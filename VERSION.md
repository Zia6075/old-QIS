# 📌 QIS HR System — Version File

> Har update isi file mein record hoga. **Ab version khud banta hai** — `npm run release:prepare`
> chalayein, yeh row aur section script khud add kar deti hai (detail: `RELEASE.md`).

| Version | Date | Zip file | Kya naya tha |
|---------|------------|----------------------------------------|---------------------------------------------------------------------------------|
| v1 | 2026-06-22 | `old HR-Visa-System-Fixed.zip` | Base system (HR + Visa + Accounting, cheque/expense) |
| v2 | 2026-08-25 | `HR-Visa-System-v2.zip` | Overdue par expense BLOCK (❌ yeh galat tha — v3 mein wapas le liya) |
| v3 | 2026-08-25 | `HR-Visa-System-v3.zip` | Overdue par bhi expense add hota rahe, overdue amount usi cheque par JAMA |
| v4 | 2026-08-27 | `HR-Visa-System-v4.zip` | Purane (locked/exhausted) cheques khud-ba-khud UNLOCK |
| v5.0.0 | 2026-09-01 | `HR-Visa-System-v5.zip` | ⭐ Firebase LIVE SYNC + Firebase HOSTING (mobile browser) + purana data import |
| **v5.1.0** | **2026-09-01** | **`HR-Visa-System-v5.1.0.zip`** | **⭐ Auto-versioning + GitHub Releases — ek command mein version, changelog, build, zip, tag, release (RELEASE.md)** |
| **v5.2.0** | **2026-09-01** | **`HR-Visa-System-v5.2.0.zip`** | Release system: npm run release:prepare se khud version bump + changelog + build + zip + git tag, aur npm run release se GitHub Release (client ko naya version dikhta hai) |
| **v5.3.0** | **2026-09-01** | **`HR-Visa-System-v5.3.0.zip`** | Mukamal setup: Firebase live verified (sync node cloud par), ek-click .bat scripts (EXE + GitHub + Hosting), setup script jo rules/URL khud theek karta hai |
| **v5.4.0** | **2026-09-01** | **`HR-Visa-System-v5.4.0.zip`** | Cloud structure khud ban jata hai (NMP app jaisa): employees/cheques/expenses/users/logs + meta + _map; _placeholder UI se chhupaya; naya doc FIREBASE_DATA_STRUCTURE.md |
| **v5.5.0** | **2026-09-01** | **`HR-Visa-System-v5.5.0.zip`** | Speed release: 14 bugs fix (startup foran, 7 round trips -> 1, har write ka double meta khatam, seeding bulk, duplicates ka bug, Safari dates, local cache upsert) |
| **v5.6.0** | **2026-09-01** | **`HR-Visa-System-v5.6.0.zip`** | SAB KUCH EK COMMAND: START.bat / npm run all — install, Firebase setup, version, EXE, GitHub token pause, release upload, Hosting deploy, browser auto-open (6 .bat ki jagah 1) |
| **v5.7.0** | **2026-09-01** | **`HR-Visa-System-v5.7.0.zip`** | AUTO-UPDATE: client ko popup (Install now/Later) + silent install + relaunch; version tag (sidebar/topbar/login/about); Firebase par last sync time LIVE (meta.lastSync/lastSyncMs) |
| **v5.8.0** | **2026-09-01** | **`HR-Visa-System-v5.8.0.zip`** | LOGIN-BASED: anonymous band (sirf app users, security), ek hi data source (Firebase) - LAN fallback OFF, purana PC data + images ek click mein cloud par, imageStats diagnostics, dataOwner multi-user |
| **v5.8.1** | **2026-09-01** | **`HR-Visa-System-v5.8.1.zip`** | Version wapas simple sequence par: v5.8.0 -> v5.8.1 (har update par khud +1, GitHub par saaf) |
| **v5.8.2** | **2026-09-01** | **`HR-Visa-System-v5.8.2.zip`** | "User not found" FIX: getRecordByIndex/getRecord/getAllRecords miss par fresh retry (khali cache bug); null snapshot cache nahi hota; Dashboard par purane PC data ka banner + ek-click LAN->Firebase import; live test (npm run test:live) add |
| **v5.8.3** | **2026-09-02** | **`HR-Visa-System-v5.8.3.zip`** | API key SUSPENDED recovery: RECOVERY-API-SUSPENDED.md + app mein saaf error message (Google ka suspension, app ka bug nahi) |
| **v5.8.4** | **2026-09-02** | **`HR-Visa-System-v5.8.4.zip`** | OFFLINE MODE: Firebase suspend/down ho to app rukti nahi - local users se login, LAN data, amber banner; init mein asli write-verify; har Firebase call par 10s timeout (deactivated DB par SDK hang karta tha) |
| **v5.8.5** | **2026-09-02** | **`HR-Visa-System-v5.8.5.zip`** | scripts/set-firebase-config.mjs: naya Firebase project ki config ek command mein (RECOVERY-API-SUSPENDED.md mein RASTA A reinstate + RASTA B naya project) |
| **v5.8.6** | **2026-09-02** | **`HR-Visa-System-v5.8.6.zip`** | PREVENT-SUSPENSION.md: suspension ki asal wajah (anonymous sign-up burst), purana vs naya account ka sach, bachne ke 7 usool, Blaze plan ka mashwara |
| **v5.9.0** | **2026-09-02** | **`HR-Visa-System-v5.9.0.zip`** | LOGIN: 2 modes (Cloud email/password + Local admin) - anonymous bilkul khatam, har session par login zaroori (auto-login band), app local se foran start, cloud login ke baad connect; timeouts tez (4s/6s) |
| **v5.10.0** | **2026-09-02** | **`HR-Visa-System-v5.10.0.zip`** | NAYA Firebase project (ishaq-old): config update, admin/staff accounts khud banaye, databaseURL AUTO-DETECT (region khud pakadta hai), region-warning bug fix, error 14s->1.3s, saaf rules message |
| **v5.11.0** | **2026-09-02** | **`HR-Visa-System-v5.11.0.zip`** | 2 emails (ishaq/queenschool) allowed - sab users ek hi shared data node; REMEMBER ME default ON (logout tak session yaad, local+cloud dono); RULES.md (RTDB + Firestore); Firestore rules = full deny |
| **v5.12.0** | **2026-09-02** | **`HR-Visa-System-v5.12.0.zip`** | BLINKING FIX: asal wajah 98.6 MB data (full-size images) - cache-first reads, connect par heavy downloads khatam (22s->2.7s), images compress tool (Backup page), safeRead se crash khatam, purana project (ishaq-1985) ke sab references hata kar ishaq-old, deploy command ishaq-old par |
| **v5.12.1** | **2026-09-02** | **`HR-Visa-System-v5.12.1.zip`** | DEPLOY.bat (ek double-click: CLI install + login + build + deploy ishaq-old) + RESET-PASSWORD.bat + login error par seedha hal (hint) |
| **v5.12.2** | **2026-09-02** | **`HR-Visa-System-v5.12.2.zip`** | Data khud compress kiya: 99.32 MB -> 26.77 MB (73% kam), 77 employees + 306 images intact; reads timeout khatam (poora data 7.3s) = blinking khatam; scripts/compress-firebase-images.cjs project mein shamil |
| **v5.12.3** | **2026-09-25** | **`HR-Visa-System-v5.12.3.zip`** | READ ONLY MODE: browser/web se sirf dekhna (Add/Edit/Delete block - UI + database layer + RTDB rules), PC application se full control; 11 naye read-only tests |
| **v5.12.4** | **2026-09-25** | **`HR-Visa-System-v5.12.4.zip`** | Firebase downloads 99% kam: images alag media/{id} node mein (employees 26MB->0.22MB, list load 2.2s), on-demand media loading, personThumb avatar, getRecordDirect; git commit message quoting fix (Windows), .gitattributes |
| **v5.14.1** | **2026-09-25** | **`HR-Visa-System-v5.14.1.zip`** | CRITICAL FIXES: (1) read-only emails (ishaq/queenschool) login fail ho rahe thay - init ab READ verify karta hai write nahi, is liye web par data khali tha; (2) cheque/receipt images media node se load; (3) SAFETY GUARD - record kabhi adhoora save nahi hoga (corruption se bachao); (4) version/zip naam match; (5) LAN MODE -> CLOUD/LOCAL/OFFLINE saaf labels |
| **v5.14.2** | **2026-09-25** | **`HR-Visa-System-v5.14.2.zip`** | IMAGE UPLOAD FIXES: (1) saveMedia ab sirf changed fields likhta hai - pehle ek image save karne se baqi (passport/visa/labour) WIPE ho jati thin, yehi 3-4 images missing hone ki wajah thi; (2) media save fail par error ab chhupta nahi; (3) ImageUpload limit 5MB->25MB (phone photos fail hoti thin) + behtar error messages |
| **v5.14.3** | **2026-09-25** | **`HR-Visa-System-v5.14.3.zip`** | VERSION FIX: single source of truth (scripts/version.mjs) - release.mjs aur all.mjs dono ab same default (patch) use karte hain, is liye 5.14.2 vs 5.15.0 wala confusion khatam; release se pehle aur baad mein verify (mismatch par release fail); git remote/push robust + clear auth guidance |
| **v5.14.4** | **2026-09-25** | **`HR-Visa-System-v5.14.4.zip`** | IMAGE UPLOAD FIX (asal wajah): employeeService mein apna PURANA inline splitMedia tha jo undefined fields ko media mein bhej kar images WIPE kar deta tha - ab shared helper (undefined = field mat chhedo); employee ke media writes bhi targeted-fields par (read-modify-write wipe khatam); edit modal mein images-loading banner + save block |
| **v5.14.5** | **2026-09-25** | **`HR-Visa-System-v5.14.5.zip`** | WHITE SCREEN FIX: formatCurrency(undefined) TypeError phenkta tha (corrupt records mein amount undefined) -> poora Accounts section crash; ab null/NaN safe (AED -). Record mein id na ho to RTDB key se auto-fill (delete/edit ho sake). Corrupt records list mein saaf nazar ate hain |
| **v5.14.7** | **2026-09-25** | **`HR-Visa-System-v5.14.7.zip`** | GITHUB PUSH FIX (CRITICAL): git push ab token ke saath hota hai - pehle github_token.txt sirf API ke liye use hota tha is liye source code kabhi push nahi hua (repo mein sirf README tha); git identity auto-set; branch -M main commit ke baad. AUTO-UPDATE: app khulne ke 10 sec baad check + phir har 30 min (pehle 6 ghante) |
| **v5.14.8** | **2026-09-25** | **`HR-Visa-System-v5.14.8.zip`** | WHITE SCREEN FIX #2: formatCurrency theek kiya tha magar 3 aur jagah seedha .toLocaleString() tha (AccountingFullPage/AccountingPage/AddTransactionPage dropdown .map mein) - corrupt records par crash; ab safeNumber/formatNumber helpers + corrupt cheques dropdown se filter. Login page par account-permission hint (admin=full, gmail=read only) |
| **v5.14.9** | **2026-09-25** | **`HR-Visa-System-v5.14.9.zip`** | READ-ONLY mein image upload field ab BILKUL nahi dikhta - guard ImageUpload component ke andar laga (ek jagah, saare 15 usages cover, kahin chhootne ka khatra nahi); PC EXE (Electron) par upload pehle jaisa chalta rahe ga; BackupPage ka file-input bhi read-only mein chhupa |
| **v5.14.10** | **2026-09-25** | **`HR-Visa-System-v5.14.10.zip`** | Naya update |
| v? | (agli update) | `HR-Visa-System-v?.zip` | `npm run release:prepare` se khud ban jaye ga |

