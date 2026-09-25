#!/usr/bin/env node
// ============================================
// Firebase ONE-TIME SETUP — QIS HR System
// ============================================
// Yeh script khud yeh sab karti hai:
//   1. RTDB ka asal URL probe karta hai (region guess nahi karta)
//   2. Agar src/firebase/config.ts mein URL purana hai to KHUD theek kar deta hai
//   3. Anonymous sign-in se token leta hai (auth ON hai ya nahi check)
//   4. ⭐ RULES PUBLISH karta hai (database.rules.json) — warna "Permission denied"
//   5. sync/_map seed karta hai + live read/write test karta hai (test node khud delete)
//   6. Report deta hai ke kya bacha (masal Firebase Hosting enable karna)
//
// Chalane ka tareeqa:
//   npm run setup            (ya:  node scripts/firebase-setup.mjs)
//   node scripts/firebase-setup.mjs --rules      (sirf rules publish)
//
// Rules publish ke liye ek dafa `firebase login` zaroori hai (ya FIREBASE_TOKEN env).
// ============================================

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const ONLY = args.includes('--rules') ? 'rules' : args.includes('--probe') ? 'probe' : '';

// config.ts se values padho (hardcode drift se bachne ke liye)
const cfgSrc = fs.readFileSync(path.join(root, 'src/firebase/config.ts'), 'utf8');
const pick = (key) => (cfgSrc.match(new RegExp(`${key}:\\s*'([^']+)'`)) || [])[1] || '';
const API_KEY = pick('apiKey');
const PROJECT = pick('projectId');
let DB_URL = pick('databaseURL');

const ok = (m) => console.log('  ✅ ' + m);
const bad = (m) => console.log('  ❌ ' + m);
const warn = (m) => console.log('  ⚠️  ' + m);

console.log('════════════════════════════════════════════════');
console.log('  Firebase setup — project: ' + PROJECT);
console.log('════════════════════════════════════════════════\n');

// ---------- 1) RTDB URL probe ----------
console.log('1) Realtime Database ka URL dhoonda ja raha hai…');
const CANDIDATES = [
  DB_URL,
  `https://${PROJECT}-default-rtdb.firebaseio.com`,
  `https://${PROJECT}-default-rtdb.asia-southeast1.firebasedatabase.app`,
  `https://${PROJECT}-default-rtdb.europe-west1.firebasedatabase.app`,
  `https://${PROJECT}-default-rtdb.us-central1.firebasedatabase.app`,
].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);

const realUrl = async () => {
  for (const url of CANDIDATES) {
    try {
      const res = await fetch(`${url}/.json`, { signal: AbortSignal.timeout(12000) });
      const text = await res.text();
      if (res.status === 401) return url;                     // maujood hai, rules rok rahi hain
      if (res.status === 200) return url;                     // maujood + khuli
      if (res.status === 404) {
        const m = text.match(/"correctUrl"\s*:\s*"([^"]+)"/); // RTDB khud sahi URL bata deta hai
        if (m) return m[1];
      }
    } catch { /* next */ }
  }
  return null;
};

const found = await realUrl();
if (!found) {
  bad('Realtime Database nahi mili.');
  console.log('\n   console.firebase.google.com → ' + PROJECT + ' → Build → Realtime Database → Create Database');
  console.log('   (location: asia-southeast1) — phir yeh script dobara chalayein.\n');
  process.exit(1);
}
ok('RTDB mili: ' + found);

// ---------- 2) config.ts mein URL theek ----------
if (found !== DB_URL) {
  const p = path.join(root, 'src/firebase/config.ts');
  fs.writeFileSync(p, cfgSrc.replace(`databaseURL: '${DB_URL}'`, `databaseURL: '${found}'`));
  DB_URL = found;
  ok(`src/firebase/config.ts ka databaseURL khud update kar diya`);
} else {
  ok('config.ts ka databaseURL sahi hai');
}
if (ONLY === 'probe') process.exit(0);

// ---------- 3) auth token ----------
console.log('\n2) Authentication check (anonymous token)…');
let TOKEN = '';
try {
  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ returnSecureToken: true }),
  });
  const data = await res.json();
  if (!data.idToken) throw new Error(data.error?.message || 'token nahi mila');
  TOKEN = data.idToken;
  ok('Anonymous sign-in chal raha hai (auth ON)');
} catch (e) {
  bad('Auth fail: ' + e.message);
  console.log('   Console → Authentication → Sign-in method → Anonymous + Email/Password ENABLE karein.\n');
}

// ---------- 4) RULES PUBLISH ----------
console.log('\n3) Rules publish (warna "Permission denied")…');
const findCliToken = () => {
  if (process.env.FIREBASE_TOKEN) return { token: process.env.FIREBASE_TOKEN.trim(), from: 'FIREBASE_TOKEN env' };
  const paths = [
    path.join(os.homedir(), '.config', 'firebase-tokens.json'),                    // Linux/mac
    path.join(process.env.APPDATA || '', 'configstore', 'firebase-tools.json'),    // Windows
    path.join(os.homedir(), '.config', 'configstore', 'firebase-tools.json'),
  ].filter(Boolean);
  for (const p of paths) {
    try {
      if (!fs.existsSync(p)) continue;
      const j = JSON.parse(fs.readFileSync(p, 'utf8'));
      const t = j?.tokens?.refresh_token || j?.refresh_token;
      if (t) return { token: t, from: p };
    } catch { /* next */ }
  }
  return null;
};

