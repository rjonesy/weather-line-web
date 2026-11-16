import {spawnSync} from 'node:child_process';
import {cp, mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const build = spawnSync(process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', ['run', 'build'], {
  cwd:root,
  stdio:'inherit',
  shell:process.platform === 'win32',
});
if (build.error) throw build.error;
if (build.status !== 0) process.exit(build.status ?? 1);

// Stage a complete static snapshot; GitHub Pages serves main:/docs directly.
const dist = new URL('../dist/', import.meta.url), docs = new URL('../docs/', import.meta.url);
await readFile(new URL('index.html', dist));
await rm(docs, {recursive:true, force:true});
await mkdir(docs, {recursive:true});
await cp(dist, docs, {recursive:true});
await writeFile(new URL('.nojekyll', docs), '');
console.log('GitHub Pages is ready in docs/. Commit docs/ with the source.');
