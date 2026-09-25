# 🔐 Login-Based Access + Data Sync (images samet)

Aap ke 3 sawaal, 3 jawab:

---

## 1️⃣ "PC app ki images web par nahi aa rahin" — wajah aur hal

**Wajah:** PC app (Electron) apna **local LAN server** (`D:\HR Backup`) chalaati hai.
Agar Firebase connect na ho to app **chupke se LAN mode** par chali jati thi — aur
web browser **Firebase** se padhta tha. Yani **do alag databases**:

```
PC  app ──► D:\HR Backup\hr_database.json   (local)
Web       ──► Firebase ishaq-old            (cloud)     ← dono kabhi milte hi nahi
```

**Hal (ab):**
- **Firebase hi ek source hai** — LAN fallback **OFF** (`db.ts → ALLOW_LAN_FALLBACK = false`)
- Top bar par saaf dikhta hai: `☁️ LIVE SYNC • 23s pehle` ya `🖥️ LAN MODE`
- **Purana PC data ek click mein cloud par:** Backup & Restore →
  **⬆️ LAN se Firebase par import karein**
  → employees + cheques + expenses + users + **saari images/receipts/cheque photos**
- **Verify karne ka tareeqa:** Firebase console → `sync/admin_qis_local/data/imageStats`
  ```json
  { "counts": { "employees": 12, "cheques": 3, "expenses": 8 },
    "sizeKB": { "employeesKB": 4210, "chequesKB": 610, "expensesKB": 1330 } }
  ```
  Agar yahan `0` hain to images cloud par nahi pohanchin (niche troubleshooting dekhein).

**Doosre PC par:** app install karein → same login → **sab kuch khud aa jaye ga**
(kyunke sab kuch cloud par hai). Kuch copy nahi karna.

---

## 2️⃣ Login page — 2 tareeqe (anonymous BILKUL band)

```
┌─────────────────────────────────────────┐
│  Welcome Back                           │
│  [ ☁️ Cloud (Firebase) ] [ 🖥️ Local ]   │
│                                         │
│  Email / Username  [____________]       │
│  Password          [____________]       │
│  [ ☁️ Cloud Sign In ]                   │
│  🔒 Anonymous band — har session par    │
│     email + password zaroori            │
└─────────────────────────────────────────┘
```

| Mode | Kya daalein | Kya hota hai |
|---|---|---|
| ☁️ **Cloud** | Firebase wali **email + password** (jo aap ne Console → Authentication mein add ki) | Firebase sign-in → data **cloud par live sync** (PC, web, doosra PC — sab ek saath) |
| 🖥️ **Local** | `admin` / `admin123` (ya `staff`) | Sirf **is PC ka local data** — internet/Firebase ki zaroorat nahi |

**Zaroori baatein:**
- **Anonymous bilkul khatam** — code mein `signInAnonymously` kahin nahi (test se verify)
- **Har session par login zaroori**: app start par purani saved session aur Firebase
  session dono clear ho jati hain (auto-login band)
- App **local se shuru** hoti hai → login page **foran** khulta hai, Firebase ka
  intezar nahi karna parta
- Cloud mode mein owner node = **aap ki email** (masal `sync/zia_gmail_com`) —
  yani har email ka apna secure data, rules ke mutabiq
- Naya email pehli baar login kare to app ka user record **khud** ban jata hai

> ⚠️ Cloud mode ke liye Firebase Console → Authentication mein **woh email add karni
> zaroori hai** (Add user). App khud naya account nahi banati (yehi suspension se
> bachao hai).

---

## 2️⃣ Anonymous khatam — sirf login wale users

| Pehle | Ab |
|---|---|
| Har baar naya **anonymous** session | ❌ band — kabhi nahi banta |
| Link mil jaye to koi bhi data khol le | ❌ bina login data tak rasai nahi |
| Google ko spam lagne ka khatra | ✅ ek hi user baar baar sign-in karta hai |

**Kaise kaam karta hai:**
```
app username  →  username@qis.local  +  wahi password
                        ↓
              Firebase Auth (Email/Password)
                        ↓
             RTDB rules: sirf usi email ka node
```

- Login: `admin` / `admin123` (pehle jaisa) — background mein `admin@qis.local` se
  Firebase sign-in hota hai
- **Users** page se naya user banayein → us ka **Firebase account khud ban jata hai**,
  phir woh web/PC dono par login kar sakta hai
- Password kam az kam **6 characters** (Firebase ki shart)
- Logout par session khatam

### ⚠️ Console mein 2 cheezein zaroori
1. **Authentication → Sign-in method → Email/Password → ENABLE**
   *(Anonymous ko disable kar dein — app use hi nahi karti)*
2. **Realtime Database → Rules →** `database.rules.json` paste → **Publish**

