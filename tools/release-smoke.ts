import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { Client } from '@colyseus/sdk';
const reservation = createServer();
await new Promise<void>(resolve => reservation.listen(0, '127.0.0.1', resolve));
const address = reservation.address();
assert.ok(address && typeof address !== 'string');
const port = address.port;
await new Promise<void>((resolve, reject) => reservation.close(error => error ? reject(error) : resolve()));
const endpoint = `http://localhost:${port}`;
const expected = JSON.parse(await readFile('packages/client/dist/release.json', 'utf8')) as { buildId: string };
let child: ReturnType<typeof spawn> | undefined;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function until(check: () => Promise<boolean> | boolean, description: string) {
  const start = Date.now(); while (!(await check())) { assert.ok(Date.now() - start < 12000, description); await sleep(50); }
}
async function start() {
  child = spawn(process.execPath, ['--import', 'tsx', 'packages/server/src/index.ts'], { env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'ignore', 'pipe'] });
  child.stderr?.on('data', d => process.stderr.write(d));
  await until(async () => { assert.equal(child?.exitCode, null, 'test server exited during startup'); try { return (await fetch(endpoint + '/health')).ok; } catch { return false; } }, 'server did not start');
}
async function stop() {
  if (!child || child.exitCode !== null) return;
  const current = child; current.kill('SIGTERM');
  await until(() => current.exitCode !== null || current.signalCode !== null, 'server did not stop'); child = undefined;
}
try {
  await start();
  for (const route of ['/', '/dev', '/dev/']) { const r = await fetch(endpoint + route); assert.equal(r.status, 200); assert.match(await r.text(), /Boot Loop/); }
  const health = await (await fetch(endpoint + '/health')).json() as { buildId: string; sprint: number };
  assert.equal(health.buildId, expected.buildId); assert.equal(health.sprint, 6);
  const manifest = await (await fetch(endpoint + '/release.json')).json() as { buildId: string };
  assert.equal(manifest.buildId, health.buildId);
  assert.equal((await fetch(endpoint + '/missing.file')).status, 404);
  assert.equal((await fetch(endpoint + '/', { method: 'POST' })).status, 405);
  assert.equal((await fetch(endpoint + '/', { method: 'HEAD' })).status, 200);
  const cors = await fetch(endpoint + '/matchmake/create/party', { method: 'OPTIONS', headers: { Origin: 'https://release-test.example', 'Access-Control-Request-Method': 'POST' } });
  assert.ok(cors.headers.get('access-control-allow-origin'));
  const client = new Client(endpoint), room = await client.create('party'); room.onMessage('snapshot', () => {});
  let left = false; room.onLeave(() => { left = true; }); const oldId = room.roomId;
  await stop(); await until(() => left, 'client did not detect shutdown');
  await start(); await assert.rejects(client.joinById(oldId));
  const replacement = await client.create('party'); replacement.onMessage('snapshot', () => {}); await replacement.leave();
  console.log(`PASS: release ${expected.buildId}; player/dev routes, health/manifest agreement, HTTP errors/HEAD, cross-origin matchmaking headers, restart disconnect, expired invite and fresh room creation.`);
} finally { await stop(); }
