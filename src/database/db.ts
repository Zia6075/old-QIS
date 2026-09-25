// ============================================
// Database Layer — Firebase Realtime Database (LIVE SYNC)
// Fallback: purana LAN server (electron/server.js) agar Firebase na mile
// ============================================
// Upar ke saare services (employee/user/accounting/backup) isi API se kaam karte
// hain — is liye un mein koi tabdeeli nahi karni pari.
// ============================================

import type { DbProvider } from './providers/types';
import {
  firebaseProvider, getSyncStatus, subscribeSync, pushDiagnostics,
  pushImageDiagnostics, reconnectAfterLogin as reconnectAfterLoginFirebase,
} from './providers/dbFirebase';
import { lanProvider } from './providers/dbLan';
import { isReadOnly, ReadOnlyError } from '../utils/platform';

let provider: DbProvider = firebaseProvider;

// ⭐ Offline mode: agar Firebase na chale (suspend / internet nahi) to app
// rukni nahi chahiye — local LAN server par chal jaye. Normal halat mein
// Firebase hi primary hai (data do jagah nahi bat-ta, kyunke fallback SIRF
// tab chalta hai jab Firebase bilkul fail ho).
const ALLOW_LAN_FALLBACK = true;

// ⭐ FIX #1: app turant render ho jati hai, init background mein chalta hai.
// Jo kaam data mangte hain (masal login) woh is promise ka intezar karte hain.
let readyResolve: () => void = () => {};
const readyPromise = new Promise<void>((r) => { readyResolve = r; });
export const whenDatabaseReady = (): Promise<void> => readyPromise;

export { getSyncStatus, subscribeSync, pushDiagnostics, pushImageDiagnostics };
export const getActiveProvider = (): DbProvider['name'] => provider.name;

/** Test/debug ke liye: provider manually set karna (masal LAN mode par test chalana) */
export const setActiveProvider = (name: DbProvider['name']): void => {
  provider = name === 'lan' ? lanProvider : firebaseProvider;
};

/** App start par: Firebase try karo, na mile to LAN server */
export const initDatabase = async (): Promise<string> => {
  try {
    const msg = await firebaseProvider.init();
    provider = firebaseProvider;
    // ⭐ LOGIN BASED: init ho gaya = ready (data login ke baad aaye ga).
    // Pehle yahan LAN par fallback hota tha jis se PC aur WEB alag alag
    // database padhte the — images/receipts is liye sync nahi hote the.
    readyResolve();
    return msg;
  } catch (err) {
    const fbError = err instanceof Error ? err.message : String(err);
    // ⭐ Sirf tab LAN par jao jab config mein allow ho (warna data do jagah bat jata hai)
    if (!ALLOW_LAN_FALLBACK) {
      readyResolve();
      throw new Error(fbError);
    }
    console.warn('[db] Firebase mode fail, LAN server try kar rahe hain →', fbError);
    try {
      const msg = await lanProvider.init();
      provider = lanProvider;
      readyResolve();
      return `${msg} (Firebase: ${fbError})`;
    } catch {
      // ⭐ Dono fail: app phir bhi khule (login local users se ho sake),
      // warna "Loading…" par atak jati thi.
      provider = firebaseProvider;
      readyResolve();
      console.warn('[db] Firebase aur LAN dono fail — offline mode:', fbError);
      return `Offline mode (Firebase: ${fbError})`;
    }
  }
};

export const getDatabase = async (): Promise<DbProvider> => provider;

/**
 * ⭐ READ ONLY GUARD — browser se koi tabdeeli nahi ho sakti.
 * PC application (Electron) mein sab kuch allowed hai.
 */
const assertWritable = (op: string): void => {
  if (isReadOnly()) throw new ReadOnlyError(op);
};

