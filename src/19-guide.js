/* ───────────────────────── first flight, and a benchmark ─────────────────────────
   On a first visit a short run of tips teaches the controls, each one leaving as soon as you've done it.
   The benchmark flies the camera through the heaviest views for a few seconds each and writes a report you can
   paste back to tune quality for real hardware. */
const coach = {
  i: -1, t: 0, look: 0, done: 0, prevQ: new Q4(), el: null,
  steps: () => [
    { k: 'Look', t: coarse ? 'Drag to look around' : 'Move the mouse to look around', ok: () => coach.look > 1.1 },
    { k: 'Fly', t: coarse ? 'Hold the thrust button to fly' : 'Hold W to fly', ok: () => player.vel.length() > 400 },
    { k: 'Boost & roll', t: coarse ? 'Keep holding: speed builds up' : 'Shift boosts · A and D roll the ship', ok: () => boosting || coach.t > 7 },
    { k: 'Lock on', t: coarse ? 'Tap a star to lock on' : 'Click a star to lock on, W takes you there', ok: () => lockI >= 0 },
    { k: 'Map', t: coarse ? 'Map, top left, shows the whole timeline' : 'M opens the map · H flies you home', ok: () => S.mode === 'map' || coach.t > 7 },
  ],
  start() { if (!LOOK.tutorial || store.get('sotd-coach') === '1' || TEST) return; this.el = $('coach'); this.list = this.steps(); this.i = 0; this.t = 0; this.prevQ.copy(rig.q); this.show() },
  show() { const s = this.list[this.i], e = this.el; e.innerHTML = `<span class="td">${this.i + 1} of ${this.list.length} · ${s.k}</span><span class="tt">${s.t}</span>`; e.hidden = false; e.classList.remove('done'); void e.offsetWidth; e.classList.add('in') },
  update(dt) {
    if (this.i < 0 || !booted || intro.active) return;
    if (!LOOK.tutorial) { this.end(); return }
    this.t += dt; this.look += this.prevQ.angleTo(rig.q); this.prevQ.copy(rig.q);
    if (this.done > 0) { this.done -= dt; if (this.done <= 0) { this.i++; this.t = 0; if (this.i >= this.list.length) this.end(); else this.show() } return }
    if (this.list[this.i].ok()) { this.done = .9; this.el.classList.add('done') }
  },
  end() { this.i = -1; store.set('sotd-coach', '1'); if (this.el) { this.el.classList.remove('in'); setTimeout(() => this.el.hidden = true, 600) } },
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
    ['Outpost (start)', () => at(HOME_P, GC)],
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
