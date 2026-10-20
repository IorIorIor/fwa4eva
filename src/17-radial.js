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
const RM_FILL = {   // solid versions for the ring's segments
  filters: '<path d="M3 4h18l-7 8.5v6.5l-4 2v-8.5z"/>',
  map: '<path d="M3 6.6l5.2-2.6v13.4l-5.2 2.6zM9.6 4l4.8 2.6v13.4l-4.8-2.6zM15.8 6.6l5.2-2.6v13.4l-5.2 2.6z"/>',
  fly: '<path fill-rule="evenodd" d="M14.6 3.4c3.1-.3 6.3 2.8 6 6-.4 4-4.2 7.4-7.3 9l-1.6 1.6-1.4-3.4-3.4-1.4 1.6-1.6c1.6-3.1 5-6.9 9-7.3zM15 7.6a1.6 1.6 0 1 0 .01 0z"/><path d="M6.2 15.6c-2 .9-3.2 3-3.2 5.4 2.4 0 4.5-1.2 5.4-3.2z"/>',
  search: '<path fill-rule="evenodd" d="M10 3a7 7 0 1 1 0 14a7 7 0 1 1 0-14zM10 5.6a4.4 4.4 0 1 0 0 8.8a4.4 4.4 0 1 0 0-8.8z"/><path d="M15.2 13.4l6 6-1.8 1.8-6-6z"/>',
  settings: '<path d="M5 3h2v18h-2zM11 3h2v18h-2zM17 3h2v18h-2z"/><circle cx="6" cy="8" r="2.7"/><circle cx="12" cy="15" r="2.7"/><circle cx="18" cy="6.5" r="2.7"/>',
  date: '<path fill-rule="evenodd" d="M5.5 5h13a1.5 1.5 0 0 1 1.5 1.5v13a1.5 1.5 0 0 1-1.5 1.5h-13a1.5 1.5 0 0 1-1.5-1.5v-13a1.5 1.5 0 0 1 1.5-1.5zM6 10v9h12v-9z"/><path d="M7 2.5h2v4h-2zM15 2.5h2v4h-2zM8 12h3v3h-3z"/>',
  upgrades: '<path d="M6 3v15l4-4 3 6.5 2.5-1.2-3-6.3h5.5z"/>',
};
const ico = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RM_ICON[k]}</svg>`;
const rmenu = (() => {
  const R0 = 70, R1 = 150, GAP = 5;   // inner and outer radius (px), gap between segments (px)
  const SEG = [['date', 'Date', 220], ['filters', 'Filters', 168], ['map', 'Map', 116], ['upgrades', 'Upgrades', 64], ['search', 'Search', 12], ['settings', 'Settings', -40]];   // centre angles, counter-clockwise from the right
  const el = $('radial'), svg = el.querySelector('svg'), dot = $('rmDot'), panel = $('rmPanel'), body = panel.querySelector('.rb');
  const P = (r, a) => [r * Math.cos(a * Math.PI / 180), -r * Math.sin(a * Math.PI / 180)];
  const sector = (a, span) => {   // an annular sector with straight gaps of GAP px either side
    const d0 = GAP / 2 / R0 * 180 / Math.PI, d1 = GAP / 2 / R1 * 180 / Math.PI, a0 = a - span / 2, a1 = a + span / 2;
    const [x0, y0] = P(R1, a0 + d1), [x1, y1] = P(R1, a1 - d1), [x2, y2] = P(R0, a1 - d0), [x3, y3] = P(R0, a0 + d0);
    return `M${x0} ${y0}A${R1} ${R1} 0 0 0 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 1 ${x3} ${y3}Z`;
  };
  svg.innerHTML = SEG.map(([k, label, a], n) => { const [lx, ly] = P((R0 + R1) / 2, a);
    return `<g class="rs" data-k="${k}" style="--n:${n};transform-origin:0 0"><path d="${sector(a, 52)}"/><g transform="translate(${lx} ${ly})"><svg x="-13" y="-30" width="26" height="26" viewBox="0 0 24 24" class="ri">${RM_FILL[k]}</svg><text y="16">${label}</text></g></g>` }).join('');
  const segs = [...svg.querySelectorAll('.rs')];
  let homes = [], open = false, cx = 0, cy = 0, vx = 0, vy = 0, hot = null, which = null;
  const setHot = k => { if (k === hot) return; hot = k; segs.forEach(s => s.classList.toggle('hot', s.dataset.k === k)); if (k) nav.tick() };
  const pickAt = (x, y) => { const r = Math.hypot(x, y); if (r < R0 * .55 || r > R1 * 1.35) return null; let a = Math.atan2(-y, x) * 180 / Math.PI; let best = null, bd = 40; for (const [k, , c] of SEG) { const d = Math.abs(((a - c + 540) % 360) - 180); if (d < bd) { bd = d; best = k } } return best };
  function show(x, y) {
    if (panel.hidden === false) close();
    const m = R1 + 16; cx = Math.max(m, Math.min(innerWidth - m, x)); cy = Math.max(m, Math.min(innerHeight - m, y)); vx = vy = 0;
    const R_ = document.documentElement.style; R_.setProperty('--rmb', (LOOK.menuBlur ?? 8) + 'px'); R_.setProperty('--rmd', LOOK.menuDim ?? .3);
    document.body.classList.add('rm-open'); tip.hidden = true;   // other tooltips step aside, and the world behind blurs
    el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.hidden = false; void el.offsetWidth; el.classList.add('in'); open = true; setHot(null);
    segs.find(s => s.dataset.k === 'map').querySelector('text').textContent = S.mode === 'map' ? 'Fly' : 'Map';
    segs.find(s => s.dataset.k === 'map').querySelector('.ri').innerHTML = RM_FILL[S.mode === 'map' ? 'fly' : 'map'];
    dot.hidden = !locked(); dot.style.transform = 'none';
  }
  function hide() { document.body.classList.toggle('rm-open', !panel.hidden && !!which); open = false; el.classList.remove('in'); setTimeout(() => { if (!open) el.hidden = true }, 220); setHot(null) }
  function move(e) {   // captured pointer: a dot you steer inside the ring; free pointer: wherever the pointer is
    if (locked()) { vx += e.movementX; vy += e.movementY; const r = Math.hypot(vx, vy), lim = R1 * .95; if (r > lim) { vx *= lim / r; vy *= lim / r } dot.style.transform = `translate(${vx}px, ${vy}px)`; setHot(pickAt(vx, vy)) }
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
    if (k === 'search') { head('search', 'Search'); searchPanel() } else if (k === 'date') { head('date', 'Date'); datePanel() } else if (k === 'filters') { head('filter', 'Filters'); filterPanel() } else if (k === 'upgrades') { head('ships', 'Upgrades'); shipsPanel() }
    panel.hidden = false; void panel.offsetWidth; panel.classList.add('in'); document.body.classList.add('rm-open');
  }
  function close() {
    hide(); if (panel.hidden) return; panel.classList.remove('in'); which = null;
    homes.forEach(([g, par, nx]) => par.insertBefore(g, nx)); homes = [];   // the filter groups go home
    const box = $('nav'); if (!box.contains($('navQ'))) { box.querySelector('.nrow').insertBefore($('navQ'), $('navNext')); box.prepend($('navRes')) }
    document.body.classList.remove('rm-open'); setTimeout(() => { if (!which) panel.hidden = true }, 200);
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
    // each wheel is a 3D drum, like the date disc of a watch: numerals on a turning cylinder behind a sapphire window.
    // Scroll or drag it (it keeps spinning, then settles on a value), or click a value; every value it passes ticks
    const L = LOOK; w.style.setProperty('--persp', (L.dialPersp ?? 600) + 'px'); w.style.setProperty('--metal', L.dialMetal ?? .7); w.style.setProperty('--tone', L.dialTone ?? 0);
    w.style.setProperty('--lens', L.dialLens ?? .8); w.style.setProperty('--dfont', (L.dialFont ?? 22) + 'px'); w.style.setProperty('--ticks', L.dialTicks ?? 1); w.style.setProperty('--mag', L.dialMag ?? 1.2);
    const mk = (items, at, set) => {
      const col = document.createElement('div'); col.className = 'dial'; const drum = document.createElement('div'); drum.className = 'drum'; col.append(drum); w.append(col);
      const R = L.dialRadius ?? 90, step = L.dialStep ?? 22, ih = 2 * R * Math.sin(step * Math.PI / 360);
      col.style.setProperty('--ih', ih.toFixed(1) + 'px');
      const els = items.map(t => { const e = document.createElement('div'); e.className = 'di'; e.textContent = t; drum.append(e); return e }); const lens = document.createElement('i'); lens.className = 'lens'; col.append(lens);
      let pos = at, vel = 0, cur = at, raf = 0, drag = null, tm = 0;
      const render = () => els.forEach((e, i) => { const a = (i - pos) * step; if (Math.abs(a) > 92) { e.style.visibility = 'hidden'; return } e.style.visibility = ''; const f = Math.cos(a * Math.PI / 180);
        e.style.transform = `rotateX(${(-a).toFixed(2)}deg) translateZ(${R}px)${i === cur ? ` scale(${L.dialMag ?? 1.2})` : ''}`; e.style.opacity = Math.max(0, 1 - (L.dialFade ?? .6) * (1 - f) * 1.6).toFixed(3); e.classList.toggle('on', i === cur) });
      const settle = () => { clearTimeout(tm); tm = setTimeout(update, 140) };
      const tick = () => { const k = Math.max(0, Math.min(items.length - 1, Math.round(pos))); if (k !== cur) { cur = k; if ((L.dialSound ?? 1) > 0) nav.tick(); set(k); settle() } };
      const run = () => {
        if (!drag) { vel *= L.dialFriction ?? .93; pos += vel; if (pos < 0 || pos > items.length - 1) { vel *= .5; pos += ((pos < 0 ? 0 : items.length - 1) - pos) * .25 }   // rubber band at the ends
          if (Math.abs(vel) < .03) { const tgt = Math.max(0, Math.min(items.length - 1, Math.round(pos))); pos += (tgt - pos) * (L.dialSpring ?? .22); if (Math.abs(tgt - pos) < .002) { pos = tgt; vel = 0 } } }
        tick(); render(); raf = (drag || vel || Math.abs(pos - Math.round(pos)) > .002) ? requestAnimationFrame(run) : 0;
      };
      const go = () => { if (!raf) raf = requestAnimationFrame(run) };
      col.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); vel += (e.deltaMode ? e.deltaY * 33 : e.deltaY) * .0022; vel = Math.max(-1.6, Math.min(1.6, vel)); go() }, { passive: false });
      col.addEventListener('pointerdown', e => { e.preventDefault(); drag = { y: e.clientY, t: performance.now(), v: 0, moved: false }; vel = 0; try { col.setPointerCapture(e.pointerId) } catch (er) { } go() });
      col.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y, now = performance.now(), dp = -dy / (R * step * Math.PI / 180); if (Math.abs(dy) > 1) drag.moved = true; pos += dp; drag.v = dp / Math.max(1, now - drag.t) * 16; drag.y = e.clientY; drag.t = now });
      col.addEventListener('pointerup', e => { if (!drag) return; const moved = drag.moved; vel = drag.v; drag = null; if (!moved) { const r = col.getBoundingClientRect(), off = (e.clientY - (r.top + r.height / 2)) / ih; vel = 0; pos += Math.round(off) * .0001; const tgt = Math.max(0, Math.min(items.length - 1, Math.round(pos + off))); const from = pos; let t0 = 0; const anim = () => { t0 += .12; pos = from + (tgt - from) * Math.min(1, 1 - Math.pow(1 - t0, 3)); tick(); render(); if (t0 < 1) requestAnimationFrame(anim) }; anim() } go() });
      render();
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
    const note = document.createElement('div'); note.className = 'rk'; note.textContent = `${gotN} rings collected · a new pointer every 5, a new trail every 7`;
    const h1 = document.createElement('div'); h1.className = 'rh'; h1.textContent = 'Pointers'; const h2 = document.createElement('div'); h2.className = 'rh'; h2.textContent = 'Trails';
    const tr = document.createElement('div'); tr.className = 'trails';
    const sw = k => { if (!k) return `background:hsl(${PILOT_HUE} 100% 60%)`; const a = new C3(), b = new C3(); TRAILS[k].c(a, b, .5); return `background:linear-gradient(90deg,#${a.getHexString()},#${b.getHexString()})` };
    tr.innerHTML = TRAILS.map((t, k) => { const need = TRAIL_UNLOCK(k), ok = gotN >= need; return `<button type="button" data-k="${k}" class="${ok ? '' : 'lock'} ${k === trailK ? 'on' : ''}"><i style="${sw(k)}"></i><span>${ok ? esc(t.name) : need + ' rings'}</span></button>` }).join('');
    tr.onclick = e => { const b = e.target.closest('button'); if (!b || b.classList.contains('lock')) return; setTrail(+b.dataset.k); tr.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)) };
    body.append(note, h1, gr, h2, tr);
  }
  const fmtDayLong = dd => { const t = new Date(DAY0 + dd * 864e5); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}` };
  return { get open() { return open }, get panel() { return !panel.hidden }, get hot() { return hot }, held: false, show, move, choose, sub, close };
})();