---

## v5.14.10 — 2026-09-25

Naya update

## v5.14.9 — 2026-09-25

READ-ONLY mein image upload field ab BILKUL nahi dikhta - guard ImageUpload component ke andar laga (ek jagah, saare 15 usages cover, kahin chhootne ka khatra nahi); PC EXE (Electron) par upload pehle jaisa chalta rahe ga; BackupPage ka file-input bhi read-only mein chhupa

## v5.14.8 — 2026-09-25

WHITE SCREEN FIX #2: formatCurrency theek kiya tha magar 3 aur jagah seedha .toLocaleString() tha (AccountingFullPage/AccountingPage/AddTransactionPage dropdown .map mein) - corrupt records par crash; ab safeNumber/formatNumber helpers + corrupt cheques dropdown se filter. Login page par account-permission hint (admin=full, gmail=read only)

## v5.14.7 — 2026-09-25

GITHUB PUSH FIX (CRITICAL): git push ab token ke saath hota hai - pehle github_token.txt sirf API ke liye use hota tha is liye source code kabhi push nahi hua (repo mein sirf README tha); git identity auto-set; branch -M main commit ke baad. AUTO-UPDATE: app khulne ke 10 sec baad check + phir har 30 min (pehle 6 ghante)

## v5.14.5 — 2026-09-25

