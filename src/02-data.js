/* ───────────────────────── the archive ─────────────────────────
   Sample data shaped like FWA's (one Site of the Day every day since May 2000, the best of each month
   and year promoted), or the viewer's own export, kept in this browser's IndexedDB. */
const IDB = {
  db: null,
  open() { return new Promise(res => { try { const r = indexedDB.open('sky-of-the-day', 1); r.onupgradeneeded = () => { const db = r.result; db.createObjectStore('kv'); db.createObjectStore('shots') }; r.onsuccess = () => { this.db = r.result; res(this.db) }; r.onerror = () => res(null); r.onblocked = () => res(null) } catch (e) { res(null) } }) },
  req(store, mode, fn) { return new Promise(res => { if (!this.db) return res(null); try { const tx = this.db.transaction(store, mode), q = fn(tx.objectStore(store)); tx.oncomplete = () => res(q ? q.result : true); tx.onerror = tx.onabort = () => res(null) } catch (e) { res(null) } }) },
  get(st, k) { return this.req(st, 'readonly', o => o.get(k)) },
  put(st, k, v) { return this.req(st, 'readwrite', o => o.put(v, k)) },
  keys(st) { return this.req(st, 'readonly', o => o.getAllKeys()) },
  clear(st) { return this.req(st, 'readwrite', o => o.clear()) },
};
await IDB.open();
// the real archive: a list of every winner plus one image per winner, kept in its own repo (IorIorIor/fwa4eva-data) and
// served by GitHub Pages. ?data=<base url> points elsewhere. The list comes up front; images only when you get near a star.
const DATA_BASE = (QS.get('data') || 'https://ioriorior.github.io/fwa4eva-data/').replace(/\/?$/, '/');
const LOCAL_IMPORT = await IDB.get('kv', 'records');
const REMOTE = Array.isArray(LOCAL_IMPORT) && LOCAL_IMPORT.length ? null : await (async () => {
  try { const ac = new AbortController(), to = setTimeout(() => ac.abort(), 8000), r = await fetch(DATA_BASE + 'archive.json', { signal: ac.signal }); clearTimeout(to); if (!r.ok) return null; const rows = normalizeRows(await r.json()); return rows.length ? rows : null } catch (e) { return null }
})();
const IMPORTED = REMOTE || LOCAL_IMPORT;
const shotURL = d => REMOTE && d.shot ? `${DATA_BASE}shots/${d.shot.slice(0, 4)}/${encodeURIComponent(d.shot)}.webp` : null;
let SHOT_KEYS = new Set(((await IDB.keys('shots')) || []).map(String));

function normalizeRows(rows) {
  const awardOf = v => { v = String(v || '').toLowerCase(); return /year|foty/.test(v) ? 'FOTY' : /month|sotm/.test(v) ? 'SOTM' : 'SOTD' };
  const out = [];
  for (const r of rows) {
    if (!r || typeof r !== 'object') continue;
    const keys = Object.keys(r), g = (...names) => { for (const n of names) for (const k of keys) if (k.toLowerCase().replace(/[^a-z]/g, '') === n && r[k] != null && r[k] !== '') return r[k]; return undefined };
    const t = Date.parse(g('date', 'day', 'awarded', 'awardedon', 'published')); if (isNaN(t)) continue;
    let tech = g('tech', 'technology', 'technologies', 'builtwith', 'stack') || ''; tech = (Array.isArray(tech) ? tech : String(tech).split(/[,;|]/)).map(x => String(x).trim()).filter(Boolean); if (!tech.length) tech = ['Unknown'];
    const url = String(g('url', 'link', 'website', 'siteurl') || '');
    out.push({
      date: new Date(t).toISOString().slice(0, 10), title: String(g('title', 'name', 'site', 'project') || 'Untitled').slice(0, 120), agency: String(g('agency', 'studio', 'credits', 'author', 'by') || 'Unknown').slice(0, 80),
      country: String(g('country', 'location') || '—').slice(0, 40), category: String(g('category', 'categories', 'type', 'tag') || 'Uncategorised').split(/[,;|]/)[0].trim().slice(0, 40) || 'Uncategorised',
      tech, award: awardOf(g('award', 'level', 'honour', 'honor')), score: (v => v > 10 ? v / 10 : v)(parseFloat(g('score', 'jury', 'juryscore', 'rating', 'points')) || 8), url: /^https?:\/\//i.test(url) ? url : '', shot: stem(g('screenshot', 'image', 'thumbnail', 'shot'))
    });
  }
  out.sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : 0); return out;
}
function parseCSV(txt) {
  const rows = []; let row = [], f = '', q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c }
    else if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' }
    else if (c === '\n' || c === '\r') { if (c === '\r' && txt[i + 1] === '\n') i++; row.push(f); f = ''; if (row.length > 1 || row[0]) rows.push(row); row = [] }
    else f += c
  }
  if (f || row.length) { row.push(f); rows.push(row) }
  const h = (rows.shift() || []).map(x => x.trim()); return rows.map(r => Object.fromEntries(h.map((k, j) => [k, r[j]])));
}

