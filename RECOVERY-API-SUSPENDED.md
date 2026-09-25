# 🚨 PROJECT SUSPENDED — wapas chalu karne ka tareeqa

## Maine live check kiya (2 Sep 2026)

```
signInWithPassword  → 403  "Consumer 'api_key:AIza…B7-c' has been suspended"
accounts:signUp     → 403  same
Realtime Database   → HTTP 423 (Locked)
```

Matlab: **app ka koi bug nahi** — Google ne aap ke project ka **API key suspend**
kar diya hai. Is liye ab login, data, sab kuch band hai. "User not found" bhi isi
ka side-effect tha (auth fail → data nahi mila).

> ⚠️ Main saaf bata deta hoon: test karte waqt maine bhi kuch anonymous sign-up
> kiye thay. Purani app **har baar khulne par naya anonymous user** banati thi
> (v5.8.2 mein yeh band kar diya) — yehi suspension ki asal wajah hai, bilkul
> waise jaise aap ki guide §10 mein likha tha:
> *"Anonymous + heavy polling → PROJECT SUSPENSION"*

---

## 📴 Tab tak app OFFLINE MODE mein chalti rahe gi (v5.8.4+)

- Top par banner: **⚠️ OFFLINE MODE — cloud sync pause**
- Login local users se ho jata hai (wahi `admin` / `admin123`)
- Data local server par chalta rehta hai
- Test: `npm run test:offline` → 6 passed

## 🛣️ Do raste hain

- **RASTA A** — purana project wapas enable karein (neeche STEP 1-4)
- **RASTA B** — naya Firebase project bana lein (10 minute, sab se tez) — sab se neeche

---

## ✅ STEP 1 — API key wapas enable karein (5 minute)

1. Kholein: **https://console.cloud.google.com** (usi Google account se jo Firebase ka owner hai)
2. Upar project selector → **ishaq-old**
3. **APIs & Services → Dashboard**
4. Agar upar koi **red/yellow banner** ho ("…has been suspended" / "Action required")
   to us par click karein → **Reinstate / Enable**
5. Warna **APIs & Services → Enabled APIs & services** mein yeh dono dhoondein:
   - **Identity Toolkit API**
   - **Firebase Realtime Database API**

   Dono par click karein → agar button **ENABLE** ka ho to daba dein.
   (Suspended hone par "This API is suspended — Learn more / Reinstate" likha aata hai)
6. Google form pooch sakta hai "kis liye use karte hain" → likh dein:
   > Internal HR & Visa management app for our school. Email/password login only,
   > anonymous auth has been disabled. Low traffic (a few users).

> Aam tor par yeh **foran** ya kuch ghanton mein wapas chalu ho jata hai.
> Agar "contact support" aaye to us link se appeal karein — yeh automated
> flag hota hai, appeal par khul jata hai.

---

## ✅ STEP 2 — Anonymous PERMANENTLY band karein (dobara na ho)

1. https://console.firebase.google.com → **ishaq-old**
2. **Build → Authentication → Sign-in method**
3. **Anonymous → DISABLE** ❌
4. **Email/Password → ENABLE** ✅ (yehi chahiye)

App v5.8.2+ anonymous ko use hi nahi karti, is liye band karne se kuch nahi tootega.

---

## ✅ STEP 3 — Traffic kam rakhein (jo fixes pehle se ho chuke hain)

| Purana masla | Ab (v5.8.2+) |
|---|---|
| Har app start par **naya anonymous user** | ❌ band — sirf email/password |
| Har write par 2 requests (meta alag) | 1.5s throttle |
| Startup par poora node download | halki `.info/connected` probe |
| 7 sequential structure requests | **1** read |
| Har getRecord par fresh HTTP | cache + sirf miss par retry |

Iske ilawa: app ko baar baar reload na karein, aur agar koi script/test chala rahe
hon to loop mein sign-up na karein.

---

## ✅ STEP 4 — Chalu hone ke baad verify

CMD mein (ya `npm run test:live`):

```bash
npm run test:live
```

Expected:
```
✅ admin@qis.local sign-in
✅ staff@qis.local sign-in
✅ init: Firebase live sync ON
✅ users collection mili -> 2 users
✅ employees mile -> 81 employees
================ RESULT: 9 passed, 0 failed ================
```

Agar phir bhi `403 suspended` aaye → STEP 1 adhoora hai (ya Google ka review chal raha hai).

---

## 🧭 Jab sab chalu ho jaye, tab

1. App kholein → login `admin` / `admin123`
2. Dashboard par amber banner → **⬆️ LAN se Firebase par import karein**
   (purani images/receipts cloud par le jane ke liye)
3. Web/doosre PC par check karein

---

## ⚡ RASTA B — Naya Firebase project (10 minute, sab se tez)

Agar reinstatement mein waqt lag raha ho to naya project bana lein:

**1. Project banayein**
- https://console.firebase.google.com → **Add project** → naam dein (masal `qis-hr-2`)
- Google Analytics: off kar dein (zaroorat nahi)

**2. Authentication ON**
- **Build → Authentication → Get started → Sign-in method**
- **Email/Password → ENABLE** · **Anonymous → rehne dein DISABLE**

**3. Realtime Database banayein**
- **Build → Realtime Database → Create Database**
- Location: **asia-southeast1 (Singapore)** · "Start in test mode"
- **Rules** tab → `database.rules.json` ka content paste → **Publish**

**4. Web app config nikalein**
- **Project settings (⚙️) → General → Your apps → Web app (`</>`) → Register app**
- Jo `firebaseConfig` dikhe, us ki values copy karein

**5. Config app mein daalein** — `scripts/set-firebase-config.mjs` khud kar de ga:
```bash
node scripts/set-firebase-config.mjs ^
  --apiKey AIza... ^
  --projectId qis-hr-2 ^
  --authDomain qis-hr-2.firebaseapp.com ^
  --storageBucket qis-hr-2.firebasestorage.app ^
  --messagingSenderId 123456789 ^
  --appId 1:123456789:web:abc ^
  --databaseURL https://qis-hr-2-default-rtdb.asia-southeast1.firebasedatabase.app
```
(Ya file khol kar `MANUAL` object bhar dein, phir `node scripts/set-firebase-config.mjs`)

**6. Build + test**
```bash
npm run build
npm run test:live        → 9 passed aana chahiye
```

**7. Purana data le jayein**
App kholein → `admin` / `admin123` (naye project mein users khud ban jate hain)
→ Dashboard ka amber banner → **⬆️ LAN se Firebase par import karein**
(local `D:\HR Backup` se employees + cheques + **images** sab chale jayen ge)
