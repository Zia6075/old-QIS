import React from 'react';
import { renderToString } from 'react-dom/server';
import { formatCurrency, formatDate } from './src/utils/helpers';
import { StatusBadge } from './src/components/UI/Table';

let pass = 0, fail = 0;
const ok = (n: string, fn: () => unknown) => {
  try { const r = fn(); pass++; console.log(`  ✅ ${n} -> ${JSON.stringify(r)}`); }
  catch (e: any) { fail++; console.log(`  ❌ ${n} -> THROW: ${e.message}`); }
};

console.log('\n== 1) formatCurrency — corrupt (undefined) values par crash na ho ==');
ok('formatCurrency(undefined)', () => formatCurrency(undefined as any));
ok('formatCurrency(null)', () => formatCurrency(null as any));
ok('formatCurrency(NaN)', () => formatCurrency(NaN));
ok('formatCurrency(1000)', () => formatCurrency(1000));
ok('formatCurrency(-2500)', () => formatCurrency(-2500));

console.log('\n== 2) formatDate — undefined par ==');
ok('formatDate(undefined)', () => formatDate(undefined as any));
ok('formatDate("")', () => formatDate(''));

console.log('\n== 3) ASLI corrupt cheque record render (jo DB mein hai) ==');
const corrupt: any = { chequeImage: 'data:image/jpeg;base64,AAA', hasMedia: true };
ok('chequeNumber cell', () => renderToString(
  React.createElement('span', null, corrupt.chequeNumber ? corrupt.chequeNumber : '⚠️ Corrupt record — delete karein')
));
ok('Amount cell (formatCurrency undefined)', () => renderToString(
  React.createElement('span', null, formatCurrency(corrupt.chequeAmount))
));
ok('Spent cell (undefined - undefined)', () => renderToString(
  React.createElement('span', null, formatCurrency(corrupt.chequeAmount - corrupt.remainingBalance))
));
ok('Balance cell', () => renderToString(
  React.createElement('span', null, formatCurrency(corrupt.remainingBalance))
));
ok('Date cell', () => renderToString(
  React.createElement('span', null, formatDate(corrupt.chequeDate))
));
ok('StatusBadge', () => renderToString(React.createElement(StatusBadge, { status: 'safe', text: 'ACTIVE' })));

console.log('\n== 4) corrupt expense (recentExpenses mein) ==');
const exp: any = { amount: undefined, category: undefined, expenseDate: undefined, description: '' };
ok('expense amount cell', () => renderToString(React.createElement('span', null, formatCurrency(exp.amount))));
ok('expense date cell', () => renderToString(React.createElement('span', null, formatDate(exp.expenseDate))));

console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
process.exit(fail === 0 ? 0 : 1);
