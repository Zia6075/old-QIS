// ============================================
// LIVE test — asal Firebase project (ishaq-1985) ke against
// "User not found" bug ka regression test bhi isi mein hai
// ============================================
global.window = { location: { protocol: 'https:', port: '' } };
global.localStorage = { _m: new Map(), getItem(k){return this._m.get(k)??null;}, setItem(k,v){this._m.set(k,String(v));}, removeItem(k){this._m.delete(k);} };
global.navigator = { userAgent: 'node-live-test' };

const auth = require('./svc/firebase/auth');
const fb = require('./svc/database/providers/dbFirebase');

let pass = 0, fail = 0;
const ok = (n, c, x='') => { if (c) { pass++; console.log('  ✅ '+n+(x?'  -> '+x:'')); } else { fail++; console.log('  ❌ '+n+(x?'  -> '+x:'')); } };

(async () => {
  console.log('\n== 1) Firebase Auth (login-based, anonymous band) ==');
  const r = await auth.firebaseSignIn('admin', 'admin123');
  ok('admin@qis.local sign-in', r.email === 'admin@qis.local', r.email);
  const r2 = await auth.firebaseSignIn('staff', 'staff123');
  ok('staff@qis.local sign-in', r2.email === 'staff@qis.local', r2.email);
  await auth.firebaseSignIn('admin', 'admin123');

  console.log('\n== 2) RTDB access (rules + owner node) ==');
  const msg = await fb.firebaseProvider.init();
  ok('init: ' + msg, /live sync ON/.test(msg));

  const users = await fb.firebaseProvider.getAllRecords('users');
  ok('users collection mili', users.length >= 2, users.length + ' users');
  const emps = await fb.firebaseProvider.getAllRecords('employees');
  ok('employees mile', emps.length > 0, emps.length + ' employees');

  console.log('\n== 3) ⭐ "User not found" bug regression ==');
  ok('getRecordByIndex(admin)', !!(await fb.firebaseProvider.getRecordByIndex('users','username','admin')));
  fb.__setCacheForTest('users', {});   // cache jaan boojh kar khali
  ok('cache KHALI ho to bhi admin mil jaye (fresh retry)',
     !!(await fb.firebaseProvider.getRecordByIndex('users','username','admin')));
  fb.__setCacheForTest('users', {});
  const afterRetry = await fb.firebaseProvider.getAllRecords('users');
  ok('cache KHALI ho to getAllRecords bhi bhare', afterRetry.length >= 2, afterRetry.length + ' users');

  console.log('\n== 4) images cloud par hain? ==');
  const counts = await fb.pushImageDiagnostics();
  console.log('     imageStats:', JSON.stringify(counts));
  ok('imageStats likha gaya', typeof counts === 'object');

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('❌ CRASH:', e.message); process.exit(2); });