WHITE SCREEN FIX: formatCurrency(undefined) TypeError phenkta tha (corrupt records mein amount undefined) -> poora Accounts section crash; ab null/NaN safe (AED -). Record mein id na ho to RTDB key se auto-fill (delete/edit ho sake). Corrupt records list mein saaf nazar ate hain

## v5.14.4 — 2026-09-25

IMAGE UPLOAD FIX (asal wajah): employeeService mein apna PURANA inline splitMedia tha jo undefined fields ko media mein bhej kar images WIPE kar deta tha - ab shared helper (undefined = field mat chhedo); employee ke media writes bhi targeted-fields par (read-modify-write wipe khatam); edit modal mein images-loading banner + save block

## v5.14.3 — 2026-09-25

VERSION FIX: single source of truth (scripts/version.mjs) - release.mjs aur all.mjs dono ab same default (patch) use karte hain, is liye 5.14.2 vs 5.15.0 wala confusion khatam; release se pehle aur baad mein verify (mismatch par release fail); git remote/push robust + clear auth guidance

## v5.14.2 — 2026-09-25

IMAGE UPLOAD FIXES: (1) saveMedia ab sirf changed fields likhta hai - pehle ek image save karne se baqi (passport/visa/labour) WIPE ho jati thin, yehi 3-4 images missing hone ki wajah thi; (2) media save fail par error ab chhupta nahi; (3) ImageUpload limit 5MB->25MB (phone photos fail hoti thin) + behtar error messages