const pickW = (arr, wf) => { let s = 0; for (const a of arr) s += wf(a); let r = R() * s; for (const a of arr) { r -= wf(a); if (r <= 0) return a } return arr[arr.length - 1] };
const CATS = ['Portfolio', 'Brand', 'Campaign', 'E-commerce', 'Game', 'Experimental', 'Music', 'Fashion', 'Architecture', 'Agency', 'Technology', 'Event'];
const CAT_COL = ['#7aa2ff', '#ff8a5b', '#ffd166', '#5ee0b0', '#c58bff', '#4fd2ff', '#ff6fae', '#b8f36b', '#e8c7a0', '#9fa8ff', '#6ff0d0', '#ff9f43'];
const AGENCIES = [['Active Theory', 'US', 2012, 2026, 5], ['Resn', 'NZ', 2005, 2026, 4], ['Locomotive', 'CA', 2014, 2026, 4], ['Lusion', 'UK', 2017, 2026, 4], ['Immersive Garden', 'FR', 2016, 2026, 5], ['Monks', 'NL', 2001, 2026, 4], ['Hello Monday', 'DK', 2006, 2026, 4], ['Dogstudio', 'BE', 2008, 2026, 4], ['North Kingdom', 'SE', 2003, 2020, 4], ['B-Reel', 'SE', 2002, 2022, 3], ['Firstborn', 'US', 2002, 2026, 3], ['2Advanced Studios', 'US', 2000, 2010, 5], ['Hi-ReS!', 'UK', 2000, 2014, 4], ['Unit9', 'UK', 2002, 2026, 3], ['Stinkdigital', 'UK', 2006, 2019, 3], ['Fantasy Interactive', 'US', 2004, 2016, 4], ['Big Spaceship', 'US', 2001, 2020, 3], ['Jam3', 'CA', 2006, 2021, 4], ['Merci-Michel', 'FR', 2012, 2026, 3], ['14islands', 'SE', 2013, 2026, 3], ['Basement Studio', 'AR', 2018, 2026, 3], ['Obys', 'UA', 2016, 2026, 4], ['Cuberto', 'US', 2015, 2026, 3], ['Build in Amsterdam', 'NL', 2011, 2026, 3], ['Exo Ape', 'DE', 2015, 2026, 4], ['Unseen Studio', 'UK', 2019, 2026, 3], ['Studio Freight', 'US', 2019, 2026, 3], ['Kokokaka', 'SE', 2010, 2024, 2], ['AKQA', 'US', 2000, 2026, 2], ['R/GA', 'US', 2000, 2026, 2], ['Group94', 'NL', 2000, 2012, 3], ['Ultranoir', 'FR', 2006, 2016, 3], ['Soleil Noir', 'FR', 2004, 2014, 2], ['Grupo Mono', 'ES', 2009, 2024, 2], ['Medium Rare', 'JP', 2008, 2020, 2], ['Tha Ltd', 'JP', 2000, 2016, 3]];
const TITLE_A = ['Halcyon', 'Nocturne', 'Paper', 'Velvet', 'Orbit', 'Silent', 'Cobalt', 'Lumen', 'Feral', 'Glass', 'Neon', 'Echo', 'Hollow', 'Ember', 'Static', 'Kinetic', 'Tidal', 'Woven', 'Prism', 'Quiet', 'Signal', 'Lucid', 'Folded', 'Brutal', 'Soft', 'Mercury', 'Vapor', 'Granite', 'Saffron', 'Polar', 'Analog', 'Liquid'];
const TITLE_B = ['Machine', 'Garden', 'Atlas', 'Records', 'Archive', 'Index', 'Theory', 'Field', 'Room', 'Season', 'Protocol', 'Gallery', 'Collective', 'Lab', 'Journey', 'Hours', 'House', 'Works', 'Frequency', 'Manifesto', 'Odyssey', 'Sessions', 'Forms', 'Matter', 'Island', 'Signal'];
function techList(y) {
  const t = [];
  if (y <= 2012) t.push(['Flash', y < 2010 ? 14 : Math.max(1, (2013 - y) * 4)]);
  t.push(['HTML/CSS', y < 2010 ? 2 : 5]);
  if (y >= 2011) t.push(['HTML5 Canvas', y < 2016 ? 5 : 2]);
  if (y >= 2012) t.push(['WebGL', y < 2016 ? 4 : 6]);
  if (y >= 2014) t.push(['Three.js', y < 2018 ? 4 : 8]);
  if (y >= 2013) t.push(['GSAP', 5]);
  if (y >= 2016) t.push(['React', 4]);
  if (y >= 2016) t.push(['Vue', 3]);
  if (y >= 2019) t.push(['Webflow', 3]);
  if (y >= 2023) t.push(['WebGPU', y < 2025 ? 2 : 4]);
  return t;
}
const TECHS = ['Flash', 'HTML/CSS', 'HTML5 Canvas', 'WebGL', 'Three.js', 'GSAP', 'React', 'Vue', 'Webflow', 'WebGPU'];
const TECH_COL = { 'Flash': '#ff5f5f', 'HTML/CSS': '#e8c7a0', 'HTML5 Canvas': '#ffd166', 'WebGL': '#4fd2ff', 'Three.js': '#7aa2ff', 'GSAP': '#b8f36b', 'React': '#6ff0d0', 'Vue': '#5ee0b0', 'Webflow': '#9fa8ff', 'WebGPU': '#ff6fae' };
const AWARDS = ['SOTD', 'SOTM', 'FOTY'];
const AWARD_NAME = { SOTD: 'Site of the Day', SOTM: 'Site of the Month', FOTY: 'FWA of the Year' };
const AWARD_COL = { SOTD: '#a9b8ff', SOTM: '#ffb547', FOTY: '#ff5fa2' };

