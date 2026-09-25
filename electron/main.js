// ============================================
// Queen International School - HR System
// Electron Desktop App Wrapper
// Spawns Central LAN Web Server and Database
// Loads UI directly from file system for 100% startup reliability
// ============================================

const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// Start the Central API & Web Server in background
const { startServer, getLocalIP } = require('./server.js');
// ⭐ Auto-update (GitHub Releases — guide §9)
const { startAutoUpdate, checkForUpdate } = require('./updater.js');
const PORT = 3000;

try {
  startServer(PORT);
} catch (err) {
  console.error('Error starting background server:', err);
}

let mainWindow;

// ======== DIST PATH ========
function getDistPath() {
  const paths = [
    path.join(__dirname, '..', 'dist', 'index.html'),
    path.join(__dirname, 'dist', 'index.html'),
    path.join(process.resourcesPath || '', 'dist', 'index.html'),
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return paths[0];
}

// ======== CREATE WINDOW ========
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Queen International School - HR & Visa Management',
    icon: fs.existsSync(path.join(__dirname, 'icon.ico')) ? path.join(__dirname, 'icon.ico') : undefined,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      devTools: true,
      webSecurity: false, // Allows calling http://localhost:3000 from local file://
    },
    autoHideMenuBar: false,
    show: false,
    backgroundColor: '#F6F7FB',
  });

  // Load the local compiled UI file directly for 100% uptime (no white screens)
  const distPath = getDistPath();
  console.log('Loading compiled UI from path:', distPath);
  
  if (fs.existsSync(distPath)) {
    mainWindow.loadFile(distPath);
  } else {
    // If not found, load from server as fallback
    mainWindow.loadURL(`http://localhost:${PORT}`);
  }

  // F12, Ctrl+Shift+I and Ctrl+Shift+J are enabled to toggle DevTools for easy error sharing
  mainWindow.webContents.on('before-input-event', (event, input) => {
    const key = (input.key || '').toLowerCase();
    if (input.key === 'F12' || (input.control && input.shift && (key === 'i' || key === 'j'))) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  // Register global shortcuts for DevTools
  const { globalShortcut } = require('electron');
  globalShortcut.register('F12', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools();
    }
  });
  globalShortcut.register('CommandOrControl+Shift+I', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools();
    }
  });
  globalShortcut.register('CommandOrControl+Shift+J', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.toggleDevTools();
    }
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.maximize();
    // ⭐ Auto-update: 8s baad pehli check, phir har 6 ghante
    try { startAutoUpdate(mainWindow); } catch (e) { console.warn('auto-update start fail:', e.message); }
  });

  // Setup Menu
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        { label: 'Refresh', accelerator: 'F5', click: () => mainWindow.reload() },
        { label: 'Developer Tools', accelerator: 'F12', click: () => mainWindow.webContents.toggleDevTools() },
        { type: 'separator' },
        {
          label: 'Mobile Connection Info',
          accelerator: 'Ctrl+M',
          click: () => {
            const ip = getLocalIP();
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Mobile Browser Access',
              message: `📱 Mobile Web Access is Active!`,
              detail: `To open the app on your mobile/tablet:\n\n1. Connect your phone to the same Wi-Fi router as this PC.\n2. Open your phone browser and enter this link:\n\nhttp://${ip}:${PORT}\n\nAny changes made on mobile are saved instantly to this PC!`,
            });
          }
        },
        { type: 'separator' },
        { label: 'Exit', accelerator: 'Alt+F4', click: () => app.quit() },
      ],
    },
    {
      label: 'View',
      submenu: [
        { label: 'Zoom In', accelerator: 'Ctrl+=', role: 'zoomIn' },
        { label: 'Zoom Out', accelerator: 'Ctrl+-', role: 'zoomOut' },
        { label: 'Reset Zoom', accelerator: 'Ctrl+0', role: 'resetZoom' },
        { type: 'separator' },
        { label: 'Full Screen', accelerator: 'F11', role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Check for Update…',
          click: () => { void checkForUpdate(mainWindow); },
        },
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About',
              message: 'Queen International School',
              detail: `HR & Visa Management System\nVersion ${app.getVersion()}\n\n© 2026 Queen International School\n\nCentral Server IP: http://${getLocalIP()}:${PORT}\nReal-time backup is enabled to D:\\HR Backup\\HR_Auto_Backup.json`,
            });
          },
        },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
