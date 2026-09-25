# 🖥️ Queen International School HR System — EXE Build Guide

## Step by Step Instructions (Windows 10/11)

---

## 📋 Requirements

Install these FIRST (if not installed):

### 1. Node.js
- Download: https://nodejs.org/
- Click **LTS version** (Green button)
- Install (Next Next Next)
- Verify: Open CMD → type `node --version`

### 2. Git (Optional)
- Download: https://git-scm.com/
- Install with default settings

---

## 🚀 BUILD STEPS

### Step 1: Open Command Prompt
```
Win + R → type "cmd" → Enter
```

### Step 2: Go to project folder
```bash
cd C:\path\to\your\project-folder
```

### Step 3: Build the web app
```bash
npm install
npm run build
```
This creates the `dist` folder with `index.html`

### Step 4: Go to electron folder
```bash
cd electron
```

### Step 5: Install Electron
```bash
npm install
```

### Step 6: Test it first
```bash
npm start
```
App should open as a desktop window! Close it.

### Step 7: Build the EXE Installer
```bash
npm run build-installer
```

### Step 8: Find your installer
```
electron/installer/QIS_HR_System_Setup_1.0.0.exe
```

---

## 📱 MOBILE BROWSER LAN ACCESS (WIFI SYNCHRONIZATION)

Your HR System now supports **Real-time Mobile Access** over the same wireless router network!

### How it works:
1. **Central Database Server:** When you run the PC app, it automatically starts a secure, lightweight database server on port `3000` on your PC.
2. **Auto IP Fetching:** The PC app will automatically detect your PC's IP address on your wireless network.
3. **Sidebar Indicator:** You will see a beautiful orange box at the bottom of your sidebar showing your exact mobile access URL, for example: `http://192.168.1.50:3000`.
4. **Real-time Sync:** Open this link in your mobile or tablet browser. Any employee you add or any accounting changes you make on mobile will **instantly** save to your PC's database and backup folder! Likewise, any changes made on the PC will show up on mobile immediately!

### Step-by-Step Mobile Setup:
1. Connect your PC and your phone/tablet to the **same wireless router (Wi-Fi)**.
2. Launch the HR System on your PC.
3. Look at the bottom of the sidebar on your PC to see your **Mobile Web Access URL**.
4. Type that URL (e.g. `http://192.168.1.XX:3000`) into your phone's Safari, Chrome, or any mobile browser.
5. Log in using your credentials (`admin`/`admin123` or `staff`/`staff123`).
6. Done! Both screens are now live and synchronized!

---

## 📦 WHAT YOU GET

```
electron/
└── installer/
    └── QIS_HR_System_Setup_1.0.0.exe   ← THIS IS YOUR INSTALLER!
```

---

## 📤 SHARE WITH OTHERS

### Send to another person:
1. Copy `QIS_HR_System_Setup_1.0.0.exe` to USB/email/WhatsApp
2. Person double-clicks the EXE
3. Install wizard opens → Next → Next → Install
4. Desktop shortcut appears → Double click → App runs!

### Transfer data between PCs:
1. **PC 1:** Open app → Backup & Restore → Create Backup
2. Copy the `.json` backup file to USB
3. **PC 2:** Open app → Backup & Restore → Restore → Select file
4. Done! Same data on both PCs!

---

## 🔧 TROUBLESHOOTING

### "npm not found"
→ Install Node.js from https://nodejs.org/ and restart CMD

### "electron not found"
→ Run `npm install` inside the electron folder

### Build failed
→ Try: `npm cache clean --force` then `npm install` again

### App shows white screen
→ Make sure you ran `npm run build` in the main project folder first

---

## 📁 FOLDER STRUCTURE

```
project-folder/
├── src/                    ← Source code
├── dist/
│   └── index.html          ← Built app (single file)
├── electron/
│   ├── main.js             ← Desktop wrapper
│   ├── package.json         ← Electron config
│   ├── icon.ico            ← App icon (add your own)
│   └── installer/
│       └── QIS_HR_Setup.exe ← Final installer!
├── package.json
└── BUILD_EXE_GUIDE.md      ← This file
```

---

## 🔄 UPDATE APP

To update the app after changes:
```bash
# In main project folder:
npm run build

# In electron folder:
cd electron
npm run build-installer
```

New installer will be created with latest changes.

---

## 💡 QUICK COMMANDS SUMMARY

```bash
# First time setup:
npm install                    # Install web dependencies
npm run build                  # Build web app
cd electron
npm install                    # Install electron
npm start                      # Test desktop app
npm run build-installer        # Create EXE installer

# After making changes:
cd ..                          # Go back to main folder
npm run build                  # Rebuild web app
cd electron
npm run build-installer        # Rebuild EXE
```

---

## ✅ DONE!

Your installer is ready at:
`electron/installer/QIS_HR_System_Setup_1.0.0.exe`

Send this single file to anyone — they install it and it works!

© 2024 Queen International School
