// Single-file build: FWA FOREVER as one self-contained page (for hosts without a build step, or a claude.ai artifact).
//   dist-single/index.html   three.js from the jsDelivr CDN, everything else inline, plus the soundtrack beside it
// The normal build is Vite (`npm run build`, see vite.config.mjs). This also lints the concatenated source.
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import * as esbuild from 'esbuild';
import { ROOT, appSource, pageHtml } from './shell.mjs';

const THREE = join(ROOT, 'node_modules', 'three'), OUT = join(ROOT, 'dist-single');
const CDN = `https://cdn.jsdelivr.net/npm/three@${JSON.parse(readFileSync(join(THREE, 'package.json'), 'utf8')).version}`;
const js = appSource({ inline: true });   // (the room's pictures written into the page)
const r = await esbuild.build({
  stdin: { contents: js, sourcefile: 'app.js', resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'esm', write: false, logLevel: 'warning',
  external: ['three', 'three/webgpu'], alias: { 'three/tsl': join(THREE, 'build', 'three.tsl.js'), 'three/addons': join(THREE, 'examples', 'jsm') },
});
let out = r.outputFiles[0].text;
for (const spec of ['three/webgpu', 'three']) out = out.replaceAll(`from "${spec}"`, `from "${CDN}/build/three.webgpu.js"`);
mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, 'app.js'), js);
let page = pageHtml({ inline: out });
if (process.env.INLINE_DATA) {   // INLINE_DATA=1: the archive and the desk's thumbnails written into the page too (a page with no data/ folder beside it)
  execSync(`python3 room/build-thumbs.py --sheets ${join(OUT, 'sheets')}`, { cwd: ROOT, stdio: 'inherit' });   // (and the screenshots, packed in sheets beside it: dist-single/sheets)
  const dd = join(ROOT, 'public', 'data'), data = { archive: JSON.parse(readFileSync(join(dd, 'archive.json'), 'utf8')), thumbs: JSON.parse(readFileSync(join(dd, 'thumbs.json'), 'utf8')), atlas: 'data:image/png;base64,' + readFileSync(join(dd, 'thumbs.png')).toString('base64') };
  page = page.replace('<script type="module">', () => `<script>window.__FWA_DATA = ${JSON.stringify(data).replace(/</g, '\\u003c')}</script>\n<script type="module">`);
}
writeFileSync(join(OUT, 'index.html'), page);
for (const f of ['favicon.svg', 'favicon.png', 'apple-touch-icon.png', 'share.png']) { const src = join(ROOT, 'public', f); if (existsSync(src)) copyFileSync(src, join(OUT, f)) }
execSync('npx eslint --quiet dist-single/app.js', { cwd: ROOT, stdio: 'inherit' });
console.log(`built dist-single/: ${(js.length / 1024).toFixed(0)} KB of source, lint clean`);
