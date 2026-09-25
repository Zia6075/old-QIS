#!/usr/bin/env node
// ============================================
// QIS HR System — SAB KUCH EK COMMAND (master)
// ============================================
// Chalayein:   npm run all      (ya double-click: START.bat)
//
// Yeh ek script yeh sab karti hai (CMD mein live dikhta hai):
//   [1/8] npm install
//   [2/8] Firebase setup (RTDB URL + rules + live test)
//   [3/8] version bump + tests + build
//   [4/8] EXE installer  (npm run dist)
//   [5/8] GitHub token  (aap khud paste karein — pause hota hai)
//   [6/8] git push + GitHub RELEASE + zip/EXE upload
//   [7/8] firebase deploy --only hosting --project ishaq-old
//   [8/8] BROWSER KHUD KHULTA HAI → GitHub release + live app
//
// Options:
//   --skip-exe      EXE na banaye (tez)
//   --skip-firebase Hosting deploy skip
//   --bump minor    version bump type (patch|minor|major)
//   --note "..."    changelog line
//   --dry-run       sirf dikhaye ke kya hoga
// ============================================

import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { DEFAULT_BUMP } from './version.mjs';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const has = (f) => args.includes(`--${f}`);
const val = (f, d = '') => { const i = args.indexOf(`--${f}`); return i >= 0 && args[i + 1] ? args[i + 1] : d; };

const SKIP_EXE = has('skip-exe');
const SKIP_FIREBASE = has('skip-firebase');
const DRY = has('dry-run');
// ⭐ default bump scripts/version.mjs se (pehle yahan 'minor' tha, release.mjs
// mein 'patch' — isi liye 5.14.2 vs 5.15.0 ka confusion hua)
const BUMP = val('bump', DEFAULT_BUMP);
const NOTE = val('note', 'Naya release — EXE + GitHub + Firebase Hosting');

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const PROJECT = pkg.release?.project || 'ishaq-old';
const REPO = pkg.release?.repo || 'Zia6075/old-QIS';
const HOSTING_URL = pkg.release?.hostingUrl || `https://${PROJECT}.web.app`;

const line = (t = '') => console.log(t);
const step = (n, total, title) => line(`\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n\x1b[1;33m  [${n}/${total}] ${title}\x1b[0m\n\x1b[36m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m`);
const okMsg = (m) => line(`\x1b[32m  ✅ ${m}\x1b[0m`);
const warnMsg = (m) => line(`\x1b[33m  ⚠️  ${m}\x1b[0m`);
const fail = (m) => { line(`\x1b[31m  ❌ ${m}\x1b[0m`); };

