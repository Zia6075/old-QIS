// ============================================
// Firebase sync-logic test (pure) — FIREBASE_IMPLEMENTATION_GUIDE.md ke rules
// Compiled src/firebase/syncUtils.ts ko call karta hai
// ============================================
const u = require('./svc/firebase/syncUtils');
const cfg = require('./svc/firebase/config');

let pass = 0, fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ✅ ' + name + (extra ? '  -> ' + extra : '')); }
  else { fail++; console.log('  ❌ ' + name + (extra ? '  -> ' + extra : '')); }
};

console.log('\n== §3 email sanitize ==');
ok('Admin@QIS.com -> admin_qis_com', u.sanitizeEmail('Admin@QIS.com') === 'admin_qis_com', u.sanitizeEmail('Admin@QIS.com'));
ok('space/dot/dash hat jate hain', u.sanitizeEmail(' Zia.Khan-6075@gmail.com ') === 'zia_khan_6075_gmail_com', u.sanitizeEmail(' Zia.Khan-6075@gmail.com '));

console.log('\n== §1.4 LOCAL time updatedAt ==');
const now = new Date(2026, 8, 1, 21, 5, 9); // 01 Sep 2026, 21:05:09 local
ok('localNow format "yyyy-MM-dd HH:mm:ss"', u.localNow(now) === '2026-09-01 21:05:09', u.localNow(now));
ok('UTC ISO nahi (guide ka sabak)', !u.localNow(now).includes('T') && !u.localNow(now).endsWith('Z'));

console.log('\n== §10 fraction-tolerant compare (blinking bug fix) ==');
ok('same second, alag fractions => barabar', u.isNewer('2026-09-01 21:05:09.123', '2026-09-01 21:05:09.999') === false);
ok('1 second naya => newer', u.isNewer('2026-09-01 21:05:10', '2026-09-01 21:05:09') === true);
ok('purana => not newer', u.isNewer('2026-09-01 21:05:08', '2026-09-01 21:05:09') === false);
ok('ISO vs local-format compare chal jata hai', u.isNewer('2026-09-01T21:06:00', '2026-09-01 21:05:09') === true);
ok('remote khali => local naya', u.isNewer('2026-09-01 21:05:09', '') === true);

console.log('\n== §1.3 tombstones ==');
const recs = [
  { id: 'a', updatedAt: '2026-09-01 21:00:00' },
  { id: 'b', updatedAt: '2026-09-01 21:01:00', deleted: true },
  { id: 'c', updatedAt: '2026-09-01 21:02:00', deleted: false },
  null,
];
ok('deleted:true pakda jata hai', u.isTombstoned({ id: 'b', deleted: true }) === true);
ok('filterLive sirf zinda records deta hai', JSON.stringify(u.filterLive(recs).map(r => r.id)) === '["a","c"]', JSON.stringify(u.filterLive(recs).map(r => r.id)));
const withPh = [...recs, { id: '_placeholder', note: 'cheques collection', updatedAt: '2026-09-01 21:03:00' }];
ok('_placeholder record list mein NAHI aata', JSON.stringify(u.filterLive(withPh).map(r => r.id)) === '["a","c"]', JSON.stringify(u.filterLive(withPh).map(r => r.id)));
ok('isPlaceholder pakadta hai', u.isPlaceholder({ id: '_placeholder' }) === true && u.isPlaceholder({ id: 'a' }) === false);

console.log('\n== §1.2 changed-only push ==');
const local = [
  { id: 'a', updatedAt: '2026-09-01 21:00:00' },   // remote jaisa hi => skip
  { id: 'b', updatedAt: '2026-09-01 21:05:00' },   // local naya => push
  { id: 'c', updatedAt: '2026-09-01 21:00:00' },   // remote par nahi => push
];
const remote = {
  a: { id: 'a', updatedAt: '2026-09-01 21:00:00.500' },
  b: { id: 'b', updatedAt: '2026-09-01 21:00:00' },
};
ok('sirf changed records push hote hain', JSON.stringify(u.pickChanged(local, remote).map(r => r.id)) === '["b","c"]',
  JSON.stringify(u.pickChanged(local, remote).map(r => r.id)));

console.log('\n== §4 remote merge + delete propagation ==');
const localMap = { a: { id: 'a', updatedAt: '2026-09-01 21:00:00' }, d: { id: 'd', updatedAt: '2026-09-01 21:00:00' } };
const remoteMap = {
  a: { id: 'a', updatedAt: '2026-09-01 21:00:00' },      // same => no update
  b: { id: 'b', updatedAt: '2026-09-01 21:03:00' },      // naya => apply
  d: { id: 'd', updatedAt: '2026-09-01 21:04:00', deleted: true }, // tombstone => remove
};
const merged = u.mergeRemote(remoteMap, localMap);
ok('naya record apply hota hai', merged.apply.length === 1 && merged.apply[0].id === 'b', JSON.stringify(merged.apply.map(r => r.id)));
ok('tombstone se local delete', JSON.stringify(merged.removeIds) === '["d"]', JSON.stringify(merged.removeIds));

