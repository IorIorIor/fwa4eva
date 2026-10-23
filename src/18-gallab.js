/* ───────────────────────── the galaxy playground (Look → Universe, or #galaxy-lab) ─────────────────────────
   All 27 galaxies in a row, each drawn from above (its gas coloured by radius, its own year's winners on its spiral) with
   only its own settings under it: the spiral's winding, its colours, how its winners spread. A "Default" galaxy leads the
   row, locked: unlock it (at your own peril) and every change there goes to all 27, overwriting what they had for that
   setting. Everything is kept in this browser; Copy gives the text to paste into the chat. The colours apply in flight
   straight away (inside each galaxy); the shape and spread are built into the galaxies once they're baked in. */
const galLab = (() => {
  const KEY = 'sotd-gal-lab', GROUPS = [
    ['Winding', [['spiralTurns', 'Turns of the spiral (core to rim)'], ['spiralGap', 'Windings at the core × further apart'], ['spiralHole', 'Open space round the core (×)'], ['spiralSize', 'Size'], ['armStart', 'Spiral starts at (from the core)'], ['armWiden', 'Arm widens toward the rim (×)'], ['armWidenCurve', '…how late the widening sets in'], ['armWidth', 'Arm width (gas)'], ['hazeCore', 'Gas gathers toward the core']]],
    ['Colours', [['radCol', 'Colour by radius'], ['radHue1', 'Core hue'], ['radHue2', 'Middle hue'], ['radHue3', 'Outer hue'], ['radSat', 'Saturation']]],
    ['Winners', [['starHug', 'Keep close to the line'], ['starBandW', 'Band width (across)'], ['starAlong', 'Spread along the spiral'], ['starBandH', 'Band height (off the disk)'], ['starCoreH', '…extra height toward the core'], ['starSep', 'Minimum spacing (u)']]],
  ];
  const KEYS = GROUPS.flatMap(g => g[1].map(r => r[0])), COLOUR = new Set(GROUPS[1][1].map(r => r[0]));
  const ROW = {}; LOOK_DEF.forEach(([, rows]) => rows.forEach(r => { if (KEYS.includes(r[0])) ROW[r[0]] = r }));
  const st = Object.assign({ def: {}, g: {} }, store.json(KEY, {})); if (!st.g || typeof st.g !== 'object') st.g = {}; if (!st.def || typeof st.def !== 'object') st.def = {};
  const base = k => { const v = +LOOK_FLY[k]; return Number.isFinite(v) ? v : ROW[k][3] };
  const valOf = (y, k) => y === 'def' ? (st.def[k] ?? base(k)) : (st.g[y] && st.g[y][k] != null ? st.g[y][k] : st.def[k] ?? base(k));
  const save = () => store.set(KEY, JSON.stringify(st));
  // colours: straight into each galaxy's own look (what flight uses inside it)
  function pushColours() {
    for (const y of YEARS) { const own = uni.own[y] = uni.own[y] || {}; COLOUR.forEach(k => { const v = valOf(y, k); if (v !== base(k)) own[k] = v; else delete own[k] }); if (!Object.keys(own).length) delete uni.own[y] }
    store.set('sotd-gal-looks', JSON.stringify(uni.own)); uni.galLook();
  }

  // the drawing: the same spiral and placement as the galaxy itself, from above
  const g32 = s => { let a = s >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296 } };
  const hsl = (h, s, l) => new C3().setHSL(((h % 1) + 1) % 1, s, l);
  function draw(cv, y) {
    const V = k => valOf(y, k), W = cv.width, g = cv.getContext('2d'), rnd = g32(y === 'def' ? 7 : 1000 + y), gs = () => { let a = 0; for (let k = 0; k < 4; k++) a += rnd(); return (a - 2) * 1.73 };
    const r0 = V('armStart') * V('spiralHole'), out = 850000 * V('spiralSize'), len = out - r0, G = V('spiralGap'), lg = Math.log(G), flat = Math.abs(lg) < 1e-3, tw = 2 * Math.PI * 5.4 * V('spiralTurns');
    const rho = t => flat ? t : G * (1 - Math.pow(G, -t)) / (G - 1), tauOf = u => { const c = Math.max(0, Math.min(1, u)); return flat ? c : -Math.log(1 - c * (G - 1) / G) / lg }, phase = r => tw * tauOf((r - r0) / len);
    const wid = V('armWiden'), wAt = r => (1 + wid * Math.pow(Math.min(1, Math.max(0, (r - r0) / len)), V('armWidenCurve'))) / (wid + 1);
    const c1 = hsl(V('radHue1'), V('radSat'), .6), c2 = hsl(V('radHue2'), V('radSat') * .85, .5), c3 = hsl(V('radHue3'), V('radSat'), .5), rc = new C3(), cc = new C3(), rk = V('radCol');
    const ss = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t) };
    const radC = u => u < .4 ? rc.copy(c1).lerp(c2, ss(-.15, .4, u)) : rc.copy(c2).lerp(c3, ss(.4, .85, u));
    const K = (W / 2 - 4) / 1.02e6, cx = W / 2, cy = W / 2, at = (r, a) => [cx + Math.cos(a) * r * K, cy + Math.sin(a) * r * K];
    g.globalCompositeOperation = 'source-over'; g.fillStyle = '#040309'; g.fillRect(0, 0, W, W); g.globalCompositeOperation = 'lighter';
    // the gas: soft puffs along the spiral, coloured by how far out they are
    const hc = V('hazeCore'), aw = V('armWidth');
    for (let i = 0; i < 2600; i++) {
      const u = Math.pow(rnd(), .85 * hc) * 1.05, rr = r0 + u * len, s = (10500 + rr * .07) * aw, wk = wAt(rr), r = Math.max(r0 * .3, rr + gs() * s * wk), a = phase(rr) + gs() * s / rr * .9 * wk;
      cc.setHSL(.68 + rnd() * .12, .6, .25 + rnd() * .25); const l = cc.r * .3 + cc.g * .59 + cc.b * .11; cc.lerp(radC(u).clone().multiplyScalar(l * 1.4 + .3), Math.min(1, rk));
      const [x, z] = at(r, a), pr = Math.max(1.5, (2400 + s * .25) * K * 1.6); g.fillStyle = `rgba(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0},.10)`; g.beginPath(); g.arc(x, z, pr, 0, 7); g.fill();
    }
    { const gr = g.createRadialGradient(cx, cy, 0, cx, cy, (r0 + len * .18) * K); const c = radC(0); gr.addColorStop(0, `rgba(${255 * Math.min(1, c.r + .4) | 0},${255 * Math.min(1, c.g + .4) | 0},${255 * Math.min(1, c.b + .4) | 0},.75)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, W) }
    // the line, faint
    g.globalCompositeOperation = 'source-over'; g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.beginPath(); for (let k = 0; k <= 400; k++) { const r = r0 + rho(k / 400) * len, [x, z] = at(r, phase(r)); k ? g.lineTo(x, z) : g.moveTo(x, z) } g.stroke();
    // its winners (the default galaxy borrows 2025's)
    const k = Math.max(0, Math.min(UNI_N - 1, (y === 'def' ? 2025 : y) - UNI_Y0)), i0 = UNI_I0[k], i1 = UNI_I1[k], hug = V('starHug'), bw = V('starBandW'), ba = V('starAlong'), Y = y === 'def' ? 2025 : y, t0 = Date.UTC(Y, 0, 1), t1 = Date.UTC(Y + 1, 0, 1);
    if (i0 >= 0) for (let i = i0; i <= i1; i++) {
      const d = D[i], u = rho(1 - Math.max(0, Math.min(1, (d.t - t0) / (t1 - t0)))), r = r0 + u * len, s = 7700 + r * .045, wk = wAt(r), rr = Math.max(r0 * .3, r + gs() * s * .7 * bw * hug * wk), a = phase(r) + gs() * .1 * ba * s / r * wk;
      const [x, z] = at(rr, a), big = d.award === 'FOTY' ? 2.4 : d.award === 'SOTM' ? 1.7 : 1.1; g.fillStyle = d.award === 'FOTY' ? AWARD_COL.FOTY : d.award === 'SOTM' ? AWARD_COL.SOTM : 'rgba(255,255,255,.9)'; g.fillRect(x - big / 2, z - big / 2, big, big);
    }
  }

  // the page
  let el = null, cols = [], locked = true;
  function slider(y, k, onSet) {
    const r = ROW[k], dec = r[6] < .01 ? 3 : r[6] < 1 ? 2 : 0, w = document.createElement('label'); w.className = 'gl-s';
    const lab = GROUPS.flatMap(g => g[1]).find(x => x[0] === k)[1];
    w.innerHTML = `<span>${lab}</span><output></output><input type="range" min="${r[4]}" max="${r[5]}" step="${r[6]}">`;
    const inp = w.querySelector('input'), o = w.querySelector('output'), set = () => { const v = valOf(y, k); inp.value = v; o.textContent = (+v).toFixed(dec); w.classList.toggle('own', y !== 'def' && st.g[y] && st.g[y][k] != null) };
    inp.oninput = () => onSet(k, +inp.value); w.set = set; set(); return w;
  }
  function column(y) {
    const c = document.createElement('div'); c.className = 'gl-c' + (y === 'def' ? ' def' : ''); const n = y === 'def' ? 0 : (k => UNI_I0[k] >= 0 ? UNI_I1[k] - UNI_I0[k] + 1 : 0)(y - UNI_Y0);
    c.innerHTML = `<header><b>${y === 'def' ? 'Default' : y}</b><span>${y === 'def' ? 'all galaxies' : n + ' winners'}</span>${y === 'def' ? '<button type="button" class="gl-lock">🔒 Play at your own peril</button>' : '<button type="button" data-a="prev" title="Take the settings of the year before">← copy</button><button type="button" data-a="reset" title="Back to the default galaxy">reset</button>'}</header><canvas width="260" height="260"></canvas>`;
    const cv = c.querySelector('canvas'), sl = [];
    const onSet = (k, v) => {
      if (y === 'def') { st.def[k] = v; for (const yy in st.g) delete st.g[yy][k]; save(); cols.forEach(o => o.refresh()) }   // the default: every galaxy follows it, for this setting
      else { (st.g[y] = st.g[y] || {})[k] = v; save(); refresh() }
      if (COLOUR.has(k)) pushColours();
    };
    GROUPS.forEach(([t, rows]) => { const h = document.createElement('h4'); h.textContent = t; c.appendChild(h); rows.forEach(([k]) => { const s = slider(y, k, onSet); sl.push(s); c.appendChild(s) }) });
    const refresh = () => { sl.forEach(s => s.set()); draw(cv, y); if (y === 'def') sl.forEach(s => s.querySelector('input').disabled = locked) };
    c.querySelector('header').onclick = e => { const a = e.target.dataset && e.target.dataset.a;
      if (e.target.classList.contains('gl-lock')) { locked = !locked; e.target.textContent = locked ? '🔒 Play at your own peril' : '🔓 Unlocked: changes go to all 27'; e.target.classList.toggle('open', !locked); refresh() }
      if (a === 'reset') { delete st.g[y]; save(); refresh(); pushColours() }
      if (a === 'prev' && y > UNI_Y0) { st.g[y] = { ...KEYS.reduce((o, k) => (o[k] = valOf(y - 1, k), o), {}) }; save(); refresh(); pushColours() } };
    return { c, refresh };
  }
  function msg(t) { const m = el.querySelector('.gl-msg'); m.textContent = t; clearTimeout(msg.t); msg.t = setTimeout(() => m.textContent = '', 3500) }
  function copyText() { const o = {}; if (Object.keys(st.def).length) o.default = st.def; YEARS.forEach(y => { if (st.g[y] && Object.keys(st.g[y]).length) o[y] = st.g[y] }); return 'FWA FOREVER galaxy settings: ' + JSON.stringify(o) }
  function importText(txt) {
    const i = txt.indexOf('{'), j = txt.lastIndexOf('}'); if (i < 0 || j < i) return msg('No settings in that text'); let o; try { o = JSON.parse(txt.slice(i, j + 1)) } catch (e) { return msg('That text could not be read') }
    const pick = s => { const r = {}; if (s && typeof s === 'object') for (const k of KEYS) if (Number.isFinite(+s[k])) r[k] = +s[k]; return r };
    st.def = pick(o.default); st.g = {}; YEARS.forEach(y => { const r = pick(o[y]); if (Object.keys(r).length) st.g[y] = r }); save(); cols.forEach(c => c.refresh()); pushColours(); msg('Settings in');
  }
  function build() {
    el = document.createElement('div'); el.id = 'galLab'; el.innerHTML = `<div class="gl-top"><b>Galaxy playground</b><span>Each year's galaxy from above, with its own settings. Colours show in flight right away; send me the text for the shapes.</span><span class="gl-msg"></span><button type="button" data-a="copy">Copy settings</button><button type="button" data-a="paste">Paste</button><button type="button" data-a="clear">Reset all</button><button type="button" data-a="close">Close ✕</button></div><textarea class="gl-in" hidden placeholder="Paste FWA FOREVER galaxy settings here"></textarea><div class="gl-row"></div>`;
    document.body.appendChild(el); const row = el.querySelector('.gl-row'), ta = el.querySelector('.gl-in');
    cols = ['def', ...YEARS].map(column); cols.forEach(c => row.appendChild(c.c));
    el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close() }); el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('wheel', e => e.stopPropagation());
    ta.addEventListener('paste', () => setTimeout(() => { importText(ta.value); ta.value = ''; ta.hidden = true }, 0));
    el.querySelector('.gl-top').onclick = e => { const a = e.target.dataset && e.target.dataset.a; if (!a) return;
      if (a === 'close') close();
      if (a === 'copy') { const t = copyText(); try { navigator.clipboard.writeText(t).then(() => msg('Copied. Paste it in the chat'), () => { ta.hidden = false; ta.value = t; ta.select(); msg('Selected: Cmd/Ctrl+C') }) } catch (er) { ta.hidden = false; ta.value = t; ta.select() } }
      if (a === 'paste') { ta.hidden = !ta.hidden; if (!ta.hidden) { ta.focus(); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(t => { if (t && t.includes('{')) { importText(t); ta.hidden = true } }).catch(() => { }) } }
      if (a === 'clear' && confirm('Reset every galaxy (and the default) to the current look?')) { st.def = {}; st.g = {}; save(); cols.forEach(c => c.refresh()); pushColours() } };
  }
  function open() { if (!el) build(); el.hidden = false; document.body.classList.add('gallab'); if (document.pointerLockElement) document.exitPointerLock(); cols.forEach(c => c.refresh()) }
  function close() { if (el) el.hidden = true; document.body.classList.remove('gallab') }
  if (location.hash === '#galaxy-lab') setTimeout(open, 1500);
  return { open, close, get state() { return st }, copyText, importText };
})();