let D = [];
const USING_IMPORT = Array.isArray(IMPORTED) && IMPORTED.length > 0;
if (USING_IMPORT) {
  D = IMPORTED.map((r, i) => ({ ...r, i, t: Date.parse(r.date + 'T00:00:00Z'), year: +r.date.slice(0, 4) }));
  let h = .07; CATS.length = CAT_COL.length = 0; D.forEach(d => {   // only the categories the archive really has
    if (!CATS.includes(d.category)) { CATS.push(d.category); CAT_COL.push(`hsl(${Math.round((h += .137) % 1 * 360)},75%,68%)`) }
    d.tech.forEach(t => { if (!TECHS.includes(t)) { TECHS.push(t); TECH_COL[t] = `hsl(${Math.round((h += .137) % 1 * 360)},70%,66%)` } })
  });
} else {
  const t0 = Date.UTC(2000, 4, 1), t1 = Date.UTC(2026, 9, 18);
  for (let t = t0; t <= t1; t += 864e5) {
    const dt = new Date(t), y = dt.getUTCFullYear();
    const pool = AGENCIES.filter(a => y >= a[2] && y <= a[3]);
    let ag, cc;
    if (R() < .2) { ag = 'Independent'; cc = pickW(['US', 'UK', 'FR', 'DE', 'NL', 'JP', 'BR', 'PL', 'ES', 'IT', 'AU', 'KR'], c => ({ US: 4, UK: 3, FR: 3, DE: 2, NL: 2, JP: 2, BR: 1.5, PL: 1.5 }[c] || 1)) }
    else { const a = pickW(pool, a => a[4]); ag = a[0]; cc = a[1] }
    const cat = pickW(CATS, c => ({ Portfolio: y < 2012 ? 5 : 3, Agency: y < 2010 ? 5 : 2, Campaign: 4, Brand: 4, Experimental: y < 2012 ? 1.5 : 5, Game: y < 2012 ? 3 : 2, Technology: y > 2016 ? 3 : 1, 'E-commerce': y > 2014 ? 3 : 1 })[c] || 2);
    const tl = techList(y), tech = []; const n = 1 + (R() < .55) + (R() < .25);
    for (let k = 0; k < n; k++) { const p = pickW(tl, a => tech.includes(a[0]) ? 0 : a[1])[0]; if (!tech.includes(p)) tech.push(p) }
    const title = (R() < .35 ? 'The ' : '') + TITLE_A[R() * TITLE_A.length | 0] + ' ' + TITLE_B[R() * TITLE_B.length | 0];
    D.push({ i: D.length, t, date: dt.toISOString().slice(0, 10), year: y, title, agency: ag, country: cc, category: cat, tech, award: 'SOTD', score: +(7 + Math.pow(R(), .8) * 2.3).toFixed(2) });
  }
  const byMonth = new Map(); D.forEach(d => { const k = d.date.slice(0, 7); if (!byMonth.has(k) || byMonth.get(k).score < d.score) byMonth.set(k, d) });
  byMonth.forEach(d => { d.award = 'SOTM'; d.score = Math.min(9.6, +(d.score + .3).toFixed(2)) });
  const byYear = new Map(); byMonth.forEach(d => { if (!byYear.has(d.year) || byYear.get(d.year).score < d.score) byYear.set(d.year, d) });
  byYear.forEach(d => { d.award = 'FOTY'; d.score = Math.min(9.8, +(d.score + .2).toFixed(2)) });
}
const N = D.length; window.__introTotal = N; loadProg(.15);
function resolveShots() { D.forEach(d => { d.shotKey = [d.shot, d.date, slug(d.title), String(d.i)].find(k => k && SHOT_KEYS.has(k)) || null }) }
resolveShots();
const YEARS = []; for (let y = 2000; y <= 2026; y++) YEARS.push(y);

/* multiplayer seam (no transport yet) */
const Net = {
  enabled: false,
  self: { id: 'pilot-' + Math.random().toString(36).slice(2, 8), name: 'You', color: '#ffb547', pos: [0, 0, 0], quat: [0, 0, 0, 1], vel: [0, 0, 0], mode: 'fly', near: null },
  peers: new Map(),
  connect() { },
  send(_state) { },
};