## v5.14.1 — 2026-09-25

CRITICAL FIXES: (1) read-only emails (ishaq/queenschool) login fail ho rahe thay - init ab READ verify karta hai write nahi, is liye web par data khali tha; (2) cheque/receipt images media node se load; (3) SAFETY GUARD - record kabhi adhoora save nahi hoga (corruption se bachao); (4) version/zip naam match; (5) LAN MODE -> CLOUD/LOCAL/OFFLINE saaf labels

## v5.12.4 — 2026-09-25

Firebase downloads 99% kam: images alag media/{id} node mein (employees 26MB->0.22MB, list load 2.2s), on-demand media loading, personThumb avatar, getRecordDirect; git commit message quoting fix (Windows), .gitattributes

## v5.12.3 — 2026-09-25

READ ONLY MODE: browser/web se sirf dekhna (Add/Edit/Delete block - UI + database layer + RTDB rules), PC application se full control; 11 naye read-only tests

## v5.12.2 — 2026-09-02

Data khud compress kiya: 99.32 MB -> 26.77 MB (73% kam), 77 employees + 306 images intact; reads timeout khatam (poora data 7.3s) = blinking khatam; scripts/compress-firebase-images.cjs project mein shamil

## v5.12.1 — 2026-09-02

DEPLOY.bat (ek double-click: CLI install + login + build + deploy ishaq-old) + RESET-PASSWORD.bat + login error par seedha hal (hint)

## v5.12.0 — 2026-09-02

BLINKING FIX: asal wajah 98.6 MB data (full-size images) - cache-first reads, connect par heavy downloads khatam (22s->2.7s), images compress tool (Backup page), safeRead se crash khatam, purana project (ishaq-1985) ke sab references hata kar ishaq-old, deploy command ishaq-old par

## v5.11.0 — 2026-09-02

2 emails (ishaq/queenschool) allowed - sab users ek hi shared data node; REMEMBER ME default ON (logout tak session yaad, local+cloud dono); RULES.md (RTDB + Firestore); Firestore rules = full deny

## v5.10.0 — 2026-09-02

NAYA Firebase project (ishaq-old): config update, admin/staff accounts khud banaye, databaseURL AUTO-DETECT (region khud pakadta hai), region-warning bug fix, error 14s->1.3s, saaf rules message

## v5.9.0 — 2026-09-02

