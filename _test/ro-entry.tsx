import React from 'react';
import { renderToString } from 'react-dom/server';
import { ImageUpload } from './src/components/UI/ImageUpload';
import { isDesktopApp, isReadOnly, canWrite } from './src/utils/platform';

let pass = 0, fail = 0;
const ok = (n: string, cond: boolean, x = '') => {
  cond ? (pass++, console.log(`  ✅ ${n}${x ? ' -> ' + x : ''}`)) : (fail++, console.log(`  ❌ ${n}${x ? ' -> ' + x : ''}`));
};

const UA_ELECTRON = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) QIS-HR/5.14.8 AppleWebKit/537.36 (KHTML, like Gecko) QIS-HR/5.14.8 Chrome/120.0.0.0 Electron/28.0.0 Safari/537.36';
const UA_CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const setEnv = (ua: string, proto: string) => {
  (globalThis as any).navigator = { userAgent: ua };
  (globalThis as any).window = { location: { protocol: proto, port: '' } };
};

const noop = () => {};
const el = React.createElement(ImageUpload, { label: 'Passport', value: '', onChange: noop, onClear: noop });

console.log('\n== 1) PC EXE (Electron) — upload field AANA chahiye ==');
setEnv(UA_ELECTRON, 'file:');
ok('isDesktopApp (Electron UA + file://)', isDesktopApp() === true);
ok('canWrite', canWrite() === true);
const pcHtml = renderToString(el);
ok('upload field render hua', pcHtml.includes('input') && pcHtml.length > 100, `html ${pcHtml.length} chars`);

console.log('\n== 2) Browser (Chrome) — upload field NAHI aana chahiye ==');
setEnv(UA_CHROME, 'https:');
ok('isDesktopApp = false', isDesktopApp() === false);
ok('isReadOnly = true', isReadOnly() === true);
ok('canWrite = false', canWrite() === false);
const webHtml = renderToString(el);
ok('upload field render NAHI hua (null)', webHtml === '' || webHtml === '<!-- -->', `html = "${webHtml}"`);

console.log('\n== 3) PC par browser se khola (localhost) — read-only ==');
setEnv(UA_CHROME, 'http:');
ok('isReadOnly = true', isReadOnly() === true);
ok('upload field nahi', renderToString(el) === '' || renderToString(el) === '<!-- -->');

console.log(`\n================ RESULT: ${pass} passed, ${fail} failed ================`);
process.exit(fail === 0 ? 0 : 1);
