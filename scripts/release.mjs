#!/usr/bin/env node
// ============================================
// QIS HR System — RELEASE script (khud version banata hai)
// ============================================
// Ek command mein:
//   1. version bump (package.json + config.ts + electron/package.json)
//   2. VERSION.md mein changelog row + section
//   3. npm run build  (dist/)
//   4. HR-Visa-System-v{X}.zip
//   5. (agar git repo hai) commit + tag
//   6. (--github aur token ho to) GitHub Release + zip/installer upload
//
// Istemal:
//   npm run release:prepare                  → patch bump (6.0.0 → 6.0.1)
//   npm run release:prepare -- --bump minor  → minor  (6.0.0 → 6.1.0)
//   npm run release:prepare -- --bump major  → major  (6.0.0 → 7.0.0)
//   npm run release:prepare -- --note "Firebase hosting fix"
//   npm run release:prepare -- --skip-tests
//   npm run release:publish                  → GitHub Release upload (token chahiye)
//   npm run release                          → dono (prepare + publish)
//
// Token: github_token.txt (personal access token, scope: repo) — .gitignore mein hai
// ============================================

import fs from 'node:fs';
import path from 'node:path';
import { execSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import AdmZip from 'adm-zip';
import {
  readVersions, versionsMatch, writeVersion, zipName, nextVersion, DEFAULT_BUMP,
} from './version.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback = '') => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const hasFlag = (name) => args.includes(`--${name}`);

// ⭐ default bump ab EK jagah se (scripts/version.mjs) — pehle release.mjs 'patch'
// aur all.mjs 'minor' use karte thay, isi liye 5.14.2 vs 5.15.0 wala confusion hua.
const BUMP = getArg('bump', DEFAULT_BUMP);
const NO_ZIP = hasFlag('no-zip');
const NOTE = getArg('note', '');
const DATE = getArg('date', new Date().toISOString().slice(0, 10));
const SKIP_TESTS = hasFlag('skip-tests');
const SKIP_BUILD = hasFlag('skip-build');
const DO_GITHUB = hasFlag('github');
const DO_ALL = hasFlag('all');            // EXE + git push + GitHub + Hosting — sab
const DO_EXE = hasFlag('exe') || DO_ALL;
const DO_PUSH = hasFlag('push') || DO_ALL;
const DO_HOSTING = hasFlag('hosting') || DO_ALL;
const ONLY_GITHUB = process.argv[2] === '--publish-only';

const run = (cmd, opts = {}) => {
  console.log(`\n$ ${cmd}`);
  return execSync(cmd, { cwd: root, stdio: 'inherit', ...opts });
};

const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(root, p), s);

// ---------- 1) version bump ----------
const pkg = JSON.parse(read('package.json'));
const [maj, min, pat] = (pkg.version || '1.0.0').split('.').map(Number);

// ⭐ Release se PEHLE: kahin version sources alag to nahi?
if (!versionsMatch() && !ONLY_GITHUB) {
  console.log('\n⚠️  Version sources alag thay — sync kar rahe hain:');
  for (const v of readVersions()) console.log(`     ${v.label.padEnd(22)} ${v.value}`);
  writeVersion(pkg.version);
}

/**
 * ⭐ AUTO VERSION — ab version sochna nahi parta.
 * Tareekh se banta hai: 2026.9.1  (saal.maheena.din)
 *   • usi din doosri release  → 2026.9.2, 2026.9.3 …
 *   • agli tareekh            → 2026.9.2 (patch khud 1)
 * Kabhi peeche nahi jata: agar current version bara hai to us par +1.
 */

let next;
if (ONLY_GITHUB) next = pkg.version;
else next = nextVersion(pkg.version, BUMP);   // ⭐ single source

const TAG = ONLY_GITHUB && getArg('tag') ? getArg('tag') : `v${next}`;
const ZIP_NAME = zipName(next);   // ⭐ hamesha version se milta hua naam

console.log('════════════════════════════════════════════');
console.log(`  QIS HR System  ${pkg.version}  →  ${next}`);
console.log('════════════════════════════════════════════');

