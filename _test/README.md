# Tests

Do tests hain — dono **asli code** ko call karte hain (koi copy/duplicate logic nahi):

| Test | Kya check karta hai | Result |
|------|---------------------|--------|
| `run-sync-test.cjs` | Firebase sync logic (`src/firebase/syncUtils.ts`) — guide §1-§8 ke rules | 21 passed |
| `run-test.cjs` | Overdue rule (`accountingService`) — purane LAN server ke against | 25 passed |

## Chalane ka tareeqa

```bash
# 1) project dependencies
npm install

# 2) sync-logic test (kisi server ki zaroorat nahi)
npm run test:sync

# 3) overdue test — pehle LAN backend chahiye
mkdir -p ../_test/backend && cp electron/server.js ../_test/backend/
cd ../_test/backend && npm i express cors && node server.js     # port 3000

# doosri terminal:
cd <project>
./node_modules/.bin/esbuild src/database/db.ts src/database/accountingService.ts \
  src/database/providers/dbLan.ts src/database/providers/dbFirebase.ts \
  src/firebase/syncUtils.ts src/firebase/auth.ts src/firebase/config.ts \
  --outdir=../_test/svc --format=cjs --platform=node
# ../_test/node_modules mein firebase ka link: ln -s <project>/node_modules/firebase
cd ../_test && node run-test.cjs
```

Expected: `21 passed, 0 failed` aur `25 passed, 0 failed`

> `run-test.cjs` cheques/expenses stores clear kar deta hai — apni asli database par na chalayein.