LOGIN: 2 modes (Cloud email/password + Local admin) - anonymous bilkul khatam, har session par login zaroori (auto-login band), app local se foran start, cloud login ke baad connect; timeouts tez (4s/6s)

## v5.8.6 — 2026-09-02

PREVENT-SUSPENSION.md: suspension ki asal wajah (anonymous sign-up burst), purana vs naya account ka sach, bachne ke 7 usool, Blaze plan ka mashwara

## v5.8.5 — 2026-09-02

scripts/set-firebase-config.mjs: naya Firebase project ki config ek command mein (RECOVERY-API-SUSPENDED.md mein RASTA A reinstate + RASTA B naya project)

## v5.8.4 — 2026-09-02

OFFLINE MODE: Firebase suspend/down ho to app rukti nahi - local users se login, LAN data, amber banner; init mein asli write-verify; har Firebase call par 10s timeout (deactivated DB par SDK hang karta tha)

## v5.8.3 — 2026-09-02

API key SUSPENDED recovery: RECOVERY-API-SUSPENDED.md + app mein saaf error message (Google ka suspension, app ka bug nahi)

## v5.8.2 — 2026-09-01

"User not found" FIX: getRecordByIndex/getRecord/getAllRecords miss par fresh retry (khali cache bug); null snapshot cache nahi hota; Dashboard par purane PC data ka banner + ek-click LAN->Firebase import; live test (npm run test:live) add

## v5.8.1 — 2026-09-01

Version wapas simple sequence par: v5.8.0 -> v5.8.1 (har update par khud +1, GitHub par saaf)




## v5.8.0 — 2026-09-01

LOGIN-BASED: anonymous band (sirf app users, security), ek hi data source (Firebase) - LAN fallback OFF, purana PC data + images ek click mein cloud par, imageStats diagnostics, dataOwner multi-user

## v5.7.0 — 2026-09-01

AUTO-UPDATE: client ko popup (Install now/Later) + silent install + relaunch; version tag (sidebar/topbar/login/about); Firebase par last sync time LIVE (meta.lastSync/lastSyncMs)

## v5.6.0 — 2026-09-01

SAB KUCH EK COMMAND: START.bat / npm run all — install, Firebase setup, version, EXE, GitHub token pause, release upload, Hosting deploy, browser auto-open (6 .bat ki jagah 1)

## v5.5.0 — 2026-09-01

Speed release: 14 bugs fix (startup foran, 7 round trips -> 1, har write ka double meta khatam, seeding bulk, duplicates ka bug, Safari dates, local cache upsert)

## Speed audit — 14 bugs mile aur theek hue (senior review)

| # | Sev | Bug | Fix |
|---|-----|-----|-----|
| 1 | 🔴 | App tab tak render nahi hoti thi jab tak Firebase + users + seeding + unlock sab na ho jaye (`App.tsx`) | App **foran** khulti hai, sab background mein; login `whenDatabaseReady()` ka intezar karta hai |
| 2 | 🔴 | Startup par **poora data node** download (images samet) sirf connectivity check ke liye | Halki `.info/connected` probe |
| 3 | 🔴 | `ensureStructure` ke **7 sequential round trips** | **1 read** + local diff (`computeStructurePatch`) |
| 4 | 🟠 | **Har** write par `writeMeta()` = 2x round trips | 1.5s throttle |
| 5 | 🟠 | Seeding 77 employees sequential (~154 round trips) startup par | Bulk multi-path write (`addRecordsBulk`) |
| 6 | 🟠 | Accounting pages same data **2 dafa** read karti thin | Ek hi `getAccountingStats()` call |
| 7 | 🟡 | Anonymous "restore" hamesha fail (refreshToken → signInWithCustomToken) | Hata diya — SDK khud persist karta hai |
| 8 | 🟡 | `formatDate` Safari par Invalid Date | `toSafeDateString()` |
| 9 | 🟡 | `unlockAllCheques` N sequential writes | Bulk write |
| 10 | 🟢 | Accounting page full-screen spinner | Page foran, chhota loading strip |
| 12 | 🟠 | Local save ke baad cache update nahi hota tha → naya record echo tak gayab, balance ghalat | Local upsert (dono providers) |
| 13 | 🔴 | LAN `addRecordsBulk` POST karta tha → **DUPLICATE records**; `getRecord` cache use hi nahi karta tha | Upsert semantics + store cache |
| 14 | 🟠 | Doosre device ka write LAN mode mein cache mein nahi aata tha | `refreshAllStores()` startup par |

