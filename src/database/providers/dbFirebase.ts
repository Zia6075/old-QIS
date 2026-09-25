// ============================================
// Firebase Provider — Realtime Database (LIVE SYNC)
// ============================================
// FIREBASE_IMPLEMENTATION_GUIDE.md ke principles:
//  §1.1 PATCH-only, PUT kabhi nahi      → sirf per-record paths likhte hain
//  §1.3 Tombstone delete                → delete = {deleted:true, updatedAt}
//  §1.4 updatedAt = LOCAL time          → syncUtils.localNow()
//  §1.6 Echo-guard / debounce           → listener se UI refresh 800ms debounce
//  §1.7 UI refresh debounce             → upar wala
//  §4   250KB chunk limit               → chunkPatch()
//  §8   Diagnostics                     → meta + imagePatch report
// ============================================

import { getDatabase, ref, get, set, update, onValue, type Database } from 'firebase/database';
import { getFirebaseApp, getFirebaseAuth, restoreSession, getIdToken } from '../../firebase/auth';
import {
  firebaseConfig, dataNode, metaPath, SYNC_ROOT, APP_NAME, APP_VERSION,
  PATCH_CHUNK_BYTES, COLLECTIONS, DEFAULT_OWNER, SHARED_OWNER_KEY, ensureDatabaseUrl, databaseFound,
} from '../../firebase/config';
import {
  sanitizeEmail, localNow, filterLive, chunkPatch, isTombstoned, isPlaceholder, deviceLabel,
  buildImagePatchReport, type SyncRecord,
} from '../../firebase/syncUtils';
import type { DbProvider } from './types';

let db: Database | null = null;
let ownerKey = '';
let nodePath = '';
const storeCache = new Map<string, Record<string, SyncRecord>>();
const forceTried = new Set<string>();   // ⭐ FIX C: ek store par ek dafa hi force-read
const liveStores = new Set<string>();   // ⭐ listener ne data de diya (cache bharosa-mand)
const listeners = new Map<string, () => void>();

type SyncEvent = { type: 'connection' | 'data' | 'auth'; message: string; at: string };
const subscribers = new Set<(e: SyncEvent) => void>();
const emit = (e: SyncEvent) => subscribers.forEach(fn => { try { fn(e); } catch { /* noop */ } });

export const subscribeSync = (fn: (e: SyncEvent) => void): (() => void) => {
  subscribers.add(fn);
  return () => subscribers.delete(fn);
};

let lastSyncAt = '';
let lastSyncMs = 0;
let lastMetaWriteMs = 0;
const touchSync = () => { lastSyncAt = localNow(); lastSyncMs = Date.now(); };
export const getSyncStatus = () => ({
  mode: 'firebase' as const,
  signedIn: !!getFirebaseAuth().currentUser,
  email: getFirebaseAuth().currentUser?.email || '',
  project: firebaseConfig.projectId,
  databaseURL: firebaseConfig.databaseURL,
  owner: ownerKey,
  connected: !!ownerKey,
  lastSync: lastSyncAt,
  lastSyncMs,
  secondsAgo: lastSyncMs ? Math.max(0, Math.round((Date.now() - lastSyncMs) / 1000)) : null,
  counts: Object.fromEntries([...storeCache.entries()].map(([k, v]) => [k, Object.keys(v).length])),
});

// RTDB JSON undefined bardasht nahi karta
const clean = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(clean) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = v === undefined ? null : clean(v);
    }
    return out as T;
  }
  return value;
};

/**
 * ⭐ Firebase SDK "deactivated" database par promise ko kabhi settle nahi karta
 * (na resolve, na reject) — natija: app hang. Is liye har cloud call par timeout.
 */
