// The multiplayer relay: each pilot sends where they are a few times a second and it passes that on to everyone else
// connected. Keeps nothing. Attached at /ws to the production server (server.mjs) and to the Vite dev server (vite.config.mjs).
import { WebSocketServer } from 'ws';
import { randomBytes } from 'node:crypto';

export function attachRelay(server) {
  const MAX_PILOTS = 200, MAX_MSG = 1024, MIN_GAP = 40;   // bytes per message, ms between messages from one pilot
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG });
  // take over only upgrades to /ws, so other sockets on the same server (Vite's live reload) are left alone
  server.on('upgrade', (req, sock, head) => { if (new URL(req.url, 'http://x').pathname === '/ws') wss.handleUpgrade(req, sock, head, ws => wss.emit('connection', ws, req)) });
  let joins = 0; const hueSeed = Math.random() * 360;
  const num = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
  wss.on('connection', ws => {
    if (wss.clients.size > MAX_PILOTS) return ws.close(1013, 'full');
    ws.id = randomBytes(6).toString('hex'); ws.last = 0; ws.alive = true; ws.state = null;
    ws.send(JSON.stringify({ t: 'hi', h: Math.round((hueSeed + joins++ * 137.508) % 360) }));   // each pilot's colour: golden-angle steps round the wheel, so pilots online together never share one
    for (const c of wss.clients) if (c !== ws && c.state) ws.send(c.state);   // everyone already flying shows up at once
    ws.on('pong', () => { ws.alive = true });
    ws.on('message', raw => {
      const now = Date.now(); if (now - ws.last < MIN_GAP) return; ws.last = now;
      let m; try { m = JSON.parse(raw) } catch { return }
      const s = m && m.t === 'p' && m.s; if (!s || !num(s.p, 3) || !num(s.q, 4)) return;   // only well-formed positions travel
      const out = JSON.stringify({ t: 'p', id: ws.id, s: { p: s.p, q: s.q, v: num(s.v, 3) ? s.v : [0, 0, 0], h: Number.isFinite(s.h) ? s.h : 0, m: s.m === 'map' ? 'map' : 'fly', th: (s.th | 0) & 3 } });
      ws.state = out;
      for (const c of wss.clients) if (c !== ws && c.readyState === 1) c.send(out);
    });
    ws.on('close', () => { const out = JSON.stringify({ t: 'x', id: ws.id }); for (const c of wss.clients) if (c.readyState === 1) c.send(out) });
  });
  const beat = setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue } ws.alive = false; ws.ping() } }, 20000);   // drop dead connections
  wss.on('close', () => clearInterval(beat));
  return wss;
}
