# 🔥 Firebase Setup — QIS HR & Visa System (v5)

> Aap ka project: **ishaq-old** · Repo: **github.com/Zia6075/old-QIS**
> Guide: `FIREBASE_IMPLEMENTATION_GUIDE.md` (isi ke principles implement kiye gaye hain)

---

## ⚠️ STEP 0 — sab se pehle yeh karein (zaroori!)

Maine aap ke project ko check kiya:

```
GET https://ishaq-old-default-rtdb.firebaseio.com/.json  →  404 Not Found
```

Matlab: **Realtime Database abhi bani hi nahi** (ya kisi aur region mein bani hai).
Jab tak yeh nahi banegi, app data read/write nahi kar sake gi.

**Karna yeh hai:**

1. https://console.firebase.google.com → project **ishaq-old**
2. **Build → Realtime Database → Create Database**
3. Location: **asia-southeast1 (Singapore)** select karein (Pakistan/UAE ke qareeb)
4. **"Start in test mode"** select karein (rules baad mein Step 2 mein publish karenge)
5. Ban'ne ke baad **Data** tab ke upar jo URL likha hai wo copy karein, masal:
   - `https://ishaq-old-default-rtdb.firebaseio.com`
   - ya `https://ishaq-old-default-rtdb.asia-southeast1.firebasedatabase.app`
6. Wo URL `src/firebase/config.ts` mein **`databaseURL`** mein paste kar dein
   (agar copy kiya hua URL wahan pehle se maujood URL se alag hai)

---

## STEP 1 — Authentication ON karein

1. Console → **Build → Authentication → Get started**
2. **Sign-in method**:
   - **Email/Password → Enable** ✅ (yehi primary hai)
   - **Anonymous → Enable** ✅ (fallback — warna purane `admin`/`staff` login par app atak sakti hai)
3. **Users → Add user**: apna asli email + password add karein (yeh "owner" account hai)

> App ka apna login wahi purana hai (`admin` / `admin123`). Firebase login **background**
> mein hota hai: pehle `admin@qis.local` try hota hai, na mile to **anonymous** — dono se
> cloud access mil jata hai.

---

## STEP 2 — Rules publish karein (guide §2)

**Realtime Database → Rules** → yeh paste karein → **Publish**:

```json
{
  "rules": {
    "remote": { ".read": "auth != null", ".write": "auth != null" },
    "sync":   { ".read": "auth != null", ".write": "auth != null" }
  }
}
```

(Yeh file project mein bhi hai: `database.rules.json`)

**Firestore** use karein to `firestore.rules` wali file paste kar dein.

> ⚠️ Test-mode rules **30 din** baad khud lock ho jati hain → "permission denied".
> Is liye upar wali rules abhi publish kar dein.

---

## STEP 3 — App chalayein

```bash
npm install
npm run dev          # browser mein: http://localhost:5173
```

Top bar par badge dikhe ga:

| Badge | Matlab |
|---|---|
| ☁️ **FIREBASE LIVE • 21:05:09** | Firebase se live sync chal raha hai ✅ |
| 🖥️ **LAN MODE** | Firebase nahi mila → purana local server (electron) use ho raha hai |

Data cloud par yahan dikhe ga:

```
sync/{owner}/data/employees/{id}
sync/{owner}/data/cheques/{id}
sync/{owner}/data/expenses/{id}
sync/{owner}/data/users/{id}
sync/{owner}/meta            ← lastSync, deviceName, version
sync/{owner}/data/imagePatch ← diagnostics report (guide §8)
sync/_map/{email} = owner    ← multi-user mapping
```

---

## STEP 4 — Purana data Firebase mein import karein (aap ne yehi kaha tha)

1. Purani app se **Backup & Restore → Create Backup** se JSON file nikalein
2. Nayi (v5) app kholein → **Backup & Restore → Restore / Upload backup**
3. Wahi JSON file select karein → **Restore**

App us file ka poora data (employees, cheques, expenses, users, logs) **Firebase** par
likh de gi — 200KB ki batches mein (guide §4 ki limit ke mutabiq), images samet.
Import ke baad `meta.importedRecords` mein count likha jata hai.

---

## 🔁 Sync kaise kaam karta hai (guide ke principles)

| Principle | Implementation |
|---|---|
| PATCH-only, PUT nahi | har record apne path par (`sync/{owner}/data/employees/{id}`) |
| Tombstone delete | delete = `{deleted:true, updatedAt}` — `remove()` kabhi nahi |
| `updatedAt` = LOCAL time | `localNow()` → `yyyy-MM-dd HH:mm:ss` |
| Fraction-tolerant compare | 19-char trim (warna har cycle blinking) |
| Changed-only push | `pickChanged()` |
| 250KB chunk limit | `chunkPatch()` — image wala record akela |
| Echo-guard / UI debounce | listener se refresh **800ms debounce** |
| Email token, anonymous fallback | `src/firebase/auth.ts` |
| Diagnostics | `sync/{owner}/data/imagePatch` |
| Images | **600px JPEG q78** thumbs, record ke andar (Storage ki zaroorat nahi) |

**Tests:** `src/firebase/syncUtils.ts` ki poori logic test hai → **21 passed, 0 failed**
(`_test/run-sync-test.cjs`). Overdue rule bhi re-test hua → **25 passed, 0 failed**.

---

## 🐙 GitHub (aap ka repo: `Zia6075/old-QIS`)

Repo abhi sirf installer ke liye hai ("this is only installer file for QIS project").
Do tarah se use ho sakta hai:

### A) Source code push karein
```bash
cd <project folder>
git init
git add .
git commit -m "QIS HR System v5 — Firebase live sync"
git branch -M main
git remote add origin https://github.com/Zia6075/old-QIS.git
git push -u origin main
```
> `.gitignore` zaroor check karein: `node_modules/`, `dist/`, `github_token.txt` push na hon.

### B) Installer ko Releases par rakhein (auto-update ke liye — guide §9)
```bash
npm run dist                      # EXE installer banega (electron/installer/)
node scripts/github-release.mjs   # tag + release + asset upload
```
`scripts/github-release.mjs` ko token chahiye:
```bash
echo "ghp_xxxxxxxxxxxxxxxxxxxx" > github_token.txt   # .gitignore mein hai
```
Token banane ka tareeqa: GitHub → Settings → Developer settings → **Personal access
tokens** → scope **repo**.

> ⚠️ Guide §9 ka sabak: PowerShell mein manual JSON escaping se 401/422 aate hain —
> is liye yeh script plain Node + `fetch` + `JSON.stringify` use karti hai.

---

## 🧪 Verify karne ki checklist (guide §11)

- [ ] RTDB create → app khulte hi **☁️ FIREBASE LIVE** badge
- [ ] Employee add → console mein `sync/{owner}/data/employees/` par 1-2 sec mein
- [ ] Doosre PC/browser par wahi data khud aa jaye
- [ ] Delete → doosre device se bhi ghayab (tombstone)
- [ ] Cheque overdue → ⚠️ OVERDUE jama hoti rahe (block nahi)
- [ ] `sync/{owner}/data/imagePatch` mein counts barh rahe hon, `failed: 0`
