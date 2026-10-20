// Builds FWA FOREVER into one self-contained page.
//   dist/index.html   production: three.js from the jsDelivr CDN, everything else inline
//   dist/dev.html     the same page loading three.js from node_modules (serve the repo root over http)
//   dist/app.js       the concatenated source, for linting and reading
// The source is plain ES modules split by concern (src/NN-name.js), concatenated in order into one module scope,
// then bundled with esbuild (which inlines the three.js add-ons we use).
import { readFileSync, writeFileSync, readdirSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import * as esbuild from 'esbuild';

const ROOT = dirname(fileURLToPath(import.meta.url)), SRC = join(ROOT, 'src'), DIST = join(ROOT, 'dist'), THREE = join(ROOT, 'node_modules', 'three');
const THREE_VERSION = JSON.parse(readFileSync(join(THREE, 'package.json'), 'utf8')).version;
const CDN = `https://cdn.jsdelivr.net/npm/three@${THREE_VERSION}`;
const rd = f => readFileSync(join(SRC, f), 'utf8');

let js = readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort().map(rd).join('\n');
js = js.replace("$('rBadge').textContent", "$('introN').textContent = N.toLocaleString('en');\n$('rBadge').textContent");

async function bundle(base) {
  const r = await esbuild.build({
    stdin: { contents: js, sourcefile: 'app.js', resolveDir: ROOT, loader: 'js' }, bundle: true, format: 'esm', write: false, logLevel: 'warning',
    external: ['three', 'three/webgpu'], alias: { 'three/tsl': join(THREE, 'build', 'three.tsl.js'), 'three/addons': join(THREE, 'examples', 'jsm') },
  });
  let out = r.outputFiles[0].text;
  for (const spec of ['three/webgpu', 'three']) out = out.replaceAll(`from "${spec}"`, `from "${base}/build/three.webgpu.js"`);
  return out;
}
async function page(base) {
  let h = rd('template.html');
  for (const [k, v] of [['%%FONT%%', rd('font.css.part').trim()], ['%%STYLE%%', rd('style.css')], ['%%MARKUP%%', rd('markup.html')], ['%%SCRIPT%%', await bundle(base)]]) h = h.replace(k, () => v);
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' + h + '\n</html>';
}

mkdirSync(DIST, { recursive: true });
writeFileSync(join(DIST, 'app.js'), js);
writeFileSync(join(DIST, 'index.html'), await page(CDN));
writeFileSync(join(DIST, 'dev.html'), await page('../node_modules/three'));
const mp3 = join(ROOT, 'assets', 'an-ending-ascent.mp3'); if (existsSync(mp3)) copyFileSync(mp3, join(DIST, 'an-ending-ascent.mp3'));
execSync('npx eslint --quiet dist/app.js', { cwd: ROOT, stdio: 'inherit' });
console.log(`built: ${(js.length / 1024).toFixed(0)} KB of source, three.js ${THREE_VERSION}, lint clean`);
