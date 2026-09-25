import { formatCurrency, formatNumber, safeNumber } from './src/utils/helpers';

let pass = 0, fail = 0;
const ok = (n: string, fn: () => unknown) => {
  try { const r = fn(); pass++; console.log(`  ✅ ${n} -> ${JSON.stringify(r)}`); }
  catch (e: any) { fail++; console.log(`  ❌ ${n} -> THROW: ${e.message}`); }
};

// ⭐ ASLI corrupt record (jo aap ke Firebase mein hai)
const corrupt: any = { chequeImage: 'data:image/jpeg;base64,AAA', hasMedia: true };
const good: any = { id:'chq1', chequeNumber:'C1', companyName:'X', chequeAmount:1000, remainingBalance:-2500 };
const cheques = [corrupt, good];

console.log('\n== 1) ASLI crash wali line (chqOpts .map) ==');
ok('chqOpts map (corrupt + good)', () => cheques
  .filter((c: any) => c.chequeNumber)
  .map((c: any) => ({ value: c.id, label: `${safeNumber(c.remainingBalance) < 0 ? '⚠️' : '✅'} ${c.chequeNumber} — ${c.companyName || '(no company)'} (${safeNumber(c.remainingBalance) < 0 ? `OVERDUE AED ${formatNumber(Math.abs(safeNumber(c.remainingBalance)))}` : `Bal: AED ${formatNumber(c.remainingBalance)}`})` })));

console.log('\n== 2) corrupt record filter hota hai? ==');
ok('corrupt filter (chequeNumber nahi)', () => cheques.filter((c: any) => c.chequeNumber).length);

console.log('\n== 3) helpers — undefined/NaN par kabhi throw na hon ==');
ok('safeNumber(undefined)', () => safeNumber(undefined));
ok('safeNumber(null)', () => safeNumber(null));
ok('safeNumber(NaN)', () => safeNumber(NaN));
ok('safeNumber("abc")', () => safeNumber('abc'));
ok('safeNumber(-2500)', () => safeNumber(-2500));
ok('formatNumber(undefined)', () => formatNumber(undefined));
ok('formatNumber(1000)', () => formatNumber(1000));
ok('formatCurrency(undefined)', () => formatCurrency(undefined));

console.log('\n== 4) PDF export wali line (e.amount undefined) ==');
const exp: any = { amount: undefined, category: undefined, description: '', vendorName: '', expenseDate: undefined };
ok('expense row', () => `<td>${formatCurrency(exp.amount)}</td>`);

console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
process.exit(fail === 0 ? 0 : 1);
