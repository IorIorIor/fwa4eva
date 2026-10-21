/* ───────────────────────── first flight, and a benchmark ─────────────────────────
   On a first visit a short run of tips teaches the controls, each one leaving as soon as you've done it.
   The benchmark flies the camera through the heaviest views for a few seconds each and writes a report you can
   paste back to tune quality for real hardware. */
const K = k => `<kbd data-k="${k}">${{ arrowleft: '←', arrowright: '→', shift: 'Shift', mouse: 'Mouse' }[k] || k.toUpperCase()}</kbd>`;   // a key, drawn as a key (it lights while you hold it)
const coach = {
  i: -1, t: 0, look: 0, done: 0, prevQ: new Q4(), el: null, arrow: false, ring: false, hold: 0,
  steps: () => coarse ? [
    { t: 'Drag to look around', s: () => portal.on ? 'or tilt the phone: it\'s a window' : '', ok: () => coach.look > 1.1 },
    { t: 'Hold Thrust to fly', s: 'slide your thumb up it to boost', ok: () => player.vel.length() > 400 },
    { t: 'Tap a star near you to lock on', s: 'then hold Thrust to fly to it', ok: () => lockI >= 0 },
    { t: 'Touch and hold anywhere for the menu', ok: () => !!(rmenu.open || rmenu.panel) },
    { t: 'Tilt, bottom left, steers with the phone', ok: () => portal.steering || coach.t > 6, skip: () => !portal.on },
    { t: 'Map, top right, shows the whole timeline', ok: () => S.mode === 'map' || coach.t > 7 },
  ] : [
    { t: `Press ${K('w')} to move forward`, ok: () => keys.w && (coach.hold += coach.dt) > .7 },
    { t: `Move the ${K('mouse')} to steer`, ok: () => coach.look > 1 },
    { t: `Press ${K('shift')} to boost`, ok: () => boosting && (coach.hold += coach.dt) > .35 },
    { t: `Press ${K('s')} to brake`, ok: () => keys.s && brakeK > .6 },
    { t: `${K('q')} ${K('e')} pick the nearest FWA`, ok: () => coach.qd && coach.ed },   // both keys, nearer and farther
    { t: 'Visit and collect an FWA', s: () => `lock on with ${K('q')} ${K('e')}, then hold ${K('w')}`, ok: () => coach.ring || (!LOOK.rings && cardI >= 0) },
    { t: 'Click and hold for the menu', s: 'pick anything you like', ok: () => !!(rmenu.open || rmenu.panel) },
    { t: `Press ${K('m')} for the map`, ok: () => S.mode === 'map', skip: () => S.mode === 'map' },   // (skipped if the menu already took you there)
    { t: `Press ${K('m')} to go back to your ship`, ok: () => S.mode === 'fly' && !(tween && tween.mode), map: true },
    { t: `Press ${K('f')} to get your mouse back`, ok: () => !locked(), skip: () => lockFailed },
  ],
  start(again) { if ((TEST && !again) || (!again && (!LOOK.tutorial || store.get('sotd-coach') === '1'))) return; this.again = !!again; this.el = $('coach'); this.list = this.steps(); this.i = 0; this.t = 0; this.done = 0; this.prevQ.copy(rig.q); this.arrow = this.ring = false; this.show() },
  show() {
    const s = this.list[this.i], e = this.el, v = x => typeof x === 'function' ? x() : x || ''; this.look = 0; this.hold = 0; this.arrow = this.ring = this.qd = this.ed = false;
    e.innerHTML = `<span class="td">${this.i + 1} / ${this.list.length}</span><span class="tt">${v(s.t)}</span>` + (s.s ? `<span class="ts">${v(s.s)}</span>` : '');
    e.hidden = false; e.classList.remove('done'); if (intro.active) e.classList.add('away'); void e.offsetWidth; e.classList.add('in'); this.kb = [...e.querySelectorAll('kbd')];
  },
  update(dt) {
    if (this.i < 0 || !booted || intro.active) return;
    if (!LOOK.tutorial && !this.again) { this.end(); return }
    this.dt = dt; this.t += dt; this.look += this.prevQ.angleTo(rig.q); this.prevQ.copy(rig.q);
    this.kb.forEach(k => k.classList.toggle('dn', k.dataset.k === 'mouse' ? performance.now() - lastInput < 120 && this.look > .02 : !!keys[k.dataset.k]));
    this.place();
    if (this.done > 0) { this.done -= dt; if (this.done <= 0) { this.i++; while (this.i < this.list.length && this.list[this.i].skip && this.list[this.i].skip()) this.i++; this.t = 0; if (this.i >= this.list.length) this.end(); else this.show() } return }
    if (this.list[this.i].ok()) { this.done = 1.8; this.el.classList.add('done'); buzz(12) }
  },
  place() {   // it floats just above the ship
    const e = this.el, st = this.list[this.i], hide = st && st.map ? S.mode !== 'map' || !!rmenu.panel : S.mode !== 'fly' || rmenu.panel || document.body.classList.contains('panel-open'); e.classList.toggle('away', hide); if (hide) return;
    const top = (LOOK.coachTop ?? 1) > 0, p = tmp.copy(player.pos).project(camera), x = top ? innerWidth / 2 : Math.max(160, Math.min(innerWidth - 160, (p.x * .5 + .5) * innerWidth));
    const y = top ? (LOOK.coachTopY ?? 110) + (e.offsetHeight || 0) : Math.max(90, Math.min(innerHeight - 40, (-p.y * .5 + .5) * innerHeight - (LOOK.coachUp ?? 90)));   // at the top of the screen (it hangs up from its anchor), or floating over the ship
    e.style.left = x.toFixed(1) + 'px'; e.style.top = y.toFixed(1) + 'px';
  },
  skip() { if (this.i < 0 || this.done > 0) return false; this.done = .3; this.el.classList.add('done'); return true },
  end() { this.i = -1; store.set('sotd-coach', '1'); if (this.el) { this.el.classList.remove('in'); setTimeout(() => { if (this.i < 0) this.el.hidden = true }, 600) } },
};

