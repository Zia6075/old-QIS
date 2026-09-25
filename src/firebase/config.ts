// ============================================
// Firebase config — QIS HR System
// ============================================
// ✅ databaseURL: app khud dhoond leti hai (ensureDatabaseUrl) — RTDB kisi bhi
//    region mein ho, sahi URL khud pakda jata hai.
//    Aap ka project: ishaq-old (RTDB asia-southeast1 mein maujood)
// ============================================

export const firebaseConfig = {
  apiKey: 'AIzaSyCMhd72on6_sPX0mAvr8VfykvaQediGsrY',
  authDomain: 'ishaq-old.firebaseapp.com',
  projectId: 'ishaq-old',
  storageBucket: 'ishaq-old.firebasestorage.app',
  messagingSenderId: '431481156812',
  appId: '1:431481156812:web:90227bc39c12bf073b3e69',
  databaseURL: 'https://ishaq-old-default-rtdb.asia-southeast1.firebasedatabase.app',
};

// ⭐ Login-based auth (anonymous NAHI):
//   • app ka har user ek Firebase Auth account bhi hai
//   • email = username + '@qis.local'  (admin → admin@qis.local)
//   • owner node = DEFAULT_OWNER, taake sab users ek hi data dekhein
//   • RTDB rules email se match karti hain (database.rules.json)
export const EMAIL_DOMAIN = 'qis.local';
export const usernameToEmail = (username: string): string =>
  `${(username || '').trim().toLowerCase()}@${EMAIL_DOMAIN}`;
export const DEFAULT_OWNER = 'admin@qis.local';

/**
 * ⭐ Sab cloud users EK HI data node share karte hain (school ka data ek jagah).
 * Node ka naam yeh hai — rules mein bhi wahi email list hai.
 */
export const SHARED_OWNER_KEY = 'admin_qis_local';

/**
 * ⭐ Jin emails ko access hai (RTDB rules mein bhi yehi list hai).
 * Nayi email add karni ho to: 1) Firebase Console → Authentication → Add user
 * 2) yahan list mein add karein  3) database.rules.json mein line add kar ke Publish
 */
export const ALLOWED_EMAILS = [
  'admin@qis.local',
  'staff@qis.local',
  'ishaq@gmail.com',
  'queenschool@gmail.com',
];
export const isAllowedEmail = (email: string): boolean =>
  ALLOWED_EMAILS.includes((email || '').trim().toLowerCase());
export const AUTH_REQUIRED = true;   // anonymous fallback OFF (security)

/**
 * ⭐ databaseURL khud dhoondna — aap RTDB kisi bhi region mein banayein,
 * app sahi URL khud pakad leti hai (404 par Firebase "correctUrl" bata deta hai).
 * Ek dafa chalta hai, phir cache.
 */
let resolvedUrl = '';
export let databaseFound = false;   // kya RTDB asal mein mili?
export const ensureDatabaseUrl = async (): Promise<string> => {
  if (resolvedUrl) return resolvedUrl;
  const base = `https://${firebaseConfig.projectId}-default-rtdb`;
  const candidates = [
    firebaseConfig.databaseURL,
    `${base}.firebaseio.com`,
    `${base}.asia-southeast1.firebasedatabase.app`,
    `${base}.europe-west1.firebasedatabase.app`,
    `${base}.us-central1.firebasedatabase.app`,
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  for (const url of candidates) {
    try {
      const res = await fetch(`${url}/.json`, { signal: AbortSignal.timeout(6000) });
      const text = await res.text();
      if (res.ok || res.status === 401) {          // 401 = database maujood, rules rok rahi hain
        firebaseConfig.databaseURL = url;
        resolvedUrl = url;
        databaseFound = true;
        if (url !== candidates[0]) console.log(`🔎 RTDB URL khud mil gaya: ${url}`);
        return url;
      }
      if (res.status === 404) {
        const m = text.match(/"correctUrl"\s*:\s*"([^"]+)"/);
        if (m) {
          firebaseConfig.databaseURL = m[1];
          resolvedUrl = m[1];
          databaseFound = true;
          console.log(`🔎 RTDB URL khud mil gaya: ${m[1]}`);
          return m[1];
        }
      }
    } catch { /* agli candidate */ }
  }
  resolvedUrl = firebaseConfig.databaseURL;   // dobara loop na ho
  console.warn('⚠️ Realtime Database nahi mili — Console → Build → Realtime Database → Create Database');
  return resolvedUrl;
};

// App ka naam/version — diagnostics report mein jata hai
export const APP_NAME = 'QIS HR & Visa System';
export const APP_VERSION = '5.14.10';

// Data model (guide ke mutabiq):  sync/{owner}/data/{collection}/{id}
export const SYNC_ROOT = 'sync';
export const MAP_PATH = `${SYNC_ROOT}/_map`;
export const dataNode = (owner: string) => `${SYNC_ROOT}/${owner}/data`;
export const metaPath = (owner: string) => `${SYNC_ROOT}/${owner}/meta`;

// Jo collections sync hoti hain
export const COLLECTIONS = ['employees', 'users', 'cheques', 'expenses', 'activityLogs', 'backupLogs'] as const;
export type CollectionName = typeof COLLECTIONS[number];

// Guide: chunk limit 250KB, images wale records alag batch mein
export const PATCH_CHUNK_BYTES = 200 * 1024;
// Guide: images 600px, JPEG q78
export const IMAGE_MAX_WIDTH = 600;
export const IMAGE_QUALITY = 0.78;
