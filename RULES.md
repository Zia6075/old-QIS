# 🔐 RULES — kahan kya paste karna hai

Aap ne 2 emails add ki hain: **ishaq@gmail.com** aur **queenschool@gmail.com**
(app ke default `admin@qis.local` / `staff@qis.local` ke saath).

Sab users **ek hi data** dekhte hain — node: `sync/admin_qis_local/`

---

## 1️⃣ REALTIME DATABASE ke rules

**Kahan:** console.firebase.google.com → **ishaq-old** → **Build → Realtime Database → Rules** tab → neeche wala paste karein → **Publish**

```json
{
  "rules": {
    "remote": { ".read": "auth != null", ".write": "auth != null" },

    "sync": {
      "_map": { ".read": "auth != null", ".write": "auth != null" },

      "$owner": {
        ".read":  "auth != null && auth.token.email !== null && (auth.token.email.toLowerCase() === 'admin@qis.local' || auth.token.email.toLowerCase() === 'staff@qis.local' || auth.token.email.toLowerCase() === 'ishaq@gmail.com' || auth.token.email.toLowerCase() === 'queenschool@gmail.com')",

        ".write": "auth != null && auth.token.email !== null && (auth.token.email.toLowerCase() === 'admin@qis.local' || auth.token.email.toLowerCase() === 'staff@qis.local')"
      }
    }
  }
}
```

(Yeh file project mein bhi hai: **`database.rules.json`**)

**Is ka matlab (2 level ki security):**

| Level | Kya |
|---|---|
| 👁️ **READ** | chaaron emails padh sakti hain: `admin@qis.local`, `staff@qis.local`, `ishaq@gmail.com`, `queenschool@gmail.com` |
| ✍️ **WRITE** | **sirf** `admin@qis.local` aur `staff@qis.local` — gmail accounts server par bhi write nahi kar saktin |
| 🖥️ **PC vs Browser** | app khud detect karti hai: **browser = READ ONLY**, PC application = full control |

- Anonymous ka koi raasta nahi
- Koi aur email (link mil jaye to bhi) data nahi dekh sakta

### Nayi email add karni ho to (3 qadam)
1. Firebase Console → **Authentication → Users → Add user** (email + password)
2. `src/firebase/config.ts` → `ALLOWED_EMAILS` mein email add karein → `npm run build`
3. `database.rules.json` mein ek line add kar ke **Publish**:
   ```
   || auth.token.email.toLowerCase() === 'nayi-email@gmail.com'
   ```
   (dono jagah — `.read` aur `.write`)

---

## 2️⃣ FIRESTORE ke rules

**Kahan:** console.firebase.google.com → **ishaq-old** → **Build → Firestore Database → Rules** tab → yeh paste karein → **Publish**

```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

**Kyun `false`?**
Yeh app **Firestore use hi nahi karti** — poora data Realtime Database mein hai.
Is liye Firestore poori tarah band: koi chupke se likh nahi sakta, quota bhi bachta hai.

> Agar Firestore banaya hi nahi to koi baat nahi — rules ki zaroorat nahi.
> (File project mein hai: **`firestore.rules`** — us mein "agar kabhi chahiye ho" wala
> block bhi likha hai.)

---

## 3️⃣ Authentication settings

**Kahan:** **Build → Authentication → Sign-in method**

| Provider | Setting |
|---|---|
| **Email/Password** | ✅ **ENABLE** (Enable + "Email link" OFF) |
| **Anonymous** | ❌ **DISABLE** (app use nahi karti — yehi suspension se bachao hai) |
| Google / Facebook / phone | band rehne dein (zaroorat nahi) |

**Users:** **Authentication → Users → Add user**
- `ishaq@gmail.com` + password ✅ (aap ne add kar liya)
- `queenschool@gmail.com` + password ✅ (aap ne add kar liya)
- `admin@qis.local` + `admin123` ✅ (maine bana diya tha)
- `staff@qis.local` + `staff123` ✅ (maine bana diya tha)

---

## 4️⃣ Verify karne ka tareeqa

```bash
npm run test:live
```
Rules publish hone ke baad:
```
✅ ishaq@gmail.com sign-in
✅ init: Firebase live sync ON
✅ users collection mili
================ RESULT: 9 passed, 0 failed
```

App mein:
1. Login page → **☁️ Cloud (Firebase)** → `ishaq@gmail.com` + aap ka password
2. Top bar par **☁️ LIVE SYNC • abhi** aana chahiye
3. Console mein `sync/admin_qis_local/data/` par records dikhne chahiye

---

## 🧰 Agar "Permission denied" aaye

| Wajah | Hal |
|---|---|
| Rules publish nahi huin | upar wala JSON paste → **Publish** |
| Email rules ki list mein nahi | `ALLOWED_EMAILS` + rules dono mein add karein |
| Email Firebase mein nahi | Authentication → Add user |
| Galat password | Console → Users → reset password |
