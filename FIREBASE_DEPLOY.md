# 🌐 Poori app mobile browser mein — Firebase Hosting (QIS HR v5)

**Goal:** Mobile browser mein bilkul WAHI full app khule jo PC par chalti hai —
sab pages (Employees, Visa, Accounts & Expenses, Reports, Users, Backup),
sab design, sab colours. Koi clone nahi, **asli app**.

```
Asli React app (npm run build → dist)  →  Firebase Hosting par upload
        ↓
Mobile browser mein URL kholein  →  wahi full app
        ↓
Data Firebase Realtime Database se LIVE (PC app bhi wahi node use karti hai)
```

> Aap ka project: **ishaq-old** · `.firebaserc` mein pehle se set hai
> (`firebase deploy` bina `--project` ke chal jaye ga).

---

## STEP 1 — Firebase CLI install (sirf 1 baar)

```bash
npm install -g firebase-tools
```

## STEP 2 — Login

```bash
firebase login
```
Browser khule ga → wahi Google account chunein jo **ishaq-old** ka owner hai → **Allow**.

## STEP 3 — Project folder mein jayen

```bash
cd <app-folder>        # jahan firebase.json hai
```

## STEP 4 — Build

```bash
npm install
npm run build          # dist/ banega (single index.html — images/CSS/JS sab andar inline)
```

## STEP 5 — Deploy

```bash
firebase deploy --only hosting
```

Aakhir mein yeh aaye ga:
```
✔ Deploy complete!
Hosting URL: https://ishaq-old.web.app
```

> Ek shortcut bhi hai: **`npm run deploy`** (build + deploy dono).

---

## ✅ DONE! Mobile par kholein

1. Mobile browser kholein
2. URL: **https://ishaq-old.web.app**
3. Login: **admin / admin123** (ya apna banaya hua user)
4. Sab pages — bilkul PC jaisa, aur data **live** (PC par add karein → mobile par 1-2 sec mein)

Top bar par badge: **☁️ FIREBASE LIVE • 21:05:09**

---

## ⚠️ Pehle yeh zaroori hai (warna hosting deploy hoga magar data nahi chale ga)

`FIREBASE_SETUP.md` ka **STEP 0** aur **STEP 2**:

1. **Realtime Database create** karein (abhi 404 aa raha hai — maine check kiya tha)
2. `databaseURL` `src/firebase/config.ts` mein sahi paste karein
3. **Rules publish** karein (`database.rules.json` wali)

---

## ⚠️ Browser mein kya kaam NAHI kare ga (sirf PC/Electron)

| Cheez | Browser? |
|---|---|
| Employee add/edit/search, visa documents | ✅ |
| Accounts: cheque, expense, overdue (jama) | ✅ |
| Reports, CSV/PDF export | ✅ |
| Users, settings, backup JSON download/restore | ✅ |
| **Auto backup `D:\HR Backup`** (local folder) | ❌ sirf Electron |
| **Local LAN server** (bina internet) | ❌ sirf Electron |
| **EXE auto-update** (GitHub Releases) | ❌ sirf Electron |

---

## 🔄 Update karne ka tareeqa (baad mein)

```bash
# code change karein
npm run deploy          # build + hosting par naya version
```
URL wahi rahe ga, version turant live.

> Version history `VERSION.md` mein — har update par version barhayein
> (`package.json` → version + `src/firebase/config.ts` → `APP_VERSION`).

---

## 🩺 Agar masla aaye

| Symptom | Wajah / Hal |
|---|---|
| `Error: Failed to get Firebase project` | `firebase login` dobara, ya `firebase use ishaq-old` |
| `Not in a Firebase project directory` | `firebase.json` wale folder mein se chalayein |
| Page khulta hai magar 🖥️ **LAN MODE** dikhta hai | RTDB nahi mili → `databaseURL` check karein (STEP 0) |
| `permission denied` | Rules publish nahi huin → `database.rules.json` paste karein |
| Purana version khul raha hai | Hard refresh (mobile: browser cache clear), `index.html` par no-cache header pehle se laga hai |
