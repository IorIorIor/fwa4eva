// The page shell and the app source, shared by the Vite setup (vite.config.mjs) and the single-file build (build.mjs).
// The source is plain ES modules split by concern (src/NN-name.js) that share one module scope, so they are
// concatenated in order rather than imported one by one.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const SRC = join(ROOT, 'src'), ROOM = join(ROOT, 'room');
const rd = f => readFileSync(join(SRC, f), 'utf8');

// the room's props (room/props.js, shared with its viewer) go in just before the room, with the pictures they use: as files in
// public/room, or (inline: the single-file build) written into the page
const ROOM_IMGS = ['kesey', 'webdesign', 'motd', 'sotd', 'persepolis'];
const roomProps = inline => `const ROOM_IMG = ${JSON.stringify(Object.fromEntries(ROOM_IMGS.map(k => [k, inline ? 'data:image/jpeg;base64,' + readFileSync(join(ROOT, 'public', 'room', k + '.jpg')).toString('base64') : `room/${k}.jpg`])))};\n`
  + readFileSync(join(ROOM, 'props.js'), 'utf8').replace('export function makeProps', 'function makeProps') + '\n';

// (after the room is up, every file starts with a breath for it to draw a frame: see roomYield in 01-zroom)
// (the settings go in just before the room, so it opens with the tuned look from its very first frame, not the defaults for a few)
const order = () => { const fs = readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort(), i = fs.indexOf('03-settings.js'), z = fs.findIndex(f => f.startsWith('01-zroom')); if (i > z && z >= 0) { fs.splice(i, 1); fs.splice(z, 0, '03-settings.js') } return fs };
export const appSource = ({ inline = false } = {}) => { let past = false; return order().map(f => { const s = (past ? ';await roomYield();\n' : '') + (f.startsWith('01-zroom') ? roomProps(inline) : '') + rd(f); if (f.startsWith('01-zroom')) past = true; return s }).join('\n') };

// the whole page around a script tag (or an inline script when `inline` is given)
export function pageHtml({ script, inline } = {}) {
  let h = rd('template.tpl');
  const tag = inline != null ? `<script type="module">\n${inline}\n</script>` : script;
  for (const [k, v] of [['%%FONT%%', rd('font.css.part').trim()], ['%%STYLE%%', rd('style.css')], ['%%MARKUP%%', rd('markup.tpl')]]) h = h.replace(k, () => v);
  h = h.replace(/<script type="module">\s*%%SCRIPT%%\s*<\/script>/, () => tag);
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' + h + '\n</html>';
}
