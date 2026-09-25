// ============================================
// QIS data — images compress kar ke wapas Firebase par likhein
// (browser ki zaroorat nahi; admin credentials se seedha REST)
// ============================================
// Chalane ka tareeqa:
//   node compress.cjs --dry     (sirf hisaab, kuch likhta nahi)
//   node compress.cjs           (asal compress + write)
//   node compress.cjs --maxw 900 --q 72
// ============================================

const sharp = require('sharp');

const KEY = 'AIzaSyCMhd72on6_sPX0mAvr8VfykvaQediGsrY';
const DB = 'https://ishaq-old-default-rtdb.asia-southeast1.firebasedatabase.app';
const NODE = 'sync/admin_qis_local/data';
const EMAIL = 'admin@qis.local';
const PASS = 'admin123';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const argVal = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 && args[i + 1] ? Number(args[i + 1]) : d; };
const MAXW = argVal('maxw', 900);
const Q = argVal('q', 72) / 100;

const EMP_FIELDS = ['personImagePath', 'passportImagePath', 'visaImagePath', 'labourCardImagePath'];

const getToken = async () => {
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASS, returnSecureToken: true }),
  });
  const d = await r.json();
  if (!d.idToken) throw new Error('login fail: ' + JSON.stringify(d.error || d));
  return d.idToken;
};

const kb = (s) => Math.round((s ? s.length : 0) / 1024);
const mb = (n) => (n / 1024 / 1024).toFixed(2) + ' MB';

/** data URL → chhoti JPEG data URL (warna wapas wahi) */
const shrink = async (dataUrl, maxW) => {
  if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) return null;
  const comma = dataUrl.indexOf(',');
  const b64 = dataUrl.slice(comma + 1);
  const buf = Buffer.from(b64, 'base64');
  const meta = await sharp(buf).metadata();
  const w = meta.width || 0;
  if (w && w <= maxW) {
    // chaurai theek hai, magar phir bhi dobara encode kar ke size kam karte hain
    const out = await sharp(buf).jpeg({ quality: Math.round(Q * 100), mozjpeg: true }).toBuffer();
    if (out.length >= buf.length) return null;
    return 'data:image/jpeg;base64,' + out.toString('base64');
  }
  const out = await sharp(buf)
    .resize({ width: maxW, withoutEnlargement: true })
    .rotate()                       // EXIF orientation theek
    .jpeg({ quality: Math.round(Q * 100), mozjpeg: true })
    .toBuffer();
  if (out.length >= buf.length) return null;
  return 'data:image/jpeg;base64,' + out.toString('base64');
};

(async () => {
  const token = await getToken();
  console.log('✅ login OK (' + EMAIL + ')');
  console.log(`⚙️  settings: maxWidth=${MAXW}px quality=${Math.round(Q * 100)} ${DRY ? '(DRY RUN — kuch write nahi hoga)' : ''}\n`);

  let grandBefore = 0, grandAfter = 0, changed = 0, skipped = 0, failed = 0;

  const handle = async (coll, fields, idLabel) => {
    const url = `${DB}/${NODE}/${coll}.json?auth=${token}`;
    const t0 = Date.now();
    const res = await fetch(url);
    if (!res.ok) { console.log(`❌ ${coll} read fail HTTP ${res.status}`); return; }
    const raw = await res.text();
    console.log(`📥 ${coll}: ${mb(raw.length)} download (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    const data = JSON.parse(raw);
    const ids = Object.keys(data || {}).filter(k => k !== '_placeholder');
    console.log(`   records: ${ids.length}\n`);

    let n = 0;
    for (const id of ids) {
      const rec = data[id];
      if (!rec || typeof rec !== 'object') continue;
      const patch = {};
      let recBefore = 0, recAfter = 0, touched = false;
      for (const f of fields) {
        const v = rec[f];
        if (typeof v !== 'string' || !v.startsWith('data:image')) continue;
        recBefore += v.length;
        try {
          const small = await shrink(v, f.includes('person') ? Math.min(MAXW, 600) : MAXW);
          if (small) { patch[f] = small; recAfter += small.length; touched = true; }
          else { recAfter += v.length; }
        } catch (e) {
          failed++;
          recAfter += v.length;
          console.log(`   ⚠️  ${id}/${f} skip: ${e.message}`);
        }
      }
      grandBefore += recBefore;
      grandAfter += recAfter;
      if (touched) {
        changed++;
        if (!DRY) {
          const body = {};
          for (const [k, v] of Object.entries(patch)) body[`${NODE}/${coll}/${id}/${k}`] = v;
          // ⭐ retry ke saath (sandbox ka network beech mein toot jata tha)
          let okWrite = false;
          for (let attempt = 1; attempt <= 4 && !okWrite; attempt++) {
            try {
              const w = await fetch(`${DB}/.json?auth=${token}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
              });
              if (w.ok) okWrite = true;
              else console.log(`   ⚠️  write HTTP ${w.status} (${id}) attempt ${attempt}`);
            } catch (e) {
              console.log(`   ⚠️  write fail (${id}) attempt ${attempt}: ${e.message}`);
              await new Promise(r => setTimeout(r, 1500 * attempt));
            }
          }
          if (!okWrite) { failed++; console.log(`   ❌ write fail ${id} (4 koshish)`); }
        }
      } else skipped++;
      n++;
      if (n % 10 === 0 || n === ids.length) {
        process.stdout.write(`   ${coll}: ${n}/${ids.length}  ·  ab tak ${mb(grandBefore)} → ${mb(grandAfter)}\r`);
      }
    }
    console.log(`\n   ✅ ${coll} done — ${changed} records change, ${skipped} skip, ${failed} fail\n`);
  };

  await handle('employees', EMP_FIELDS);
  await handle('cheques', ['chequeImage']);
  await handle('expenses', ['receiptImage']);

  console.log('\n════════════════════════════════════════════');
  console.log(`  images ka size : ${mb(grandBefore)}  →  ${mb(grandAfter)}`);
  const pct = grandBefore ? Math.round((1 - grandAfter / grandBefore) * 100) : 0;
  console.log(`  kami           : ${pct}%`);
  console.log(`  records change : ${changed}   fail: ${failed}`);
  console.log(DRY ? '  (DRY RUN — kuch write nahi hua)' : '  ✅ Firebase par save ho gaya');
  console.log('════════════════════════════════════════════');
})().catch(e => { console.error('❌ CRASH:', e.message); process.exit(1); });