```json
{
  "rules": {
    "remote": { ".read": "auth != null", ".write": "auth != null" },
    "sync": {
      "_map": { ".read": "auth != null", ".write": "auth != null" },
      "$owner": {
        ".read":  "auth != null && auth.token.email !== null && $owner === auth.token.email.toLowerCase().replace(/[^a-z0-9]/g, '_')",
        ".write": "auth != null && auth.token.email !== null && $owner === auth.token.email.toLowerCase().replace(/[^a-z0-9]/g, '_')"
      }
    }
  }
}
```
> Yeh rules **sirf aap ke users** ko data deti hain. Koi doosra (jise link pata ho)
> sign-in nahi kar sakta — kyunke naya account banane ke liye console access chahiye.

---

## 3️⃣ Multi-user, ek hi data (`dataOwner`)

Rules owner-email scoped hain, is liye har user record mein `dataOwner` hota hai:

| User | Login email | Data node |
|---|---|---|
| admin | `admin@qis.local` | `sync/admin_qis_local` |
| staff | `staff@qis.local` | `sync/admin_qis_local` ← same (dataOwner = admin) |
| aap ka naya user | `ahmed@qis.local` | `sync/admin_qis_local` ← same |

Sab ek hi data dekhte aur edit karte hain — **live** (1-2 sec mein doosre device par).

---

## 🚨 SAB SE PEHLE: project SUSPENDED tha (2 Sep 2026, dobara check)

```
signInWithPassword → 403 "Consumer 'api_key:AIza…B7-c' has been suspended"
Realtime Database  → HTTP 423 (Locked)
```
Yeh app ka bug nahi — Google ne API key rok di. Wapas chalu karne ka poora
tareeqa: **`RECOVERY-API-SUSPENDED.md`**

---

## 🔎 Maine aap ka project LIVE check kiya (2 Sep 2026)

| Cheez | Nateeja |
|---|---|
| `admin@qis.local` / `admin123` → Firebase Auth | ✅ **LOGIN OK** (uid `SEMaJx2i…`) |
| `staff@qis.local` / `staff123` → Firebase Auth | ✅ **LOGIN OK** (uid `1K84mrrl…`) |
| RTDB read/write (`sync/admin_qis_local`) | ✅ **200 OK** (rules theek hain) |
| `users` collection | ✅ 2 users (`admin`, `staff`), `dataOwner = admin@qis.local` |
| password hashes | ✅ match (`admin123` → `hashed_39c43b7d_8`) |
| employees | ✅ 81 records cloud par |
| **images** | ❌ **0** — sab ke `personImagePath/passport/visa` fields **khaali** |

### "User not found" ki asal wajah (mil gayi + theek kar di)
`getRecordByIndex` sirf **cache** se padhta tha. Pehla read **login se pehle** hota hai,
jab tak rules ki wajah se `permission-denied` aata hai → cache **khali** bhar jata →
login ke baad bhi wahi khali cache padha jata → **"User not found"**.

**Fix:** miss par ek dafa **fresh read** (retry), aur `null` snapshot ko cache mein khali
map bana kar rakha hi nahi jata. Ab test: cache jaan boojh kar khali karne par bhi
`admin` mil jata hai ✅ (`npm run test:live` → 9 passed).

### Images kyun nahi aa rahin
Cloud par jo 81 employees hain woh **seed data** hai (images ke baghair). Aap ka asal
data (photos/passport/visa/receipts) abhi bhi **PC par local** hai.

**Hal:** Dashboard par ab amber banner aata hai →
**⬆️ LAN se Firebase par import karein** (ya Backup & Restore → wahi button).
Yeh PC ke local server se poora data + **saari images** Firebase par bhej deta hai.
Verify: `sync/admin_qis_local/data/imageStats` ke counts barh jayen ge.

---

## 🩺 Troubleshooting

| Symptom | Wajah / Hal |
|---|---|
| `User not found` | v5.8.2 mein theek ho gaya (cache retry). Phir bhi aaye to page refresh karein, ya Users page se user add karein |
| `Firebase: Email ya password ghalat hai` | Users page se user banayein (Firebase account khud bane ga), ya Console → Authentication mein khud add karein: `admin@qis.local` / `admin123` |
| `Firebase: Firebase Console → … Email/Password ENABLE karein` | Sign-in method enable nahi |
| `permission-denied` / data nahi aa raha | Rules publish nahi huin → `database.rules.json` paste karein |
| Images abhi bhi nahi | Backup & Restore → **LAN se Firebase par import**; phir `imageStats` check karein |
| Purane users login nahi kar pa rahe | Purane user records mein Firebase account nahi tha → Users page se password dobara set karein (ya Console se user add karein) |
| 🖥️ LAN MODE dikh raha hai | Firebase init fail — console (F12) ka error dekhein; aam tor par internet ya rules |

---

## 🧪 Tests
`npm test` → **42 passed** (sync + auth) · 25 (overdue) · perf regression
