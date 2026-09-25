# 🟢 START HERE — QIS HR & Visa System

## ⚡ Firebase downloads 99% kam (19.84 GB wala masla hal)

**Masla:** har app load par poora employees node (26 MB, images samet) download hota tha
→ Firebase par **19.84 GB** downloads ho gaye (billing warning / suspension ka khatra).

**Hal:** bari images ab alag `media/{id}` node mein hain. Employee list load karte waqt
sirf **~0.2 MB** aata hai; images **sirf tab** load hoti hain jab aap kisi employee
ki detail kholein. List ke avatar ke liye chhota `personThumb` (~3 KB) record mein hai.

| | Pehle | Ab |
|---|---|---|
| employees node | 26 MB | **0.22 MB** |
| list load | timeout / blink | **2.2s** |
| employee detail | (poora node pehle se) | **+0.2s** (sirf us ki images) |

Data migrate ho chuka hai (78 employees + 2 cheques + 14 expenses ki images `media` mein).
Aage kabhi dobara zaroorat pare:
```bash
npm run media:split:dry    # pehle hisaab
npm run media:split        # asal migrate
```

## 🔒 Browser = READ ONLY, PC app = full control

| Kahan | Kya kar sakte hain |
|---|---|
| 🌐 **Browser / mobile web** | sirf **dekhna** — Add/Edit/Delete buttons gayab, upar `🔒 READ ONLY` badge |
| 🖥️ **PC application (EXE)** | **sab kuch** — add, edit, delete, import, backup |

Yeh 2 level par lagoo hai:
1. **App level** — browser mein write wale pages/buttons hi nahi dikhte, aur database layer
   write rok deti hai (`🔒 "..." browser mein allowed nahi — READ ONLY mode`)
2. **Server level** — RTDB rules mein `.write` sirf `admin@qis.local` / `staff@qis.local`
   ke liye hai (gmail accounts sirf padh sakti hain) → `RULES.md`

## 🖱️ Double-click files

| File | Kaam |
|---|---|
| **`START.bat`** | install + Firebase setup + app chalaye |
| **`DEPLOY.bat`** | ⭐ `firebase deploy --only hosting --project ishaq-old` (CLI install + login + build + deploy khud) |
| **`RESET-PASSWORD.bat`** | Console ka Users page khole → password reset |
| `2-RUN-APP.bat` … | (purani alag-alag files, zaroorat nahi) |

## 🗜️ Data chhota karna (app tez karne ke liye)

Purani app ne **full-size images** save ki thin — data **99 MB** ho gaya tha
(isi se page blink karta tha). Maine 2 Sep 2026 ko khud compress kar diya:
**99.32 MB → 26.77 MB (73% kam)**, data bilkul safe (77 employees, 306 images intact).

Aage kabhi dobara zaroorat pare:
```bash
npm install sharp                    # ek dafa
npm run compress:images:dry          # pehle hisaab dekhein (kuch write nahi hota)
npm run compress:images              # asal compress + Firebase par save
npm run compress:images -- --maxw 800 --q 68    # settings badalni hon to
```

## ⭐ Sab kuch EK command

**Windows:** project folder mein **`START.bat`** double-click karein.
**CMD se:**
```bat
npm run all
```

Bas. Script khud yeh sab karti hai — **CMD mein live dikhta rehta hai**:

```
[1/8] npm install
[2/8] Firebase setup (RTDB URL + rules + live test)
[3/8] naya version + tests + build
[4/8] EXE installer            (npm run dist)
[5/8] GitHub token             ← YAHAN PAUSE HOTA HAI: aap token paste karein + Enter
[6/8] git push + GitHub RELEASE + zip/EXE upload
[7/8] firebase deploy --only hosting --project ishaq-old
[8/8] BROWSER KHUD KHULTA HAI  → GitHub release + live app
```

Aur client ko **khud update ka popup** aata hai (Help → Check for Update… bhi hai),
app mein **version tag** dikhta hai, aur Firebase par **last sync time live** rehta hai
— detail: **`AUTO-UPDATE.md`**

**Version khud +1 hota rehta hai** (`v5.8.0` → `v5.8.1` → `v5.8.2`) — aap ko version sochna nahi parta.
Shuru mein ek line poochti hai: *"Is version mein kya naya hai?"* — likh dein ya khali
chhor kar Enter dabayein. Wahi text client ko GitHub release mein changelog ki tarah dikhe ga.

---

## 📴 OFFLINE MODE (Firebase down ho to bhi app chalti hai)

Agar Firebase suspend ho, ya internet na ho, to app **rukti nahi**:
- Top par amber banner: **⚠️ OFFLINE MODE — cloud sync pause**
- Login **local users** se hota hai (wahi username/password)
- Data local server (`D:\HR Backup`) par chalta rehta hai
- Firebase wapas aate hi page refresh karein → cloud sync chalu

