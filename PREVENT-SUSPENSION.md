# 🛡️ Suspension se bachne ki guide (2 dafa kyun hua, aur ab kaise bachein)

## 1️⃣ Wajah kya hai?

Aap ki purani app **har khulne par ek naya *anonymous* Firebase user** banati thi.
Google ka system isi pattern ko **spam/bot** samajhta hai:

```
app khuli → naya anonymous user
app band → app khuli → phir naya anonymous user
… (kai users, kai PCs, kai baar)  =  chhoti si window mein bohat saare sign-ups
```

Aur jab **naya project** banta hai aur us par **turant** yeh traffic shuru ho jaye, to
automated abuse-detection **jaldi** flag kar deta hai. Is liye aap ko "2 dafa" hua.

> ⚠️ Main saaf maanta hoon: **mere test ne bhi is mein hissa daala** — maine check
> karte waqt kuch anonymous sign-up kiye. Aap ki guide §10 mein yehi likha tha:
> *"Anonymous + heavy polling → PROJECT SUSPENSION"*.

---

## 2️⃣ Kya "purana account" use karne se bach jayen ge?

**Nahi.** Masla account ki **umar** nahi, **traffic ka pattern** hai.

| Soch | Haqeeqat |
|---|---|
| "Naya project is liye suspend hota hai" | ❌ Naya project **jaldi** flag hota hai agar turant anonymous-burst ho |
| "Purana account use karoon to bach jaon ga" | ❌ Purana account bhi usi pattern par suspend ho jata |
| "Bar bar naya project banata rahoon" | ❌❌ **Sab se khatarnak** — Google isay *evasion* samajhta hai aur **poora Google account** ban kar sakta hai |

### Aap ke project ki asal halat (maine check ki)
```
API key (Identity Toolkit + Realtime Database)  → 403 suspended
Realtime Database                               → 423 deactivated
```
Yeh **project-level** suspension hai — aap ka **Google account ban nahi hua**
(Gmail/Drive waghera theek chal rahe honge). Is liye ghabrane ki baat nahi,
**appeal/reinstate** se wapas aa jata hai.

---

## 3️⃣ Bachne ke 7 usool (yehi sabse zaroori hissa hai)

### ✅ 1. Anonymous auth HAMESHA band rakhein
Firebase Console → Authentication → Sign-in method → **Anonymous → DISABLE**
App v5.8.2+ anonymous ko use hi nahi karti (sirf email/password), is liye band karne
se kuch nahi toota.

### ✅ 2. Ek hi project rakhein
Naye project bar bar na banayein. Suspend ho to **reinstate/appeal** karein.

### ✅ 3. Login-based access (pehle se ho chuka)
Sirf woh log sign-in karein jin ka account aap ne banaya → sign-ups **gin ke** hote hain.

### ✅ 4. Requests kam rakhein (app mein pehle se fix ho chuka)
| Purana | Ab |
|---|---|
| Har write par 2 requests | 1.5s throttle |
| Startup par poora node download | halki probe |
| 7 sequential requests | 1 read |
| Har getRecord par fresh HTTP | cache + sirf miss par retry |
| Listeners + polling dono | sirf listeners |

### ✅ 5. Test/debug mein sign-up loop na chalayein
Koi script bar bar `signUp`/`signIn` na kare. Test ke liye **1 login** kaafi hai
(`npm run test:live` ek dafa login karta hai).

### ✅ 6. Rules tight rakhein
`database.rules.json` (owner-email scoped) publish karein — warna koi bhi aap ke
project par traffic bhej kar flag karwa sakta hai.

### ✅ 7. (Optional magar bohat asardaar) Billing/Blaze plan
Project settings → **Plan → Blaze** (credit card lagana zaroori nahi ke kharcha ho —
free quota ke andar hi rehta hai). **Paid project ko Google serious leta hai**,
automated suspension ka imkaan bohat kam ho jata hai. School ke liye yeh sab se
pakka bachao hai.

---

## 4️⃣ Agar phir suspend ho jaye to kya karein?

1. **Naya project NA banayein** (yehi galti account ban karwa deti hai)
2. `console.cloud.google.com` → project → **APIs & Services → Dashboard**
   → **Identity Toolkit API** / **Firebase Realtime Database API** → **Enable / Reinstate**
3. Appeal form aaye to yeh likhein:
   > Internal HR & Visa management app for our school (about 80 staff records).
   > Only a few named users sign in with email/password. Anonymous authentication
   > has been permanently disabled. Traffic is very low.
4. Tab tak app **OFFLINE MODE** mein chalti rahe gi (v5.8.4+) — data local par safe

---

## 5️⃣ Aap ki app mein jo bachao pehle se maujood hai

| Bachao | Kahan |
|---|---|
| Anonymous band (login-based) | `src/firebase/auth.ts` (`AUTH_REQUIRED`) |
| Offline mode (suspend ho to app rukti nahi) | `src/database/db.ts` (LAN fallback) |
| Har Firebase call par 10s timeout (hang nahi hoti) | `withTimeout` |
| Throttled meta + cached reads (kam requests) | `dbFirebase.ts` |
| Diagnostics (kitna data/images cloud par hai) | `imageStats` / `imagePatch` node |
| Recovery guide + config-swap helper | `RECOVERY-API-SUSPENDED.md`, `scripts/set-firebase-config.mjs` |

---

## 🎯 Khulasa (ek line mein)

**Anonymous auth band + ek hi project + kam requests + (behtar) Blaze plan** —
yeh char cheezein karein, suspension dobara nahi hoga. Aur suspend hone par
**naya project banane ke bajaye reinstate/appeal** karein.
