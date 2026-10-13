import { Client } from '@colyseus/sdk';
import type { Room } from '@colyseus/sdk';
import { createPlayer, step, TOYBOX_ARENA } from '@boot-loop/shared';
import type { PlayerState } from '@boot-loop/shared';

export interface ConnectionStatus { connected: boolean; ping: number | null; serverTick: number; sharedAgreement: boolean | null }
export const connection: ConnectionStatus = { connected: false, ping: null, serverTick: 0, sharedAgreement: null };
const label = document.querySelector<HTMLSpanElement>('#connection')!;
const retry = document.querySelector<HTMLButtonElement>('#reconnect')!;
let room: Room | undefined;
let pingTimer: ReturnType<typeof setInterval> | undefined;
let busy = false;
function localReference() {
  let state = createPlayer(TOYBOX_ARENA.spawns[0]!);
  for (let i = 0; i < 60; i++) state = step(state, { x: 1, jumpHeld: i < 12, jumpPressed: i === 0 }, TOYBOX_ARENA);
  return state;
}
function offline() {
  connection.connected = false; connection.ping = null; connection.sharedAgreement = null;
  if (pingTimer) clearInterval(pingTimer);
  label.textContent = 'Offline · movement still works'; label.dataset.state = 'offline'; retry.hidden = false;
}
export async function connect() {
  if (busy || connection.connected) return;
  busy = true; retry.hidden = true; label.textContent = 'Connecting…'; label.dataset.state = 'connecting';
  try {
    const endpoint = import.meta.env.VITE_SERVER_URL || (import.meta.env.DEV ? location.protocol + '//' + location.hostname + ':3000' : location.origin);
    const client = new Client(endpoint);
    room = await client.create('movement_lab');
    room.onMessage('pong', (message: { sentAt: number; tick: number; reference: PlayerState }) => {
      connection.ping = Math.round(performance.now() - message.sentAt);
      connection.serverTick = message.tick;
      connection.sharedAgreement = JSON.stringify(message.reference) === JSON.stringify(localReference());
    });
    room.onLeave(() => offline());
    room.onError(() => offline());
    connection.connected = true; label.textContent = 'Server connected'; label.dataset.state = 'connected';
    const ping = () => { if (room && connection.connected) room.send('ping', performance.now()); };
    ping(); pingTimer = setInterval(ping, 1000);
  } catch (error) { console.warn('Connection check unavailable:', error); offline(); }
  finally { busy = false; }
}
retry.addEventListener('click', () => { void connect(); });
window.addEventListener('pagehide', () => { if (pingTimer) clearInterval(pingTimer); void room?.leave(); });