const bench = { on: false, ms: [] };
function gpuName() {
  try { if (GPU) { const i = renderer.backend.device && renderer.backend.device.adapterInfo; if (i) return [i.vendor, i.architecture, i.description || i.device].filter(Boolean).join(' ') }
    else { const gl = renderer.backend.gl, x = gl && gl.getExtension('WEBGL_debug_renderer_info'); if (x) return gl.getParameter(x.UNMASKED_RENDERER_WEBGL) } } catch (e) { }
  return 'unknown GPU';
}
async function runBench() {
  if (bench.on || !booted) return; bench.on = true;
  const msg = m => { $('lookMsg').textContent = m }, frames = n => new Promise(r => { let k = 0; const f = () => { if (++k >= n) r(); else requestAnimationFrame(f) }; requestAnimationFrame(f) });
  const keep = { pos: player.pos.clone(), base: player.base.clone(), vel: player.vel.clone(), cruise: player.cruise, rig: rig.q.clone(), mode: S.mode, adaptive: LOOK.adaptive, dpr: DPR };
  LOOK.adaptive = 0; setDpr(Math.min(LOOK.maxDpr, devicePixelRatio || 1), true); lockI = -1; auto = null; for (const k in keys) keys[k] = false;
  const up = new V3(0, 1, 0).applyQuaternion(GQ), side = new V3(1, 0, 0).applyQuaternion(GQ), at = (p, look) => { if (S.mode !== 'fly') setMode('fly'); tween = null; player.pos.copy(p); aimAt(look.clone().sub(p), 1); player.base.copy(rig.q); player.quat.copy(rig.q); player.vel.set(0, 0, 0); player.cruise = 0 };
  const star = Math.floor(N / 2), sp = starPos(star);
  const poses = [
    ['Start (past the rim)', () => at(HOME_P, GC)],
    ['Inside an arm', () => at(ringPoint(.42, 1, 2500), GC)],
    ['Beside a winner', () => at(sp.clone().add(new V3(1, .3, .5).normalize().multiplyScalar(stopR(star) * 1.6)), sp)],
    ['Black hole, far', () => at(GC.clone().addScaledVector(side, 700000).addScaledVector(up, 126000), GC)],
    ['Black hole, close', () => at(GC.clone().addScaledVector(side, BH.rs * 6).addScaledVector(up, BH.rs * .4), GC)],
    ['Near light speed', () => { at(ringPoint(.7, 2, 3000), GC); player.vel.set(0, 0, -1).applyQuaternion(rig.q).multiplyScalar(LIGHT * .85); player.cruise = 1 }],
    ['Map, whole galaxy', () => { setMode('map'); tween = null; Object.assign(orbit, { target: GC.clone(), dist: UNI_D * .9 }) }],
  ];
  const rows = [];
  for (let k = 0; k < poses.length; k++) {
    msg(`Benchmarking ${k + 1} of ${poses.length}: ${poses[k][0]}…`); poses[k][1](); await frames(45);
    bench.ms = []; await frames(150); const a = bench.ms.slice().sort((x, y) => x - y), avg = a.reduce((s, x) => s + x, 0) / Math.max(1, a.length), p95 = a[Math.floor(a.length * .95)] || avg;
    rows.push(`${poses[k][0].padEnd(20)} ${String(Math.round(1000 / avg)).padStart(4)} fps · p95 ${p95.toFixed(1)} ms`);
  }
  if (S.mode !== keep.mode) setMode(keep.mode); tween = null;
  player.pos.copy(keep.pos); player.base.copy(keep.base); player.quat.copy(keep.base); player.vel.copy(keep.vel); player.cruise = keep.cruise; rig.q.copy(keep.rig); LOOK.adaptive = keep.adaptive; setDpr(keep.dpr, true); bench.on = false;
  const ua = navigator.userAgent, br = (ua.match(/(Edg|Chrome|Firefox|Version)\/(\d+)/) || [])[0] || 'browser';
  const txt = `FWA FOREVER benchmark · ${GPU ? 'WebGPU' : 'WebGL 2'} · ${gpuName()} · ${innerWidth}×${innerHeight} at ${Math.min(LOOK.maxDpr, devicePixelRatio || 1)}× · ${br}${/Mac/.test(ua) ? ' · Mac' : /Win/.test(ua) ? ' · Windows' : ''}\nBlack hole steps ${LOOK.bhSteps} · soft layers ${LOOK.softRes} · volumetric ${LOOK.volumetric ? 'on' : 'off'}\n` + rows.join('\n');
  const ta = $('lookOut'); ta.value = txt; ta.hidden = false;
  try { await navigator.clipboard.writeText(txt); msg('Benchmark copied. Paste it in the chat') } catch (e) { ta.focus(); ta.select(); msg('Done. Copy the report below') }
}
