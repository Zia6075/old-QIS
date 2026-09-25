# QIS HR & Visa System

Queen International School — HR, Visa aur Accounts (cheque/expense) management.

## 👉 Sab kuch EK command

**Windows:** `START.bat` double-click  ·  **CMD:** `npm run all`

```
[1/8] npm install          [5/8] GitHub token (aap paste karein — pause)
[2/8] Firebase setup       [6/8] git push + GitHub RELEASE + upload
[3/8] version+tests+build  [7/8] firebase deploy --only hosting
[4/8] EXE installer        [8/8] BROWSER khud khule ga (release + live app)
```

Detail: **`START-HERE.md`**

## Quick start
```bash
npm install
npm run dev        # http://localhost:5173   (login: admin / admin123)
npm run dist       # Windows EXE installer
```

## GitHub (repo: Zia6075/old-QIS)
```bash
git init && git add . && git commit -m "QIS HR System v5 — Firebase live sync"
git branch -M main
git remote add origin https://github.com/Zia6075/old-QIS.git
git push -u origin main

# installer ko Releases par (auto-update ke liye)
npm run dist
echo "ghp_xxx" > github_token.txt      # .gitignore mein hai — push na ho
npm run github-release
```

## 🌐 Mobile browser (Firebase Hosting)
```bash
npm install -g firebase-tools     # sirf 1 baar
firebase login
npm run deploy                    # build + hosting par upload
```
Deploy ke baad jo URL mile (masal `https://ishaq-old.web.app`) use mobile browser
mein kholein — **wahi full app** (login: admin / admin123), data Firebase se live.
Detail: **`FIREBASE_DEPLOY.md`**

## 🚀 Naya version / release (khud version banta hai)
```bash
npm run release:prepare                                   # bump + changelog + build + zip + tag
npm run release:prepare -- --bump minor --note "..."      # feature release
npm run release                                           # + GitHub Release upload (token chahiye)
```
Poora tareeqa: **`RELEASE.md`**

## Tests
```bash
npm run test:sync      # Firebase sync logic  → 21 passed
```
(overdue rule ka test: `_test/README.md` dekhein → 25 passed)