**Natija (tests se):** 77 employees seed = 77 HTTP calls (pehle ~154) · warm cache par 4 reads = **0 calls** · bulk re-run par **0 duplicates** · unlock = 2 calls.

## v5.4.0 — 2026-09-01

Cloud structure khud ban jata hai (NMP app jaisa): employees/cheques/expenses/users/logs + meta + _map; _placeholder UI se chhupaya; naya doc FIREBASE_DATA_STRUCTURE.md

## v5.3.0 — 2026-09-01

Mukamal setup: Firebase live verified (sync node cloud par), ek-click .bat scripts (EXE + GitHub + Hosting), setup script jo rules/URL khud theek karta hai

## v5.2.0 — 2026-09-01

Release system: npm run release:prepare se khud version bump + changelog + build + zip + git tag, aur npm run release se GitHub Release (client ko naya version dikhta hai)

## v5.1.0 — 2026-09-01

Auto-versioning + GitHub Releases (RELEASE.md): ek command mein version bump, changelog, build, zip, tag aur GitHub release

## ⭐ v5 — Firebase live sync (1 Sep 2026)

Aap ki `FIREBASE_IMPLEMENTATION_GUIDE.md` ke principles ke mutabiq poora cloud sync.

### Naye files
| File | Kaam |
|------|------|
| `src/firebase/config.ts` | Aap ka Firebase config (`ishaq-old`) + `databaseURL` |
| `src/firebase/auth.ts` | Email/password token (+ anonymous fallback), token kabhi persist nahi |
| `src/firebase/syncUtils.ts` | PURE sync logic: sanitize, LOCAL time, tombstone, compare, chunking, diagnostics |
| `src/database/providers/dbFirebase.ts` | RTDB provider (per-record PATCH, tombstone, SSE listener, chunked import) |
| `src/database/providers/dbLan.ts` | Purana LAN server provider (fallback) |
| `src/database/db.ts` | Wahi purani API — ab provider switch karti hai (services/pages mein koi tabdeeli nahi) |
| `database.rules.json` / `firestore.rules` | Rules (console mein paste karne ke liye) |
| `FIREBASE_SETUP.md` | Step-by-step setup (RTDB create → rules → import → GitHub) |
| `scripts/github-release.mjs` | GitHub Releases par installer upload (guide §9, Node + fetch) |

### Kya badla
- **Live sync:** har record apne RTDB path par (`sync/{owner}/data/{collection}/{id}`),
  realtime listener se doosre device par 1-2 sec mein
- **Delete = tombstone** (`{deleted:true}`) — `remove()` kabhi nahi
- **`updatedAt` = LOCAL time** (`yyyy-MM-dd HH:mm:ss`) — UTC wali ghalti nahi
- **Images 600px / JPEG q78** (guide §7) — Storage ki zaroorat nahi
- **Top bar badge:** ☁️ FIREBASE LIVE • time  /  🖥️ LAN MODE
- **Purana data import:** Backup & Restore → Restore se poora JSON Firebase par (200KB batches)
- **Diagnostics:** `sync/{owner}/data/imagePatch` + `meta` (lastSync, device, version)
- **GitHub:** `.gitignore` + `npm run github-release` (repo `Zia6075/old-QIS`)

### 🌐 Firebase Hosting (mobile browser mein poori app)
`FULL-APP-DEPLOY-GUIDE.md` ke mutabiq — wahi full app mobile par:
- `firebase.json` (public: `dist`, SPA rewrite) + `.firebaserc` (project `ishaq-old`) + `.firebasehostingignore`
- **`npm run deploy`** = build + hosting upload
- Guide: **`FIREBASE_DEPLOY.md`** (CLI install → login → deploy → kya browser mein nahi chale ga)

### ⚠️ Zaroori
Aap ke project mein **Realtime Database abhi bani nahi** (maine check kiya:
`https://ishaq-old-default-rtdb.firebaseio.com/.json` → **404**).
`FIREBASE_SETUP.md` ka **STEP 0** pehle karein.

### Test result
- `node _test/run-sync-test.cjs` → **21 passed, 0 failed** (sync logic; is se chunking ka asli bug pakda gaya)
- `node _test/run-test.cjs` → **25 passed, 0 failed** (overdue rule, LAN provider ke saath)

