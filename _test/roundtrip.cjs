global.window={location:{protocol:'https:',port:'',origin:'http://localhost:3000'}};
global.localStorage={_m:new Map(),getItem(k){return this._m.get(k)??null;},setItem(k,v){this._m.set(k,String(v));},removeItem(k){this._m.delete(k);}};
global.navigator={userAgent:'Mozilla/5.0 QIS-HR Electron/28.0.0 Chrome/120 Safari/537.36'};
const db=require('./svc/database/db');
const auth=require('./svc/firebase/auth');
const acc=require('./svc/database/accountingService');
const IMG='data:image/jpeg;base64,'+'A'.repeat(4000);
let pass=0,fail=0;
const ok=(n,c,x='')=>{ if(c){pass++;console.log('  ✅ '+n+(x?'  -> '+x:''));} else {fail++;console.log('  ❌ '+n+(x?'  -> '+x:''));} };
const raw = async (path) => {
  const t = await (await fetch('https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyCMhd72on6_sPX0mAvr8VfykvaQediGsrY',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'admin@qis.local',password:'admin123',returnSecureToken:true})})).json();
  const r = await fetch(`https://ishaq-old-default-rtdb.asia-southeast1.firebasedatabase.app/sync/admin_qis_local/data/${path}.json?auth=${t.idToken}`);
  return r.json();
};
(async()=>{
  await auth.firebaseSignIn('admin@qis.local','admin123');
  await db.connectFirebase();
  console.log('== 1) Cheque banao (image ke saath) ==');
  const c = await acc.createCheque({companyName:'ROUNDTRIP TEST CO',chequeNumber:'RT-001',chequeAmount:5000,chequeDate:'2026-09-25',bankName:'Test Bank',notes:'roundtrip',chequeImage:IMG});
  ok('cheque bana, id hai', !!c.id, c.id);
  const rc = await raw('cheques/'+c.id);
  ok('DB mein saare fields maujood', rc && rc.companyName==='ROUNDTRIP TEST CO' && rc.chequeAmount===5000 && rc.chequeNumber==='RT-001',
     rc?Object.keys(rc).length+' fields':'null');
  ok('image record mein NAHI (media mein)', !rc.chequeImage || !String(rc.chequeImage).startsWith('data:image'));
  const mc = await raw('media/'+c.id);
  ok('image media node mein hai', !!(mc&&mc.chequeImage), mc?(mc.chequeImage.length/1024).toFixed(1)+' KB':'null');

  console.log('\n== 2) Expense banao (receipt ke saath) ==');
  const x = await acc.createExpense({chequeId:c.id,amount:1200,category:'Rent',description:'roundtrip rent',receiptImage:IMG,expenseDate:'2026-09-25',vendorName:'Test Vendor',referenceNo:'RT-1'});
  const rx = await raw('expenses/'+x.id);
  ok('DB mein saare fields maujood', rx && rx.amount===1200 && rx.category==='Rent' && rx.chequeId===c.id && rx.vendorName==='Test Vendor',
     rx?Object.keys(rx).length+' fields':'null');
  const mx = await raw('media/'+x.id);
  ok('receipt media node mein hai', !!(mx&&mx.receiptImage));

  console.log('\n== 3) Cheque update (image ke saath) — fields wipe na hon ==');
  await acc.updateChequeInfo(c.id,{chequeAmount:7000,chequeImage:IMG});
  const rc2 = await raw('cheques/'+c.id);
  ok('update ke baad bhi saare fields', rc2 && rc2.companyName==='ROUNDTRIP TEST CO' && rc2.chequeAmount===7000 && rc2.chequeNumber==='RT-001',
     rc2?Object.keys(rc2).length+' fields':'null');
  ok('balance sahi recalc hua', rc2 && rc2.remainingBalance===5800, 'remaining='+(rc2&&rc2.remainingBalance));

  console.log('\n== 4) Expense update — fields wipe na hon ==');
  await acc.updateExpense(x.id,{amount:2000,receiptImage:IMG});
  const rx2 = await raw('expenses/'+x.id);
  ok('update ke baad bhi saare fields', rx2 && rx2.amount===2000 && rx2.category==='Rent' && rx2.chequeId===c.id,
     rx2?Object.keys(rx2).length+' fields':'null');

  console.log('\n== 5) Detail mein images wapas aayen ==');
  const cf = await acc.getChequeWithImage(c.id);
  ok('cheque detail image', !!(cf&&cf.chequeImage&&cf.chequeImage.startsWith('data:image')));
  const xf = await acc.getExpenseWithImage(x.id);
  ok('expense detail receipt', !!(xf&&xf.receiptImage&&xf.receiptImage.startsWith('data:image')));

  console.log('\n== 6) Cleanup ==');
  await acc.deleteCheque(c.id);
  const rc3 = await raw('cheques/'+c.id);
  ok('cheque delete ho gaya', !rc3 || rc3===null || rc3.deleted===true);
  console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
  process.exit(fail===0?0:1);
})().catch(e=>{console.error('❌ ERR',e.message);process.exit(1);});
