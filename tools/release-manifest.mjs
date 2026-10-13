import { createHash } from 'node:crypto';
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
const paths = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = `${dir}/${entry.name}`;
    if (entry.isDirectory()) await walk(path); else paths.push(path);
  }
}
for (const dir of ['packages/shared/src', 'packages/server/src', 'packages/client/src', 'assets', 'tuning']) await walk(dir);
paths.push('package.json', 'package-lock.json', 'packages/client/index.html');
const hash = createHash('sha256');
for (const path of paths.sort()) { hash.update(path); hash.update(await readFile(path)); }
const manifest = { project: 'Boot Loop', buildId: hash.digest('hex').slice(0, 16), builtAt: new Date().toISOString(), sprint: 6 };
await mkdir('packages/client/public', { recursive: true });
await writeFile('packages/client/public/release.json', JSON.stringify(manifest, null, 2) + '\n');
console.log(`Release build ${manifest.buildId}`);