---

## ⭐ v4 — kya badla (27 Aug 2026)

### Purana data unlock
v2 mein balance 0 / negative wale cheques `exhausted` / `overdue` par **lock** ho gaye the.
Ab app khulte hi ek migration chalti hai (`unlockAllCheques()` in `App.tsx`):

| Purana record | Ab |
|---|---|
| `status: 'exhausted'` (balance 0) | ✅ `active` — expense add ho sakta hai |
| `status: 'overdue'` (balance negative) | ⚠️ `overdue` — **khula hai**, expense add hota rahega, overdue jama hogi |
| `status: 'cancelled'` | ⛔ waisa hi (yehi ek exception) |

Balance aur jama shuda overdue amount **waise hi rehte hain** — sirf lock khatam hota hai.
Migration sirf tab database mein likhti hai jab status galat ho (warna koi extra request nahi),
is liye baar baar khulne par bhi koi masla nahi.

### UI
- Balance 0 wala cheque ab **✅ FULLY USED (khula)** — locked nahi
- Overdue cheque **⚠️ OVERDUE** (khula) + kitni amount jama hai
- Console par message: `✅ N purane cheque(s) unlock ho gaye`

### Files changed
| File | Tabdeeli |
|------|----------|
| `src/database/accountingService.ts` | `unlockAllCheques()`, `statusForBalance` (balance 0 = active), stats theek |
| `src/App.tsx` | App start par unlock migration |
| `src/pages/AccountingFullPage.tsx`, `src/pages/AccountingPage.tsx` | Labels/badges update |
| `_test/run-test.cjs` | Purane locked data ka test add |

### Test result
`node _test/run-test.cjs` → **25 passed, 0 failed**

---

## ⭐ v3 — kya badla (25 Aug 2026)

### Rule (aap ki requirement ke mutabiq)
Cheque ka balance khatam (0) ya negative hone par bhi **expense add hota rahega**.
Jo amount cheque se zyada kharch ho, wo **usi cheque par OVERDUE ke tor par jama
(accumulate) hoti rahegi** aur har jagah dikhegi. Koi block / lock nahi.

| Situation | v2 (ghalat) | **v3 (ab)** |
|---|---|---|
| Balance 0, naya expense | ❌ block | ✅ **add ho jata hai** → balance negative |
| Balance negative (overdue), naya expense | ❌ block | ✅ **add ho jata hai** → overdue barhti hai |
| Expense ka amount barhana (overdue cheque) | ❌ block | ✅ **allowed** |
| Cheque ki amount kam karna | ❌ block | ✅ **allowed** (overdue jama) |
| CANCELLED cheque | ❌ block | ❌ block (yehi ek exception) |

### Kya naya dikhta hai
- **OVERDUE** badge + **⚠️ Overdue** column (kitna extra kharch jama hai)
- Dashboard par **OVERDUE** card: total overdue + kitne cheques overdue hain
- Add Expense screen: overdue cheque select karne par amber note — *"expense phir bhi add
  ho jayega, extra amount OVERDUE mein jama hogi"* + "After Deduction / OVERDUE (JAMA HOGA)" box
- Cheque detail modal: **⚠️ OVERDUE: AED … jama** (total kharcha vs cheque amount)
- Dropdown mein overdue cheques `⚠️` ke saath, cancelled `⛔` ke saath

### Files changed
| File | Tabdeeli |
|------|----------|
| `src/database/accountingService.ts` | Block hata diya. Overdue helpers: `getOverdueAmount`, `getSpentAmount`, `statusForBalance`, `overdueNote`, `syncChequeStatuses`. Stats: `totalOverdue`, `overdueCount` |
| `src/pages/AccountingFullPage.tsx` | Overdue info UI (amber), overdue column, OVERDUE stat card, dropdown labels |
| `src/pages/AccountingPage.tsx` | Wahi cheezein purane page par bhi |
| `_test/` | Rule ka automated test (real `electron/server.js` backend ke saath) |

### Test result
`node _test/run-test.cjs` → **19 passed, 0 failed**
(overdue par add, overdue jama hona, amount barhana, amount kam karna, cancelled block, purane v1 data ka status theek hona)
