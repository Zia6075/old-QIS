// ============================================
// LAN Provider — purana Express server (electron/server.js)
// Firebase na mile to yeh fallback chalta hai (offline/LAN mode)
// ============================================
// ⭐ FIX #13: pehle har getRecord par direct HTTP jata tha (collection memory
//    mein hone ke bawajood) aur bulk write POST karta tha = DUPLICATE records.
//    Ab Firebase provider jaisa hi in-memory store cache + upsert semantics.
// ============================================

import type { DbProvider } from './types';

const getApiUrl = (path: string): string => {
  const isLocalFile = window.location.protocol === 'file:';
  const isDev = window.location.port === '5173';
  const base = (isLocalFile || isDev) ? 'http://localhost:3000' : window.location.origin;
  return `${base}${path}`;
};

type Rec = { id: string; [key: string]: unknown };
const storeCache = new Map<string, Record<string, Rec>>();

const fetchCollection = async (storeName: string): Promise<Record<string, Rec>> => {
  const res = await fetch(getApiUrl(`/api/records/${storeName}`), { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const list = (await res.json()) as Rec[];
  const map: Record<string, Rec> = {};
  for (const r of Array.isArray(list) ? list : []) if (r && r.id) map[r.id] = r;
  storeCache.set(storeName, map);
  return map;
};

const readStore = async (storeName: string, force = false): Promise<Record<string, Rec>> => {
  if (!force && storeCache.has(storeName)) return storeCache.get(storeName)!;
  return fetchCollection(storeName);
};

const upsert = (storeName: string, rec: Rec): void => {
  const map = storeCache.get(storeName) || {};
  map[rec.id] = rec;
  storeCache.set(storeName, map);
};

export const lanProvider: DbProvider = {
  name: 'lan',

  async init() {
    const maxAttempts = 6;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await fetch(getApiUrl('/api/ping'), { cache: 'no-store' });
        if (res.ok) return 'Connected to central LAN server';
      } catch { await new Promise(r => setTimeout(r, 250)); }
    }
    throw new Error('LAN server offline');
  },

  async addRecord<T>(storeName: string, record: T): Promise<T> {
    const res = await fetch(getApiUrl(`/api/records/${storeName}`), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Failed to add record to ${storeName}`); }
    upsert(storeName, record as Rec);            // FIX #12/#13: cache turant update
    return record;
  },

  /**
   * ⭐ FIX #13: bulk write. Purana record ho to PUT (update), naya ho to POST.
   * Pehle sab POST hote the → duplicates bante the.
   */
  async addRecordsBulk<T>(storeName: string, records: T[]): Promise<number> {
    const map = await readStore(storeName);
    for (const r of records) {
      const id = (r as Rec).id;
      if (map[id]) await this.updateRecord(storeName, r);
      else await this.addRecord(storeName, r);
    }
    return records.length;
  },

  async updateRecord<T>(storeName: string, record: T): Promise<T> {
    const id = (record as Rec).id;
    const res = await fetch(getApiUrl(`/api/records/${storeName}/${id}`), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(record),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Failed to update record in ${storeName}`); }
    upsert(storeName, record as Rec);            // FIX #12/#13
    return record;
  },

  async deleteRecord(storeName: string, id: string): Promise<void> {
    const res = await fetch(getApiUrl(`/api/records/${storeName}/${id}`), { method: 'DELETE' });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `Failed to delete record from ${storeName}`); }
    const map = storeCache.get(storeName);
    if (map) delete map[id];
  },

  /** ⭐ FIX #13: pehle har getRecord par direct HTTP — ab cache se */
  async getRecord<T>(storeName: string, id: string): Promise<T | undefined> {
    const map = await readStore(storeName);
    if (map[id]) return map[id] as T;
    try {
      const res = await fetch(getApiUrl(`/api/records/${storeName}/${id}`), { cache: 'no-store' });
      if (!res.ok) return undefined;
      const rec = (await res.json()) as Rec;
      if (rec && rec.id) upsert(storeName, rec);
      return rec as T;
    } catch { return undefined; }
  },

  async setRecordFields(storeName: string, id: string, fields: Record<string, unknown>): Promise<void> {
    const cur = (await this.getRecord<Rec>(storeName, id)) || ({ id } as Rec);
    const merged = { ...cur, ...fields, id };
    const res = await fetch(getApiUrl(`/api/records/${storeName}/${id}`), {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(merged),
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `fields save fail (${storeName}/${id})`); }
    upsert(storeName, merged);
  },

  async getRecordDirect<T>(storeName: string, id: string): Promise<T | undefined> {
    try {
      const res = await fetch(getApiUrl(`/api/records/${storeName}/${id}`), { cache: 'no-store' });
      if (!res.ok) return undefined;
      const rec = (await res.json()) as Rec;
      if (rec && rec.id) upsert(storeName, rec);
      return rec as T;
    } catch { return undefined; }
  },

  async getAllRecords<T>(storeName: string, force = false): Promise<T[]> {
    return Object.values(await readStore(storeName, force)) as T[];
  },

  async getRecordByIndex<T>(storeName: string, indexName: string, value: string): Promise<T | undefined> {
    const map = await readStore(storeName);
    return Object.values(map).find(r => String(r[indexName] ?? '') === String(value)) as T | undefined;
  },

  /**
   * ⭐ FIX #14: LAN server par koi realtime stream nahi, is liye doosre device ka
   * write cache mein nahi aata. App start par (aur manual refresh par) ek dafa
   * saari collections fresh padh lete hain.
   */
  async refreshAllStores(): Promise<void> {
    await Promise.all(['employees', 'users', 'cheques', 'expenses', 'activityLogs', 'backupLogs']
      .map(s => fetchCollection(s).catch(() => undefined)));
  },

  async clearStore(storeName: string): Promise<void> {
    const res = await fetch(getApiUrl(`/api/records/${storeName}`), { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to clear store ${storeName}`);
    storeCache.set(storeName, {});
  },

  async exportDatabase(): Promise<string> {
    const res = await fetch(getApiUrl('/api/export'), { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return JSON.stringify(await res.json(), null, 2);
  },

  async importDatabase(jsonData: string): Promise<void> {
    const res = await fetch(getApiUrl('/api/import'), {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: jsonData,
    });
    if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || 'Failed to import database to server'); }
    storeCache.clear();
  },
};
