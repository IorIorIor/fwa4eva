/* ───────────────────────── the radial menu ─────────────────────────
   Click where there's no star in reach and a ring of five opens around the point: Filters, Map, Search, Settings, Date.
   With the pointer captured (flying) a small dot follows your mouse inside the ring and a click takes the segment it's on;
   with a free pointer (or a finger) you simply click one. Search, Date and Filters open a panel in the middle. */
const RM_ICON = {   // tabler icons, as used in the rest of the interface
  filter: '<path d="M4 4h16v2.172a2 2 0 0 1 -.586 1.414l-4.414 4.414v7l-6 2v-8.5l-4.48 -4.928a2 2 0 0 1 -.52 -1.345v-2.227z"/>',
  map: '<path d="M3 7l6 -3l6 3l6 -3v13l-6 3l-6 -3l-6 3v-13"/><path d="M9 4v13"/><path d="M15 7v13"/>',
  fly: '<path d="M4 13a8 8 0 0 1 7 7a6 6 0 0 0 3 -5a9 9 0 0 0 6 -8a3 3 0 0 0 -3 -3a9 9 0 0 0 -8 6a6 6 0 0 0 -5 3"/><path d="M7 14a6 6 0 0 0 -3 6a6 6 0 0 0 6 -3"/><path d="M14 9a1 1 0 1 0 2 0a1 1 0 1 0 -2 0"/>',
  search: '<path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0"/><path d="M21 21l-6 -6"/>',
  settings: '<path d="M4 10a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M6 4v4"/><path d="M6 12v8"/><path d="M10 16a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M12 4v10"/><path d="M12 18v2"/><path d="M16 7a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/><path d="M18 4v1"/><path d="M18 9v11"/>',
  ships: '<path d="M7 4l0 13l3.5 -3.5l2.5 6l2 -1l-2.5 -6l5 0z"/>',
  date: '<path d="M4 7a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-12z"/><path d="M16 3v4"/><path d="M8 3v4"/><path d="M4 11h16"/><path d="M8 15h2v2h-2z"/>',
};
const ico = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RM_ICON[k]}</svg>`;
const rmenu = (() => {
  const R0 = 70, R1 = 150, GAP = 5;   // inner and outer radius (px), gap between segments (px)
  const SEG = [['date', 'Date', 220], ['filters', 'Filters', 168], ['map', 'Map', 116], ['ships', 'Ships', 64], ['search', 'Search', 12], ['settings', 'Settings', -40]];   // centre angles, counter-clockwise from the right
  const el = $('radial'), svg = el.querySelector('svg'), dot = $('rmDot'), panel = $('rmPanel'), body = panel.querySelector('.rb');
  const P = (r, a) => [r * Math.cos(a * Math.PI / 180), -r * Math.sin(a * Math.PI / 180)];
  const sector = (a, span) => {   // an annular sector with straight gaps of GAP px either side
    const d0 = GAP / 2 / R0 * 180 / Math.PI, d1 = GAP / 2 / R1 * 180 / Math.PI, a0 = a - span / 2, a1 = a + span / 2;
    const [x0, y0] = P(R1, a0 + d1), [x1, y1] = P(R1, a1 - d1), [x2, y2] = P(R0, a1 - d0), [x3, y3] = P(R0, a0 + d0);
    return `M${x0} ${y0}A${R1} ${R1} 0 0 0 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 1 ${x3} ${y3}Z`;
  };
  svg.innerHTML = SEG.map(([k, label, a], n) => { const [lx, ly] = P((R0 + R1) / 2, a);
    return `<g class="rs" data-k="${k}" style="--n:${n};transform-origin:0 0"><path d="${sector(a, 52)}"/><g transform="translate(${lx} ${ly})"><svg x="-14" y="-30" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" class="ri">${RM_ICON[k === 'map' ? 'map' : k]}</svg><text y="16">${label}</text></g></g>` }).join('');
  const segs = [...svg.querySelectorAll('.rs')];
  let homes = [], open = false, cx = 0, cy = 0, vx = 0, vy = 0, hot = null, which = null;
  const setHot = k => { if (k === hot) return; hot = k; segs.forEach(s => s.classList.toggle('hot', s.dataset.k === k)); if (k) nav.tick() };
  const pickAt = (x, y) => { const r = Math.hypot(x, y); if (r < R0 * .55 || r > R1 * 1.35) return null; let a = Math.atan2(-y, x) * 180 / Math.PI; let best = null, bd = 40; for (const [k, , c] of SEG) { const d = Math.abs(((a - c + 540) % 360) - 180); if (d < bd) { bd = d; best = k } } return best };
  function show(x, y) {
    if (panel.hidden === false) close();
    const m = R1 + 16; cx = Math.max(m, Math.min(innerWidth - m, x)); cy = Math.max(m, Math.min(innerHeight - m, y)); vx = vy = 0;
    el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.hidden = false; void el.offsetWidth; el.classList.add('in'); open = true; setHot(null);
    segs.find(s => s.dataset.k === 'map').querySelector('text').textContent = S.mode === 'map' ? 'Fly' : 'Map';
    segs.find(s => s.dataset.k === 'map').querySelector('.ri').innerHTML = RM_ICON[S.mode === 'map' ? 'fly' : 'map'];
    dot.hidden = !locked(); dot.style.transform = 'translate(-50%,-50%)';
  }
  function hide() { open = false; el.classList.remove('in'); setTimeout(() => { if (!open) el.hidden = true }, 220); setHot(null) }
  function move(e) {   // captured pointer: a dot you steer inside the ring; free pointer: wherever the pointer is
    if (locked()) { vx += e.movementX; vy += e.movementY; const r = Math.hypot(vx, vy), lim = R1 * .95; if (r > lim) { vx *= lim / r; vy *= lim / r } dot.style.transform = `translate(calc(-50% + ${vx}px), calc(-50% + ${vy}px))`; setHot(pickAt(vx, vy)) }
    else setHot(pickAt(e.clientX - cx, e.clientY - cy));
  }
  function choose(k = hot) {
    hide(); if (!k) return;
    if (k === 'map') { setMode(S.mode === 'map' ? 'fly' : 'map'); return }
    if (k === 'settings') { if (locked()) document.exitPointerLock(); if (!$('lookPanel').classList.contains('open')) togglePanel('lookPanel'); return }
    sub(k);
  }
  svg.addEventListener('pointermove', e => { if (!locked()) setHot(e.target.closest('.rs')?.dataset.k || null) });
  svg.addEventListener('pointerup', e => { if (locked()) return; e.stopPropagation(); const s = e.target.closest('.rs'); choose(s ? s.dataset.k : null) });
  el.addEventListener('pointerdown', e => e.stopPropagation());
  // ── the panels ──
  const head = (k, title) => { panel.querySelector('.ri').innerHTML = ico(k); panel.querySelector('header b').textContent = title };
  function sub(k) {
    if (locked()) document.exitPointerLock(); hide(); which = k; panel.className = 'hud p-' + k; body.innerHTML = '';
    if (k === 'search') { head('search', 'Search'); searchPanel() } else if (k === 'date') { head('date', 'Date'); datePanel() } else if (k === 'filters') { head('filter', 'Filters'); filterPanel() } else if (k === 'ships') { head('ships', 'Ships'); shipsPanel() }
    panel.hidden = false; void panel.offsetWidth; panel.classList.add('in');
  }
  function close() {
    hide(); if (panel.hidden) return; panel.classList.remove('in'); which = null;
    homes.forEach(([g, par, nx]) => par.insertBefore(g, nx)); homes = [];   // the filter groups go home
    const box = $('nav'); if (!box.contains($('navQ'))) { box.querySelector('.nrow').insertBefore($('navQ'), $('navNext')); box.prepend($('navRes')) }
    setTimeout(() => { if (!which) panel.hidden = true }, 200);
  }
  panel.querySelector('.x').onclick = close;
  window.__navPicked = close;
  function searchPanel() {
    body.append($('navQ'), $('navRes')); const q = $('navQ'); q.value = ''; $('navRes').hidden = true; setTimeout(() => q.focus(), 30);
    const t = document.createElement('div'); t.className = 'rtours'; t.innerHTML = '<span>Tours</span>' + Object.keys(TOURS).map(n => `<button type="button">${n}</button>`).join('');
    t.onclick = e => { const b = e.target.closest('button'); if (!b) return; const n = b.textContent, ids = TOURS[n](); if (ids.length) { close(); startTour(ids, n) } else b.classList.add('none') };
    body.append(t);
  }
  function filterPanel() {
    homes = [...$('panel').querySelectorAll('.grp.keep')].map(g => [g, g.parentNode, g.nextSibling]); homes.forEach(([g]) => body.appendChild(g));
    const r = document.createElement('div'); r.className = 'rfoot'; r.innerHTML = `<span id="rmCount"></span><button type="button" class="rbtn">Reset</button>`; body.append(r);
    const cnt = () => { $('rmCount').textContent = `${matchCount.toLocaleString('en')} of ${N.toLocaleString('en')}` }; cnt();
    r.querySelector('button').onclick = () => { $('reset').click(); cnt() }; body.addEventListener('click', () => setTimeout(cnt, 0)); body.addEventListener('change', () => setTimeout(cnt, 0));
  }
  // date: three wheels (day, month, year) like a phone's picker; each row you pass ticks; it shows that day's winner
  function datePanel() {
    const start = new Date(DAY0 + (lockI >= 0 ? W_DAY[lockI] : W_DAY[nav.pick >= 0 ? nav.pick : N - 1]) * 864e5);
    let d = start.getUTCDate(), m = start.getUTCMonth(), y = start.getUTCFullYear();
    const w = document.createElement('div'); w.className = 'wheels'; body.append(w);
    const info = document.createElement('div'); info.className = 'rwin'; body.append(info);
    const IH = 34, mk = (items, at, set) => {
      const c = document.createElement('div'); c.className = 'wcol'; c.innerHTML = '<div class="wpad"></div>' + items.map(t => `<div class="wi">${t}</div>`).join('') + '<div class="wpad"></div>'; w.append(c);
      let cur = at, tm = 0; requestAnimationFrame(() => { c.scrollTop = at * IH; mark() });
      const mark = () => c.querySelectorAll('.wi').forEach((e, k) => e.classList.toggle('on', k === cur));
      c.addEventListener('scroll', () => { const k = Math.max(0, Math.min(items.length - 1, Math.round(c.scrollTop / IH))); if (k !== cur) { cur = k; nav.tick(); mark(); set(k) } clearTimeout(tm); tm = setTimeout(update, 120) });
      c.addEventListener('click', e => { const i = [...c.querySelectorAll('.wi')].indexOf(e.target); if (i >= 0) c.scrollTo({ top: i * IH, behavior: 'smooth' }) });
      return c;
    };
    mk(Array.from({ length: 31 }, (_, k) => k + 1), d - 1, k => { d = k + 1 });
    mk(MONTHS.map(s => s.slice(0, 3)), m, k => { m = k });
    mk(YEARS.map(String), y - YEARS[0], k => { y = YEARS[k] });
    function update() {
      const dd = Math.min(d, new Date(Date.UTC(y, m + 1, 0)).getUTCDate()), day = Math.round((Date.UTC(y, m, dd) - DAY0) / 864e5); nav.show(day); const i = nav.pick;
      info.innerHTML = i < 0 ? '<span class="rk">No winner near this day</span>' : `<span class="rk">${W_DAY[i] === day ? 'FWA of the Day' : 'Nearest: ' + esc(fmtDayLong(W_DAY[i]))}</span><b>${esc(D[i].title)}</b><span class="ra">${esc(D[i].agency || '')}</span><div class="rrow"><button type="button" class="rbtn" data-a="go">Fly there</button></div>`;
    }
    info.onclick = e => { if (e.target.dataset.a === 'go' && nav.pick >= 0) { const i = nav.pick; close(); flyTo(i) } };
    update();
  }
  // ships: every pointer, the ones you've earned ready to fly, the rest showing how many rings they need
  function shipsPanel() {
    const svgOf = def => { const P = pts => 'M' + pts.map(([x, y]) => `${x.toFixed(2)} ${y.toFixed(2)}`).join('L') + 'Z', d = def.parts.map(p => Array.isArray(p) ? P(p) : P(p.o) + p.h.map(P).join('')).join('');
      return `<svg viewBox="-3 -3 26 26" aria-hidden="true"><path d="${d}" fill="#0a0a0c" stroke="#fff" stroke-width="1.3" stroke-linejoin="round" fill-rule="evenodd" paint-order="stroke"/></svg>` };
    const gr = document.createElement('div'); gr.className = 'ships';
    gr.innerHTML = CURSORS.map((c, k) => { const need = SHIP_UNLOCK(k), ok = gotN >= need; return `<button type="button" data-k="${k}" class="${ok ? '' : 'lock'} ${k === shipK ? 'on' : ''}" title="${esc(c.name)}">${svgOf(c)}<span>${ok ? esc(c.name) : need + ' rings'}</span></button>` }).join('');
    gr.onclick = e => { const b = e.target.closest('button'); if (!b || b.classList.contains('lock')) return; setShip(+b.dataset.k); gr.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)) };
    const note = document.createElement('div'); note.className = 'rk'; note.textContent = `${gotN} rings collected · a new pointer every 5`; body.append(note, gr);
  }
  const fmtDayLong = dd => { const t = new Date(DAY0 + dd * 864e5); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}` };
  return { get open() { return open }, get panel() { return !panel.hidden }, show, move, choose, sub, close };
})();
