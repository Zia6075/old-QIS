import { build } from 'esbuild';
import fs from 'node:fs';
const res = await build({
  entryPoints: ['/home/user/hrvisa/ro-entry.tsx'],
  bundle: true, format: 'cjs', platform: 'node', write: false,
  jsx: 'automatic', loader: { '.tsx':'tsx', '.ts':'ts', '.css':'empty' },
  external: ['react','react-dom','react-dom/server'],
  logLevel: 'error',
});
fs.writeFileSync('/home/user/hrvisa/ro-out.cjs', res.outputFiles[0].text);
