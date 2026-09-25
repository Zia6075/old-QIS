// ============================================
// Sync helpers — PURE logic (koi Firebase/browser dependency nahi)
// FIREBASE_IMPLEMENTATION_GUIDE.md ke principles yahan implement hain:
//   • email sanitize  • LOCAL-time updatedAt  • tombstone delete
//   • fraction-tolerant compare  • changed-only push  • 250KB chunking
// ============================================

export interface SyncRecord {
  id: string;
  updatedAt?: string;
  deleted?: boolean;
  [key: string]: unknown;
}

/** Guide §3: email.toLowerCase().replace(/[^a-z0-9]/g, '_') */
export const sanitizeEmail = (email: string): string =>
  (email || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '_');

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * Guide §1.4 / §6: updatedAt = LOCAL time, "yyyy-MM-dd HH:mm:ss"
 * (UTC ISO likhne se doosre device par edits "purani" lagti thin aur skip ho jatin)
 */
export const localNow = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;

/**
 * ⭐ FIX: Safari `new Date("2026-09-01 18:45:00")` par Invalid Date deta hai
 * (space separator). Is liye pehle format ko ISO banate hain.
 */
export const toSafeDateString = (s: string): string => {
  const t = s.trim();
  if (!t) return t;
  if (t.includes('T') || t.endsWith('Z')) return t;              // pehle se ISO
  if (/^\d{4}-\d{2}-\d{2}[ ]\d{2}:\d{2}(:\d{2})?/.test(t)) return t.replace(' ', 'T');
  const dot = t.match(/^(\d{4})\.(\d{1,2})\.(\d{1,2})$/);        // 2026.09.01
  if (dot) return `${dot[1]}-${pad(Number(dot[2]))}-${pad(Number(dot[3]))}`;
  return t;
};

/**
 * ⭐ FIX: structure ka patch — ek hi read se tay ho jata hai
 * (pehle har collection ke liye alag request jati thi = 7 round trips)
 */
export const computeStructurePatch = (
  existing: Record<string, unknown> | null | undefined,
  collections: readonly string[],
  now: string,
  meta: Record<string, unknown>
): Record<string, unknown> => {
  const patch: Record<string, unknown> = {};
  const data = (existing && typeof existing === 'object' ? (existing as Record<string, unknown>).data : null) as Record<string, unknown> | null;
  for (const c of collections) {
    const node = data && typeof data[c] === 'object' ? (data[c] as Record<string, unknown>) : null;
    if (!node || !node._placeholder) patch[`data/${c}/_placeholder`] = { id: '_placeholder', note: `${c} collection`, updatedAt: now };
  }
  if (!existing || typeof (existing as Record<string, unknown>).meta !== 'object') patch['meta'] = meta;
  return patch;
};

/** Har date field ko normalize karna (guide §5 merge sanity) */
export const normalizeDate = (value: unknown): string | null => {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  // "yyyy-MM-dd HH:mm:ss" → "yyyy-MM-ddTHH:mm:ss" (browser parse)
  const iso = toSafeDateString(s);
  const t = Date.parse(iso);
  if (!Number.isNaN(t)) return new Date(t).toISOString();
  // dd-MM-yyyy / dd/MM/yyyy
  const m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (m) return new Date(`${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`).toISOString();
  return null;
};

/**
 * Guide §10 "Fractional-seconds compare":
 * 19-char trim kar ke compare karo, warna har cycle saare records update hote hain (blinking).
 */
export const stampKey = (s?: string | null): string => {
  if (!s) return '';
  return String(s).replace('T', ' ').trim().slice(0, 19);
};

/** a > b ? (a naya hai) — fractional seconds ignore */
export const isNewer = (a?: string | null, b?: string | null): boolean => {
  const ka = stampKey(a);
  const kb = stampKey(b);
  if (!ka) return false;
  if (!kb) return true;
  if (ka === kb) return false;
  const ta = Date.parse(ka.includes(' ') ? ka.replace(' ', 'T') : ka);
  const tb = Date.parse(kb.includes(' ') ? kb.replace(' ', 'T') : kb);
  if (!Number.isNaN(ta) && !Number.isNaN(tb)) return ta > tb;
  return ka > kb; // string fallback
};

/** Guide §1.3: tombstoned (deleted:true) records client ko kabhi nahi dikhne chahiye */
export const isTombstoned = (rec: Partial<SyncRecord> | null | undefined): boolean =>
  !!rec && rec.deleted === true;

