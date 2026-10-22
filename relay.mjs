// The multiplayer relay: each pilot sends where they are a few times a second and it passes that on to everyone else
// connected. Keeps nothing but the flags: each pilot's one parked vehicle (test), saved to FLAGS_FILE (default ./flags.json). Attached at /ws to the production server (server.mjs) and to the Vite dev server (vite.config.mjs).
import { WebSocketServer } from 'ws';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFile } from 'node:fs';

export function attachRelay(server) {
  const MAX_PILOTS = 200, MAX_MSG = 1024, MIN_GAP = 40;   // bytes per message, ms between messages from one pilot
  const wss = new WebSocketServer({ noServer: true, maxPayload: MAX_MSG });
  // take over only upgrades to /ws, so other sockets on the same server (Vite's live reload) are left alone
  server.on('upgrade', (req, sock, head) => { if (new URL(req.url, 'http://x').pathname === '/ws') wss.handleUpgrade(req, sock, head, ws => wss.emit('connection', ws, req)) });
  let joins = 0; const hueSeed = Math.random() * 360;
  // flags: keyed by a hash of the pilot's secret token (only the token's owner can move or remove theirs; others see the hash)
  const FLAGS_FILE = process.env.FLAGS_FILE || './flags.json', MAX_FLAGS = 5000, flags = new Map(); let saveT = 0;
  try { for (const [k, f] of Object.entries(JSON.parse(readFileSync(FLAGS_FILE, 'utf8')))) flags.set(k, f) } catch { }
  const saveFlags = () => { clearTimeout(saveT); saveT = setTimeout(() => writeFile(FLAGS_FILE, JSON.stringify(Object.fromEntries(flags)), () => { }), 1000) };
  const keyOf = tok => typeof tok === 'string' && /^[0-9a-f]{16,64}$/.test(tok) ? createHash('sha256').update(tok).digest('hex').slice(0, 16) : null;
  const str = (x, n) => typeof x === 'string' ? x.slice(0, n) : '';
  const num = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite);
  wss.on('connection', ws => {
    if (wss.clients.size > MAX_PILOTS) return ws.close(1013, 'full');
    ws.id = randomBytes(6).toString('hex'); ws.last = 0; ws.alive = true; ws.state = null;
    ws.send(JSON.stringify({ t: 'hi', h: Math.round((hueSeed + joins++ * 137.508) % 360) }));   // each pilot's colour: golden-angle steps round the wheel, so pilots online together never share one
    for (const c of wss.clients) if (c !== ws && c.state) ws.send(c.state);   // everyone already flying shows up at once
    ws.send(JSON.stringify({ t: 'flags', list: [...flags].map(([k, f]) => ({ k, f })) }));   // and every parked vehicle
    ws.on('pong', () => { ws.alive = true });
    ws.on('message', raw => {
      const now = Date.now(); if (now - ws.last < MIN_GAP) return; ws.last = now;
      let m; try { m = JSON.parse(raw) } catch { return }
      if (m && m.t === 'flagme') { const k = keyOf(m.tok); if (k) ws.send(JSON.stringify({ t: 'flagme', k })); return }
      if (m && m.t === 'flag') {   // plant, move or remove your one flag
        const k = keyOf(m.tok), f = m.f; if (!k) return; let out;
        if (f === null) { if (!flags.delete(k)) return; out = { t: 'flag', k, f: null } }
        else { if (!f || !num(f.p, 3) || !num(f.q, 4) || (!flags.has(k) && flags.size >= MAX_FLAGS)) return; const v = { p: f.p, q: f.q, n: str(f.n, 32), a: str(f.a, 40), h: Number.isFinite(f.h) ? f.h : 0, s: Number.isInteger(f.s) ? f.s & 63 : 0, at: Date.now() }; flags.set(k, v); out = { t: 'flag', k, f: v } }
        saveFlags(); const o = JSON.stringify(out); for (const c of wss.clients) if (c.readyState === 1) c.send(o); ws.send(JSON.stringify({ t: 'flagme', k })); return;
      }
      const s = m && m.t === 'p' && m.s; if (!s || !num(s.p, 3) || !num(s.q, 4)) return;   // only well-formed positions travel
      const out = JSON.stringify({ t: 'p', id: ws.id, s: { p: s.p, q: s.q, v: num(s.v, 3) ? s.v : [0, 0, 0], h: Number.isFinite(s.h) ? s.h : 0, m: s.m === 'map' ? 'map' : 'fly', th: (s.th | 0) & 3, n: str(s.n, 32), fk: str(s.fk, 40), ...(typeof s.say === 'string' && Number.isFinite(s.sid) ? { say: str(s.say, 140), sid: s.sid } : {}) } });
      ws.state = out;
      for (const c of wss.clients) if (c !== ws && c.readyState === 1) c.send(out);
    });
    ws.on('close', () => { const out = JSON.stringify({ t: 'x', id: ws.id }); for (const c of wss.clients) if (c.readyState === 1) c.send(out) });
  });
  const beat = setInterval(() => { for (const ws of wss.clients) { if (!ws.alive) { ws.terminate(); continue } ws.alive = false; ws.ping() } }, 20000);   // drop dead connections
  wss.on('close', () => clearInterval(beat));
  return wss;
}
