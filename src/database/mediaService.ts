// ============================================
// Media Service — bari images alag `media/{id}` node mein
// ============================================
// ⭐ Wajah: Firebase par 19.84 GB downloads ho gaye thay kyunke har list load
// par poora data (images samet) aata tha. Ab:
//   • record mein sirf chhota THUMB (~3 KB) — list fast
//   • bari image `media/{id}` mein — sirf detail khulne par load
// ============================================

import { getRecordDirect, setRecordFields, deleteRecord } from './db';
import { makeThumb } from './imageOptimizer';

export const MEDIA_STORE = 'media';

export type MediaRecord = { id: string; [key: string]: unknown };

/** ek record ki bari images (sirf detail par load karein) */
export const getMedia = async (id: string): Promise<MediaRecord | undefined> =>
  getRecordDirect<MediaRecord>(MEDIA_STORE, id);

/**
 * ⭐ Images save karein.
 * FIX: pehle poora media record REPLACE hota tha — agar purana record load na ho
 * pata to baqi images (passport/visa/labour) MIT jati thin. Ab sirf diye gaye
 * fields likhe jate hain, aur fail hone par error UPAR bheja jata hai
 * (chupaya nahi jata) taake user ko pata chale ke upload fail hua.
 */
export const saveMedia = async (id: string, patch: Record<string, unknown>): Promise<void> => {
  // ⭐ FIX: undefined kabhi na bhejein (warna cloud par null likha jata = image wipe)
  const fields: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    fields[k] = v;
  }
  if (Object.keys(fields).length <= 1) return;   // kuch change hi nahi hua
  await setRecordFields(MEDIA_STORE, id, fields);
};

export const deleteMedia = async (id: string): Promise<void> => {
  try { await deleteRecord(MEDIA_STORE, id); } catch { /* ignore */ }
};

/**
 * Record ko 2 hisson mein baantein: core (chhota) + media (bara).
 * `thumbField` diya ho to us image ka chhota thumb core mein rakh dete hain.
 */
export const splitMedia = async (
  data: Record<string, unknown>,
  mediaFields: readonly string[],
  thumbFor?: { field: string; thumbField: string }
): Promise<{ core: Record<string, unknown>; media: Record<string, unknown>; hasMedia: boolean }> => {
  const core: Record<string, unknown> = {};
  const media: Record<string, unknown> = {};
  let hasMedia = false;

  for (const [k, v] of Object.entries(data)) {
    if (mediaFields.includes(k)) {
      // ⭐ FIX (CRITICAL): `undefined` ka matlab hai "is field ko chheda hi nahi".
      // Pehle yeh media mein chala jata tha aur clean() isay `null` bana kar
      // image KO MITA deta tha (edit form save karte hi photo gayab ho jati thi).
      if (v === undefined) continue;
      media[k] = v;
      hasMedia = true;
    } else {
      core[k] = v;
    }
  }

  if (thumbFor && Object.prototype.hasOwnProperty.call(media, thumbFor.field)) {
    const img = media[thumbFor.field];
    if (typeof img === 'string' && img.startsWith('data:image')) {
      core[thumbFor.thumbField] = await makeThumb(img);
    } else {
      // khali string / null = user ne image clear ki
      core[thumbFor.thumbField] = '';
    }
  }

  return { core, media, hasMedia };
};