if (!ONLY_GITHUB) {
  // ⭐ teeno jagah EK saath likho (single source of truth)
  writeVersion(next);
  console.log(`\n  Version sync → ${readVersions().map(v => `${v.label}=${v.value}`).join(' | ')}`);

  // ---------- 2) VERSION.md ----------
  const vpath = 'VERSION.md';
  if (fs.existsSync(path.join(root, vpath))) {
    let v = read(vpath);
    const row = `| **v${next}** | **${DATE}** | **\`${ZIP_NAME}\`** | ${NOTE || '(changelog: --note "..." se likhein)'} |`;
    const nextRow = '| v? | (agli update) | `HR-Visa-System-v?.zip` | `npm run release:prepare` se khud ban jaye ga |';
    if (v.includes(nextRow)) v = v.replace(nextRow, `${row}\n${nextRow}`);
    else v = v.replace(/\n---\n/, `\n${row}\n\n---\n`);
    v = v.replace(
      /\n---\n/,
      `\n---\n\n## v${next} — ${DATE}\n\n${NOTE || '- (is release ke changes yahan likhein: \`npm run release:prepare -- --note "..."\`)'}\n`
    );
    write(vpath, v);
  }
  console.log(`\n✅ Version files update: ${pkg.version} → ${next}`);
}

// ---------- 3) tests + build ----------
if (!ONLY_GITHUB && !SKIP_TESTS) {
  console.log('\n── Tests ──');
  const t = spawnSync('npm', ['run', 'test:sync'], { cwd: root, stdio: 'inherit' });
  if (t.status !== 0) { console.error('❌ Sync tests fail — release roka gaya (--skip-tests se majbooran skip kar sakte hain)'); process.exit(1); }
}

if (!ONLY_GITHUB && !SKIP_BUILD) {
  console.log('\n── Build ──');
  run('npm run build');
}

// ---------- 3b) EXE installer (optional) ----------
if (!ONLY_GITHUB && DO_EXE) {
  console.log('\n── EXE installer ──');
  try {
    run('npm run dist');
    const dir = path.join(root, 'electron', 'installer');
    if (fs.existsSync(dir)) console.log('🖥️  ' + fs.readdirSync(dir).filter(f => /\.exe$/i.test(f)).join(', '));
  } catch (e) { console.warn('⚠️  EXE build fail (Windows + electron chahiye): ' + e.message); }
}

// ---------- 4) zip ----------
const zipPath = path.resolve(root, '..', ZIP_NAME);
if (!ONLY_GITHUB && !NO_ZIP) {
  console.log('\n── Zip ──');
  const zip = new AdmZip();
  const IGNORE_DIRS = new Set(['node_modules', 'dist', '.git', 'installer', 'svc']);
  const IGNORE_FILES = new Set(['base.zip', 'github_token.txt', '.DS_Store']);
  const isIgnoredDir = (p) => p.split(/[\\/]/).some(seg => IGNORE_DIRS.has(seg));

  const walk = (dir, rel = '') => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (IGNORE_DIRS.has(entry.name) || isIgnoredDir(relPath)) continue;
        if (relPath.startsWith('electron/dist')) continue;
        zip.addFile(relPath + '/', Buffer.alloc(0));
        walk(path.join(dir, entry.name), relPath);
      } else {
        if (IGNORE_FILES.has(entry.name) || entry.name.endsWith('.zip')) continue;
        zip.addLocalFile(path.join(dir, entry.name), rel);
      }
    }
  };
  walk(root);
  zip.writeZip(zipPath);
  const mb = (fs.statSync(zipPath).size / 1024 / 1024).toFixed(2);
  console.log(`📦 ${zipPath}  (${mb} MB)`);
}

// ---------- 5) git commit + tag ----------
const isGitRepo = fs.existsSync(path.join(root, '.git'));
if (!ONLY_GITHUB && isGitRepo) {
  console.log('\n── Git ──');
  try {
    run(`git add -A`);
    run(`git commit -m "Release ${TAG}${NOTE ? ` — ${NOTE}` : ''}" || true`);
    run(`git tag -f ${TAG}`);
    console.log(`🏷️  tag ${TAG} ban gaya`);
    if (DO_PUSH) {
      run('git push origin HEAD --tags');
      console.log('⬆️  GitHub par push ho gaya');
    } else {
      console.log('   (push ke liye: npm run release -- --all  ya  git push origin main --tags)');
    }
  } catch (e) { console.warn('git step skip:', e.message); }
}

// ---------- 6) GitHub Release ----------
const readToken = () => {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN.trim();
  const f = path.join(root, 'github_token.txt');
  return fs.existsSync(f) ? read('github_token.txt').trim() : '';
};