export const addRecord = <T>(storeName: string, record: T): Promise<T> => {
  assertWritable('naya record add karna');
  return provider.addRecord(storeName, record);
};
export const addRecordsBulk = <T>(storeName: string, records: T[]): Promise<number> => {
  assertWritable('bulk import');
  return provider.addRecordsBulk(storeName, records);
};
export const updateRecord = <T>(storeName: string, record: T): Promise<T> => {
  assertWritable('record update karna');
  return provider.updateRecord(storeName, record);
};
export const deleteRecord = (storeName: string, id: string): Promise<void> => {
  assertWritable('record delete karna');
  return provider.deleteRecord(storeName, id);
};
export const getRecord = <T>(storeName: string, id: string): Promise<T | undefined> => provider.getRecord(storeName, id);
export const getRecordDirect = <T>(storeName: string, id: string): Promise<T | undefined> => provider.getRecordDirect(storeName, id);
export const setRecordFields = (storeName: string, id: string, fields: Record<string, unknown>): Promise<void> => {
  if (isReadOnly()) throw new ReadOnlyError('images save karna');
  return provider.setRecordFields(storeName, id, fields);
};
export const getAllRecords = <T>(storeName: string, force = false): Promise<T[]> => provider.getAllRecords(storeName, force);
export const getRecordByIndex = <T>(storeName: string, indexName: string, value: string): Promise<T | undefined> => provider.getRecordByIndex(storeName, indexName, value);
export const clearStore = (storeName: string): Promise<void> => {
  assertWritable('store clear karna');
  return provider.clearStore(storeName);
};
export const refreshAllStores = (): Promise<void> => provider.refreshAllStores();

/**
 * ⭐ App start: SIRF local mode (Firebase ka intezar nahi).
 * Login page foran khulta hai; cloud login ke baad connectFirebase() chalta hai.
 */
let lanOnline = false;

export const startLocalMode = async (): Promise<string> => {
  provider = lanProvider;
  let msg = 'Local mode';
  try { msg = await lanProvider.init(); lanOnline = true; }
  catch (e) { lanOnline = false; msg = `Local server bhi nahi mila (${e instanceof Error ? e.message : e})`; }
  readyResolve();
  return msg;
};

/** ⭐ Top bar badge ke liye saaf status */
export const getConnectionStatus = (): 'cloud' | 'local' | 'offline' => {
  if (provider.name === 'firebase') return 'cloud';
  return lanOnline ? 'local' : 'offline';
};

/** ⭐ Cloud login ke baad: Firebase se jurein (owner = signed-in email) */
export const connectFirebase = async (): Promise<string> => {
  const msg = await firebaseProvider.init();
  provider = firebaseProvider;
  lanOnline = true;
  readyResolve();
  return msg;
};

/** Wapas local par (logout / cloud fail) */
export const switchToLocal = async (): Promise<void> => {
  provider = lanProvider;
  try { await refreshAllStores(); } catch { /* ignore */ }
};

/** Login ke baad Firebase dobara attach (token ab maujood hai) */
export const reconnectAfterLogin = async (dataOwner?: string): Promise<string> => {
  provider = firebaseProvider;
  const msg = await reconnectAfterLoginFirebase(dataOwner);
  readyResolve();
  return msg;
};

/**
 * ⭐ Purana PC data (LAN server / D:\\HR Backup) → Firebase.
 * Ek click mein employees, cheques, expenses, users, logs + IMAGES sab cloud par.
 */
export const importFromLanToFirebase = async (): Promise<{ collections: Record<string, number>; total: number }> => {
  await lanProvider.init();
  const summary: Record<string, number> = {};
  let total = 0;
  for (const c of ['employees', 'users', 'cheques', 'expenses', 'activityLogs', 'backupLogs']) {
    const list = await lanProvider.getAllRecords<{ id: string }>(c, true);
    if (!list.length) { summary[c] = 0; continue; }
    await firebaseProvider.addRecordsBulk(c, list);
    summary[c] = list.length;
    total += list.length;
  }
  await pushImageDiagnostics();
  return { collections: summary, total };
};
export const exportDatabase = (): Promise<string> => provider.exportDatabase();
export const importDatabase = (jsonData: string): Promise<void> => {
  assertWritable('database restore');
  return provider.importDatabase(jsonData);
};
