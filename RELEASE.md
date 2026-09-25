# 🚀 Release / Version ka tareeqa (QIS HR System)

Ab version **khud** banta hai — aap ko ginti yaad rakhne ki zaroorat nahi.

## ⭐ Sab kuch ek command (EXE + GitHub + Hosting)

```bash
npm run all          # ya Windows par START.bat double-click
```
Flow: install → Firebase setup → version+build → EXE → **token poochta hai** →
git push + GitHub Release → Hosting deploy → **browser khud khulta hai**.

## Sirf version + zip (upload ke baghair)

```bash
npm run release:prepare
```

Yeh khud yeh sab karta hai:

| # | Kaam | Kahan |
|---|---|---|
| 1 | Version bump (6.0.0 → 6.0.1) | `package.json`, `src/firebase/config.ts` (`APP_VERSION`), `electron/package.json` |
| 2 | Changelog | `VERSION.md` (row + section) |
| 3 | Tests | `npm run test:sync` (fail hua to release ruk jati hai) |
| 4 | Build | `npm run build` → `dist/` |
| 5 | Zip | `../HR-Visa-System-v6.0.1.zip` |
| 6 | Git (agar repo hai) | commit + tag `v6.0.1` |

Aakhir mein screen par likha aata hai:
```
✅ v6.0.1 ready — HR-Visa-System-v6.0.1.zip
AGLA VERSION: 6.0.2
(bas dobara chalayein: npm run release:prepare)
```

## Options

```bash
npm run release:prepare -- --bump minor --note "Naya: visa expiry alerts"
npm run release:prepare -- --bump major --note "UI redesign"
npm run release:prepare -- --skip-tests      # majboori mein
npm run release:prepare -- --skip-build      # sirf version + zip
```

- **`patch` (default)**: 5.8.0 → 5.8.1 — har aam update
- `minor`: 5.8.0 → 5.9.0 — naya feature
- `minor`: 6.0.0 → 6.1.0 — naya feature
- `major`: 6.0.0 → 7.0.0 — bara change

> `--note "..."` zaroor dein — wahi text client ko GitHub release mein dikhe ga.

---

## 🐙 GitHub par release (client ko "naya version aaya" feel ho)

### Ek baar ki tayyari
1. GitHub → Settings → Developer settings → **Personal access tokens** → **Generate**
   (scope: **repo**)
2. Token ko project folder mein `github_token.txt` naam se save karein
   (`.gitignore` mein hai — kabhi push nahi hoga)
3. Repo set hai: `Zia6075/old-QIS` (badalna ho to `--repo user/repo` dein)

### Har release par
```bash
npm run all                 # ⭐ sab kuch (token pehli baar pooche ga)
```
Ya sirf upload:
```bash
npm run dist:publish        # GitHub Release + files upload
```

Client ko kya dikhe ga:
- Repo ke **Releases** tab mein naya version: `QIS HR System v6.1.0`
- Neeche changelog (jo `--note` / `VERSION.md` mein likha)
- Asset: `HR-Visa-System-v6.1.0.zip` (+ agar `npm run dist` chalaya to EXE installer bhi)
- GitHub khud "1 new release" ka badge/notification dikhata hai

### EXE installer bhi release mein daalni ho
```bash
npm run dist                     # electron/installer/QIS_HR_System_Setup_6.1.0.exe
npm run release:publish          # zip + exe dono upload ho jayengi
```

---

## 🔁 Client ka auto-update (guide §9)

Installer app har 6 ghante mein yeh check karti hai:
```
GET https://api.github.com/repos/Zia6075/old-QIS/releases/latest
```
Agar `tag_name` current version se bara hua to popup: *"Naya version available — Install now?"*
→ download → silent install → app khud restart.

Is liye **har release par tag `v{version}` sahi hona chahiye** — yeh script khud banata hai.

---

## 📋 Version history kahan hai?

- `VERSION.md` — poori history (v1 se aaj tak), har version ka changelog
- `package.json` → `version`
- App ke andar: Firebase par `sync/{owner}/meta.version` + `data/imagePatch.version`
  (yani cloud par dikhta hai ke kaun sa device kis version par hai)

---

## ⚠️ Yaad rakhne ki baatein

1. `github_token.txt` **kabhi** git mein push na karein (`.gitignore` mein hai — phir bhi check kar lein)
2. Release se pehle tests pass hone chahiye (script khud rok deta hai)
3. Zip hamesha project folder ke **bahar** banti hai (`../HR-Visa-System-vX.zip`) —
   taake agli zip mein purani zip na chale jaye
4. Version kabhi **peeche** na karein — client ka auto-update compare karta hai
