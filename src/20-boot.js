/* ───────────────────────── boot: warm up, then a powers-of-ten entrance ─────────────────────────
   Shaders compile behind a quiet title card. Enter starts the sound (and pointer lock), then the camera falls from a
   view of the whole galaxy to your ship in one continuous move (log-distance easing), and hands you the controls. */
const UV_FLIP = true;   // screenUV runs top-down on both backends
const TEST = QS.has('test');
/* the opening: nothing but the pointer on a black screen, then the camera swings round and in, with a great deal of
   easing, to just above and behind it as the galaxy comes up far ahead; a light wakes in the back of the stem (the
   trail emitter), the instruments arrive, and your first push lets the camera settle back to its usual distance */
const INTRO_END = new V3(0, .55, 2.1), _il = new THREE.Matrix4(), _ia = new V3(), _ib = new V3(), _ix = new V3(), _iu = new V3();
let camNear = 0, camNearGo = false, emitGlow = 1;
const quint = x => x < .5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2;
const veil = (() => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), new THREE.MeshBasicMaterial({ color: 0, transparent: true, opacity: 1, side: THREE.BackSide, depthWrite: false })); m.renderOrder = 9999; m.frustumCulled = false; m.visible = false; camera.add(m); return m })();   // blacks out all but the ship
const intro = {
  active: false, t: 0, glow: 0, dur: 8, D0: 10, up0: new V3(), upW: new V3(),
  start() {
    // every time: the ship faces the galaxy's core and the camera's frame is the ship's own, so the opening always looks the same
    aimAt(GC.clone().sub(player.pos), 1); player.base.copy(rig.q); player.quat.copy(rig.q); player.vel.set(0, 0, 0);
    camera.fov = LOOK.fov; camera.updateProjectionMatrix();
    this.D0 = .503 * innerHeight / (2 * Math.tan(LOOK.fov * Math.PI / 360) * 21);   // the arrow about 21 px tall: a real pointer's size
    this.up0.set(Math.sin(ARROW.ax), 0, -Math.cos(ARROW.ax));   // screen-up for a pointer on a screen (its left edge upright), in the ship's frame
    this.t = 0; this.glow = 0; this.hud = false; emitGlow = 0; camNear = 1; camNearGo = false; this.active = introActive = true;
    document.body.classList.add('intro'); veil.visible = true; veil.material.opacity = 1; this.update(0);
  },
  at: null,   // where on screen the pointer starts (the Start button's centre), eased back to the centre as the camera swings
  update(dt) {
    avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat); avatar.visible = true; avatar.userData.flame.material.opacity = 0;
    if (this.t < 1) {
      this.t = Math.min(1, this.t + dt / (reduceMotion ? 2.5 : this.dur));
      // one move: the camera swings from straight overhead round to just above and behind, easing in and out a great deal,
      // and it keeps looking at the ship until, at the very end, it settles into looking ahead past it
      const ez = quint(sstep(this.t, .02, .98)), w = quint(sstep(this.t, .3, 1));
      const b = _ib.copy(INTRO_END).normalize(), ang = Math.acos(b.y), d = Math.exp(Math.log(this.D0) * (1 - ez) + Math.log(INTRO_END.length()) * ez);
      camera.position.copy(_ia.set(0, 1, 0).applyAxisAngle(_ix.set(1, 0, 0), ang * ez).multiplyScalar(d)).applyQuaternion(rig.q).add(player.pos);
      const toShip = _ib.copy(player.pos).sub(camera.position).normalize(), fwd = _ix.set(0, 0, -1).applyQuaternion(rig.q), dir = toShip.lerp(fwd, w).normalize();
      const up = this.upW.copy(this.up0).applyQuaternion(rig.q).lerp(_iu.set(0, 1, 0).applyQuaternion(rig.q), ez).normalize();
      _il.lookAt(_ia.set(0, 0, 0), dir, up); camera.quaternion.setFromRotationMatrix(_il);
      if (this.at) { const k = 1 - ez, W = innerWidth, H = innerHeight; camera.setViewOffset(W, H, -(this.at.x - W / 2) * k, -(this.at.y - H / 2) * k, W, H) }
      veil.material.opacity = 1 - sstep(this.t, .3, .9); veil.scale.setScalar(camera.position.distanceTo(player.pos) + .45);
      emitGlow = quint(sstep(this.t, .72, 1));   // the engine lights during the last of the swing
      if (this.t >= .76 && !this.hud) { this.hud = true; document.body.classList.remove('intro'); flickIn((1 - this.t) * (reduceMotion ? 2.5 : this.dur)) }   // and the instruments flicker in, all landing as the camera does
      if (this.t >= 1) this.finish();   // the moment the camera arrives: engine on, instruments flicker in, yours to fly
    }
    camera.updateMatrixWorld();
  },
  finish() {
    if (!this.active) return; this.active = introActive = false; veil.visible = false; emitGlow = 1; camera.clearViewOffset(); this.at = null;
    camRel.copy(INTRO_END); camRelV.set(0, 0, 0); if (!this.hud) { document.body.classList.remove('intro'); flickIn() } handOver();
  },
};
// the instruments flicker on one by one as the opening ends, each with its own pattern and moment
function flickIn(within = 1.8) {   // every element is fully on within this many seconds
  const r = (a, b) => a + Math.random() * (b - a);
  document.querySelectorAll('.hud:not([hidden]), #labels').forEach(e => { e.style.setProperty('--fk', 'flk' + (1 + (Math.random() * 3 | 0))); const fd = r(.45, .75) * within; e.style.setProperty('--fd', fd.toFixed(2) + 's'); e.style.setProperty('--fdl', r(0, within - fd).toFixed(2) + 's'); e.classList.remove('flk-go'); void e.offsetWidth; e.classList.add('flk-go') });
  setTimeout(() => document.querySelectorAll('.flk-go').forEach(e => e.classList.remove('flk-go')), within * 1000 + 300);
}
function handOver() { booted = true; updateLockUI(); region = null; lastInput = performance.now(); coach.start() }

