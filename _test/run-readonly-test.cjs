// ============================================
// READ ONLY test — browser mode mein koi tabdeeli nahi honi chahiye
// ============================================
global.window = { location: { protocol: 'https:', port: '', origin: 'http://localhost:3000' } };   // browser (file: nahi)
global.localStorage = { _m:new Map(), getItem(k){return this._m.get(k)??null;}, setItem(k,v){this._m.set(k,String(v));}, removeItem(k){this._m.delete(k);} };
global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0) Chrome/120 Safari/537.36' };  // NO Electron

const db = require('./svc/database/db');
const plat = require('./svc/utils/platform');
const users = require('./svc/database/userService');

let pass=0, fail=0;
const ok=(n,c,x='')=>{ if(c){pass++;console.log('  ✅ '+n+(x?'  -> '+x:''));} else {fail++;console.log('  ❌ '+n+(x?'  -> '+x:''));} };

(async () => {
  console.log('\n== 1) Platform detect ==');
  ok('browser detect hua (desktop nahi)', plat.isDesktopApp() === false);
  ok('isReadOnly = true', plat.isReadOnly() === true);
  ok('canWrite = false', plat.canWrite() === false);

  await db.startLocalMode();

  console.log('\n== 2) READ kaam karna chahiye ==');
  const emps = await db.getAllRecords('employees');
  ok('read chalta hai', Array.isArray(emps), emps.length + ' records');

  console.log('\n== 3) WRITE block hona chahiye ==');
  const t = async (label, fn) => {
    try { await fn(); ok(label + ' BLOCK hua', false, 'write ho gaya!'); }
    catch (e) { ok(label + ' BLOCK hua', /READ ONLY|allowed nahi/i.test(e.message), e.message.slice(0,60)); }
  };
  await t('addRecord', () => db.addRecord('employees', { id:'x1', fullName:'Chor' }));
  await t('updateRecord', () => db.updateRecord('employees', { id:'x1', fullName:'Chor2' }));
  await t('deleteRecord', () => db.deleteRecord('employees', 'x1'));
  await t('addRecordsBulk', () => db.addRecordsBulk('employees', [{ id:'x2' }]));
  await t('clearStore', () => db.clearStore('employees'));
  await t('importDatabase', () => db.importDatabase('{}'));

  console.log('\n== 4) Login phir bhi chale (read-only mein) ==');
  const r = await users.authenticateLocal('admin', 'admin123');
  ok('local login kamyab', r.success === true, r.success ? 'user=' + r.user.username : (r.error||''));

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('❌ CRASH:', e.message); process.exit(2); });
