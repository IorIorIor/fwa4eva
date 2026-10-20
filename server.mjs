// FWA FOREVER server (what Railway runs: `npm start` after `npm run build`).
// Serves the built site from dist/ and runs the multiplayer relay at /ws. The relay keeps nothing: each pilot sends
// where they are a few times a second, and it passes that on to everyone else connected. No accounts, no storage.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { randomBytes } from 'node:crypto';
import { WebSocketServer } from 'ws';
import { ROOT } from './shell.mjs';

const DIST = join(ROOT, 'dist'), PORT = +process.env.PORT || 8787;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok ${wss.clients.size} pilots`) }
    let file = normalize(join(DIST, path)); if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() }
    if (!(await stat(file).catch(() => null))?.isFile()) file = join(DIST, 'index.html');   // one page: everything else is the app
    const body = await readFile(file), hashed = file.includes(`${join(DIST, 'assets')}`);
    res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream', 'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(body);
  } catch (e) { res.writeHead(500); res.end() }
});

/* the relay */
const MAX_PILOTS = 200, MAX_MSG = 1024, MIN_GAP = 40;   // bytes per message, ms between messages from one pilot
const wss = new WebSocketServer({ server, path: '/ws', maxPayload: MAX_MSG });
const num = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
wss.on('connection', ws => {
  if (wss.clients.size > MAX_PILOTS) return ws.close(1013, 'full');
  ws.id = randomBytes(6).toString('hex'); ws.last = 0; ws.alive = true; ws.state = null;
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
setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue } ws.alive = false; ws.ping() } }, 20000);   // drop dead connections

server.listen(PORT, () => console.log(`FWA FOREVER on :${PORT} (relay at /ws)`));
