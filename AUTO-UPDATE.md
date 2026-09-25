# 🔄 Auto-Update — client ko khud pata chal jaye ga

Guide §9 ke mutabiq: **EXE app khud GitHub Releases check karti hai**, naya version
mila to popup dikhati hai, aur "Install now" par **app band → silent install → naya
version khud chalu**.

```
App start  ──(8 sec baad)──►  GET api.github.com/repos/Zia6075/old-QIS/releases/latest
                                        │
                            tag_name (v5.7.0) > app version (5.6.0)?
                                        │
                        ┌───────────────┴───────────────┐
                        │ NAHI                          │ HAAN
                        │ kuch nahi hota                ▼
                        └──────────────►   🎉 "Naya version v5.7.0 aa gaya hai!"
                                           [ Install now ]  [ Later ]
                                                  │
                                                  ▼
                                    EXE download (progress window)
                                                  │
                                                  ▼
                                    app band → installer /SILENT → naya version
```

- **Check kab:** app start ke 8 sec baad, phir **har 6 ghante**
- **Manual:** menu → **Help → Check for Update…**
- **Files:** `electron/updater.js` (logic), `electron/main.js` (wiring)
- **Version compare:** `v5.7.0` vs `5.6.0` — test: 36 passed (`isNewerVersion`)

---

## ⚠️ Zaroori: release mein **EXE** honi chahiye

Popup mein "Install now" tab hi aata hai jab release mein `.exe` / `.msi` asset ho.
Is liye release aise banayein:

```bat
START.bat            ⭐ ya:  npm run all
```
Step [4/8] `npm run dist` chalata hai (EXE banti hai) aur step [6/8] us EXE + zip
dono ko GitHub Release mein upload kar deta hai.

> Agar sirf `npm run dist:publish` chalayein aur `electron/installer/` mein EXE na ho,
> to release mein sirf zip jaye gi → client ko popup to dikhe ga magar "Install now"
> ke bajaye sirf "OK" (kyunke installer maujood nahi).

---

## 🏷️ Version tag (client ko har baar nazar aaye)

| Kahan | Kya dikhta hai |
|---|---|
| **Sidebar** (upar, "HR System" ke saath) | `v5.7.0` |
| **Top bar** (right side) | `v5.7.0` — hover par pura detail |
| **Login page** (bare title ke saath) | `v5.7.0` |
| **Help → About** | `Version 5.7.0` |

Version ek jagah se aata hai: `src/firebase/config.ts` → `APP_VERSION`
(release script khud update karti hai — `package.json` + `electron/package.json` ke saath).

---

## ☁️ Firebase par "last sync" LIVE

Top bar par badge har **2 second** refresh hota hai:

```
☁️ LIVE SYNC • abhi          (5 sec se kam)
☁️ LIVE SYNC • 23s pehle
☁️ LIVE SYNC • 4m pehle
🖥️ LAN MODE                 (Firebase nahi mila)
```

Aur Firebase console mein bhi wahi time likha rehta hai:

```
sync/{owner}/meta
   ├── lastSync   : "2026-09-01 20:15:32"     ← LOCAL time (readable)
   ├── lastSyncMs : 1788295532145             ← numeric (compare ke liye)
   ├── deviceName : "PC-Chrome"
   ├── version    : "5.7.0"                   ← kaun sa version sync kar raha hai
   └── app        : "QIS HR & Visa System"
```

> Write storm se bachne ke liye meta **1 second** mein ek dafa se zyada nahi likha jata
> (guide ka "coalescing" sabak).

---

## 🧪 Test

```bash
npm test
```
- sync logic → **36 passed** (isme 6 auto-update version-compare ke)
- overdue rule → **25 passed**
- perf → round trips + duplicates regression

> Jo test nahi ho saka: asal installer download/install — kyun ke woh Windows + EXE
> mangta hai. Logic (version compare, download, silent flags) code mein hai aur
> syntax check pass hai.
