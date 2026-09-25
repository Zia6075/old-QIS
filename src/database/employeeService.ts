// ============================================
// Employee Service Layer - UAE Dubai
// ============================================

import { Employee } from '../types';
import { 
  addRecord, 
  updateRecord, 
  deleteRecord, 
  getRecord, 
  getAllRecords,
  getRecordByIndex,
  getRecordDirect
} from './db';
import { makeThumb } from './imageOptimizer';
import { splitMedia as splitMediaShared, saveMedia, deleteMedia } from './mediaService';

/**
 * ⭐ FIX (Firebase 19.84 GB downloads):
 * Bari images employee record mein NAHI rehtin — alag `media/{id}` node mein hoti hain.
 * Is se employee list load karte waqt sirf ~0.2 MB aata hai (pehle 26 MB).
 * List ke avatar ke liye chhota `personThumb` (~3 KB) record mein rehta hai.
 */
export const MEDIA_STORE = 'media';
export const MEDIA_FIELDS = ['personImagePath', 'passportImagePath', 'visaImagePath', 'labourCardImagePath'] as const;
export type MediaField = typeof MEDIA_FIELDS[number];
export type EmployeeMedia = { id: string } & Partial<Record<MediaField, string>>;

/**
 * ⭐ FIX (CRITICAL): pehle yahan apna PURANA inline splitMedia tha jo
 * `undefined` fields ko bhi media mein bhej deta tha → cloud par `null` likha
 * jata → images WIPE ho jati thin. Ab shared helper use hota hai jo
 * `undefined` ko "is field ko mat chhedo" samajhta hai.
 */
const splitMedia = async (data: Record<string, unknown>) =>
  splitMediaShared(data, MEDIA_FIELDS, { field: 'personImagePath', thumbField: 'personThumb' });

/** employee ki bari images (sirf tab load hoti hain jab detail kholein) */
export const getEmployeeMedia = async (id: string): Promise<EmployeeMedia | undefined> =>
  getRecordDirect<EmployeeMedia>(MEDIA_STORE, id);

/** employee + us ki images (detail page ke liye) */
export const getEmployeeWithMedia = async (id: string): Promise<Employee | undefined> => {
  const emp = await getRecord<Employee>(STORE_NAME, id);
  if (!emp) return undefined;
  const media = await getEmployeeMedia(id);
  return { ...emp, ...(media || {}) } as Employee;
};

const STORE_NAME = 'employees';

export const generateEmployeeCode = async (): Promise<string> => {
  const employees = await getAllRecords<Employee>(STORE_NAME);
  const maxCode = employees.reduce((max, emp) => {
    const num = parseInt(emp.employeeCode.replace('QIS', ''));
    return num > max ? num : max;
  }, 0);
  return `QIS${String(maxCode + 1).padStart(4, '0')}`;
};

export const generateId = (): string => {
  return `emp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

export const createEmployee = async (employeeData: Omit<Employee, 'id' | 'employeeCode' | 'createdAt' | 'updatedAt'>): Promise<Employee> => {
  const id = generateId();
  const employeeCode = await generateEmployeeCode();
  const now = new Date().toISOString();

  // ⭐ images alag media node mein
  const { core, media, hasMedia } = await splitMedia(employeeData as unknown as Record<string, unknown>);
  const personImg = (media.personImagePath as string) || '';
  const personThumb = personImg ? await makeThumb(personImg) : '';

  const employee = {
    ...(core as object),
    personThumb,
    id,
    employeeCode,
    createdAt: now,
    updatedAt: now,
  } as unknown as Employee;

  const saved = await addRecord<Employee>(STORE_NAME, employee);
  if (hasMedia) await saveMedia(id, media);   // ⭐ targeted fields — wipe impossible
  return saved;
};

export const updateEmployee = async (id: string, updates: Partial<Employee>): Promise<Employee> => {
  const existing = await getRecord<Employee>(STORE_NAME, id);
  if (!existing) {
    throw new Error('Employee not found');
  }

  // ⭐ images alag media node mein — employee record chhota rehta hai
  const { core, media, hasMedia } = await splitMedia(updates as Record<string, unknown>);
  const personImg = media.personImagePath as string | undefined;
  const personThumb = personImg === undefined
    ? (existing as unknown as { personThumb?: string }).personThumb || ''
    : (personImg ? await makeThumb(personImg) : '');

  const updatedEmployee = {
    ...existing,
    ...(core as object),
    personThumb,
    id: existing.id,
    employeeCode: existing.employeeCode,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  } as unknown as Employee;

  const saved = await updateRecord<Employee>(STORE_NAME, updatedEmployee);
  // ⭐ FIX (CRITICAL): pehle poora media record REPLACE hota tha — agar purana
  // record load na ho pata to baqi images MIT jati thin. Ab sirf changed fields.
  if (hasMedia) await saveMedia(id, media);
  return saved;
};

export const deleteEmployee = async (id: string): Promise<void> => {
  await deleteMedia(id);
  return deleteRecord(STORE_NAME, id);
};

export const getEmployee = async (id: string): Promise<Employee | undefined> => {
  return getRecord<Employee>(STORE_NAME, id);
};

export const getEmployeeByPassport = async (passportNumber: string): Promise<Employee | undefined> => {
  return getRecordByIndex<Employee>(STORE_NAME, 'passportNumber', passportNumber);
};

export const getAllEmployees = async (): Promise<Employee[]> => {
  return getAllRecords<Employee>(STORE_NAME);
};

export const searchEmployees = async (
  query: string,
  field: 'all' | 'name' | 'passport' | 'contact' | 'nationality' | 'emirateId' = 'all'
): Promise<Employee[]> => {
  const employees = await getAllRecords<Employee>(STORE_NAME);
  const lowerQuery = query.toLowerCase();

  return employees.filter((emp) => {
    switch (field) {
      case 'name':
        return emp.fullName.toLowerCase().includes(lowerQuery) ||
               emp.arabicName.includes(query);
      case 'passport':
        return emp.passportNumber.toLowerCase().includes(lowerQuery);
      case 'contact':
        return emp.contactNumber.includes(query);
      case 'nationality':
        return emp.nationality.toLowerCase().includes(lowerQuery);
      case 'emirateId':
        return emp.emirateId?.toLowerCase().includes(lowerQuery);
      default:
        return (
          emp.fullName.toLowerCase().includes(lowerQuery) ||
          emp.arabicName.includes(query) ||
          emp.passportNumber.toLowerCase().includes(lowerQuery) ||
          emp.contactNumber.includes(query) ||
          emp.nationality.toLowerCase().includes(lowerQuery) ||
          emp.employeeCode.toLowerCase().includes(lowerQuery) ||
          (emp.emirateId && emp.emirateId.toLowerCase().includes(lowerQuery))
        );
    }
  });
};

export const checkPassportExists = async (passportNumber: string, excludeId?: string): Promise<boolean> => {
  const employee = await getRecordByIndex<Employee>(STORE_NAME, 'passportNumber', passportNumber);
  if (!employee) return false;
  if (excludeId && employee.id === excludeId) return false;
  return true;
};
