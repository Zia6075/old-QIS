// ============================================
// OFFLINE test — Firebase down/suspend ho to bhi login chale (local users se)
// Asal LAN provider + asli userService.authenticateUser()
// ============================================
global.window = { location: { protocol: 'http:', port: '5173' } };
global.localStorage = { _m:new Map(), getItem(k){return this._m.get(k)??null;}, setItem(k,v){this._m.set(k,String(v));}, removeItem(k){this._m.delete(k);} };
// ⭐ PC application (Electron) simulate karein — warna read-only mode chalu ho jata
global.navigator = { userAgent: 'Mozilla/5.0 (Windows NT 10.0) QIS-HR/5.12 Electron/28.0.0 Chrome/120 Safari/537.36' };

const db = require('./svc/database/db');
const users = require('./svc/database/userService');

let pass=0, fail=0;
const ok=(n,c,x='')=>{ if(c){pass++;console.log('  ✅ '+n+(x?'  -> '+x:''));} else {fail++;console.log('  ❌ '+n+(x?'  -> '+x:''));} };

(async () => {
  // local users store saaf (seedha REST se — provider init se pehle)
  await fetch('http://localhost:3000/api/records/users', { method:'DELETE' });

  console.log('\n== 0) App ka asal flow: startLocalMode() (Firebase login ke baad connect hota hai) ==');
  const t0 = Date.now();
  const initMsg = await db.startLocalMode();
  console.log('   ', String(initMsg).slice(0, 100));
  ok('app 3s ke andar tayyar (koi Firebase wait nahi)', (Date.now() - t0) < 3000, (Date.now()-t0) + 'ms');
  ok('provider = lan (offline mode)', db.getActiveProvider() === 'lan', db.getActiveProvider());

  console.log('\n== 0b) write bhi hang na ho (timeout guard) ==');
  const tw = Date.now();
  await db.addRecord('users', {
    id:'usr_offline_1', username:'admin', passwordHash:'hashed_39c43b7d_8', role:'admin',
    fullName:'System Administrator', email:'admin@company.com', isActive:true,
    createdAt:new Date().toISOString(), lastLogin:'', failedAttempts:0, isLocked:false, dataOwner:'admin@qis.local',
  });
  ok('write 15s ke andar mukammal (hang nahi)', (Date.now() - tw) < 15000, (Date.now()-tw) + 'ms');

  console.log('\n== 2) LOCAL login ("admin","admin123") — Firebase ke baghair ==');
  const r = await users.authenticateLocal('admin', 'admin123');
  ok('LOGIN KAMYAB (offline mode)', r.success === true, r.success ? 'user=' + r.user.username : (r.error||''));
  ok('user record mila', !!r.user && r.user.role === 'admin');

  console.log('\n== 3) ghalat password → saaf error (hang nahi) ==');
  const bad = await users.authenticateLocal('admin', 'ghalat123');
  ok('reject hua', bad.success === false, bad.error ? bad.error.slice(0,60) : '');

  console.log('\n== 4) CLOUD login (naya project ishaq-old) ==');
  const tc = Date.now();
  const c = await users.authenticateCloud('admin@qis.local', 'admin123');
  // project theek ho to kamyab; warna saaf error (hang kabhi nahi)
  ok('kamyab ya saaf error (hang nahi)', c.success === true || !!c.error,
     c.success ? 'LOGIN OK, node=' + (c.user?.dataOwner || '') : (c.error||'').slice(0,70));
  ok('60s ke andar jawab', (Date.now() - tc) < 60000, (Date.now()-tc) + 'ms');
  ok('local login phir bhi chalta hai', (await users.authenticateLocal('admin','admin123')).success === true);

  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================\n`);
  process.exit(fail === 0 ? 0 : 1);
})().catch(e => { console.error('❌ CRASH:', e.message); process.exit(2); });
