import { Server } from 'node-osc';
import { BrowserWindow } from 'electron';

export interface OSCMessage {
  address: string;
  args: number[];
}

export interface OSCStatus {
  bound: boolean;
  host: string;
  port: number;
  packetCount: number;
  lastAddress: string | null;
  lastArgs: number[] | null;
  lastTime: number | null;
  lastError: string | null;
}

let server: Server | null = null;
let statusTimer: NodeJS.Timeout | null = null;

const status: OSCStatus = {
  bound: false,
  host: '',
  port: 0,
  packetCount: 0,
  lastAddress: null,
  lastArgs: null,
  lastTime: null,
  lastError: null,
};

function sendStatus(win: BrowserWindow): void {
  if (!win.isDestroyed()) win.webContents.send('osc-status', { ...status });
}

/** Coerce a node-osc arg (number, or {type,value}) into a plain number. */
function toNumber(a: unknown): number {
  if (typeof a === 'number') return a;
  if (a && typeof a === 'object' && 'value' in (a as any)) return Number((a as any).value);
  return Number(a);
}

function handleIncoming(msg: unknown[], win: BrowserWindow): void {
  if (!Array.isArray(msg) || msg.length < 1 || typeof msg[0] !== 'string') return;
  const address = msg[0] as string;
  const args = msg.slice(1).map(toNumber);

  status.packetCount++;
  status.lastAddress = address;
  status.lastArgs = args;
  status.lastTime = Date.now();
  console.log(`[osc #${status.packetCount}] ${address} ${args.join(' ')}`);

  const payload: OSCMessage = { address, args };
  if (!win.isDestroyed()) win.webContents.send('osc-message', payload);
}

/** Recursively walk an OSC bundle and dispatch each contained message. */
function expandBundle(bundle: any, win: BrowserWindow): void {
  if (!bundle || !bundle.elements) return;
  for (const el of bundle.elements) {
    if (!el) continue;
    if (el.elements) {
      expandBundle(el, win); // nested bundle
    } else if (Array.isArray(el)) {
      handleIncoming(el, win);
    } else if (el.address) {
      const args = Array.isArray(el.args)
        ? el.args.map((a: any) => (a && typeof a === 'object' && 'value' in a ? a.value : a))
        : [];
      handleIncoming([el.address, ...args], win);
    }
  }
}

export function startOSCReceiver(port: number, host: string, win: BrowserWindow): void {
  stopOSCReceiver();

  status.host = host;
  status.port = port;
  status.bound = false;
  status.lastError = null;
  status.packetCount = 0;

  server = new Server(port, host, () => {
    status.bound = true;
    console.log(`[osc] listening on ${host}:${port}`);
    sendStatus(win);
  });

  server.on('message', (msg: unknown[]) => {
    handleIncoming(msg, win);
  });

  // node-osc's typings omit 'bundle', but the runtime emits it — VCV Rack's
  // trowaSoft cvOSCcv sends bundled messages, so this path is essential.
  (server as any).on('bundle', (bundle: any) => {
    expandBundle(bundle, win);
  });

  server.on('error', (err: Error) => {
    status.lastError = err.message;
    console.error('[osc] server error', err);
    sendStatus(win);
  });

  // heartbeat so the in-app monitor stays current even when idle
  statusTimer = setInterval(() => sendStatus(win), 500);
}

export function stopOSCReceiver(): void {
  if (statusTimer) {
    clearInterval(statusTimer);
    statusTimer = null;
  }
  if (server) {
    server.close();
    server = null;
  }
  status.bound = false;
}
