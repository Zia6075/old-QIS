// ============================================
// PERF test — round trips kitne kam hue (asli HTTP count)
// LAN provider + asli Express backend, global fetch wrap kar ke ginti
// ============================================
global.window = { location: { protocol: 'http:', port: '5173' } };
global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0) QIS-HR Electron/28.0.0 Chrome/120 Safari/537.36' };  // PC app (write allowed)
const db = require('./svc/database/db');
db.setActiveProvider('lan');

let calls = 0;
const realFetch = global.fetch;
const log = [];
global.fetch = (...a) => { calls++; log.push(String(a[0]).replace('http://localhost:3000','')); return realFetch(...a); };
const reset = () => { calls = 0; };

(async () => {
  await fetch('http://localhost:3000/api/records/employees', { method: 'DELETE' });
  await fetch('http://localhost:3000/api/records/cheques', { method: 'DELETE' });

  console.log('\n== FIX #5: 77 employees seed karna ==');
  const recs = Array.from({ length: 77 }, (_, i) => ({
    id: 'emp_perf_' + i, employeeCode: 'QIS' + String(i + 1).padStart(4, '0'),
    fullName: 'TEST ' + i, title: 'Teacher', nationality: 'Indian', contactNumber: '',
    emirateId: '', passportNumber: 'P' + i, passportIssueDate: '', passportExpiryDate: '',
    visaExpiryDate: '', labourExpiry: '', rtaExpiry: '', joiningDate: '', sponsor: 'QIS',
    licenceNo: '', personImagePath: '', passportImagePath: '', visaImagePath: '',
    labourCardImagePath: '', basicSalary: 1000, otherAllowance: 500, totalSalary: 1500,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }));
  const t0 = Date.now();
  reset();
  const n = await db.addRecordsBulk('employees', recs);
  console.log(`  ✅ ${n} records, HTTP calls = ${calls}, time = ${Date.now() - t0}ms`);
  console.log(`     (pehle: 77 x (1 read + 1 write) = ~154 calls)`);

  console.log('\n== cache: pehla read 1 call, baqi 0 ==');
  reset();
  const all = await db.getAllRecords('employees');
  const afterFirst = calls;
  await db.getRecord('employees', 'emp_perf_10');
  await db.getAllRecords('employees');
  await db.getRecord('employees', 'emp_perf_76');
  // employees ka cache bulk se pehle hi warm hai → 0 calls expected
  const zeroExtra = (calls - afterFirst) === 0 && afterFirst === 0;
  console.log(`  ${zeroExtra ? '✅' : '❌'} warm store ke 4 reads = ${afterFirst + (calls - afterFirst)} calls (0 hone chahiye), records = ${all.length}`);
  if (!zeroExtra) console.log('  calls: ' + JSON.stringify(log.slice(-4)));

  console.log('\n== FIX #13 regression: bulk dobara chalane par DUPLICATE na bane ==');
  reset();
  await db.addRecordsBulk('employees', recs.slice(0, 10).map(r => ({ ...r, fullName: r.fullName + ' (edited)' })));
  const all2 = await db.getAllRecords('employees', true);
  const dupes = all2.length - new Set(all2.map(r => r.id)).size;
  const edited = all2.find(r => r.id === 'emp_perf_0');
  console.log(`  ${all2.length === 77 && dupes === 0 ? '✅' : '❌'} total = ${all2.length} (77 hona chahiye), duplicates = ${dupes}, edit lagi = ${edited ? edited.fullName.includes('(edited)') : false}`);

  console.log('\n== FIX #9: unlockAllCheques bulk ==');
  const svc = require('./svc/database/accountingService');
  const c1 = await svc.createCheque({ companyName: 'A', chequeNumber: 'PERF-1', chequeAmount: 100, chequeDate: '2026-08-01', bankName: 'B', notes: '' });
  const c2 = await svc.createCheque({ companyName: 'B', chequeNumber: 'PERF-2', chequeAmount: 100, chequeDate: '2026-08-01', bankName: 'B', notes: '' });
  // dono ko purane (v2) locked status par daalo
  for (const id of [c1.id, c2.id]) {
    await fetch('http://localhost:3000/api/records/cheques/' + id, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...(await (await fetch('http://localhost:3000/api/records/cheques/' + id)).json()), status: 'exhausted', remainingBalance: 0 }),
    });
  }
  await db.refreshAllStores();   // FIX #14: baahar se kiya gaya write uthao
  reset();
  const fixed = await svc.unlockAllCheques();
  console.log(`  ✅ ${fixed} cheques unlock, HTTP calls = ${calls}  (pehle: 1 read + ${fixed} writes = ${1 + fixed})`);

  console.log('\n================ PERF DONE ================\n');
  process.exit(0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
