global.window={location:{protocol:'file:',port:''}};
global.localStorage={_m:new Map(),getItem(k){return this._m.get(k)??null;},setItem(k,v){this._m.set(k,String(v));},removeItem(k){this._m.delete(k);}};
global.navigator={userAgent:'Mozilla/5.0 QIS-HR Electron/28.0.0 Chrome/120 Safari/537.36'};
const db=require('./svc/database/db'); const auth=require('./svc/firebase/auth'); const emp=require('./svc/database/employeeService');
const img=(n)=>'data:image/jpeg;base64,'+Buffer.alloc(n,65).toString('base64');
let pass=0,fail=0; const ok=(n,c,x='')=>{ if(c){pass++;console.log('  ✅ '+n+(x?' -> '+x:''));}else{fail++;console.log('  ❌ '+n+(x?' -> '+x:''));} };
const has=(m,f)=>!!(m&&typeof m[f]==='string'&&m[f].startsWith('data:image'));
(async()=>{
  await auth.firebaseSignIn('admin@qis.local','admin123'); await db.connectFirebase();
  // temp employee (asli data safe)
  const t = await emp.createEmployee({fullName:'ZZ TEST UPLOAD',arabicName:'',title:'Teacher',nationality:'Indian',
    contactNumber:'',emirateId:'',passportNumber:'ZZTEST'+Date.now(),passportIssueDate:'',passportExpiryDate:'',
    visaExpiryDate:'',labourExpiry:'',rtaExpiry:'',joiningDate:'',sponsor:'Test',licenceNo:'',
    personImagePath:'',passportImagePath:'',visaImagePath:'',labourCardImagePath:'',
    basicSalary:1000,otherAllowance:0,totalSalary:1000});
  console.log('temp employee:', t.id);

  console.log('\n== 1) Charon images upload ==');
  await emp.updateEmployee(t.id,{personImagePath:img(2000),passportImagePath:img(2000),visaImagePath:img(2000),labourCardImagePath:img(2000)});
  let m=await emp.getEmployeeMedia(t.id);
  ok('charon save huin', has(m,'personImagePath')&&has(m,'passportImagePath')&&has(m,'visaImagePath')&&has(m,'labourCardImagePath'));

  console.log('\n== 2) ⭐ CRITICAL: undefined ke saath save (purana bug: wipe hota tha) ==');
  await emp.updateEmployee(t.id,{personImagePath:undefined,passportImagePath:undefined,visaImagePath:undefined,labourCardImagePath:undefined,otherAllowance:500});
  m=await emp.getEmployeeMedia(t.id);
  ok('person WIPE nahi hui', has(m,'personImagePath'));
  ok('passport WIPE nahi hui', has(m,'passportImagePath'));
  ok('visa WIPE nahi hui', has(m,'visaImagePath'));
  ok('labour WIPE nahi hui', has(m,'labourCardImagePath'));
  const e2=(await emp.getAllEmployees()).find(x=>x.id===t.id);
  ok('baqi field bhi update hua (otherAllowance=500)', e2&&e2.otherAllowance===500, 'otherAllowance='+(e2&&e2.otherAllowance));

  console.log('\n== 3) Naya image upload (sirf ek field) ==');
  await emp.updateEmployee(t.id,{personImagePath:img(3000)});
  m=await emp.getEmployeeMedia(t.id);
  ok('person update hui', has(m,'personImagePath'));
  ok('baqi 3 safe', has(m,'passportImagePath')&&has(m,'visaImagePath')&&has(m,'labourCardImagePath'));

  console.log('\n== 4) Explicit clear (khali string) ==');
  await emp.updateEmployee(t.id,{labourCardImagePath:''});
  m=await emp.getEmployeeMedia(t.id);
  ok('labour clear ho gayi', !has(m,'labourCardImagePath'));
  ok('baqi 3 safe', has(m,'personImagePath')&&has(m,'passportImagePath')&&has(m,'visaImagePath'));

  console.log('\n== 5) Cleanup ==');
  await emp.deleteEmployee(t.id);
  ok('temp employee delete', !(await emp.getAllEmployees()).some(x=>x.id===t.id));
  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  process.exit(fail===0?0:1);
})().catch(e=>{console.error('❌ ERR',e.message);process.exit(1);});
