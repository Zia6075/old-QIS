import { build } from 'esbuild';
import fs from 'node:fs';
const res = await build({
  entryPoints: ['/home/user/hrvisa/crash2-entry.tsx'],
  bundle: true, format: 'cjs', platform: 'node', write: false,
  loader: { '.tsx':'tsx', '.ts':'ts', '.css':'empty' },
  logLevel: 'error',
});
fs.writeFileSync('/home/user/hrvisa/crash2-out.cjs', res.outputFiles[0].text);
