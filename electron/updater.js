// ============================================
// Auto-Update — GitHub Releases (FIREBASE_IMPLEMENTATION_GUIDE §9)
// ============================================
// Har 6 ghante + app start par GitHub ki latest release check hoti hai.
// Naya version mila to popup: "Install now / Later"
//   → Install: EXE download → silent install (/SILENT) → app khud band → installer chal jata hai
// ============================================

const { app, dialog, BrowserWindow } = require('electron');
const https = require('https');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const REPO = 'Zia6075/old-QIS';
// ⭐ App khuli rahe to update milta rahe:
//   • pehla check app khulne ke 10 second baad
//   • phir har 30 minute (pehle 6 ghante tha — user ko update pata hi nahi chalta tha)
const FIRST_CHECK_MS = 10 * 1000;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;
const API = `https://api.github.com/repos/${REPO}/releases/latest`;

// "v5.7.0" > "5.6.0" ?
const isNewer = (candidate, current) => {
  const parse = (v) => String(v || '').replace(/^v/i, '').split(/[.\-+]/).map((n) => parseInt(n, 10)).filter((n) => !Number.isNaN(n));
  const a = parse(candidate);
  const b = parse(current);
  if (!a.length) return false;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = a[i] || 0;
    const y = b[i] || 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
};

const getJson = (url) =>
  new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'QIS-HR-Updater', Accept: 'application/vnd.github+json' }, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('timeout')); });
  });

// download with redirect follow + progress
const download = (url, dest, onProgress) =>
  new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const go = (u, redirects = 0) => {
      if (redirects > 5) return reject(new Error('too many redirects'));
      https.get(u, { headers: { 'User-Agent': 'QIS-HR-Updater' }, timeout: 60000 }, (res) => {
        if ([301, 302, 307, 308].includes(res.statusCode) && res.headers.location) {
          res.resume();
          return go(res.headers.location, redirects + 1);
        }
        if (res.statusCode !== 200) { file.close(); return reject(new Error(`HTTP ${res.statusCode}`)); }
        const total = parseInt(res.headers['content-length'] || '0', 10);
        let got = 0;
        res.on('data', (c) => { got += c.length; if (onProgress && total) onProgress(Math.round((got / total) * 100)); });
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve(dest)));
      }).on('error', (e) => { file.close(); reject(e); });
    };
    go(url);
  });

let progressWindow = null;
const showProgress = (text) => {
  try {
    if (!progressWindow || progressWindow.isDestroyed()) {
      progressWindow = new BrowserWindow({
        width: 460, height: 170, resizable: false, minimizable: false, maximizable: false,
        title: 'QIS HR System — Update', alwaysOnTop: true,
        webPreferences: { nodeIntegration: false, contextIsolation: true },
      });
      progressWindow.setMenuBarVisibility(false);
    }
    progressWindow.loadURL(
      'data:text/html;charset=utf-8,' +
      encodeURIComponent(
        `<body style="font-family:Segoe UI,Arial;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">` +
        `<div style="text-align:center"><div style="font-size:34px">⬇️</div>` +
        `<div style="font-size:15px;font-weight:600;margin-top:10px">${text}</div></div></body>`
      )
    );
  } catch (e) { console.warn('progress window fail:', e.message); }
};

const checkForUpdate = async (parentWindow) => {
  try {
    const rel = await getJson(API);
    const current = app.getVersion();
    const tag = rel.tag_name || '';
    console.log(`[updater] current v${current} | latest ${tag}`);
    if (!tag || !isNewer(tag, current)) return null;

    // installer asset dhoondo (EXE/MSI) — zip update ke liye kaam ka nahi
    const asset = (rel.assets || []).find((a) => /\.(exe|msi)$/i.test(a.name || ''));
    const choice = await dialog.showMessageBox(parentWindow, {
      type: 'info',
      title: 'Naya version available',
      message: `🎉 Naya version ${tag} aa gaya hai!`,
      detail:
        `Aap ka current version: v${current}\n` +
        (rel.body ? `\nKya naya hai:\n${String(rel.body).slice(0, 600)}\n` : '') +
        (asset ? '\n"Install now" par app band ho kar naya version khud install ho jaye ga.' : '\n(Note: is release mein installer file nahi mili — GitHub se khud download karein.)'),
      buttons: asset ? ['Install now', 'Later'] : ['OK'],
      defaultId: 0,
      cancelId: asset ? 1 : 0,
    });
    if (!asset || choice.response !== 0) return null;

    const dest = path.join(os.tmpdir(), asset.name);
    showProgress(`Download ho raha hai… 0%`);
    await download(asset.browser_download_url, dest, (p) => {
      if (p % 10 === 0) showProgress(`Download ho raha hai… ${p}%`);
    });
    if (progressWindow && !progressWindow.isDestroyed()) { progressWindow.close(); progressWindow = null; }

    console.log('[updater] installer:', dest);
    // NSIS silent install — guide §9: /SILENT (skipifsilent hata dein taake relaunch ho)
    const child = spawn(dest, ['/SILENT'], { detached: true, stdio: 'ignore' });
    child.unref();
    setTimeout(() => app.exit(0), 1200); // app band → installer kaam kare
    return tag;
  } catch (e) {
    console.warn('[updater] check fail:', e.message);
    return null;
  }
};

const startAutoUpdate = (parentWindow) => {
  setTimeout(() => { void checkForUpdate(parentWindow); }, FIRST_CHECK_MS); // ⭐ 10 sec baad
  setInterval(() => { void checkForUpdate(parentWindow); }, CHECK_INTERVAL_MS);
};

module.exports = { startAutoUpdate, checkForUpdate, isNewer };