const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timeout (${ms}ms)`)), ms)),
  ]);

const getDb = (): Database => {
  if (!db) db = getDatabase(getFirebaseApp());
  return db;
};

const collectionRef = (storeName: string) => ref(getDb(), `${nodePath}/${storeName}`);

/**
 * ⭐ FIX #12: local write ke baad cache turant update karo.
 * Pehle sirf Firebase listener se cache banta tha — yani apna hi naya record
 * UI mein tab tak nahi dikhta tha jab tak server ka echo na aaye (aur
 * recalcBalance purani list se balance nikalta tha = ghalat total).
 */
const upsertCache = (storeName: string, rec: SyncRecord): void => {
  const map = storeCache.get(storeName) || {};
  map[rec.id] = rec;
  storeCache.set(storeName, map);
};

const cacheStore = (storeName: string, raw: Record<string, SyncRecord | null> | null): Record<string, SyncRecord> => {
  const map: Record<string, SyncRecord> = {};
  if (raw) {
    for (const [id, rec] of Object.entries(raw)) {
      if (!rec || typeof rec !== 'object' || isTombstoned(rec) || isPlaceholder(rec)) continue;
      // ⭐ FIX: record mein `id` na ho to RTDB key se bhar do — warna Table ka key
      // undefined hota hai aur record delete/edit nahi ho sakta.
      map[id] = rec.id ? rec : { ...rec, id };
    }
  }
  storeCache.set(storeName, map);
  return map;
};

// ⭐ Pehli (uncached) read ke liye lamba timeout — aap ka data ~99 MB tha,
// 10s mein load hi nahi hota tha. Compress karne ke baad yeh foran ho jaye ga.
const FIRST_READ_TIMEOUT = 60000;

const readStore = async (storeName: string, force = false): Promise<Record<string, SyncRecord>> => {
  // ⭐ FIX (blinking/timeout): realtime listener ne jo data de diya hai wahi kaafi hai.
  // Aap ka employees node ~99 MB hai — har read par `get()` karna 10s+ leta tha
  // aur UI bar bar refresh hoti thi. Ab listener ka cache use hota hai.
  if (!force && liveStores.has(storeName) && storeCache.has(storeName)) return storeCache.get(storeName)!;
  if (!force && storeCache.has(storeName)) return storeCache.get(storeName)!;
  const snap = await withTimeout(get(collectionRef(storeName)), FIRST_READ_TIMEOUT, `read ${storeName}`);
  const raw = (snap.val() as Record<string, SyncRecord | null>) ?? null;
  // ⭐ FIX: null snapshot (node maujood nahi / permission denied se pehle) ko
  // cache mein KHALI map bana kar na rakho — warna agla read hamesha khali mile ga.
  if (!raw) return {};
  return cacheStore(storeName, raw);
};

let metaPending: Record<string, unknown> | null = null;
let metaTimer: ReturnType<typeof setTimeout> | null = null;
let metaInFlight: Promise<boolean> | null = null;

const flushMeta = async (): Promise<boolean> => {
  const extra = metaPending || {};
  metaPending = null;
  try {
    // ⭐ timeout: deactivated database par SDK promise kabhi settle nahi karta
    await withTimeout(set(ref(getDb(), metaPath(ownerKey)), clean({
      lastSync: localNow(),
      lastSyncMs: Date.now(),
      deviceName: deviceLabel(),
      version: APP_VERSION,
      app: APP_NAME,
      ...extra,
    })), 6000, 'meta write');
    touchSync();
    return true;
  } catch (err) {
    console.warn('[firebase] meta write fail:', err instanceof Error ? err.message : err);
    return false;
  }
};

/**
 * ⭐ FIX #4: pehle HAR write par meta likha jata tha (2 network round trips per save).
 * Ab 1.5s throttle — kitne bhi saves hon, meta ek dafa likha jata hai.
 */
const writeMeta = (extra: Record<string, unknown> = {}): Promise<void> => {
  metaPending = { ...(metaPending || {}), ...extra };
  touchSync();
  // ⭐ Firebase par "last sync" time har second se zyada baar nahi likhte (warna
  //    khud hi write storm ban jata hai) — sirf 1s gap ke baad actual write.
  if (Date.now() - lastMetaWriteMs < 1000) return Promise.resolve();
  lastMetaWriteMs = Date.now();
  if (metaTimer) return Promise.resolve();
  metaTimer = setTimeout(async () => {
    metaTimer = null;
    metaInFlight = flushMeta();
    await metaInFlight;
    metaInFlight = null;
    if (metaPending) writeMeta(); // throttle ke dauran aur changes aaye to ek aur flush
  }, 1500);
  return Promise.resolve();
};

/** Guide §8: cloud par diagnostics report (debug ke liye zaroori) */
export const pushDiagnostics = async (extra: Record<string, number> = {}): Promise<void> => {
  if (!ownerKey) return;
  const counts: Record<string, number> = {};
  // ⭐ FIX (blinking): sirf CACHE se ginti — network read bilkul nahi
  for (const c of COLLECTIONS) counts[c] = Object.keys(storeCache.get(c) || {}).length;
  try {
    await set(ref(getDb(), `${nodePath}/imagePatch`), clean(buildImagePatchReport({
      device: deviceLabel(), version: APP_VERSION, counts: { ...counts, ...extra },
    })));
  } catch (err) { console.warn('[firebase] diagnostics fail:', err); }
};

/** Guide §6: realtime listener + debounce (typing ke dauran UI refresh nahi) */
const attachListeners = (): void => {
  let debounce: ReturnType<typeof setTimeout> | null = null;
  for (const storeName of COLLECTIONS) {
    const off = onValue(collectionRef(storeName), (snap) => {
      cacheStore(storeName, (snap.val() as Record<string, SyncRecord | null>) ?? null);
      liveStores.add(storeName);        // ⭐ ab cache se padh sakte hain
      touchSync();
      if (debounce) clearTimeout(debounce);
      debounce = setTimeout(() => emit({ type: 'data', message: `${storeName} updated`, at: lastSyncAt }), 800);
    }, (err) => emit({
      type: 'connection',
      message: /permission-denied|permission denied/i.test(err.message)
        ? 'Login zaroori hai (ya RTDB rules publish karein — database.rules.json)'
        : err.message,
      at: localNow(),
    }));
    listeners.set(storeName, off);
  }
  emit({ type: 'connection', message: 'Firebase se live sync chal raha hai', at: localNow() });
};

/**
 * ⭐ Cloud par poora structure bana deta hai (NMP app ki tarah console mein sab dikhe):
 *   data/employees, cheques, expenses, users, activityLogs, backupLogs + meta
 * Khaali collection console mein nahi dikhti, is liye `_placeholder` node likhte hain
 * (app usay record nahi samajhti — isPlaceholder() filter karta hai).
 * FIX #3: sirf EK read, farq local nikalte hain — jo missing hai wahi likha jata hai.
 */
const ensureStructure = async (): Promise<void> => {
  // ⭐ FIX (blinking): pehle yahan POORA owner node download hota tha
  // (77 employees + base64 images = MBs) → reads timeout → UI bar bar refresh.
  // Ab sirf chhote `_placeholder` reads, woh bhi parallel.
  try {
    const checks = await Promise.all(COLLECTIONS.map(async (c) => {
      try {
        const snap = await withTimeout(get(ref(getDb(), `${nodePath}/${c}/_placeholder`)), 5000, `probe ${c}`);
        return { c, exists: snap.exists() };
      } catch { return { c, exists: true }; }   // fail → likhne ki koshish na karein
    }));
    const patch: Record<string, unknown> = {};
    for (const { c, exists } of checks) {
      if (!exists) patch[`data/${c}/_placeholder`] = { id: '_placeholder', note: `${c} collection`, updatedAt: localNow() };
    }
    try {
      const metaSnap = await withTimeout(get(ref(getDb(), `${SYNC_ROOT}/${ownerKey}/meta`)), 5000, 'probe meta');
      if (!metaSnap.exists()) patch['meta'] = { app: APP_NAME, version: APP_VERSION, deviceName: deviceLabel(), lastSync: localNow() };
    } catch { /* ignore */ }
    if (Object.keys(patch).length) {
      await withTimeout(update(ref(getDb(), `${SYNC_ROOT}/${ownerKey}`), clean(patch)), 10000, 'structure write');
    }
  } catch (err) {
    console.warn('[firebase] structure create skip:', err instanceof Error ? err.message : err);
  }
};

/** Sirf test ke liye: cache ko jaan boojh kar khali karna (regression test) */
export const __setCacheForTest = (storeName: string, map: Record<string, SyncRecord>): void => {
  storeCache.set(storeName, map);
};

let ready = false;
export const isProviderReady = (): boolean => ready;

/** Login ke baad dobara attach (token ab maujood hai) */
export const reconnectAfterLogin = async (dataOwner?: string): Promise<string> => {
  await ensureDatabaseUrl();
  // ⭐ shared node (sab users ek hi data dekhte hain)
  ownerKey = dataOwner ? sanitizeEmail(dataOwner) : SHARED_OWNER_KEY;
  nodePath = dataNode(ownerKey);
  for (const off of listeners.values()) { try { off(); } catch { /* noop */ } }
  listeners.clear();
  storeCache.clear();
  liveStores.clear();
  attachListeners();
  await writeMeta({ authMode: 'email', email: getFirebaseAuth().currentUser?.email || '' , dataOwner: ownerKey });
  await ensureStructure();
  void pushDiagnostics();
  void pushImageDiagnostics();
  return `Firebase live sync ON — ${firebaseConfig.projectId} (node: ${ownerKey})`;
};

/**
 * ⭐ Images ka hisaab cloud par likho — isi se pata chalta hai ke images
 *    asal mein Firebase par pohanchin ya nahi (aap ka sawal).
 */
export const pushImageDiagnostics = async (): Promise<Record<string, number>> => {
  const counts: Record<string, number> = {};
  const sizeKB: Record<string, number> = {};
  let failed = 0;
  const scan = async (name: string, fields: string[]) => {
    try {
      // ⭐ FIX (blinking): cache se — images dobara download nahi hoti
      const recs = Object.values(storeCache.get(name) || {});
      let n = 0; let b = 0;
      for (const r of recs) {
        for (const f of fields) {
          const v = (r as Record<string, unknown>)[f];
          if (typeof v === 'string' && v.startsWith('data:image')) { n++; b += v.length; }
        }
      }
      counts[name] = n;
      sizeKB[`${name}KB`] = Math.round(b / 1024);
    } catch { failed++; }
  };
  await Promise.all([
    scan('employees', ['personImagePath', 'passportImagePath', 'visaImagePath', 'labourCardImagePath']),
    scan('cheques', ['chequeImage']),
    scan('expenses', ['receiptImage']),
  ]);
  if (ownerKey) {
    try {
      await set(ref(getDb(), `${nodePath}/imageStats`), clean({
        at: localNow(), device: deviceLabel(), version: APP_VERSION, counts, sizeKB, failed,
        note: 'Kitni images cloud par maujood hain',
      }));
    } catch { /* rules */ }
  }
  return counts;
};

/**
 * ⭐ FIX: read timeout/permission fail par app CRASH na ho.
 * Pehle withTimeout ka rejection unhandled reh kar poora process gira deta tha.
 */
const safeRead = async (storeName: string, force = false): Promise<Record<string, SyncRecord>> => {
  try {
    return await readStore(storeName, force);
  } catch (e) {
    console.warn(`[firebase] ${storeName} read fail (${e instanceof Error ? e.message : e}) — khali list`);
    return storeCache.get(storeName) || {};
  }
};

export const firebaseProvider: DbProvider = {
  name: 'firebase',

  async init(): Promise<string> {
    // ⭐ LOGIN BASED: anonymous session kabhi nahi banti (security + Google spam se bachao).
    //    Purani session (SDK khud persist karta hai) ho to wahi, warna DEFAULT_OWNER node.
    // ⭐ sab se pehle: sahi RTDB URL dhoondo (initializeApp se pehle zaroori)
    await ensureDatabaseUrl();
    const session = await restoreSession();
    // ⭐ Sab cloud users EK HI node share karte hain (school ka data ek jagah),
    // warna har email ka alag data ban jata aur do emails ek doosre ka data na dekhtin.
    const email = getFirebaseAuth().currentUser?.email || session.email || DEFAULT_OWNER;
    ownerKey = SHARED_OWNER_KEY;
    void email;
    nodePath = dataNode(ownerKey);
    try { await withTimeout(get(ref(getDb(), '.info/connected')), 4000, 'connect probe'); } catch { /* probe fail ho to bhi chale ga */ }

    // ⭐ Bina login Firebase par write ki koshish hi na karein — rules rok deti hain
    // aur SDK 10 second zaya karta tha. (App login ke BAAD connectFirebase() chalati hai)
    if (!getFirebaseAuth().currentUser) {
      ready = false;
      throw new Error('Firebase login zaroori hai (anonymous band hai)');
    }

    // ⭐ FIX (CRITICAL): pehle yahan WRITE verify hoti thi — natija yeh hua ke
    // jin emails ko sirf READ ki ijazat hai (ishaq/queenschool), un ka login hi
    // fail ho jata tha aur web par data KHALI dikhta tha.
    // Ab READ verify hoti hai; write na ho to "read-only cloud" mode chal jata hai.
    if (!databaseFound) {
      ready = false;
      throw new Error('Realtime Database abhi bani NAHI. Console → Build → Realtime Database → Create Database (asia-southeast1) → phir Rules publish karein.');
    }
    let canRead = false;
    try {
      await withTimeout(get(ref(getDb(), `${nodePath}/meta`)), 10000, 'read verify');
      canRead = true;
    } catch (e) {
      console.warn('[firebase] read verify fail:', e instanceof Error ? e.message : e);
    }
    if (!canRead) {
      ready = false;
      throw new Error('Firebase se data padha nahi ja saka (permission denied). Rules mein yeh email READ list mein honi chahiye — RULES.md dekhein.');
    }

    // write optional hai (browser = read only)
    metaPending = { authMode: 'email', email };
    const okWrite = await flushMeta();
    if (!okWrite) console.warn('☁️ Cloud READ-ONLY mode (write permission nahi) — browser ke liye yeh theek hai');
    try { attachListeners(); } catch (e) { console.warn('[firebase] listeners fail:', e); }
    void ensureStructure();
    void pushDiagnostics();
    void pushImageDiagnostics();
    ready = true;
    return `Firebase live sync ON — ${firebaseConfig.projectId} (node: ${ownerKey})`;
  },

  async addRecord<T>(storeName: string, record: T): Promise<T> {
    const rec = clean({ ...(record as object), updatedAt: localNow() }) as T;
    upsertCache(storeName, rec as SyncRecord);           // FIX #12 (UI turant update)
    await withTimeout(set(ref(getDb(), `${nodePath}/${storeName}/${(rec as { id: string }).id}`), rec), 10000, `write ${storeName}`);
    void writeMeta();
    return rec;
  },

  async updateRecord<T>(storeName: string, record: T): Promise<T> {
    const rec = clean({ ...(record as object), updatedAt: localNow() }) as T;
    upsertCache(storeName, rec as SyncRecord);           // FIX #12
    // per-record path (PUT nahi) — baqi records untouched
    await withTimeout(set(ref(getDb(), `${nodePath}/${storeName}/${(rec as { id: string }).id}`), rec), 10000, `update ${storeName}`);
    void writeMeta();
    return rec;
  },

  async deleteRecord(storeName: string, id: string): Promise<void> {
    // Guide §1.3: tombstone — remove() kabhi nahi, warna delete propagate nahi hota
    await withTimeout(update(ref(getDb(), nodePath), {
      [`${storeName}/${id}`]: { id, deleted: true, updatedAt: localNow() },
    }), 10000, `delete ${storeName}`);
    void writeMeta();
    const map = storeCache.get(storeName);
    if (map) delete map[id];
  },

  /**
   * ⭐ FIX #5: bulk write — multi-path update (guide §4 ki chunking ke saath).
   * Seeding/import mein 77 records = pehle 154 round trips, ab 1-3.
   */
  async addRecordsBulk<T>(storeName: string, records: T[]): Promise<number> {
    let n = 0;
    for (const chunk of chunkPatch(records as SyncRecord[], PATCH_CHUNK_BYTES)) {
      const patch: Record<string, unknown> = {};
      for (const r of chunk) patch[`data/${storeName}/${(r as { id: string }).id}`] = clean({ ...(r as object), updatedAt: localNow() });
      await withTimeout(update(ref(getDb(), `${SYNC_ROOT}/${ownerKey}`), patch), 20000, `bulk ${storeName}`);
      const map = storeCache.get(storeName) || {};
      for (const r of chunk) map[(r as { id: string }).id] = r as SyncRecord;
      storeCache.set(storeName, map);
      n += chunk.length;
    }
    void writeMeta({ bulkAdded: n });
    return n;
  },

  async getRecord<T>(storeName: string, id: string): Promise<T | undefined> {
    const map = await safeRead(storeName);
    if (map[id]) return map[id] as T;
    // ⭐ FIX ("User not found" bug): cache khali/stale ho sakta hai — miss par
    // ek dafa fresh read, warna banda login hi nahi kar pata tha.
    if (getFirebaseAuth().currentUser) {
      const fresh = await safeRead(storeName, true);
      return fresh[id] as T | undefined;
    }
    return undefined;
  },

  /**
   * ⭐ FIX (19.84 GB downloads): sirf EK record lao.
   * Pehle har employee ke liye poora collection (26 MB, images samet) download
   * hota tha — isi se Firebase ka download quota khatam ho gaya.
   */
  /**
   * ⭐ FIX (images wipe hona): sirf diye gaye fields likho.
   * Pehle saveMedia poora media record REPLACE karta tha — agar purana record
   * load na ho pata to baqi images (passport/visa/labour) MIT jati thin.
   */
  async setRecordFields(storeName: string, id: string, fields: Record<string, unknown>): Promise<void> {
    await withTimeout(
      update(ref(getDb(), `${nodePath}/${storeName}/${id}`), clean(fields)),
      30000,
      `save ${storeName}/${id}`
    );
  },

  async getRecordDirect<T>(storeName: string, id: string): Promise<T | undefined> {
    try {
      const snap = await withTimeout(get(ref(getDb(), `${nodePath}/${storeName}/${id}`)), 15000, `read ${storeName}/${id}`);
      const val = snap.val() as SyncRecord | null;
      if (!val || typeof val !== 'object') return undefined;
      return val as T;
    } catch (e) {
      console.warn(`[firebase] ${storeName}/${id} read fail:`, e instanceof Error ? e.message : e);
      return undefined;
    }
  },

  async getAllRecords<T>(storeName: string, force = false): Promise<T[]> {
    const map = await safeRead(storeName, force);
    const list = Object.values(map) as T[];
    // ⭐ FIX: cache khali ho (pehla read permission-denied se khali bhara tha)
    // to SIRF EK dafa fresh read — warna khali collection par har call par
    // network read hota (traffic + UI blink).
    if (list.length === 0 && !force && getFirebaseAuth().currentUser && !forceTried.has(storeName)) {
      forceTried.add(storeName);
      return Object.values(await safeRead(storeName, true)) as T[];
    }
    if (list.length > 0) forceTried.delete(storeName);
    return list;
  },

  async getRecordByIndex<T>(storeName: string, indexName: string, value: string): Promise<T | undefined> {
    const find = (m: Record<string, SyncRecord>) =>
      Object.values(m).find(r => String((r as Record<string, unknown>)[indexName] ?? '') === String(value)) as T | undefined;
    const map = await safeRead(storeName);
    const hit = find(map);
    if (hit) return hit;
    // ⭐ FIX: cache khali tha to ek dafa fresh read kar ke dobara dhoondo
    if (getFirebaseAuth().currentUser) return find(await safeRead(storeName, true));
    return undefined;
  },

  async refreshAllStores(): Promise<void> {
    // listeners pehle se cache fresh rakhte hain; yeh sirf startup certainty ke liye
    await Promise.all(COLLECTIONS.map(c => readStore(c, true).catch(() => undefined)));
  },

  async clearStore(storeName: string): Promise<void> {
    const map = await safeRead(storeName, true);
    const patch: Record<string, unknown> = {};
    for (const id of Object.keys(map)) patch[`${storeName}/${id}`] = { id, deleted: true, updatedAt: localNow() };
    if (Object.keys(patch).length) await withTimeout(update(ref(getDb(), nodePath), patch), 15000, `clear ${storeName}`);
    storeCache.set(storeName, {});
    void writeMeta();
  },

  async exportDatabase(): Promise<string> {
    const out: Record<string, unknown> = {
      exportDate: new Date().toISOString(),
      version: 3,
      appName: APP_NAME,
      source: 'firebase',
      project: firebaseConfig.projectId,
      node: ownerKey,
    };
    for (const c of COLLECTIONS) out[c] = Object.values(await safeRead(c, true));
    return JSON.stringify(out, null, 2);
  },

  /**
   * Purani JSON backup (LAN server ya pehle wali app) → Firebase.
   * Guide §4: bara payload 10MB par fail hota hai, is liye ~200KB ki batches.
   */
  async importDatabase(jsonData: string): Promise<void> {
    const data = JSON.parse(jsonData) as Record<string, unknown>;
    let total = 0;
    for (const c of COLLECTIONS) {
      const list = Array.isArray(data[c]) ? (data[c] as SyncRecord[]) : [];
      const live = list.filter(r => r && r.id && !isTombstoned(r));
      for (const chunk of chunkPatch(live, PATCH_CHUNK_BYTES)) {
        const patch: Record<string, unknown> = {};
        for (const rec of chunk) {
          patch[`${c}/${rec.id}`] = clean({ ...rec, updatedAt: rec.updatedAt ? String(rec.updatedAt) : localNow(), deleted: false });
        }
        await update(ref(getDb(), nodePath), patch);
        total += chunk.length;
      }
    }
    for (const c of COLLECTIONS) storeCache.delete(c);
    await writeMeta({ importedRecords: total, importedAt: localNow() });
    void pushDiagnostics({ imported: total });
  },
};

// token sirf diagnostics ke liye expose (SDK khud handle karta hai)
export const currentToken = getIdToken;
export const filterLiveRecords = filterLive;
