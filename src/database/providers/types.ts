// ============================================
// DB Provider interface — Firebase RTDB ya LAN server, dono yehi API dete hain
// ============================================

export interface DbProvider {
  name: 'firebase' | 'lan';
  init(): Promise<string>;
  addRecord<T>(storeName: string, record: T): Promise<T>;
  /** FIX #5: bulk write (seeding/import) — kam round trips */
  addRecordsBulk<T>(storeName: string, records: T[]): Promise<number>;
  updateRecord<T>(storeName: string, record: T): Promise<T>;
  deleteRecord(storeName: string, id: string): Promise<void>;
  getRecord<T>(storeName: string, id: string): Promise<T | undefined>;
  /** ⭐ sirf EK record cloud se lao (poora collection download nahi) */
  getRecordDirect<T>(storeName: string, id: string): Promise<T | undefined>;
  /** ⭐ record ke SIRF diye gaye fields likho (baqi fields safe rehte hain) */
  setRecordFields(storeName: string, id: string, fields: Record<string, unknown>): Promise<void>;
  getAllRecords<T>(storeName: string, force?: boolean): Promise<T[]>;
  getRecordByIndex<T>(storeName: string, indexName: string, value: string): Promise<T | undefined>;
  clearStore(storeName: string): Promise<void>;
  /** ⭐ FIX #14: saari collections fresh read (startup / doosre device ke baad) */
  refreshAllStores(): Promise<void>;
  exportDatabase(): Promise<string>;
  importDatabase(jsonData: string): Promise<void>;
}