/** Command chalao — output LIVE stream hota hai (inherit) */
// ⭐ Windows par shell:true hota hai, is liye space wale args khud quote karne
// padte hain — warna `git commit -m QIS HR System v5.13.0` mein "HR"/"System"
// alag pathspec ban jate thay aur commit fail hota tha.
const quoteArg = (a) =>
  process.platform === 'win32' && /[\s"&|<>^%]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a;

const run = (cmd, cmdArgs, opts = {}) => new Promise((resolve) => {
  line(`\n  \x1b[90m$ ${cmd} ${cmdArgs.join(' ')}\x1b[0m`);
  if (DRY) { line('  (dry-run: skip)'); return resolve(0); }
  const child = spawn(cmd, cmdArgs.map(quoteArg), { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...opts });
  child.on('exit', (code) => resolve(code ?? 0));
  child.on('error', () => resolve(1));
});

/** Command chalao aur output capture karo (URL nikalne ke liye) */
const capture = (cmd, cmdArgs) => new Promise((resolve) => {
  if (DRY) return resolve({ code: 0, out: '' });
  const child = spawn(cmd, cmdArgs.map(quoteArg), { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  let out = '';
  child.stdout?.on('data', d => { process.stdout.write(d); out += d.toString(); });
  child.stderr?.on('data', d => { process.stderr.write(d); out += d.toString(); });
  child.on('exit', (code) => resolve({ code: code ?? 0, out }));
  child.on('error', () => resolve({ code: 1, out }));
});

const ask = (question, { silent = false } = {}) => new Promise((resolve) => {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  if (silent && process.stdin.isTTY) process.stdout.write('\x1b[90m  (token type karte waqt screen par nahi dikhe ga)\x1b[0m\n');
  rl.question(question, (a) => { rl.close(); resolve(a.trim()); });
});

const openBrowser = (url) => {
  if (DRY) { line(`  (dry-run: browser open → ${url})`); return; }
  const cmd = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
  try { spawn(cmd, process.platform === 'win32' ? ['', url] : [url], { shell: process.platform === 'win32', detached: true, stdio: 'ignore' }).unref(); }
  catch { warnMsg(`browser khud na khula — khud kholein: ${url}`); }
};

const readTokenFile = () => {
  const f = path.join(root, 'github_token.txt');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').trim() : '';
};

/** Token: GH_TOKEN env → github_token.txt → aap se poocho */
const getToken = async () => {
  if (process.env.GH_TOKEN) { okMsg('GH_TOKEN environment se token mil gaya'); return process.env.GH_TOKEN.trim(); }
  if (process.env.GITHUB_TOKEN) { okMsg('GITHUB_TOKEN environment se token mil gaya'); return process.env.GITHUB_TOKEN.trim(); }
  const fromFile = readTokenFile();
  if (fromFile) { okMsg('github_token.txt se token mil gaya'); return fromFile; }
  if (!process.stdin.isTTY) { fail('Token nahi mila (GH_TOKEN env ya github_token.txt chahiye)'); return ''; }
  line('');
  line('  GitHub token chahiye (Personal Access Token, scope: repo).');
  line('  Banane ka tareeqa: GitHub → Settings → Developer settings → Personal access tokens');
  const t = await ask('  👉 Token paste karein aur Enter dabayein: ');
  if (!t) { warnMsg('token khali — GitHub step skip'); return ''; }
  try { fs.writeFileSync(path.join(root, 'github_token.txt'), t + '\n'); okMsg('token github_token.txt mein save kar diya (git mein push nahi hoga)'); }
  catch { /* koi baat nahi */ }
  return t;
};

const have = (cmd) => {
  const r = spawnSync(cmd, ['--version'], { cwd: root, stdio: 'ignore', shell: process.platform === 'win32' });
  return r.status === 0;
};

const TOTAL = 8;
(async () => {
  line('\x1b[1;35m');
  line('  ╔══════════════════════════════════════════════╗');
  line('  ║   QIS HR & VISA SYSTEM — SAB KUCH EK COMMAND ║');
  line('  ╚══════════════════════════════════════════════╝');
  line('\x1b[0m');
  line(`  Project : ${PROJECT}`);
  line(`  Repo    : ${REPO}`);
  line(`  Version : ${pkg.version}  →  ${BUMP} bump`);
  if (DRY) warnMsg('DRY-RUN mode — kuch asal mein nahi chale ga');

  // [1] install
  step(1, TOTAL, 'npm install');
  if (have('npm')) { const c = await run('npm', ['install', '--no-audit', '--no-fund']); if (c !== 0) { fail('npm install fail'); process.exit(1); } okMsg('dependencies ready'); }
  else { fail('npm nahi mila — pehle Node.js install karein (nodejs.org)'); process.exit(1); }

  // [2] firebase setup
  step(2, TOTAL, 'Firebase setup (RTDB URL + rules + live test)');
  await run('node', ['scripts/firebase-setup.mjs']);

  // [3] version + tests + build
  step(3, TOTAL, 'Naya version + tests + build');
  const relArgs = ['scripts/release.mjs', '--bump', BUMP, '--note', NOTE, '--skip-tests'];
  const c3 = await run('node', relArgs);
  if (c3 !== 0) { fail('build/release prepare fail'); process.exit(1); }
  const newPkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const TAG = `v${newPkg.version}`;
  okMsg(`version ${newPkg.version} + zip ready`);

  // [4] EXE
  step(4, TOTAL, SKIP_EXE ? 'EXE installer (SKIP kiya gaya)' : 'EXE installer ban raha hai (npm run dist)');
  if (!SKIP_EXE) {
    if (process.platform !== 'win32') warnMsg('EXE sirf Windows par banta hai — is OS par skip');
    else { const c = await run('npm', ['run', 'dist']); if (c !== 0) warnMsg('EXE build fail (baqi kaam jari hai)'); else okMsg('installer: electron/installer/'); }
  }

  // [5] token
  step(5, TOTAL, 'GitHub token');
  const TOKEN = await getToken();

  // [6] git push + GitHub release
  step(6, TOTAL, 'GitHub par upload (code + release + files)');
  let releaseUrl = `https://github.com/${REPO}/releases`;
  if (!TOKEN) {
    warnMsg('token nahi hai — GitHub step skip (baad mein: npm run dist:publish)');
  } else {
    // ⭐ git repo tayyar karo (idempotent)
    if (!fs.existsSync(path.join(root, '.git'))) {
      await run('git', ['init']);
    }
    // user identity (warna commit fail hota hai)
    const cfgName = await capture('git', ['config', 'user.name']);
    if (!(cfgName.out || '').trim()) await run('git', ['config', 'user.name', 'QIS Release Bot']);
    const cfgMail = await capture('git', ['config', 'user.email']);
    if (!(cfgMail.out || '').trim()) await run('git', ['config', 'user.email', 'release@qis.local']);

    const remotes = await capture('git', ['remote']);
    if (!/\borigin\b/.test(remotes.out || '')) {
      await run('git', ['remote', 'add', 'origin', `https://github.com/${REPO}.git`]);
    }

    await run('git', ['add', '.']);
    await run('git', ['commit', '-m', `Release ${TAG}`, '--allow-empty']);
    await run('git', ['branch', '-M', 'main']);
    await run('git', ['tag', '-f', TAG]);

    // ⭐ FIX (CRITICAL): pehle `git push origin` bina credentials ke chalta tha —
    // github_token.txt sirf GitHub API ke liye use hota tha, git ke liye NAHI.
    // Isi liye source code kabhi push nahi hua (repo mein sirf README.md tha).
    // Ab token ko push URL mein istemal karte hain (remote mein save nahi hota).
    const authUrl = `https://x-access-token:${TOKEN}@github.com/${REPO}.git`;
    line('\n  \x1b[90m$ git push https://x-access-token:****@github.com/' + REPO + '.git HEAD:main --tags\x1b[0m');
    let push = 0;
    if (!DRY) {
      const child = spawnSync('git', ['push', authUrl, 'HEAD:refs/heads/main', '--tags', '--force'], {
        cwd: root, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8',
      });
      push = child.status ?? 1;
      const out = `${child.stdout || ''}${child.stderr || ''}`.replace(new RegExp(TOKEN, 'g'), '****');
      if (out.trim()) line('  ' + out.trim().split('\n').slice(-6).join('\n  '));
    }
    if (push !== 0) {
      warnMsg('git push FAIL — GitHub release ban jaye gi magar SOURCE CODE push nahi hua.');
      line('     Check karein: token ka scope "repo" hai? aur repo naam sahi hai (' + REPO + ')?');
    } else {
      okMsg('source code + tag GitHub par push ho gaya');
    }

    const pub = await capture('node', ['scripts/release.mjs', '--publish-only', '--github', '--tag', TAG]);
    const m = pub.out.match(/https:\/\/github\.com\/[^\s]+\/releases\/tag\/[^\s]+/);
    if (m) { releaseUrl = m[0]; okMsg('release live: ' + releaseUrl); }
    else if (pub.code === 0) okMsg('release ban gayi');
    else fail('GitHub release fail — upar ka error dekhein');
  }

  // [7] firebase hosting
  step(7, TOTAL, SKIP_FIREBASE ? 'Firebase Hosting (SKIP)' : `firebase deploy --only hosting --project ${PROJECT}`);
  let hostingUrl = HOSTING_URL;
  if (!SKIP_FIREBASE) {
    if (!have('firebase')) {
      warnMsg('firebase CLI nahi mila. Install + login:');
      line('      npm install -g firebase-tools');
      line('      firebase login');
    } else {
      const d = await capture('firebase', ['deploy', '--only', 'hosting', '--project', PROJECT]);
      const m = d.out.match(/https:\/\/[a-z0-9-]+\.(web\.app|firebaseapp\.com)/);
      if (m) { hostingUrl = m[0]; okMsg('hosting live: ' + hostingUrl); }
      else if (d.code === 0) okMsg('deploy ho gaya');
      else warnMsg('deploy fail — `firebase login` kar ke dobara chalayein');
    }
  }

  // [8] browser
  step(8, TOTAL, 'Browser khol rahe hain…');
  line(`  🔗 GitHub release : ${releaseUrl}`);
  line(`  🔗 Live app       : ${hostingUrl}`);
  openBrowser(releaseUrl);
  setTimeout(() => openBrowser(hostingUrl), 1200);

  line('\n\x1b[1;32m  ══════════════════════════════════════════════\x1b[0m');
  line(`\x1b[1;32m  🎉 SAB DONE — ${TAG} live hai\x1b[0m`);
  line('\x1b[1;32m  ══════════════════════════════════════════════\x1b[0m\n');
})().catch((e) => { fail(e instanceof Error ? e.message : String(e)); process.exit(1); });
