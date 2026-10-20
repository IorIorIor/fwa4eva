// FWA FOREVER server (what Railway runs: `npm start` after `npm run build`).
// Serves the built site from dist/ and runs the multiplayer relay at /ws. The relay keeps nothing: each pilot sends
// where they are a few times a second, and it passes that on to everyone else connected. No accounts, no storage.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { attachRelay } from './relay.mjs';
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

const wss = attachRelay(server);

server.listen(PORT, () => console.log(`FWA FOREVER on :${PORT} (relay at /ws)`));
