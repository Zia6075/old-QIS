// ⭐ Sabit karein: ek image save karne se baqi images WIPE nahi hoti
global.window={location:{protocol:'file:',port:''}};
global.localStorage={_m:new Map(),getItem(k){return this._m.get(k)??null;},setItem(k,v){this._m.set(k,String(v));},removeItem(k){this._m.delete(k);}};
global.navigator={userAgent:'Mozilla/5.0 QIS-HR Electron/28.0.0 Chrome/120 Safari/537.36'};
const db=require('./svc/database/db'); const auth=require('./svc/firebase/auth'); const emp=require('./svc/database/employeeService');
const img=(n)=>'data:image/jpeg;base64,'+Buffer.alloc(n,65).toString('base64');
let pass=0,fail=0; const ok=(n,c,x='')=>{ if(c){pass++;console.log('  ✅ '+n+(x?' -> '+x:''));}else{fail++;console.log('  ❌ '+n+(x?' -> '+x:''));} };
(async()=>{
  await auth.firebaseSignIn('admin@qis.local','admin123'); await db.connectFirebase();
  const all=await emp.getAllEmployees(); const t=all[0];
  console.log('target:', t.fullName);
  await emp.updateEmployee(t.id,{passportImagePath:img(2000),visaImagePath:img(2000),labourCardImagePath:img(2000)});
  let m=await emp.getEmployeeMedia(t.id);
  ok('3 images save huin', !!(m.passportImagePath&&m.visaImagePath&&m.labourCardImagePath));
  // ab SIRF person photo save karein — baqi 3 WIPE nahi honi chahiye
  await emp.updateEmployee(t.id,{personImagePath:img(2000)});
  m=await emp.getEmployeeMedia(t.id);
  ok('person photo save hui', !!m.personImagePath);
  ok('passport WIPE nahi hui', !!m.passportImagePath);
  ok('visa WIPE nahi hui', !!m.visaImagePath);
  ok('labour WIPE nahi hui', !!m.labourCardImagePath);
  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  process.exit(fail===0?0:1);
})().catch(e=>{console.error('ERR',e.message);process.exit(1);});
