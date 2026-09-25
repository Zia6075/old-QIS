// ============================================
// VERSION — single source of truth
// ============================================
// ⭐ Masla yeh tha: version 3 jagah likha hota tha (package.json,
// electron/package.json, src/firebase/config.ts) aur 2 scripts mein alag
// bump default tha (patch vs minor) — isi liye kabhi 5.14.3 kabhi 5.15.0
// ban jata tha aur zip/EXE ke naam milte nahi thay.
//
// Ab: package.json hi ek source hai. Baqi dono jagah yeh script sync karti hai,
// aur verify ke baghair release nahi hoti.
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

export const VERSION_SOURCES = [
  { file: 'package.json', kind: 'json', key: 'version', label: 'app' },
  { file: 'electron/package.json', kind: 'json', key: 'version', label: 'installer (EXE)' },
  { file: 'src/firebase/config.ts', kind: 'const', key: 'APP_VERSION', label: 'app ke andar ka tag' },
];

const readJson = (p) => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));

/** sab jagah se current version padho */
export const readVersions = () => VERSION_SOURCES.map((s) => {
  if (s.kind === 'json') return { ...s, value: readJson(s.file)[s.key] };
  const txt = fs.readFileSync(path.join(root, s.file), 'utf8');
  const m = txt.match(new RegExp(`export const ${s.key} = '([^']*)'`));
  return { ...s, value: m ? m[1] : null };
});

/** kya sab jagah version same hai? */
export const versionsMatch = () => {
  const vs = readVersions();
  return vs.every((v) => v.value === vs[0].value) ? vs[0].value : null;
};

/** sab jagah ek version likh do */
export const writeVersion = (version) => {
  for (const s of VERSION_SOURCES) {
    const p = path.join(root, s.file);
    if (s.kind === 'json') {
      const d = readJson(s.file);
      d[s.key] = version;
      fs.writeFileSync(p, JSON.stringify(d, null, 2) + '\n');
    } else {
      let t = fs.readFileSync(p, 'utf8');
      t = t.replace(new RegExp(`(export const ${s.key} = ')[^']*(')`), `$1${version}$2`);
      fs.writeFileSync(p, t);
    }
  }
  return version;
};

/** zip ka naam — HAMESHA version se milta hua */
export const zipName = (version) => `HR-Visa-System-v${version}.zip`;

/** bump calculate karo (default: patch — DONO scripts mein yehi) */
export const DEFAULT_BUMP = 'patch';

export const nextVersion = (current, bump = DEFAULT_BUMP) => {
  const [a = 0, b = 0, c = 0] = String(current).split('.').map((n) => parseInt(n, 10) || 0);
  if (bump === 'major') return `${a + 1}.0.0`;
  if (bump === 'minor') return `${a}.${b + 1}.0`;
  return `${a}.${b}.${c + 1}`;
};

/** CLI: node scripts/version.mjs [check|sync <version>] */
if (process.argv[1] && process.argv[1].endsWith('version.mjs')) {
  const cmd = process.argv[2] || 'check';
  const vs = readVersions();
  console.log('\n  Version sources:');
  for (const v of vs) console.log(`    ${v.label.padEnd(22)} ${v.file.padEnd(28)} ${v.value}`);
  const match = versionsMatch();
  if (cmd === 'check') {
    if (match) console.log(`\n  ✅ Sab jagah SAME: ${match}\n`);
    else { console.log('\n  ❌ MISMATCH — `node scripts/version.mjs sync <version>` chalayein\n'); process.exit(1); }
  } else if (cmd === 'sync') {
    const v = process.argv[3] || match || vs[0].value;
    writeVersion(v);
    console.log(`\n  ✅ Sab jagah ${v} kar diya\n`);
  }
}