/**
 * Structure dikhane ke liye har collection mein ek `_placeholder` node hota hai
 * (warna khaali collection Firebase console mein nahi dikhti).
 * Yeh record NAHI hai — UI/list se hamesha chhupa rahe.
 */
export const isPlaceholder = (rec: Partial<SyncRecord> | null | undefined): boolean =>
  !!rec && (rec.id === '_placeholder' || rec.placeholder === true);

export const filterLive = <T extends Partial<SyncRecord>>(records: (T | null | undefined)[]): T[] =>
  records.filter((r): r is T => !!r && !isTombstoned(r) && !isPlaceholder(r));

/** Guide §1.2: changed-only push — sirf woh records jo local par badle hain */
export const pickChanged = <T extends SyncRecord>(
  local: T[],
  remote: Record<string, SyncRecord | null>
): T[] => {
  const out: T[] = [];
  for (const rec of local) {
    const r = remote[rec.id];
    // remote par nahi hai, ya local naya hai → push karo
    if (!r || isNewer(rec.updatedAt, r.updatedAt)) out.push(rec);
  }
  return out;
};

/**
 * Guide §4: "remote.deleted=true → local DELETE"
 * Returns: apply = records jo local par likhne hain, removeIds = jo local se hatane hain
 */
export const mergeRemote = <T extends SyncRecord>(
  remote: Record<string, T | null> | null | undefined,
  local: Record<string, T>
): { apply: T[]; removeIds: string[] } => {
  const apply: T[] = [];
  const removeIds: string[] = [];
  if (!remote) return { apply, removeIds };
  for (const [id, rec] of Object.entries(remote)) {
    if (!rec || typeof rec !== 'object') continue;
    if (isTombstoned(rec)) {
      if (local[id]) removeIds.push(id);
      continue;
    }
    if (!local[id] || isNewer(rec.updatedAt, local[id].updatedAt)) apply.push(rec);
  }
  return { apply, removeIds };
};

const approxBytes = (value: unknown): number => JSON.stringify(value ?? null).length;

/**
 * Guide §4: multi-path PATCH limits — bara payload 10MB par fail hota hai aur
 * chupke se images strip kar deta hai. Is liye ~200KB ki batches,
// aur image wala record apni alag batch mein.
 */
export const chunkPatch = <T extends SyncRecord>(records: T[], maxBytes = 200 * 1024): T[][] => {
  const chunks: T[][] = [];
  let current: T[] = [];
  let size = 2;
  let currentHasImage = false;
  for (const rec of records) {
    const hasImage = JSON.stringify(rec).includes('data:image');
    const bytes = approxBytes(rec);
    // batch flush karo agar: limit cross ho rahi ho, ya image wala record akela jaana chahiye
    if (current.length > 0 && (size + bytes > maxBytes || hasImage || currentHasImage)) {
      chunks.push(current);
      current = [];
      size = 2;
      currentHasImage = false;
    }
    current.push(rec);
    size += bytes;
    currentHasImage = currentHasImage || hasImage;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
};

/** Guide §8: diagnostics report (cloud par likha jata hai) */
export const buildImagePatchReport = (input: {
  device: string;
  version: string;
  counts: Record<string, number>;
  failed?: number;
}): Record<string, unknown> => ({
  at: localNow(),
  device: input.device,
  version: input.version,
  ...input.counts,
  failed: input.failed ?? 0,
});

/**
 * ⭐ Auto-update ke liye: "5.6.0" vs "v5.7.0" compare.
 * Guide §9: tag > current ho to update popup.
 */
export const isNewerVersion = (candidate: string, current: string): boolean => {
  const parse = (v: string): number[] =>
    String(v || '').replace(/^v/i, '').split(/[.\-+]/).map(n => parseInt(n, 10)).filter(n => !Number.isNaN(n));
  const a = parse(candidate);
  const b = parse(current);
  if (!a.length) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false; // barabar = update nahi
};

/** Device ka naam (browser) — diagnostics ke liye */
export const deviceLabel = (): string => {
  try {
    const ua = navigator.userAgent || '';
    const isMobile = /Android|iPhone|iPad/i.test(ua);
    const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
    return `${isMobile ? 'Mobile' : 'PC'}-${browser}`;
  } catch {
    return 'unknown-device';
  }
};