console.log('\n== §4 PATCH chunking (250KB limit) ==');
const small = Array.from({ length: 200 }, (_, i) => ({ id: 'e' + i, name: 'x'.repeat(200) }));
const chunks = u.chunkPatch(small, 20 * 1024);
ok('chotte records ki multiple batches', chunks.length > 1 && chunks.flat().length === 200, `chunks=${chunks.length}`);
ok('har batch limit ke andar', chunks.every(c => JSON.stringify(c).length <= 20 * 1024 + 500));
const withImg = [
  { id: 'p1', name: 'a' },
  { id: 'p2', personThumb: 'data:image/jpeg;base64,' + 'A'.repeat(5000) },
  { id: 'p3', name: 'b' },
];
const imgChunks = u.chunkPatch(withImg, 100 * 1024);
ok('image wala record apni alag batch mein', imgChunks.length === 3 && imgChunks[1].length === 1 && imgChunks[1][0].id === 'p2',
  `chunks=${imgChunks.length} sizes=${imgChunks.map(c => c.length).join(',')}`);

console.log('\n== §5 date sanitizer ==');
ok('khaali -> null', u.normalizeDate('') === null);
ok('dd-MM-yyyy -> ISO', (u.normalizeDate('18-02-2028') || '').startsWith('2026') === false && u.normalizeDate('18-02-2028') === '2028-02-18T00:00:00.000Z', String(u.normalizeDate('18-02-2028')));
ok('local datetime string -> ISO', u.normalizeDate('2026-09-01 21:05:09') !== null);

console.log('\n== §8 diagnostics report ==');
const rep1 = u.buildImagePatchReport({ device: 'PC-Chrome', version: '5.0.0', counts: { employees: 77, cheques: 3 }, failed: 0 });
ok('report mein at/device/version/counts', rep1.device === 'PC-Chrome' && rep1.employees === 77 && rep1.failed === 0 && typeof rep1.at === 'string',
  JSON.stringify(rep1).slice(0, 90) + '…');

console.log('\n== FIX #8 Safari-safe dates ==');
ok('"2026-09-01 18:45:00" -> ISO', u.toSafeDateString('2026-09-01 18:45:00') === '2026-09-01T18:45:00', u.toSafeDateString('2026-09-01 18:45:00'));
ok('pehle se ISO waisa hi', u.toSafeDateString('2026-09-01T18:45:00Z') === '2026-09-01T18:45:00Z');
ok('"2026.09.01" -> ISO', u.toSafeDateString('2026.09.01') === '2026-09-01', u.toSafeDateString('2026.09.01'));
ok('normalizeDate space wala format parse karta hai', u.normalizeDate('2026-09-01 18:45:09') !== null);

console.log('\n== FIX #3 structure patch (1 read se tay) ==');
const p1 = u.computeStructurePatch(null, ['employees','cheques'], '2026-09-01 10:00:00', { app:'QIS' });
ok('khaali node -> sab collections + meta', Object.keys(p1).length === 3 && !!p1['data/employees/_placeholder'] && !!p1['meta'], JSON.stringify(Object.keys(p1)));
const existing = { meta: { app:'QIS' }, data: { employees: { _placeholder: { id:'_placeholder' } } } };
const p2 = u.computeStructurePatch(existing, ['employees','cheques'], '2026-09-01 10:00:00', { app:'QIS' });
ok('jo maujood hai woh dobara NAHI likha jata', Object.keys(p2).length === 1 && !!p2['data/cheques/_placeholder'], JSON.stringify(Object.keys(p2)));
const p3 = u.computeStructurePatch(existing, ['employees'], '2026-09-01 10:00:00', { app:'QIS' });
ok('sab maujood -> koi write nahi', Object.keys(p3).length === 0, JSON.stringify(p3));

console.log('\n== ⭐ AUTO-UPDATE: version compare (guide §9) ==');
ok('v5.7.0 > 5.6.0', u.isNewerVersion('v5.7.0', '5.6.0') === true);
ok('5.6.0 = 5.6.0 -> update nahi', u.isNewerVersion('5.6.0', '5.6.0') === false);
ok('5.5.9 < 5.6.0 -> update nahi', u.isNewerVersion('5.5.9', '5.6.0') === false);
ok('5.6.1 > 5.6.0 (patch)', u.isNewerVersion('5.6.1', '5.6.0') === true);
ok('6.0.0 > 5.9.9 (major)', u.isNewerVersion('6.0.0', '5.9.9') === true);
ok('khaali/ghalat tag -> update nahi', u.isNewerVersion('', '5.6.0') === false && u.isNewerVersion('abc', '5.6.0') === false);

console.log('\n== ⭐ LOGIN BASED AUTH (anonymous band) ==');
ok('admin -> admin@qis.local', cfg.usernameToEmail('admin') === 'admin@qis.local', cfg.usernameToEmail('admin'));
ok('Admin (capital/space) -> lowercase', cfg.usernameToEmail('  Admin ') === 'admin@qis.local', cfg.usernameToEmail('  Admin '));
ok('staff -> staff@qis.local', cfg.usernameToEmail('staff') === 'staff@qis.local');
ok('AUTH_REQUIRED = true (anonymous OFF)', cfg.AUTH_REQUIRED === true);
ok('DEFAULT_OWNER = admin@qis.local', cfg.DEFAULT_OWNER === 'admin@qis.local', cfg.DEFAULT_OWNER);
// RTDB rules wala sanitize pattern bilkul wahi hona chahiye jo rules mein hai
const ruleSanitize = (e) => e.toLowerCase().replace(/[^a-z0-9]/g, '_');
ok('email->owner key rules se match karta hai',
  ruleSanitize(cfg.usernameToEmail('admin')) === 'admin_qis_local',
  ruleSanitize(cfg.usernameToEmail('admin')));

console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================\n`);
process.exit(fail === 0 ? 0 : 1);