> Firebase ka har call **10 second timeout** ke saath hai — app kabhi hang nahi hoti.

## 🔐 Login — 2 tareeqe (anonymous BILKUL band)

| Tab | Kya daalein | Nateeja |
|---|---|---|
| ☁️ **Cloud (Firebase)** | Console wali **email + password** | data cloud par **live sync** |
| 🖥️ **Local (offline)** | `admin` / `admin123` | sirf is PC ka data, internet ki zaroorat nahi |

**Remember me** (default ON): app band karne ke baad bhi logged-in rahein ge —
jab tak khud **Logout** na karein (local aur cloud dono). App local se shuru hoti hai
is liye login page **foran** khulta hai. Detail: `LOGIN-SECURITY.md`

**Rules kahan paste karein:** `RULES.md` (RTDB + Firestore dono)

## 🔐 Login (anonymous band)

Ab **bina login data nahi khulta** — link kisi ko mil jaye to bhi data safe.
- App login wahi purana: `admin` / `admin123` (background mein `admin@qis.local`)
- **Users** page se naya user banayein → us ka Firebase account **khud** ban jata hai
- Console mein **Authentication → Email/Password ENABLE** + **RTDB rules publish**
  (`database.rules.json`) — detail: `LOGIN-SECURITY.md`

## 📸 Purana PC data (images/receipts) cloud par

Backup & Restore → **⬆️ LAN se Firebase par import karein**
→ employees, cheques, expenses, users **+ saari images** Firebase par;
phir web aur doosre PC par bhi wahi sab. Verify: `sync/admin_qis_local/data/imageStats`

## 🔑 GitHub token (sirf pehli baar)

Step [5/8] par script ruk kar pooche gi. Token banane ka tareeqa:

1. GitHub → **Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. **Generate new token** → scope: **repo** → copy
3. Script mein paste karein → **Enter**

Token `github_token.txt` mein save ho jata hai (`.gitignore` mein hai — kabhi push nahi hoga),
is liye agli baar poocha nahi jaye ga.

> Agar aap CMD se khud set karna chahein: `set GH_TOKEN=ghp_xxxx` phir `npm run all`

---

## 📦 Ek dafa ki tayyari (2 minute)

```bat
npm install -g firebase-tools
firebase login
```
(Hosting deploy aur rules publish ke liye. Iske baghair step [7/8] skip ho jata hai,
baqi sab chalta rehta hai.)

---

## 🧩 Alag alag command (agar kabhi sirf ek kaam karna ho)

| Command | Kaam |
|---|---|
| `npm run all` | ⭐ sab kuch (upar wala flow) |
| `npm run all -- --skip-exe` | EXE banaye baghair (tez) |
| `npm run all -- --bump major --note "..."` | bara version bump |
| `npm run dist` | sirf EXE installer |
| `npm run dist:publish` | sirf GitHub release upload |
| `npm run deploy` | sirf Firebase Hosting deploy |
| `npm run setup` | sirf Firebase setup/rules |
| `npm run release:prepare` | sirf version + build + zip |
| `npm run dev` | app local chalaye (localhost:5173) |
| `npm test` | teeno tests |

---

## 🔥 Firebase ka haal (maine khud verify kiya)

| Cheez | Status |
|---|---|
| Project `ishaq-old` | ✅ |
| Realtime Database | ✅ bani hui (asia-southeast1) — URL config mein sahi |
| Anonymous auth | ✅ ON |
| `sync/` node read/write | ✅ **chal raha hai** (maine data likh kar padha) |
| Rules (root) | sirf root locked, app ka kaam nahi rokta |
| Hosting | `firebase login` ke baad step [7/8] khud deploy kare ga |

Detail: `FIREBASE_DATA_STRUCTURE.md`, `FIREBASE_SETUP.md`, `FIREBASE_DEPLOY.md`

---

## 📚 Baqi docs

| File | Kya hai |
|---|---|
| `LOGIN-SECURITY.md` | 🔐 **login-based access (anonymous band) + images/data sync ka poora hal** |
| `RULES.md` | 🔐 **RTDB + Firestore rules — kahan kya paste karna hai** |
| `PREVENT-SUSPENSION.md` | 🛡️ **suspension kyun hoti hai aur kaise bachein** |
| `AUTO-UPDATE.md` | ⭐ client ko khud update ka popup + version tag + live last-sync |
| `RELEASE.md` | version/release system ki detail |
| `VERSION.md` | v1 se aaj tak ki history + **speed audit (14 bugs)** |
| `BUILD_EXE_GUIDE.md` | EXE banane ki step-by-step |
| `_test/` | tests: sync (30) + overdue (25) + perf |
