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
const RM_FILL = {   // Tabler's own filled icons (v3), for the ring's choices
  park: '<path d="M4 5a1 1 0 0 1 .3 -.714a6 6 0 0 1 8.213 -.176l.351 .328a4 4 0 0 0 5.272 0l.249 -.227c.61 -.483 1.527 -.097 1.61 .676l.005 .113v9a1 1 0 0 1 -.3 .714a6 6 0 0 1 -8.213 .176l-.351 -.328a4 4 0 0 0 -5.136 -.114v6.552a1 1 0 0 1 -1.993 .117l-.007 -.117v-16z"/>',
  say: '<path d="M18 3a4 4 0 0 1 4 4v8a4 4 0 0 1 -4 4h-4.724l-4.762 2.857a1 1 0 0 1 -1.508 -.743l-.006 -.114v-2h-1a4 4 0 0 1 -3.995 -3.8l-.005 -.2v-8a4 4 0 0 1 4 -4z"/>',
  filters: '<path d="M20 3h-16a1 1 0 0 0 -1 1v2.227l.008 .223a3 3 0 0 0 .772 1.795l4.22 4.641v8.114a1 1 0 0 0 1.316 .949l6 -2l.108 -.043a1 1 0 0 0 .576 -.906v-6.586l4.121 -4.12a3 3 0 0 0 .879 -2.123v-2.171a1 1 0 0 0 -1 -1z"/>',
  map: '<path d="M18.364 4.636a9 9 0 0 1 .203 12.519l-.203 .21l-4.243 4.242a3 3 0 0 1 -4.097 .135l-.144 -.135l-4.244 -4.243a9 9 0 0 1 12.728 -12.728zm-6.364 3.364a3 3 0 1 0 0 6a3 3 0 0 0 0 -6z"/>',
  fly: '<path d="M11.092 2.581a1 1 0 0 1 1.754 -.116l.062 .116l8.005 17.365c.198 .566 .05 1.196 -.378 1.615a1.53 1.53 0 0 1 -1.459 .393l-7.077 -2.398l-6.899 2.338a1.535 1.535 0 0 1 -1.52 -.231l-.112 -.1c-.398 -.386 -.556 -.954 -.393 -1.556l.047 -.15l7.97 -17.276z"/>',
  search: '<path d="M14 3.072a8 8 0 0 1 2.617 11.424l4.944 4.943a1.5 1.5 0 0 1 -2.008 2.225l-.114 -.103l-4.943 -4.944a8 8 0 0 1 -12.49 -6.332l-.006 -.285l.005 -.285a8 8 0 0 1 11.995 -6.643z"/>',
  settings: '<path d="M14.647 4.081a.724 .724 0 0 0 1.08 .448c2.439 -1.485 5.23 1.305 3.745 3.744a.724 .724 0 0 0 .447 1.08c2.775 .673 2.775 4.62 0 5.294a.724 .724 0 0 0 -.448 1.08c1.485 2.439 -1.305 5.23 -3.744 3.745a.724 .724 0 0 0 -1.08 .447c-.673 2.775 -4.62 2.775 -5.294 0a.724 .724 0 0 0 -1.08 -.448c-2.439 1.485 -5.23 -1.305 -3.745 -3.744a.724 .724 0 0 0 -.447 -1.08c-2.775 -.673 -2.775 -4.62 0 -5.294a.724 .724 0 0 0 .448 -1.08c-1.485 -2.439 1.305 -5.23 3.744 -3.745a.722 .722 0 0 0 1.08 -.447c.673 -2.775 4.62 -2.775 5.294 0zm-2.647 4.919a3 3 0 1 0 0 6a3 3 0 0 0 0 -6z"/>',
  date: '<path d="M16 2a1 1 0 0 1 .993 .883l.007 .117v1h1a3 3 0 0 1 2.995 2.824l.005 .176v12a3 3 0 0 1 -2.824 2.995l-.176 .005h-12a3 3 0 0 1 -2.995 -2.824l-.005 -.176v-12a3 3 0 0 1 2.824 -2.995l.176 -.005h1v-1a1 1 0 0 1 1.993 -.117l.007 .117v1h6v-1a1 1 0 0 1 1 -1zm3 7h-14v9.625c0 .705 .386 1.286 .883 1.366l.117 .009h12c.513 0 .936 -.53 .993 -1.215l.007 -.16v-9.625z"/><path d="M12 12a1 1 0 0 1 .993 .883l.007 .117v3a1 1 0 0 1 -1.993 .117l-.007 -.117v-2a1 1 0 0 1 -.117 -1.993l.117 -.007h1z"/>',
  upgrades: '<path d="M3.039 4.277l3.904 13.563c.185 .837 .92 1.516 1.831 1.642l.17 .016a2.2 2.2 0 0 0 1.982 -1.006l.045 -.078l1.4 -2.072l4.05 4.05a2.067 2.067 0 0 0 2.924 0l1.047 -1.047c.388 -.388 .606 -.913 .606 -1.461l-.008 -.182a2.067 2.067 0 0 0 -.598 -1.28l-4.047 -4.048l2.103 -1.412c.726 -.385 1.18 -1.278 1.053 -2.189a2.2 2.2 0 0 0 -1.701 -1.845l-13.524 -3.89a1 1 0 0 0 -1.236 1.24z"/>',
};
const ico = (k, cls = '') => `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${RM_ICON[k]}</svg>`;
const rmenu = (() => {
  const R0 = 14, R1 = 75, GAP = 3;   // inner and outer radius (px), gap between segments (px)
  const SEG = [['map', 'Map', 90], ['upgrades', 'Upgrades', 141.4], ['filters', 'Filters', 192.9], ['park', 'Park', 244.3], ['say', 'Say', 295.7], ['settings', 'Settings', 347.1], ['search', 'Search', 38.6]];   /* (dates are typed into Search now) */   // centre angles, counter-clockwise from the right
  const el = $('radial'), svg = el.querySelector('svg'), dot = $('rmDot'), panel = $('rmPanel'), body = panel.querySelector('.rb');
  const P = (r, a) => [r * Math.cos(a * Math.PI / 180), -r * Math.sin(a * Math.PI / 180)];
  const sector = (a, span) => {   // an annular sector with straight gaps of GAP px either side
    const d0 = GAP / 2 / R0 * 180 / Math.PI, d1 = GAP / 2 / R1 * 180 / Math.PI, a0 = a - span / 2, a1 = a + span / 2;
    const [x0, y0] = P(R1, a0 + d1), [x1, y1] = P(R1, a1 - d1), [x2, y2] = P(R0, a1 - d0), [x3, y3] = P(R0, a0 + d0);
    return `M${x0} ${y0}A${R1} ${R1} 0 0 0 ${x1} ${y1}L${x2} ${y2}A${R0} ${R0} 0 0 1 ${x3} ${y3}Z`;
  };
  // two looks: wedges round the press, or 'sun' (a ring of fine rays that stretch toward where you push, with the
  // choices as white discs round it; the ones you lean toward swell and the picked one shows its name)
  const TK = 64, RI = 64, ticks = [];
  let segs = [], style = '';
  function build() {
    style = LOOK.menuSun ?? 1 ? 'sun' : 'wedge'; el.classList.toggle('sunm', style === 'sun'); ticks.length = 0;
    if (style === 'sun') {
      svg.innerHTML = `<g class="rays">${Array.from({ length: TK }, (_, j) => '<line/>').join('')}</g>` + SEG.map(([k, label, a], n) => { const [lx, ly] = P(RI, a);
        return `<g class="rs sun" data-k="${k}" style="--n:${n};transform-origin:0 0"><g transform="translate(${lx} ${ly})"><g class="sc"><circle r="12.5"/><svg x="-5.25" y="-5.25" width="10.5" height="10.5" viewBox="0 0 24 24" class="ri">${RM_FILL[k]}</svg></g><text y="24">${label}</text></g></g>` }).join('');
      svg.querySelectorAll('.rays line').forEach((l, j) => ticks.push({ l, a: j / TK * 2 * Math.PI }));
    } else svg.innerHTML = SEG.map(([k, label, a], n) => { const [lx, ly] = P(R0 + (R1 - R0) * .58, a);
      return `<g class="rs" data-k="${k}" style="--n:${n};transform-origin:0 0"><path d="${sector(a, 47)}"/><g transform="translate(${lx} ${ly})"><svg x="-5.6" y="-12" width="11.2" height="11.2" viewBox="0 0 24 24" class="ri">${RM_FILL[k]}</svg><text y="7">${label}</text></g></g>` }).join('');
    segs = [...svg.querySelectorAll('.rs')];
  }
  function lean() {   // sun: rays stretch and discs swell toward the way you're pushing
    if (style !== 'sun') return; const m = Math.min(1, Math.hypot(vx, vy) / 10), am = Math.atan2(vy, vx);
    for (const t of ticks) { const c = Math.max(0, Math.cos(t.a - am)) * m, r0 = 25, r1 = r0 + 3 + 17 * Math.pow(c, 5); t.l.setAttribute('x1', (Math.cos(t.a) * r0).toFixed(2)); t.l.setAttribute('y1', (Math.sin(t.a) * r0).toFixed(2)); t.l.setAttribute('x2', (Math.cos(t.a) * r1).toFixed(2)); t.l.setAttribute('y2', (Math.sin(t.a) * r1).toFixed(2)); t.l.style.opacity = (.45 + .55 * Math.pow(c, 2)).toFixed(2) }
    segs.forEach((g, n) => { const a = -SEG[n][2] * Math.PI / 180, c = Math.max(0, Math.cos(a - am)) * m, sc = 1 + .32 * Math.pow(c, 3) + (g.dataset.k === hot ? .3 : 0); g.querySelector('.sc').style.transform = `scale(${sc.toFixed(3)})` });
  }
  build();
  let px = 0, py = 0, settleT = 0, homes = [], open = false, cx = 0, cy = 0, vx = 0, vy = 0, hot = null, which = null;
  const setHot = k => { if (k === hot) return; hot = k; segs.forEach(s => s.classList.toggle('hot', s.dataset.k === k)); if (k) nav.tick(); lean() };
  const pickAt = (x, y) => { const r = Math.hypot(x, y); if (r < 1) return null;   // by direction from the middle
    let a = Math.atan2(-y, x) * 180 / Math.PI; let best = null, bd = 40; for (const [k, , c] of SEG) { const d = Math.abs(((a - c + 540) % 360) - 180); if (d < bd) { bd = d; best = k } } return best };
  function show(x, y) {
    if (panel.hidden === false) close(); if (style !== ((LOOK.menuSun ?? 1) ? 'sun' : 'wedge')) build();
    const m = R1 * 2 + 20; cx = Math.max(m, Math.min(innerWidth - m, x)); cy = Math.max(m, Math.min(innerHeight - m, y)); vx = x - cx; vy = y - cy; px = x; py = y;   // the pointer, relative to the menu's middle (it may sit off-centre near an edge)
    const R_ = document.documentElement.style; R_.setProperty('--rmb', (LOOK.menuBlur ?? 8) + 'px'); R_.setProperty('--rmd', LOOK.menuDim ?? .3);
    document.body.classList.add('rm-open', 'rm-ring'); tip.hidden = true;   // other tooltips step aside, and the world behind blurs
    el.style.left = cx + 'px'; el.style.top = cy + 'px'; el.hidden = false; void el.offsetWidth; el.classList.add('in'); open = true; setHot(null); lean();
    segs.find(s => s.dataset.k === 'map').querySelector('text').textContent = S.mode === 'map' ? 'Fly' : 'Map';
    segs.find(s => s.dataset.k === 'map').querySelector('.ri').innerHTML = RM_FILL[S.mode === 'map' ? 'fly' : 'map'];
    dot.hidden = !locked(); dot.style.transform = 'none'; clearTimeout(settleT); el.classList.remove('settled'); settleT = setTimeout(() => el.classList.add('settled'), 450);   // no pointer at all: the direction you nudge picks
  }
  function hide() { document.body.classList.remove('rm-ring'); document.body.classList.toggle('rm-open', !panel.hidden && !!which); open = false; el.classList.remove('in'); setTimeout(() => { if (!open) el.hidden = true }, 220); setHot(null) }
  function move(e) {   // captured pointer: a dot you steer inside the ring; free pointer: wherever the pointer is
    const dx = locked() ? e.movementX : e.clientX - px, dy = locked() ? e.movementY : e.clientY - py; px = e.clientX; py = e.clientY;
    vx += dx; vy += dy; const r = Math.hypot(vx, vy), lim = R1 * 3; if (r > lim) { vx *= lim / r; vy *= lim / r } if (locked()) dot.style.transform = `translate(${vx.toFixed(1)}px, ${vy.toFixed(1)}px)`; const rr = Math.hypot(vx, vy); setHot(rr > 16 && rr < R1 * (LOOK.menuFar ?? 2.2) ? pickAt(vx, vy) : null); lean();   /* well outside the ring: nothing picked, so letting go just closes it */   // the hand points: whatever it's over (past a small dead zone in the middle) is picked
  }
  function choose(k = hot) {
    hide(); if (!k) return;
    close();   // whatever was open goes first
    if (k === 'map') { setMode(S.mode === 'map' ? 'fly' : 'map'); return }
    if (k === 'settings') { if (locked()) document.exitPointerLock(); if (!$('lookPanel').classList.contains('open')) togglePanel('lookPanel'); return }
    if (k === 'park') { flagDlg.open(); return } if (k === 'say') { say.open(); return }
    sub(k);
  }
  svg.addEventListener('pointerup', e => { if (locked()) return; e.stopPropagation(); const s = e.target.closest('.rs'); choose(s ? s.dataset.k : null) });
  el.addEventListener('pointerdown', e => e.stopPropagation());
  // ── the panels ──
  const head = (k, title) => { panel.querySelector('.ri').innerHTML = ico(k); panel.querySelector('header b').textContent = title };
  function sub(k) {
    if (locked()) document.exitPointerLock(); if (!panel.hidden) close(); hide(); which = k; panel.inert = false; panel.className = 'hud p-' + k; body.innerHTML = '';
    if (k === 'search') { head('search', 'Search'); searchPanel() } else if (k === 'date') { head('date', 'Date'); datePanel() } else if (k === 'filters') { head('filter', 'Filters'); filterPanel() } else if (k === 'upgrades') { head('ships', 'Upgrades'); shipsPanel() }
    panel.hidden = false; void panel.offsetWidth; panel.classList.add('in'); document.body.classList.add('rm-open');
  }
  function close() {
    hide(); document.body.classList.remove('rm-open', 'rm-ring'); if (panel.hidden) return; panel.classList.remove('in'); which = null;
    homes.forEach(([g, par, nx]) => par.insertBefore(g, nx)); homes = [];   // the filter groups go home
    const box = $('nav'); if (!box.contains($('navQ'))) { box.querySelector('.nrow').insertBefore($('navQ'), $('navNext')); box.prepend($('navRes')) }
    document.body.classList.remove('rm-open', 'rm-ring'); panel.inert = true; setTimeout(() => { if (!which) panel.hidden = true }, 200);   // gone at once for clicks (inert), hidden once faded
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
      const ih = 32;   // a plain list: rows slide up and down, the middle one is the pick
      col.style.setProperty('--ih', ih.toFixed(1) + 'px');
      const els = items.map(t => { const e = document.createElement('div'); e.className = 'di'; e.textContent = t; drum.append(e); return e }); const lens = document.createElement('i'); lens.className = 'lens'; col.append(lens);
      let pos = at, vel = 0, cur = at, raf = 0, drag = null, tm = 0;
      const render = () => els.forEach((e, i) => { const o = i - pos; if (Math.abs(o) > 3.5) { e.style.visibility = 'hidden'; return } e.style.visibility = '';
        e.style.transform = `translateY(${(o * ih).toFixed(1)}px)`; e.style.opacity = Math.max(0, 1 - Math.abs(o) * .28).toFixed(3); e.classList.toggle('on', i === cur) });
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
      col.addEventListener('pointermove', e => { if (!drag) return; const dy = e.clientY - drag.y, now = performance.now(), dp = -dy / ih; if (Math.abs(dy) > 1) drag.moved = true; pos += dp; drag.v = dp / Math.max(1, now - drag.t) * 16; drag.y = e.clientY; drag.t = now });
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
// recording: the browser captures this tab (it asks which; pick this one), and the video lands in your downloads
const recorder = (() => {
  let mr = null, chunks = [], stream = null; const btn = () => $('recBtn') || { classList: { add() { }, remove() { } } };   // (no Record button any more: L does it)
  const stop = () => { if (mr && mr.state !== 'inactive') mr.stop(); if (stream) stream.getTracks().forEach(t => t.stop()); stream = null };
  async function start() {
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 60, displaySurface: 'browser' }, audio: true, preferCurrentTab: true, selfBrowserSurface: 'include' }) } catch (e) { return }
    const type = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm', 'video/mp4'].find(t => MediaRecorder.isTypeSupported(t)) || '';
    chunks = []; mr = new MediaRecorder(stream, { mimeType: type, videoBitsPerSecond: 16e6 }); mr.ondataavailable = e => e.data.size && chunks.push(e.data);
    mr.onstop = () => { const b = new Blob(chunks, { type: mr.mimeType || 'video/webm' }), a = document.createElement('a'), d = new Date(), p = n => String(n).padStart(2, '0'); a.href = URL.createObjectURL(b); a.download = `fwa-forever-${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}.${/mp4/.test(b.type) ? 'mp4' : 'webm'}`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove() }, 4000); mr = null; btn().textContent = 'Record'; btn().classList.remove('rec') };
    stream.getVideoTracks()[0].addEventListener('ended', stop);   // the browser's own Stop sharing button ends it too
    mr.start(1000); btn().textContent = '● Stop'; btn().classList.add('rec');
  }
  return { toggle() { if (mr) stop(); else start() }, get on() { return !!mr } };
})();
// the same choices as a plain menu along the top, beside the logo
(() => {
  const nav = $('topnav'), mapB = nav.querySelector('[data-k="map"]');
  nav.addEventListener('pointerdown', e => e.stopPropagation());
  nav.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const k = b.dataset.k; if (S.mode === 'map' && k === 'filters') { togglePanel('panel'); return } if (S.mode === 'map' && k === 'search') { document.body.classList.toggle('nosearch'); if (!document.body.classList.contains('nosearch')) return; rmenu.close(); return }   // on the map these two are switches: the filters panel and the search bar
    if (k === 'flag') { flagDlg.open(); return } if (k === 'say') { say.open(); return } if (k === 'rec') { recorder.toggle(); return } if (k === 'sound') { audio(); const off = !(muted && musicOff); setMuted(off); setMusicOff(off); return }   /* one switch: everything off, or everything on */ if (k === 'music') { audio(); setMusicOff(!musicOff); return } if (k === 'tour') { if (S.mode !== 'fly') setMode('fly'); rmenu.close(); coach.start(true); return } rmenu.choose(k) });
  const fB = nav.querySelector('[data-k="filters"]'), sB = nav.querySelector('[data-k="search"]');
  setInterval(() => { const m = S.mode === 'map'; mapB.textContent = m ? 'Fly' : 'Map'; fB.classList.toggle('on', m && $('panel').classList.contains('open')); sB && sB.classList.toggle('on', m && !document.body.classList.contains('nosearch')) }, 200);
  $('mapSearch').onclick = () => rmenu.sub('search');   // the map's search bar: a click opens the full search
})();