const publishRules = async () => {
  const rules = fs.readFileSync(path.join(root, 'database.rules.json'), 'utf8');
  const cli = findCliToken();
  if (!cli) {
    warn('Firebase CLI ka login nahi mila — rules khud publish nahi kar saka.');
    console.log('     1) npm install -g firebase-tools');
    console.log('     2) firebase login');
    console.log('     3) node scripts/firebase-setup.mjs --rules      (ya console mein khud paste kar dein)');
    return false;
  }
  ok('CLI token mila (' + cli.from + ')');
  // refresh token → access token
  const rt = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com', grant_type: 'refresh_token', refresh_token: cli.token }),
  });
  const rtj = await rt.json();
  if (!rtj.access_token) { warn('Access token nahi mila: ' + (rtj.error || rt.status) + ' — `firebase login` dobara karein'); return false; }
  const put = await fetch(`${DB_URL}/.settings/rules.json`, {
    method: 'PUT', headers: { Authorization: 'Bearer ' + rtj.access_token, 'Content-Type': 'application/json' }, body: rules,
  });
  if (put.ok) { ok('Rules publish ho gayin ✅ (auth != null)'); return true; }
  warn('Rules publish fail: HTTP ' + put.status + ' ' + (await put.text()).slice(0, 200));
  console.log('     Console → Realtime Database → Rules → database.rules.json paste → Publish');
  return false;
};

if (ONLY === 'rules') { await publishRules(); process.exit(0); }

// pehle check: rules pehle se theek hain?
let rulesOk = false;
if (TOKEN) {
  // app asal mein sirf sync/ node par likhti hai — wahi test karo (root par nahi)
  const probe = await fetch(`${DB_URL}/sync/__qis_probe.json?auth=${TOKEN}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: '{"t":1}' });
  const probeBody = await probe.text();
  rulesOk = probe.ok && !/Permission denied/.test(probeBody);
  if (rulesOk) {
    await fetch(`${DB_URL}/sync/__qis_probe.json?auth=${TOKEN}`, { method: 'DELETE' });
    ok('Rules pehle se theek hain — sync/ node par write chal gaya ✅');
  } else {
    warn('sync/ node par write nahi ho saka: ' + probeBody.slice(0, 100));
  }
}
if (!rulesOk) rulesOk = await publishRules();

// ---------- 5) live test + seed ----------
console.log('\n4) Live read/write test…');
if (TOKEN) {
  const myKey = 'admin_qis_local';
  const node = `sync/${myKey}`;
  const w = await fetch(`${DB_URL}/${node}/meta.json?auth=${TOKEN}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lastSync: new Date().toISOString().slice(0, 19).replace('T', ' '), deviceName: 'setup-script', version: 'setup', app: 'QIS HR System' }),
  });
  const map = await fetch(`${DB_URL}/sync/_map/${myKey}.json?auth=${TOKEN}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(myKey),
  });
  const r = await fetch(`${DB_URL}/${node}/meta.json?auth=${TOKEN}`);
  const rBody = await r.text();
  if (w.ok && map.ok && r.ok && !/Permission denied/.test(rBody)) {
    ok(`sync node ready: ${node}/  (mapping sync/_map/${myKey} = ${myKey})`);
  } else if (/Permission denied/.test(rBody) || w.status === 401 || r.status === 401) {
    bad('Rules abhi write/read rok rahi hain ("Permission denied").');
    console.log('     Upar STEP 3 ke mutabiq rules publish karein — phir yeh test khud pass ho jaye ga.');
  } else {
    bad(`write/read fail (HTTP ${w.status}/${r.status}) — message: ${rBody.slice(0, 120)}`);
  }
} else {
  warn('token nahi tha, live test skip');
}

// ---------- 6) report ----------
console.log('\n════════════════════════════════════════════════');
console.log('  SUMMARY');
console.log('════════════════════════════════════════════════');
console.log(`  RTDB URL      : ${DB_URL}`);
console.log(`  Rules         : ${rulesOk ? '✅ published (auth != null)' : '❌ abhi publish karna baqi hai'}`);
console.log(`  Auth          : ${TOKEN ? '✅ anonymous ON' : '❌ console se ON karein'}`);
console.log('');
console.log('  Ab yeh karein:');
console.log('    npm run dev            → browser mein app (☁️ FIREBASE LIVE badge aana chahiye)');
console.log('    npm run deploy         → Firebase Hosting (mobile browser)');
console.log('    npm run release -- --all → EXE + GitHub + Hosting sab ek saath');
console.log('');
