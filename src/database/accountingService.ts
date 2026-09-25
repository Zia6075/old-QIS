// ============================================
// Accounting Service - Full Cheque & Expense System
// Queen International School
//
// ⭐ v3 — OVERDUE RULE (koi BLOCK NAHI)
// ---------------------------------------------
// Cheque ka balance khatam (0) ya negative hone par bhi expense add
// hota RAHEGA. Jo amount cheque se zyada kharch ho wo usi cheque par
// OVERDUE ke tor par jama (accumulate) hoti rehti hai aur har jagah
// dikhti hai. Sirf CANCELLED cheque par expense add nahi hota.
// ============================================

import { addRecord, updateRecord, deleteRecord, getAllRecords, getRecord, addRecordsBulk } from './db';
import { getMedia, saveMedia, deleteMedia, splitMedia } from './mediaService';

export type ChequeStatus = 'active' | 'exhausted' | 'overdue' | 'cancelled';

export interface Cheque {
  id: string;
  companyName: string;
  chequeNumber: string;
  chequeAmount: number;
  remainingBalance: number;
  chequeDate: string;
  bankName: string;
  notes: string;
  chequeImage: string;
  /** ⭐ chhota thumb (list ke liye) — bari image `media/{id}` mein */
  chequeThumb?: string;
  status: ChequeStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Expense {
  id: string;
  chequeId: string;
  amount: number;
  category: string;
  description: string;
  receiptImage: string;
  /** ⭐ chhota thumb — bari receipt `media/{id}` mein */
  receiptThumb?: string;
  expenseDate: string;
  vendorName: string;
  referenceNo: string;
  createdAt: string;
  updatedAt: string;
}

export const EXPENSE_CATEGORIES = [
  'Rent', 'Utilities', 'Salaries & Wages', 'Office Supplies', 'Maintenance & Repairs',
  'Transportation', 'Food & Beverages', 'Printing & Stationery', 'Communication & Internet',
  'Insurance', 'Medical & Health', 'Events & Activities', 'Furniture & Fixtures', 'Equipment & Tools',
  'Cleaning & Janitorial', 'Security Services', 'IT & Software', 'Marketing & Advertising',
  'Training & Development', 'Legal & Professional', 'Bank Charges', 'Government Fees',
  'Petty Cash', 'Miscellaneous', 'Other'
];

const CHEQUE_STORE = 'cheques';
const EXPENSE_STORE = 'expenses';

const genId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
/**
 * ⭐ SAFETY GUARD — updateRecord poora record REPLACE karta hai. Agar galti se
 * adhoora object chala jaye to baqi fields wipe ho jate hain (yeh bug hua tha:
 * cheques/expenses mein sirf image reh gayi thi). Is liye zaroori fields check.
 */
const assertComplete = (rec: Record<string, unknown>, required: string[], what: string): void => {
  const missing = required.filter(f => rec[f] === undefined || rec[f] === null);
  if (missing.length) {
    throw new Error(`${what} save nahi hua — zaroori fields gayab: ${missing.join(', ')} (data protect karne ke liye rok diya)`);
  }
};

const money = (n: number) => `AED ${(Number(n) || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

// ============ OVERDUE HELPERS (v3) ============

// Kitna kharch ho chuka hai (kisi ek expense ko chhor kar)
export const sumExpenses = (expenses: Expense[], excludeId?: string): number =>
  round2(expenses.filter(e => !excludeId || e.id !== excludeId).reduce((s, e) => s + (Number(e.amount) || 0), 0));

// Balance se status nikalna — sirf dikhane ke liye, kisi ko block nahi karta.
// ⭐ v4: balance 0 wala cheque bhi 'active' hi rehta hai (locked nahi).
//        'exhausted' sirf purane (v1/v2) records mein milta hai — unlockAllCheques() usay theek kar deta hai.
export const statusForBalance = (remainingBalance: number, keepCancelled = false, current?: ChequeStatus): ChequeStatus => {
  if (keepCancelled && current === 'cancelled') return 'cancelled';
  const r = round2(remainingBalance);
  if (r < 0) return 'overdue'; // balance negative => OVERDUE (jama hota rahega, block nahi)
  return 'active';             // balance 0 ya zyada => active
};

// Cheque kitna overdue hai (0 = koi overdue nahi) — yeh amount jama hoti rehti hai
export const getOverdueAmount = (cheque: Pick<Cheque, 'remainingBalance'>): number => {
  const r = round2(cheque.remainingBalance);
  return r < 0 ? Math.abs(r) : 0;
};

// Kitna kharch ho chuka
export const getSpentAmount = (cheque: Pick<Cheque, 'chequeAmount' | 'remainingBalance'>): number =>
  round2((Number(cheque.chequeAmount) || 0) - (Number(cheque.remainingBalance) || 0));

// ⭐ v3 — expense har haal mein add ho sakta hai, sirf CANCELLED cheque par nahi
export const canAddExpense = (cheque: Pick<Cheque, 'remainingBalance' | 'status'>): boolean =>
  cheque.status !== 'cancelled';

// Information ke liye note (block nahi)
export const overdueNote = (cheque: Pick<Cheque, 'chequeNumber' | 'remainingBalance' | 'status'>): string => {
  const over = getOverdueAmount(cheque);
  if (over > 0) return `Cheque ${cheque.chequeNumber} par ${money(over)} OVERDUE jama hai (kharcha cheque amount se zyada). Aur expense add ho sakte hain — overdue barhti rahegi.`;
  if (round2(cheque.remainingBalance) === 0) return `Cheque ${cheque.chequeNumber} ka balance khatam hai — aage ka kharcha OVERDUE mein jama hoga.`;
  return '';
};

// ============ CHEQUE CRUD ============

export const createCheque = async (data: { companyName: string; chequeNumber: string; chequeAmount: number; chequeDate: string; bankName: string; notes: string; chequeImage?: string }): Promise<Cheque> => {
  if (!data.companyName) throw new Error('Company name is required');
  if (!data.chequeNumber) throw new Error('Cheque number is required');
  if (!data.chequeAmount || data.chequeAmount <= 0) throw new Error('Cheque amount must be greater than 0');
  if (!data.chequeDate) throw new Error('Cheque date is required');

  // ⭐ bari image media node mein, record mein sirf chhota thumb
  const id = genId('chq');
  const { core, media, hasMedia } = await splitMedia(
    { ...data, chequeImage: data.chequeImage || '' } as unknown as Record<string, unknown>,
    ['chequeImage'],
    { field: 'chequeImage', thumbField: 'chequeThumb' }
  );
  const cheque = {
    ...(core as object),
    id,
    chequeAmount: data.chequeAmount,
    remainingBalance: data.chequeAmount,
    status: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Cheque;
  assertComplete(cheque as unknown as Record<string, unknown>,
    ['id', 'chequeNumber', 'chequeAmount', 'companyName', 'chequeDate'], 'Cheque');
  const saved = await addRecord<Cheque>(CHEQUE_STORE, cheque);
  if (hasMedia) await saveMedia(id, media);
  return saved;
};

export const getCheque = async (id: string): Promise<Cheque | undefined> => getRecord<Cheque>(CHEQUE_STORE, id);
export const getAllCheques = async (): Promise<Cheque[]> => getAllRecords<Cheque>(CHEQUE_STORE);

export const updateChequeInfo = async (id: string, data: Partial<Cheque>): Promise<Cheque> => {
  const existing = await getRecord<Cheque>(CHEQUE_STORE, id);
  if (!existing) throw new Error('Cheque not found');

  const nextAmount = data.chequeAmount !== undefined ? Number(data.chequeAmount) || 0 : existing.chequeAmount;
  if (data.chequeAmount !== undefined && nextAmount <= 0) throw new Error('Cheque amount must be greater than 0');

  // Spent hamesha asli expenses se nikalte hain (purane/inconsistent balance par bharosa nahi).
  // Amount kam karne par balance negative ho sakta hai — wo OVERDUE ke tor par jama rahega.
  const spent = sumExpenses(await getExpensesByCheque(id));
  const remaining = round2(nextAmount - spent);

  // ⭐ image field aaya ho to media node mein bhejo
  const { core, media, hasMedia } = await splitMedia(
    data as Record<string, unknown>,
    ['chequeImage'],
    { field: 'chequeImage', thumbField: 'chequeThumb' }
  );
  const updated = {
    ...existing,
    ...(core as object),
    chequeThumb: (core.chequeThumb as string) ?? existing.chequeThumb ?? '',
    id: existing.id,
    chequeAmount: nextAmount,
    remainingBalance: remaining,
    status: statusForBalance(remaining, true, data.status ?? existing.status),
    updatedAt: new Date().toISOString(),
  } as unknown as Cheque;
  assertComplete(updated as unknown as Record<string, unknown>,
    ['id', 'chequeNumber', 'chequeAmount', 'companyName'], 'Cheque update');
  const saved = await updateRecord<Cheque>(CHEQUE_STORE, updated);
  if (hasMedia) await saveMedia(existing.id, media);
  return saved;
};

export const deleteCheque = async (id: string): Promise<void> => {
  const expenses = await getExpensesByCheque(id);
  for (const exp of expenses) { await deleteMedia(exp.id); await deleteRecord(EXPENSE_STORE, exp.id); }
  await deleteMedia(id);
  return deleteRecord(CHEQUE_STORE, id);
};

/** ⭐ cheque + us ki bari image (detail ke liye) */
export const getChequeWithImage = async (id: string): Promise<Cheque | undefined> => {
  const c = await getRecord<Cheque>(CHEQUE_STORE, id);
  if (!c) return undefined;
  const m = await getMedia(id);
  return { ...c, ...(m || {}) } as Cheque;
};

// Balance + status dobara nikalna (overdue amount yahan jama hoti hai)
const recalcBalance = async (chequeId: string): Promise<Cheque> => {
  const cheque = await getRecord<Cheque>(CHEQUE_STORE, chequeId);
  if (!cheque) throw new Error('Cheque not found');
  const expenses = await getExpensesByCheque(chequeId);
  const totalSpent = sumExpenses(expenses);
  const remaining = round2(cheque.chequeAmount - totalSpent);
  const updated: Cheque = {
    ...cheque,
    remainingBalance: remaining,
    status: statusForBalance(remaining, true, cheque.status),
    updatedAt: new Date().toISOString(),
  };
  return updateRecord<Cheque>(CHEQUE_STORE, updated);
};

// Purane database (v1/v2) ke cheques ka status naye rule ke mutabiq theek karna.
// Sirf tab likhta hai jab status galat ho — warna koi extra request nahi.
export const syncChequeStatuses = async (cheques?: Cheque[]): Promise<number> => {
  const all = cheques ?? await getAllCheques();
  let fixed = 0;
  for (const c of all) {
    const expected = statusForBalance(c.remainingBalance, true, c.status);
    if (c.status !== expected) {
      await updateRecord<Cheque>(CHEQUE_STORE, { ...c, status: expected, updatedAt: new Date().toISOString() });
      fixed++;
    }
  }
  return fixed;
};

// ⭐ v4 — PURANA DATA UNLOCK
// v2 mein balance 0/negative wale cheques 'exhausted'/'overdue' par LOCK ho jate the.
// Ab koi lock nahi: yeh function app khulte hi chal kar har purane cheque ko khud
// unlock kar deta hai (balance aur overdue amount waise hi rehte hain).
// Sirf 'cancelled' cheque waisa hi rehta hai.
export const unlockAllCheques = async (cheques?: Cheque[]): Promise<number> => {
  const all = cheques ?? await getAllCheques();
  // ⭐ FIX #9: pehle har cheque par alag write (N round trips, startup par).
  // Ab ek hi bulk write — sirf jo cheques galat status par hain.
  const now = new Date().toISOString();
  const toFix = all
    .map(c => ({ c, expected: statusForBalance(c.remainingBalance, true, c.status) }))
    .filter(({ c, expected }) => c.status !== expected)
    .map(({ c, expected }) => ({ ...c, status: expected, updatedAt: now }));
  if (toFix.length === 0) return 0;
  await addRecordsBulk<Cheque>(CHEQUE_STORE, toFix);
  return toFix.length;
};

// ============ EXPENSE CRUD ============

export const createExpense = async (data: { chequeId: string; amount: number; category: string; description: string; receiptImage: string; expenseDate: string; vendorName: string; referenceNo: string }): Promise<Expense> => {
  if (!data.chequeId) throw new Error('Please select a cheque');
  if (!data.amount || data.amount <= 0) throw new Error('Amount must be greater than 0');
  if (!data.category) throw new Error('Category is required');
  if (!data.expenseDate) throw new Error('Expense date is required');

  const cheque = await getRecord<Cheque>(CHEQUE_STORE, data.chequeId);
  if (!cheque) throw new Error('Cheque not found');
  if (cheque.status === 'cancelled') throw new Error(`Cheque ${cheque.chequeNumber} cancelled hai — expense add nahi ho sakta.`);

  // ⭐ v3 — koi block nahi: balance 0/negative hone par bhi expense add hoga,
  //        extra amount isi cheque par OVERDUE ke tor par jama hogi.

  // ⭐ bari receipt media node mein, record mein chhota thumb
  const id = genId('exp');
  const { core, media, hasMedia } = await splitMedia(
    { ...data, receiptImage: data.receiptImage || '' } as unknown as Record<string, unknown>,
    ['receiptImage'],
    { field: 'receiptImage', thumbField: 'receiptThumb' }
  );
  const expense = {
    ...(core as object),
    id,
    chequeId: data.chequeId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  } as unknown as Expense;
  assertComplete(expense as unknown as Record<string, unknown>,
    ['id', 'chequeId', 'amount', 'category', 'expenseDate'], 'Expense');
  await addRecord<Expense>(EXPENSE_STORE, expense);
  if (hasMedia) await saveMedia(id, media);
  await recalcBalance(data.chequeId);
  return expense;
};

export const updateExpense = async (id: string, data: Partial<Expense>): Promise<Expense> => {
  const existing = await getRecord<Expense>(EXPENSE_STORE, id);
  if (!existing) throw new Error('Expense not found');

  const nextAmount = data.amount !== undefined ? Number(data.amount) || 0 : existing.amount;
  if (data.amount !== undefined && nextAmount <= 0) throw new Error('Amount must be greater than 0');

  // ⭐ v3 — amount barhana bhi allowed (overdue jama hoti rahegi)

  const { core, media, hasMedia } = await splitMedia(
    data as Record<string, unknown>,
    ['receiptImage'],
    { field: 'receiptImage', thumbField: 'receiptThumb' }
  );
  const updated = {
    ...existing,
    ...(core as object),
    receiptThumb: (core.receiptThumb as string) ?? existing.receiptThumb ?? '',
    amount: nextAmount,
    id: existing.id,
    chequeId: existing.chequeId,
    updatedAt: new Date().toISOString(),
  } as unknown as Expense;
  assertComplete(updated as unknown as Record<string, unknown>,
    ['id', 'chequeId', 'amount', 'category'], 'Expense update');
  await updateRecord<Expense>(EXPENSE_STORE, updated);
  if (hasMedia) await saveMedia(existing.id, media);
  await recalcBalance(existing.chequeId);
  return updated;
};

export const deleteExpense = async (id: string): Promise<void> => {
  const expense = await getRecord<Expense>(EXPENSE_STORE, id);
  if (!expense) throw new Error('Expense not found');
  await deleteMedia(id);
  await deleteRecord(EXPENSE_STORE, id);
  await recalcBalance(expense.chequeId);
};

export const getExpensesByCheque = async (chequeId: string): Promise<Expense[]> => {
  const all = await getAllRecords<Expense>(EXPENSE_STORE);
  return all.filter(e => e.chequeId === chequeId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

export const getAllExpenses = async (): Promise<Expense[]> => getAllRecords<Expense>(EXPENSE_STORE);

/** ⭐ expense + us ki bari receipt image (detail ke liye) */
export const getExpenseWithImage = async (id: string): Promise<Expense | undefined> => {
  const x = await getRecord<Expense>(EXPENSE_STORE, id);
  if (!x) return undefined;
  const m = await getMedia(id);
  return { ...x, ...(m || {}) } as Expense;
};

// ============ DASHBOARD & REPORTS ============

export const getAccountingStats = async () => {
  const cheques = await getAllCheques();
  const expenses = await getAllExpenses();

  const activeCheques = cheques.filter(c => c.status !== 'cancelled');
  const totalReceived = activeCheques.reduce((s, c) => s + c.chequeAmount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalRemaining = totalReceived - totalExpenses;

  // ⭐ Overdue (negative balance) — yeh amount jama hoti rehti hai
  const overdueCheques = activeCheques.filter(c => round2(c.remainingBalance) < 0);
  const totalOverdue = round2(overdueCheques.reduce((s, c) => s + getOverdueAmount(c), 0));

  // Category breakdown
  const categoryBreakdown: Record<string, number> = {};
  expenses.forEach(e => { categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount; });

  // Monthly expenses
  const monthlyExpenses: Record<string, number> = {};
  expenses.forEach(e => {
    const m = e.expenseDate?.substring(0, 7) || 'Unknown';
    monthlyExpenses[m] = (monthlyExpenses[m] || 0) + e.amount;
  });

  // Recent expenses (last 10)
  const recentExpenses = expenses.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 10);

  return {
    totalReceived,
    totalExpenses,
    totalRemaining,
    totalOverdue,
    overdueCount: overdueCheques.length,
    totalCheques: cheques.length,
    activeCheques: activeCheques.filter(c => round2(c.remainingBalance) > 0).length,
    exhaustedCheques: activeCheques.filter(c => round2(c.remainingBalance) === 0).length, // balance 0 (lock nahi)
    overdueCheques: overdueCheques.length,
    cancelledCheques: cheques.filter(c => c.status === 'cancelled').length,
    categoryBreakdown,
    monthlyExpenses,
    recentExpenses,
    cheques,
  };
};

// Cheque-wise report
export const getChequeReport = async (chequeId: string) => {
  const cheque = await getRecord<Cheque>(CHEQUE_STORE, chequeId);
  if (!cheque) throw new Error('Cheque not found');
  const expenses = await getExpensesByCheque(chequeId);
  const categoryBreakdown: Record<string, number> = {};
  expenses.forEach(e => { categoryBreakdown[e.category] = (categoryBreakdown[e.category] || 0) + e.amount; });
  return { cheque, expenses, categoryBreakdown, overdueAmount: getOverdueAmount(cheque), spent: getSpentAmount(cheque) };
};

// Date range report
export const getExpensesByDateRange = async (startDate: string, endDate: string): Promise<Expense[]> => {
  const all = await getAllExpenses();
  return all.filter(e => e.expenseDate >= startDate && e.expenseDate <= endDate).sort((a, b) => new Date(a.expenseDate).getTime() - new Date(b.expenseDate).getTime());
};

// Category report
export const getExpensesByCategory = async (category: string): Promise<Expense[]> => {
  const all = await getAllExpenses();
  return all.filter(e => e.category === category).sort((a, b) => new Date(b.expenseDate).getTime() - new Date(a.expenseDate).getTime());
};