// restore the ship where it was last parked, facing the core otherwise
aimAt(GC.clone().sub(HOME_P), 1); player.base.copy(rig.q); player.quat.copy(rig.q);
{ const sv = store.json('sotd-ship'); if (sv && sv.p && sv.p.every(Number.isFinite)) { player.pos.fromArray(sv.p); player.base.fromArray(sv.q); player.quat.copy(player.base); rig.q.fromArray(sv.r) } }
camera.position.copy(player.pos).add(new V3(0, .3, 1));
recolor(); applyFilter(); refreshLabels(); renderLook(); applyLook(); updateLockUI(); Net.connect(); resize();
if (coarse) $('skipHint').hidden = true;   // touch: the opening just plays

// warm-up: one exotic of each kind and a sun in view while the first frames compile every pipeline
{
  const warm = new THREE.Group(); scene.add(warm); camera.updateMatrixWorld();
  Object.entries(EXO_KINDS).forEach(([k, K], j) => { const b = K.build(K.P, EXO_SHARED[k] ??= {}); b.obj.scale.setScalar(.02); b.obj.position.set((j - 4) * 60, 0, -900).applyQuaternion(camera.quaternion).add(camera.position); warm.add(b.obj) });
  bodies.mesh.count = 1; bodies.mesh.setMatrixAt(0, new THREE.Matrix4().compose(new V3(0, 0, -900).applyQuaternion(camera.quaternion).add(camera.position), new Q4(), new V3(10, 10, 10)));
  // compile every scene's shaders in parallel and off the main thread where the browser allows, ticking the ring as each lands
  const jobs = [[renderer, scene], [renderer, softScene], [renderer, hazeScene], [renderer, volScene], [renderer, trailScene], [shipRenderer, shipScene]]; let done = 0;
  try { await Promise.all(jobs.map(([r, sc]) => r.compileAsync(sc, camera).catch(() => { }).then(() => loadProg(.6 + .3 * ++done / jobs.length)))) } catch (e) { }
  pipeline.render(); loadProg(.95); await new Promise(r => setTimeout(r, 0)); pipeline.render();   // the post chain on top
  scene.remove(warm); bodies.mesh.count = 0;
}
function begin(withSound, e) {
  { const r = $('enter').getBoundingClientRect(); intro.at = r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null }   // the pointer appears right where Start was
  if (e && e.pointerType !== 'touch' && e.clientX) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true }   // the pointer is already where you clicked: no second click to wake it
  if (withSound) { setMuted(false); audio() }
  if (!coarse && !lockFailed && !TEST) requestLock();
  $('intro').hidden = true;   // straight to black: then only the pointer fades in
  if (!TEST) { intro.start(); const skip = e => { if (e.key !== 'Escape' && e.key !== ' ') return; intro.finish(); removeEventListener('keydown', skip) }; setTimeout(() => addEventListener('keydown', skip), 400) }   // clicks never skip it; Esc or Space does
  else handOver();
}
if (TEST) { $('intro').hidden = true; document.body.classList.remove('intro'); LOOK.adaptive = 0; handOver() }
else {
  const enter = $('enter'); if (window.__introProgress) window.__introProgress(1); else document.body.classList.add('ready');   // the ring opens Start when it closes
  enter.onclick = e => begin(true, e); $('enterQuiet').onclick = e => { setMuted(true); begin(false, e) };
  addEventListener('keydown', function k(e) { if ($('intro').classList.contains('gone')) return removeEventListener('keydown', k); if (e.target.closest && e.target.closest('#intro button')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeEventListener('keydown', k); begin(true) } });
}
let vt = performance.now();
if (!TEST) requestAnimationFrame(t => { last = t; loop(t) });
else last = vt;
window.__ready = true;
window.__sky = { starR, hazeVis: v => haze.mesh.visible = v, softVis: v => softScene.children.forEach(o => { if (o.isMesh || o.isSprite || o.isGroup) o.visible = v }), starsVis: v => stars.mesh.visible = v, tickOnly(dtMs = 16.7) { vt += dtMs; tick(vt) }, lockI: () => lockI, applyFilter, matchCount: () => matchCount, avatar, outpost, ringPoint, stopR, aimAt, GQ, toLocal, async run(n = 1, dtMs = 16.7) { for (let i = 0; i < n; i++) { vt += dtMs; tick(vt) } await new Promise(r => requestAnimationFrame(r)); vt += dtMs; tick(vt); if (GPU) await renderer.backend.device.queue.onSubmittedWorkDone(); await new Promise(r => requestAnimationFrame(r)) }, keys, regionOf, setDpr, THREE, LOOK, player, rig, camera, renderer, perf, S, setMode, focus, applyLook, D, P, GC, starPos, get GPU() { return GPU }, intro, pipeline, U, PU, orbit, zoom, rotateRig, mapHover, ringAt, ringZoom, mapLvl, get mapYrs() { return mapYrs }, ruler, timeRings, bh, BH, setBH, armPhase, nearest, get nearI() { return nearI }, get contact() { return contactK }, avatarTail: () => avatar.userData.tail, tip, get hovI() { return hovI }, updateHover, get ringHov() { return ringHov }, coach, runBench, bench, peerUpdate, Net, showCard };
