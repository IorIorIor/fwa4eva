// FWA FOREVER server (what Railway runs: `npm start` after `npm run build`).
// Serves the built site from dist/ and runs the multiplayer relay at /ws. The relay keeps nothing: each pilot sends
// where they are a few times a second, and it passes that on to everyone else connected. No accounts, no storage.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname } from 'node:path';
import { brotliCompressSync, gzipSync, constants } from 'node:zlib';
import { attachRelay } from './relay.mjs';
import { ROOT } from './shell.mjs';

const DIST = join(ROOT, 'dist'), PORT = +process.env.PORT || 8787;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };

// text files go out compressed (brotli, else gzip), squeezed once and kept: the page drops from ~1.4 MB to ~0.4 MB
const packCache = new Map();
async function packed(file, enc) {
  const k = enc + file; if (packCache.has(k)) return packCache.get(k); const raw = await readFile(file);
  const out = enc === 'br' ? brotliCompressSync(raw, { params: { [constants.BROTLI_PARAM_QUALITY]: 11, [constants.BROTLI_PARAM_SIZE_HINT]: raw.length } }) : gzipSync(raw, { level: 9 });
  packCache.set(k, out); return out;
}

const server = createServer(async (req, res) => {
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path === '/health') { res.writeHead(200, { 'content-type': 'text/plain' }); return res.end(`ok ${wss.clients.size} pilots`) }
    let file = normalize(join(DIST, path)); if (!file.startsWith(DIST)) { res.writeHead(403); return res.end() }
    if (!(await stat(file).catch(() => null))?.isFile()) file = join(DIST, 'index.html');   // one page: everything else is the app
    const hashed = file.includes(`${join(DIST, 'assets')}`), type = TYPES[extname(file)] || 'application/octet-stream', ae = req.headers['accept-encoding'] || '';
    const headers = { 'content-type': type, 'cache-control': hashed ? 'public, max-age=31536000, immutable' : 'no-cache', vary: 'accept-encoding' };
    const enc = /text|javascript|json|svg/.test(type) ? (/\bbr\b/.test(ae) ? 'br' : /gzip/.test(ae) ? 'gzip' : null) : null;
    const body = enc ? await packed(file, enc) : await readFile(file); if (enc) headers['content-encoding'] = enc;
    res.writeHead(200, headers); res.end(body);
  } catch (e) { res.writeHead(500); res.end() }
});

const wss = attachRelay(server);

server.listen(PORT, () => console.log(`FWA FOREVER on :${PORT} (relay at /ws)`));
// warm the compression cache in the background: the big script takes a couple of seconds at brotli quality 11
import('node:fs/promises').then(async ({ readdir }) => {
  const walk = async d => (await readdir(d, { withFileTypes: true })).flatMap(e => e.isDirectory() ? [] : [join(d, e.name)]);
  const files = [...await walk(DIST), ...await walk(join(DIST, 'assets')).catch(() => [])].filter(f => /\.(html|js|css|json|svg)$/.test(f));
  for (const f of files) for (const enc of ['br', 'gzip']) { await packed(f, enc); await new Promise(r => setImmediate(r)) }
}).catch(() => { });
