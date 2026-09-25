// ============================================
// Migration: employee ki bari images → alag `media/{id}` node
// (Firebase downloads 26 MB → ~0.3 MB karne ke liye)
// ============================================
const sharp = require('sharp');
const KEY = 'AIzaSyCMhd72on6_sPX0mAvr8VfykvaQediGsrY';
const DB = 'https://ishaq-old-default-rtdb.asia-southeast1.firebasedatabase.app';
const NODE = 'sync/admin_qis_local/data';
const FIELDS = ['personImagePath','passportImagePath','visaImagePath','labourCardImagePath'];
const DRY = process.argv.includes('--dry');

const mb = (n) => (n/1024/1024).toFixed(2)+' MB';
const patch = async (token, body, label) => {
  for (let i=1;i<=4;i++){
    try {
      const r = await fetch(`${DB}/.json?auth=${token}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if (r.ok) return true;
      console.log(`   ⚠️ ${label} HTTP ${r.status} (${i})`);
    } catch(e){ console.log(`   ⚠️ ${label} fail (${i}): ${e.message}`); await new Promise(r=>setTimeout(r,1200*i)); }
  }
  return false;
};
const thumb = async (dataUrl) => {
  try {
    const buf = Buffer.from(dataUrl.slice(dataUrl.indexOf(',')+1),'base64');
    const out = await sharp(buf).resize(96,96,{fit:'cover'}).jpeg({quality:70}).toBuffer();
    return 'data:image/jpeg;base64,'+out.toString('base64');
  } catch { return ''; }
};

(async () => {
  const t = await (await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`,{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({email:'admin@qis.local',password:'admin123',returnSecureToken:true})})).json();
  if (!t.idToken) throw new Error('login fail');
  const token = t.idToken;
  console.log('✅ login OK'+(DRY?'   (DRY RUN)':''));

  const raw = await (await fetch(`${DB}/${NODE}/employees.json?auth=${token}`)).text();
  console.log(`📥 employees: ${mb(raw.length)}`);
  const data = JSON.parse(raw);
  const ids = Object.keys(data||{}).filter(k=>k!=='_placeholder');
  console.log(`   records: ${ids.length}\n`);

  let moved=0, imgBytes=0, thumbBytes=0, fail=0, n=0;
  for (const id of ids) {
    const rec = data[id]; if (!rec || typeof rec!=='object') continue;
    const media = { id };
    const empPatch = {};
    let has=false;
    for (const f of FIELDS) {
      const v = rec[f];
      if (typeof v==='string' && v.startsWith('data:image')) {
        media[f]=v; imgBytes+=v.length; empPatch[`${NODE}/employees/${id}/${f}`]=null; has=true;
      }
    }
    if (has) {
      const th = await thumb(media.personImagePath || '');
      if (th) { empPatch[`${NODE}/employees/${id}/personThumb`]=th; thumbBytes+=th.length; }
      if (!DRY) {
        const body = { [`${NODE}/media/${id}`]: media, ...empPatch };
        if (await patch(token, body, id)) moved++; else fail++;
      } else moved++;
    }
    n++;
    if (n%10===0||n===ids.length) process.stdout.write(`   ${n}/${ids.length}  images ${mb(imgBytes)} → thumbs ${mb(thumbBytes)}\r`);
  }
  console.log(`\n\n════════════════════════════════════════`);
  console.log(`  employees se hatayi gayi images : ${mb(imgBytes)}`);
  console.log(`  inline thumbs (list ke liye)    : ${mb(thumbBytes)}`);
  console.log(`  media node mein move hue        : ${moved} records   fail: ${fail}`);
  console.log(DRY?'  (DRY RUN — kuch write nahi hua)':'  ✅ Firebase par save ho gaya');
  console.log('════════════════════════════════════════');
})().catch(e=>{console.error('❌',e.message);process.exit(1);});
