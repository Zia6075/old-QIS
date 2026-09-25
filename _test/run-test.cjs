// ============================================
// v3 OVERDUE rule test — "block NAHI, overdue jama hoti rahe"
// Real electron/server.js backend + compiled src/database/accountingService.ts
// ============================================
// db.ts browser ke liye likha hai -> Node mein sirf `window.location` shim (baqi code bilkul asli hai)
global.window = { location: { protocol: 'http:', port: '5173' } };
global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0) QIS-HR Electron/28.0.0 Chrome/120 Safari/537.36' };  // PC app (write allowed)
const svc = require('./svc/database/accountingService');
// Yeh test purane LAN server ke against chalta hai (Firebase RTDB abhi bani nahi)
require('./svc/database/db').setActiveProvider('lan');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  -> ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  -> ' + extra : '')); }
};
const errOf = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  const r = await fetch('http://localhost:3000/api/ping').then(x => x.json());
  ok('server /api/ping', r.success === true, JSON.stringify(r));

  await fetch('http://localhost:3000/api/records/cheques', { method: 'DELETE' });
  await fetch('http://localhost:3000/api/records/expenses', { method: 'DELETE' });

  console.log('\n== 1. Cheque AED 1000 ==');
  const chq = await svc.createCheque({ companyName: 'Al Noor Trading', chequeNumber: 'CHQ-TEST-1', chequeAmount: 1000, chequeDate: '2026-08-01', bankName: 'ENBD', notes: '' });
  ok('balance 1000, status active', chq.remainingBalance === 1000 && chq.status === 'active');

  console.log('\n== 2. Expense 800 -> balance 200 ==');
  const e1 = await svc.createExpense({ chequeId: chq.id, amount: 800, category: 'Rent', description: 'August rent', receiptImage: '', expenseDate: '2026-08-05', vendorName: 'Landlord', referenceNo: 'R-1' });
  let c = await svc.getCheque(chq.id);
  ok('balance 200', !!e1.id && c.remainingBalance === 200, `bal=${c.remainingBalance}`);

  console.log('\n== 3. Expense 500 (sirf 200 available) -> ⭐ ADD HONA CHAHIYE, overdue 300 ==');
  const e2 = await svc.createExpense({ chequeId: chq.id, amount: 500, category: 'Utilities', description: 'DEWA', receiptImage: '', expenseDate: '2026-08-06', vendorName: 'DEWA', referenceNo: 'U-1' });
  c = await svc.getCheque(chq.id);
  ok('expense save hua (block nahi hua)', !!e2.id && e2.amount === 500);
  ok('balance -300, status overdue', c.remainingBalance === -300 && c.status === 'overdue', `bal=${c.remainingBalance} status=${c.status}`);
  ok('getOverdueAmount = 300', svc.getOverdueAmount(c) === 300);

  console.log('\n== 4. Balance 0 wale cheque par bhi add ho ==');
  const chq2 = await svc.createCheque({ companyName: 'Zero Co', chequeNumber: 'CHQ-ZERO-1', chequeAmount: 100, chequeDate: '2026-08-02', bankName: 'ADCB', notes: '' });
  await svc.createExpense({ chequeId: chq2.id, amount: 100, category: 'Petty Cash', description: 'cash', receiptImage: '', expenseDate: '2026-08-03', vendorName: 'Shop', referenceNo: 'P-1' });
  let z = await svc.getCheque(chq2.id);
  ok('balance 0 => status active (⭐ v4: lock nahi)', z.remainingBalance === 0 && z.status === 'active', `status=${z.status}`);
  const e3 = await svc.createExpense({ chequeId: chq2.id, amount: 100, category: 'Other', description: 'tea', receiptImage: '', expenseDate: '2026-08-04', vendorName: 'Cafe', referenceNo: 'T-1' });
  z = await svc.getCheque(chq2.id);
  ok('balance 0 par bhi expense add hua', !!e3.id, `id=${e3.id}`);
  ok('balance -100, status overdue', z.remainingBalance === -100 && z.status === 'overdue', `bal=${z.remainingBalance} status=${z.status}`);

  console.log('\n== 5. Overdue cheque par aur expense -> overdue JAMA hoti rahe ==');
  await svc.createExpense({ chequeId: chq.id, amount: 250, category: 'Maintenance & Repairs', description: 'AC repair', receiptImage: '', expenseDate: '2026-08-09', vendorName: 'Tech', referenceNo: 'M-1' });
  c = await svc.getCheque(chq.id);
  ok('overdue 300 + 250 = 550 jama', c.remainingBalance === -550 && svc.getOverdueAmount(c) === 550, `overdue=${svc.getOverdueAmount(c)}`);

  console.log('\n== 6. Expense ka amount barhana bhi allowed ==');
  await svc.updateExpense(e2.id, { amount: 700 });
  c = await svc.getCheque(chq.id);
  ok('edit allowed, overdue 750', c.remainingBalance === -750, `bal=${c.remainingBalance}`);

  console.log('\n== 7. Stats: totalOverdue = 750 + 100 = 850, 2 cheques ==');
  let st = await svc.getAccountingStats();
  ok('totalOverdue 850, overdueCount 2', st.totalOverdue === 850 && st.overdueCount === 2, `overdue=${st.totalOverdue} count=${st.overdueCount}`);

  console.log('\n== 8. Purana (v1) data: negative balance + status "active" -> sync se theek ==');
  const legacy = await svc.createCheque({ companyName: 'Legacy Co', chequeNumber: 'CHQ-OLD-1', chequeAmount: 500, chequeDate: '2026-06-01', bankName: 'ADCB', notes: '' });
  // v1 (purana) record: 750 ka expense hai, balance -250 magar status abhi bhi "active"
  await fetch('http://localhost:3000/api/records/expenses', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'exp_legacy_v1', chequeId: legacy.id, amount: 750, category: 'Rent', description: 'old rent',
      receiptImage: '', expenseDate: '2026-06-05', vendorName: 'Old', referenceNo: 'L-1',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  });
  await fetch('http://localhost:3000/api/records/cheques/' + legacy.id, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...legacy, remainingBalance: -250, status: 'active' }),
  });
  await require('./svc/database/db').refreshAllStores(); // FIX #14: baahar ka write uthao
  const fixed = await svc.syncChequeStatuses();
  const lc = await svc.getCheque(legacy.id);
  ok('syncChequeStatuses ne status theek kiya', fixed >= 1 && lc.status === 'overdue', `fixed=${fixed} status=${lc.status}`);
  const lExp = await svc.createExpense({ chequeId: legacy.id, amount: 50, category: 'Other', description: 'misc', receiptImage: '', expenseDate: '2026-08-11', vendorName: '', referenceNo: '' });
  ok('purane overdue cheque par bhi expense add hua', !!lExp.id, `id=${lExp.id}`);

  console.log('\n== 9. Sirf CANCELLED cheque block ho ==');
  await svc.updateChequeInfo(chq2.id, { status: 'cancelled' });
  const err1 = await errOf(() => svc.createExpense({ chequeId: chq2.id, amount: 5, category: 'Other', description: 'x', receiptImage: '', expenseDate: '2026-08-12', vendorName: '', referenceNo: '' }));
  ok('cancelled cheque par expense BLOCKED', !!err1, err1 ? err1.slice(0, 70) + '…' : 'no error!');
  ok('canAddExpense(cancelled) = false', svc.canAddExpense(await svc.getCheque(chq2.id)) === false);
  ok('canAddExpense(overdue) = true', svc.canAddExpense(await svc.getCheque(chq.id)) === true);

  console.log('\n== 10. Cheque amount kam karne par bhi overdue jama (block nahi) ==');
  await svc.updateChequeInfo(chq.id, { chequeAmount: 500 });
  c = await svc.getCheque(chq.id);
  ok('amount 1000 -> 500, balance -1250', c.remainingBalance === -1250 && c.status === 'overdue', `bal=${c.remainingBalance} status=${c.status}`);

  console.log('\n== 11. Expense delete karne par overdue kam ho jaye ==');
  await svc.deleteExpense(e2.id);
  c = await svc.getCheque(chq.id);
  ok('700 delete -> balance -550', c.remainingBalance === -550, `bal=${c.remainingBalance}`);

  console.log('\n== 12. ⭐ PURANA (v2) LOCKED DATA -> unlockAllCheques() ==');
  // v2 wale locked records seedha DB mein daalo
  const mk = (id, no, amt, rem, status) => fetch('http://localhost:3000/api/records/cheques', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, companyName: 'Old Co', chequeNumber: no, chequeAmount: amt, remainingBalance: rem,
      chequeDate: '2026-05-01', bankName: 'Old Bank', notes: '', chequeImage: '', status,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  });
  const mkExp = (id, chqId, amt) => fetch('http://localhost:3000/api/records/expenses', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, chequeId: chqId, amount: amt, category: 'Rent', description: 'purana kharcha',
      receiptImage: '', expenseDate: '2026-05-10', vendorName: 'Old', referenceNo: id,
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }),
  });
  await mk('chq_old_locked_1', 'CHQ-OLD-LOCK-1', 500, 0, 'exhausted');   // v2: balance 0 => locked
  await mkExp('exp_old_lock_1', 'chq_old_locked_1', 500);                // 500 kharch ho chuka
  await mk('chq_old_locked_2', 'CHQ-OLD-LOCK-2', 500, -200, 'overdue');  // v2: negative => locked
  await mkExp('exp_old_lock_2', 'chq_old_locked_2', 700);                // 700 kharch => 200 overdue
  await mk('chq_old_cancel_1', 'CHQ-OLD-CANCEL', 500, 500, 'cancelled'); // cancelled => waisa hi rahe
  await require('./svc/database/db').refreshAllStores(); // FIX #14

  const n = await svc.unlockAllCheques();
  const l1 = await svc.getCheque('chq_old_locked_1');
  const l2 = await svc.getCheque('chq_old_locked_2');
  const l3 = await svc.getCheque('chq_old_cancel_1');
  ok('unlockAllCheques ne purana "exhausted" record theek kiya', n >= 1, `unlocked=${n}`);
  ok('purana "exhausted" (bal 0) -> ACTIVE', l1.status === 'active', `status=${l1.status}`);
  ok('purana "overdue" (bal -200) -> OVERDUE (khula, lock nahi)', l2.status === 'overdue' && svc.canAddExpense(l2) === true, `status=${l2.status}`);
  ok('cancelled cheque waisa hi raha', l3.status === 'cancelled' && svc.canAddExpense(l3) === false, `status=${l3.status}`);

  const u1 = await svc.createExpense({ chequeId: 'chq_old_locked_1', amount: 150, category: 'Rent', description: 'old cheque rent', receiptImage: '', expenseDate: '2026-08-20', vendorName: 'V', referenceNo: 'O-1' });
  const r1 = await svc.getCheque('chq_old_locked_1');
  ok('purane locked cheque par ab expense add ho gaya (overdue 150)', !!u1.id && r1.remainingBalance === -150 && r1.status === 'overdue', `bal=${r1.remainingBalance} status=${r1.status}`);
  const u2 = await svc.createExpense({ chequeId: 'chq_old_locked_2', amount: 50, category: 'Other', description: 'misc', receiptImage: '', expenseDate: '2026-08-21', vendorName: 'V', referenceNo: 'O-2' });
  ok('purane overdue cheque par bhi add hua (overdue jama)', !!u2.id, `id=${u2.id}`);

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('TEST CRASH:', e); process.exit(2); });
