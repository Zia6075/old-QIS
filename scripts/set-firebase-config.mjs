#!/usr/bin/env node
// ============================================
// Firebase config badalne ka helper
// ============================================
// Agar aap ne NAYA Firebase project banaya hai (ya purana reinstate nahi ho raha),
// to nayi config yahan daal dein — yeh script src/firebase/config.ts khud update
// kar de gi.
//
// Istemal:
//   1) Is file mein neeche "YAHAN NAYI CONFIG DALEIN" wali jagah values daalein
//      (Firebase Console → Project settings → General → Your apps → SDK setup)
//   2) Chalayein:  node scripts/set-firebase-config.mjs
//   3) npm run build
//
// Ya command line se:
//   node scripts/set-firebase-config.mjs --apiKey AIza... --projectId mera-project ...
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const FILE = path.join(root, 'src/firebase/config.ts');

// ┌─────────────────────────────────────────────────────────────┐
// │  YAHAN NAYI CONFIG DALEIN (Firebase Console se copy karein) │
// └─────────────────────────────────────────────────────────────┘
const MANUAL = {
  apiKey: '',
  authDomain: '',            // masal: mera-project.firebaseapp.com
  projectId: '',             // masal: mera-project
  storageBucket: '',         // masal: mera-project.firebasestorage.app
  messagingSenderId: '',     // masal: 431481156812
  appId: '',                 // masal: 1:9909:web:abc123
  databaseURL: '',           // RTDB create karne ke baad jo URL mile
};

// command line args (agar diye gaye)
const args = process.argv.slice(2);
const cfg = { ...MANUAL };
for (const k of Object.keys(cfg)) {
  const i = args.indexOf(`--${k}`);
  if (i >= 0 && args[i + 1]) cfg[k] = args[i + 1];
}

const missing = Object.entries(cfg).filter(([, v]) => !v).map(([k]) => k);
if (missing.length) {
  console.error('❌ Yeh fields khali hain: ' + missing.join(', '));
  console.error('   Ya to is file mein MANUAL object bharein, ya --apiKey ... --projectId ... dein.');
  console.error('\n   Firebase Console → Project settings → General → Your apps → Web app → SDK setup');
  process.exit(1);
}

let src = fs.readFileSync(FILE, 'utf8');
const before = (src.match(/apiKey: '[^']*'/) || [''])[0];

for (const [k, v] of Object.entries(cfg)) {
  const re = new RegExp(`(${k}:\\s*)'[^']*'`);
  if (!re.test(src)) { console.error(`❌ config.ts mein "${k}" nahi mila`); process.exit(1); }
  src = src.replace(re, `$1'${v}'`);
}

// owner + email domain project ke saath badal dein (purane project ke users kaam nahi karein ge)
src = src.replace(/(export const EMAIL_DOMAIN = ')[^']*(')/, `$1qis.local$2`);
src = src.replace(/(export const DEFAULT_OWNER = ')[^']*(')/, `$1admin@qis.local$2`);

fs.writeFileSync(FILE, src);

console.log('✅ src/firebase/config.ts update ho gaya');
console.log('   pehle : ' + before);
console.log(`   ab    : apiKey: '${cfg.apiKey}'`);
console.log(`   project: ${cfg.projectId}`);
console.log(`   RTDB   : ${cfg.databaseURL}`);
console.log('\nAb yeh karein:');
console.log('  1) Firebase Console → Authentication → Email/Password ENABLE (Anonymous DISABLE)');
console.log('  2) Realtime Database CREATE karein (location: asia-southeast1)');
console.log('  3) RTDB Rules mein database.rules.json paste → Publish');
console.log('  4) npm run build');
console.log('  5) npm run test:live   → 9 passed aana chahiye');
console.log('\n⚠️ Naye project mein users dobara banenge: app pehli baar khulne par');
console.log('   admin/admin123 aur staff/staff123 khud ban jate hain.');
