// The page shell and the app source, shared by the Vite setup (vite.config.mjs) and the single-file build (build.mjs).
// The source is plain ES modules split by concern (src/NN-name.js) that share one module scope, so they are
// concatenated in order rather than imported one by one.
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(fileURLToPath(import.meta.url));
export const SRC = join(ROOT, 'src');
const rd = f => readFileSync(join(SRC, f), 'utf8');

export const appSource = () => readdirSync(SRC).filter(f => /^\d\d-.*\.js$/.test(f)).sort().map(rd).join('\n');

// the whole page around a script tag (or an inline script when `inline` is given)
export function pageHtml({ script, inline } = {}) {
  let h = rd('template.tpl');
  const tag = inline != null ? `<script type="module">\n${inline}\n</script>` : script;
  for (const [k, v] of [['%%FONT%%', rd('font.css.part').trim()], ['%%STYLE%%', rd('style.css')], ['%%MARKUP%%', rd('markup.tpl')]]) h = h.replace(k, () => v);
  h = h.replace(/<script type="module">\s*%%SCRIPT%%\s*<\/script>/, () => tag);
  return '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">\n' + h + '\n</html>';
}