if (DO_GITHUB || ONLY_GITHUB) {
  const TOKEN = readToken();
  if (!TOKEN) { console.error('❌ github_token.txt ya GITHUB_TOKEN nahi mila — GitHub release skip'); process.exit(DO_GITHUB ? 1 : 0); }
  const REPO = getArg('repo', pkg.release?.repo || 'Zia6075/old-QIS');
  const API = 'https://api.github.com';
  const headers = { Authorization: `Bearer ${TOKEN}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
  const gh = async (url, options = {}) => {
    const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
    const text = await res.text();
    if (!res.ok) throw new Error(`${options.method || 'GET'} ${url} → ${res.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  };

  const versionSection = (() => {
    try {
      const v = read('VERSION.md');
      const i = v.indexOf(`## v${next} —`);
      if (i < 0) return NOTE || `QIS HR System ${TAG}`;
      const rest = v.slice(i);
      const end = rest.indexOf('\n## ', 5);
      return rest.slice(0, end > 0 ? end : 1200);
    } catch { return NOTE || `QIS HR System ${TAG}`; }
  })();

  const assets = [zipPath].filter(p => fs.existsSync(p));
  const installerDir = path.join(root, 'electron', 'installer');
  if (fs.existsSync(installerDir)) {
    for (const f of fs.readdirSync(installerDir)) if (/\.(exe|msi|zip)$/i.test(f)) assets.push(path.join(installerDir, f));
  }

  console.log(`\n── GitHub Release (${REPO} ${TAG}) ──`);
  let release;
  try {
    release = await gh(`${API}/repos/${REPO}/releases/tags/${TAG}`);
    console.log('↩️  release pehle se hai, update ho rahi hai');
  } catch {
    release = await gh(`${API}/repos/${REPO}/releases`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tag_name: TAG, name: `QIS HR System ${TAG}`, body: versionSection, draft: false, prerelease: false }),
    });
    console.log(`✅ release bani: ${release.html_url}`);
  }
  for (const file of assets) {
    const name = path.basename(file);
    const list = await gh(`${API}/repos/${REPO}/releases/${release.id}/assets`).catch(() => []);
    const dupe = Array.isArray(list) ? list.find(a => a.name === name) : null;
    if (dupe) await gh(`${API}/repos/${REPO}/releases/assets/${dupe.id}`, { method: 'DELETE' });
    const data = fs.readFileSync(file);
    await fetch(`${release.upload_url.split('{')[0]}?name=${encodeURIComponent(name)}`, {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/octet-stream', 'Content-Length': String(data.length) }, body: data,
    });
    console.log(`⬆️  ${name} (${(data.length / 1024 / 1024).toFixed(2)} MB)`);
  }
  console.log(`\n🎉 ${release.html_url}`);
}

// ---------- 7) Firebase Hosting ----------
if (!ONLY_GITHUB && DO_HOSTING) {
  console.log('\n── Firebase Hosting ──');
  try {
    run('npx firebase deploy --only hosting');
    console.log('🌐 Hosting par live (mobile browser mein kholein)');
  } catch (e) { console.warn('⚠️  Hosting deploy fail — pehle `firebase login` karein: ' + e.message); }
}

// ⭐ FINAL VERIFY — teeno jagah same hona zaroori hai, warna release fail
const finalMatch = versionsMatch();
if (!ONLY_GITHUB && finalMatch !== next) {
  console.error(`\n❌ Version mismatch! expected ${next}, mila ${finalMatch}`);
  for (const v of readVersions()) console.error(`     ${v.label}: ${v.value}`);
  process.exit(1);
}

console.log(`\n════════════════════════════════════════════`);
console.log(`  ✅ VERSION : ${next}`);
console.log(`  ✅ ZIP     : ${ZIP_NAME}   ← naam version se MILTA hai`);
console.log(`  ✅ TAG     : ${TAG}`);
console.log(`  (app ke andar, installer, GitHub release — sab ${next})`);
console.log(`  AGLA VERSION: ${BUMP === 'major' ? `${maj + 2}.0.0` : BUMP === 'minor' ? `${maj}.${min + 2}.0` : `${maj}.${min}.${pat + 2}`}  (bas dobara chalayein)`);
console.log(`  (bas dobara chalayein: npm run release:prepare  /  START.bat)`);
console.log(`════════════════════════════════════════════\n`);
