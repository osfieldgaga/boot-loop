import { Server, Room } from '@colyseus/core';
import type { Client } from '@colyseus/core';
import { Schema, defineTypes } from '@colyseus/schema';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createPlayer, step, TOYBOX_ARENA, MatchEngine } from '@boot-loop/shared';
import { createReadStream } from 'node:fs';
import { stat, readFile } from 'node:fs/promises';
import { dirname, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';

class LabState extends Schema { tick = 0; phase = 'movement-preview'; }
defineTypes(LabState, { tick: 'number', phase: 'string' });
function referenceMovement() {
  let state = createPlayer(TOYBOX_ARENA.spawns[0]!);
  for (let i = 0; i < 60; i++) state = step(state, { x: 1, jumpHeld: i < 12, jumpPressed: i === 0 }, TOYBOX_ARENA);
  return state;
}
class MovementLab extends Room<{ state: LabState }> {
  onCreate() {
    this.maxClients = 4; this.maxMessagesPerSecond = 10;
    this.setState(new LabState());
    this.setSimulationInterval(() => this.state.tick++, 1000 / 60);
    this.onMessage('ping', (client: Client, message: unknown) => {
      if (typeof message !== 'number' || !Number.isFinite(message) || message < 0) return;
      client.send('pong', { sentAt: message, tick: this.state.tick, reference: referenceMovement() });
    });
  }
}
class PartyRoom extends Room<{ state: LabState }> {
  private match = new MatchEngine();
  private syncJoinLock() {
    if (['countdown', 'running'].includes(this.match.phase)) void this.lock();
    else void this.unlock();
  }
  onCreate() {
    this.maxClients = 4; this.maxMessagesPerSecond = 90; this.autoDispose = true;
    this.setState(new LabState());
    this.onMessage('input', (client: Client, message: unknown) => { this.match.submit(client.sessionId, message); });
    this.onMessage('snapshot', (client: Client) => client.send('snapshot', this.match.snapshot()));
    this.onMessage('ping', (client: Client, message: unknown) => {
      if (typeof message === 'number' && Number.isFinite(message) && message >= 0) client.send('pong', { sentAt: message, tick: this.match.tick });
    });
    this.onMessage('duration', (client: Client, value: unknown) => {
      if (this.match.configure(client.sessionId, value)) this.publish();
    });
    this.onMessage('bullet-padding', (client: Client, value: unknown) => {
      if (this.match.configureBulletPadding(client.sessionId, value)) this.publish();
    });
    this.onMessage('mode', (client: Client, value: unknown) => { if (this.match.configureMode(client.sessionId, value)) this.publish(); });
    this.onMessage('arena', (client: Client, value: unknown) => { if (this.match.configureArena(client.sessionId, value)) this.publish(); });
    this.onMessage('stocks', (client: Client, value: unknown) => { if (this.match.configureStocks(client.sessionId, value)) this.publish(); });
    this.onMessage('start', (client: Client) => {
      if (this.match.start(client.sessionId)) { this.syncJoinLock(); this.publish(); }
      else client.send('notice', 'Only the room host can start, and at least two players must be present.');
    });
    this.setSimulationInterval(() => {
      const previousPhase = this.match.phase;
      this.match.advance();
      if (previousPhase !== this.match.phase) this.syncJoinLock();
      this.state.tick = this.match.tick; this.state.phase = this.match.phase;
      if (this.match.tick % 3 === 0) this.publish();
    }, 1000 / 60);
  }
  onJoin(client: Client) {
    if (!this.match.add(client.sessionId)) { void client.leave(4000); return; }
    this.publish();
  }
  onLeave(client: Client) { this.match.remove(client.sessionId); this.syncJoinLock(); this.publish(); }
  private publish() { this.broadcast('snapshot', this.match.snapshot()); }
}
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../client/dist');
const release = JSON.parse(await readFile(resolve(root, 'release.json'), 'utf8').catch(() => '{"buildId":"unbuilt"}')) as { buildId: string };
const mime: Record<string, string> = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg' };
const gameServer = new Server({
  greet: false,
  transport: new WebSocketTransport({ maxPayload: 4096 }),
  express: (app) => {
    app.get('/health', (_request: IncomingMessage, response: ServerResponse) => {
      response.setHeader('Cache-Control', 'no-store');
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify({ status: 'ok', project: 'Boot Loop', sprint: 6, buildId: release.buildId, movement: 'server replay with client prediction', reference: referenceMovement() }));
    });
    app.use(async (request: IncomingMessage, response: ServerResponse, next: () => void) => {
      // Colyseus installs its matchmaking router after the custom HTTP routes.
      if (request.url?.startsWith('/matchmake')) { next(); return; }
      if (request.method !== 'GET' && request.method !== 'HEAD') { response.statusCode = 405; response.end(); return; }
      let path: string;
      try { const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname); path = resolve(root, '.' + (['/', '/dev', '/dev/'].includes(pathname) ? '/index.html' : pathname)); }
      catch { response.statusCode = 400; response.end(); return; }
      if (!path.startsWith(root + sep)) { response.statusCode = 403; response.end(); return; }
      try {
        const info = await stat(path);
        if (!info.isFile()) { response.statusCode = 404; response.end(); return; }
        response.setHeader('Content-Type', mime[extname(path)] ?? 'application/octet-stream');
        response.setHeader('X-Content-Type-Options', 'nosniff');
        response.setHeader('Cache-Control', path.includes(sep + 'assets' + sep) ? 'public, max-age=31536000, immutable' : 'no-cache');
        if (request.method === 'HEAD') { response.end(); return; }
        const stream = createReadStream(path);
        stream.on('error', () => { if (!response.headersSent) response.statusCode = 500; response.end(); });
        stream.pipe(response);
      } catch { response.statusCode = 404; response.end('Build the client with npm run build, then reload.'); }
    });
  },
});
gameServer.define('movement_lab', MovementLab);
gameServer.define('party', PartyRoom);
const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be a valid TCP port.');
await gameServer.listen(port, '0.0.0.0');
console.log('Boot Loop movement preview: http://localhost:' + port);
