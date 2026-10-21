/* ───────────────────────── small things ───────────────────────── */
const $ = id => document.getElementById(id);
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const stem = n => String(n || '').split(/[\\/]/).pop().replace(/\.[a-z0-9]+$/i, '').toLowerCase().trim();
const slug = t => String(t || '').toLowerCase().replace(/^the\s+/, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function mulberry32(a) { const f = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }; f.state = v => v === undefined ? a : (a = v); return f }   // state(): read or set the seed, so extra things can be drawn without moving everything after them
const gaussOf = r => () => { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) };
const R = mulberry32(20000501), gauss = gaussOf(R);
const sstep = (x, a, b) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) };
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const store = {   // localStorage that never throws (private windows, blocked storage)
  get(k, d = null) { try { const v = localStorage.getItem(k); return v == null ? d : v } catch (e) { return d } },
  set(k, v) { try { localStorage.setItem(k, v) } catch (e) { } },
  json(k, d = null) { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d } catch (e) { return d } },
};
const fmtD = v => v < 1e3 ? Math.round(v) + '' : v < 1e6 ? Math.round(v / 1e3) + 'k' : (v / 1e6).toFixed(1) + 'M';
const fmtSpd = v => v < 1000 ? v.toFixed(0) + ' u/s' : v < 1e6 ? (v / 1000).toFixed(v < 1e4 ? 1 : 0) + 'k u/s' : (v / 1e6).toFixed(2) + 'M u/s';
const fmtDate = s => new Date(s + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
const MON3 = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const phone = coarse && Math.min(screen.width, screen.height) < 600;   // a phone, not a tablet or a touch laptop
const buzz = p => { if (coarse && (LOOK.haptics ?? 1)) try { navigator.vibrate?.(p) } catch (e) { } };   // phones only; iPhones ignore it
const QS = new URLSearchParams(location.search), TEST_EARLY = QS.has('test');
let booted = false, introActive = false;   // booted: the intro has handed control to the pilot
// a canvas texture drawn once by a 2D painter
function canvasTex(w, h, paint) { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); return t }
function radialTex(size, stops) { return canvasTex(size, size, (g, s) => { const gr = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); stops.forEach(([o, c]) => gr.addColorStop(o, c)); g.fillStyle = gr; g.fillRect(0, 0, s, s) }) }
// a text node that only touches the DOM when its value changes
function liveText(el) { let v = null; return s => { if (s !== v) { v = s; el.textContent = s } } }

// loading progress for the ring round Start (0…1), reported as each stage of the page comes up
const loadProg = v => { if (v >= .95 && window.__loadMarks) setTimeout(() => console.info('[FWA load] ms at each step:', JSON.stringify(window.__loadMarks)), 0);
   try { (window.__loadMarks ??= []).push([v, Math.round(performance.now())]); window.__introProgress && window.__introProgress(v) } catch (e) { } };
loadProg(.08);
