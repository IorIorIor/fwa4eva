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
// the 3D logo the opening flies through: the FWA mark extruded a little, white faces and grey sides, built once.
// Its origin is the point under the middle of the W (svg 244, 102), where the camera passes through.
const LOGO_THRU = [244, 102];   // the point of the logo the camera passes through: under the middle of the W
const logoShapes = (() => { let sh = null; return () => { if (sh) return sh; const svg = document.querySelector('#logo svg'); if (!svg) return null; sh = new SVGLoader().parse(svg.outerHTML).paths.flatMap(p => SVGLoader.createShapes(p));
  return sh } })();
let logo3d = null;
function makeLogo3d() {
  const shapes = logoShapes(); if (!shapes) return null;
  const geo = new THREE.ExtrudeGeometry(shapes, { depth: 149, bevelEnabled: false, curveSegments: 10 }); geo.translate(-LOGO_THRU[0], -LOGO_THRU[1], -149); geo.scale(1, -1, 1);   // svg y points down
  const face = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .9, roughness: .4, side: THREE.DoubleSide }), side = new THREE.MeshStandardMaterial({ color: 0x9a9aa4, emissive: 0xffffff, emissiveIntensity: .06, roughness: .5, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geo, [face, side]), g = new THREE.Group(); g.add(mesh); g.userData.mesh = mesh; g.visible = false; shipScene.add(g); return g;
}
/* the splash's star field: simple twinkling points around the logo, in 3D (they sit nearer and further than it). On the
   splash it's drawn flat on its own canvas; from Start the same stars, in the same places, are 3D points in front of the
   camera that rush past with the logo, then fade a second after you're through it, as the galaxy comes up */
const sStars = (() => {
  const n = 700, r = mulberry32(4242), X = new Float32Array(n), Y = new Float32Array(n), K = new Float32Array(n), B = new Float32Array(n), P = new Float32Array(n), F = new Float32Array(n);
  for (let i = 0; i < n; i++) { X[i] = (r() * 2 - 1) * 1.25; Y[i] = (r() * 2 - 1) * 1.25; K[i] = .35 * Math.pow(20, r()); B[i] = .25 + .75 * Math.pow(r(), 2.2); P[i] = r() * 6.283; F[i] = .6 + r() * 2.4 }
  const S = { shift: 0, v: 0, k: 1, after: -1, t: 0 }, Z0 = () => .6 * .503 * SHIP_SC * innerHeight / (2 * Math.tan(LOOK.fov * Math.PI / 360) * 21);
  const bright = (i, t, z) => B[i] * (.62 + .38 * Math.sin(t * F[i] + P[i]) + .9 * Math.pow(Math.max(0, Math.sin(t * F[i] * .37 + P[i] * 3)), 40)) * Math.min(1, z / (Z0() * .12)) * Math.min(1, 7.5 - z / Z0());   // a gentle twinkle and, now and then, a sparkle
  // flat, on the splash
  const cv = $('splashStars'), g = cv && cv.getContext('2d');
  const flat = now => {
    if (!g) return; if ($('intro').hidden) { requestAnimationFrame(flat); return } const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d) }
    const t = now / 1000, z0 = Z0(); S.shift = (S.shift + .016 * z0 * (LOOK.splashDrift ?? .04)) % (z0 * 4); g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    for (let i = 0; i < n; i++) { let z = K[i] * z0 - S.shift; if (z < z0 * .05) z += z0 * 7; const q = K[i] * z0 / z, x = W / 2 + X[i] * q * W / 2, y = H / 2 - Y[i] * q * H / 2; if (x < -4 || x > W + 4 || y < -4 || y > H + 4) continue;
      const b = bright(i, t, z) * (LOOK.splashStars ?? 1); if (b < .02) continue; const sz = (.6 + 1.1 * B[i]) * Math.min(2.2, Math.sqrt(q)); g.fillStyle = `rgba(255,255,255,${Math.min(1, b).toFixed(3)})`; g.fillRect(x - sz / 2, y - sz / 2, sz, sz) }
    requestAnimationFrame(flat);
  };
  requestAnimationFrame(flat);
  // in 3D, from Start: camera-local quads (they face the camera by construction), sized to stay a pixel or two
  const geo = new THREE.PlaneGeometry(1, 1), mat = new THREE.MeshBasicMaterial({ map: softDot, color: 0xffffff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false });
  const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.frustumCulled = false; mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); mesh.renderOrder = 5; mesh.visible = false; shipScene.add(mesh);
  const m4 = new THREE.Matrix4(), q4 = new Q4(), v3 = new V3(), sc = new V3();
  S.update = (dt, logoShift) => {
    if (!intro.active || !(LOOK.splashStars ?? 1)) { mesh.visible = false; return }
    S.t += dt; if (intro.ph === 2) { if (S.after < 0) S.after = 0; S.after += dt; S.lshift = (S.lshift || 0) + S.v * dt; S.v *= Math.exp(-dt * .8) } else if (logoShift != null) { const ls = logoShift; S.v = dt > 0 ? (ls - (S.lshift || 0)) / dt : 0; S.lshift = ls }
    S.k = 1 - sstep(S.after, LOOK.splashStarsHold ?? 1, (LOOK.splashStarsHold ?? 1) + (LOOK.splashStarsFade ?? 1)); if (S.k <= 0) { mesh.visible = false; return }
    mesh.visible = true; mesh.position.copy(camera.position); mesh.quaternion.copy(camera.quaternion); mesh.updateMatrixWorld();
    const z0 = Z0(), th = Math.tan(camera.fov * Math.PI / 360), asp = camera.aspect, tt = performance.now() / 1000, px = 2 * th / innerHeight, sh = S.shift + (S.lshift || 0) * (LOOK.splashStarsFollow ?? 1);
    for (let i = 0; i < n; i++) {
      let z = K[i] * z0 - sh; while (z < z0 * .05) z += z0 * 7; const b = bright(i, tt, z) * S.k * (LOOK.splashStars ?? 1), s = (.6 + 1.1 * B[i]) * 2.6 * px * z * Math.min(2.2, Math.sqrt(K[i] * z0 / z));
      m4.compose(v3.set(X[i] * th * asp * K[i] * z0, Y[i] * th * K[i] * z0, -z), q4, sc.set(s, s, 1)); mesh.setMatrixAt(i, m4); mesh.instanceColor.setXYZ(i, b, b, b) }
    mesh.instanceMatrix.needsUpdate = true; mesh.instanceColor.needsUpdate = true;
  };
  S.reset = () => { S.after = -1; S.lshift = 0; S.v = 0; S.t = 0 };
  S.far = () => mesh.visible ? Z0() * 8 : 0;
  return S;
})();
const curEl = (() => { const e = document.createElement('img'); e.id = 'introCur'; e.alt = ''; e.style.cssText = 'position:fixed;left:0;top:0;z-index:60;pointer-events:none;display:none'; document.body.appendChild(e); return e })();   // the opening's plain mouse pointer
const intro = {
  logoAt: null,
  active: false, t: 0, glow: 0, dur: 8, D0: 10, up0: new V3(), upW: new V3(), ph: 2, lt: 0,
  start() {
    // every time: the ship faces the galaxy's core and the camera's frame is the ship's own, so the opening always looks the same
    aimAt(GC.clone().sub(player.pos), 1); player.base.copy(rig.q); player.quat.copy(rig.q); player.vel.set(0, 0, 0);
    camera.fov = LOOK.fov; camera.updateProjectionMatrix();
    this.D0 = .503 * SHIP_SC * innerHeight / (2 * Math.tan(LOOK.fov * Math.PI / 360) * 21);   // the arrow about 21 px tall: a real pointer's size
    this.up0.set(Math.sin(ARROW.ax), 0, -Math.cos(ARROW.ax));   // screen-up for a pointer on a screen (its left edge upright), in the ship's frame
    INTRO_END.set(0, rig.dist * (LOOK.camHeight ?? .42), rig.dist).multiplyScalar(LOOK.introDist ?? 1);   /* it lands right where the flight camera sits, so nothing moves on afterwards */ this.lit = false;   // where the opening ends up: close behind the pointer
    this.goal = null; this.av.x = this.av.y = 0;
    sStars.reset(); this.lshift = 0; this.t = 0; this.glow = 0; this.hud = false; emitGlow = 0; camNear = 0; camNearGo = false; camHold = null; this.active = introActive = true;
    document.body.classList.add('intro'); veil.visible = true; veil.material.opacity = 1; this.wipe = true;   // one frame through the black veil, so the warm-up's last picture doesn't linger on the canvas
    setDpr(.5, true); this.lowDpr = true;   // nothing but black, the pointer and the logo to draw at first: the lowest resolution is plenty
    const wantLogo = LOOK.logoIntro && this.logoAt && !reduceMotion && (logo3d || (logo3d = makeLogo3d())); if (logo3d) logo3d.visible = false;
    this.ph = 2; this.pose(0);
    if (this.at) {   // shift the frame so the pointer's tip, not its middle, sits exactly on the click
      camera.clearViewOffset(); camera.updateMatrixWorld(); avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat); avatar.updateMatrixWorld(true);
      const tip = avatar.localToWorld(_ia.set(ARROW.pts[0][0], .7, ARROW.pts[0][1])).project(camera), tail = avatar.localToWorld(_ib.set(ARROW.tail[0], .7, ARROW.tail[1])).project(camera);
      this.tipOff = { x: -tip.x * innerWidth / 2, y: tip.y * innerHeight / 2 }; this.at.x += this.tipOff.x; this.at.y += this.tipOff.y;
      // the flat pointer, drawn to the size the ship shows at, so the swap from one to the other can't be seen
      const def = CURSORS[shipK] || CURSORS[0], dpx = Math.hypot((tail.x - tip.x) * innerWidth / 2, (tail.y - tip.y) * innerHeight / 2), dpt = Math.hypot(def.tail[0] - def.tip[0], def.tail[1] - def.tip[1]), sc = dpx / dpt, dpr = devicePixelRatio || 1, pic = cursorPic(def, sc * dpr);
      curEl.src = pic.url; curEl.style.width = curEl.style.height = pic.size / dpr + 'px'; this.cur = { hx: pic.hx / dpr, hy: pic.hy / dpr };
      this.pose(0);
    }
    if (wantLogo && this.at) {   // phase one: you're still just a mouse pointer, and the FWA logo flies at you until you pass through it, under the middle of the W
      this.ph = 1; this.lt = 0; curEl.style.display = 'block'; this.placeCur();
      camera.updateMatrixWorld(); const W = innerWidth, H = innerHeight, th = Math.tan(camera.fov * Math.PI / 360), Z0 = this.D0 * .6, s = this.logoAt.w / H * 2 * Z0 * th / 509;
      this.lg = { Z0, s, x0: (this.logoAt.x / W * 2 - 1) * th * W / H * Z0, y0: (1 - this.logoAt.y / H * 2) * th * Z0, dz: s * 149 * (LOOK.logoDepth ?? .12) };
      logo3d.scale.set(s, s, s * (LOOK.logoDepth ?? .12)); logo3d.visible = true; this.logoStep(0);
    }
  },
  ez(t) {   // the zoom: creeping at first, faster and faster (exponentially), then landing softly
    const x = Math.min(1, Math.max(0, (t - .02) / .96)), k = LOOK.introEaseIn ?? 5, f = (Math.exp(k * x) - 1) / (Math.exp(k) - 1); return 1 - Math.pow(1 - f, LOOK.introEaseOut ?? 2.2);
  },
  at: null, goal: null, av: { x: 0, y: 0 }, tipOff: { x: 0, y: 0 }, cur: null,
  mouse(e) {   // all through the opening the arrow is still your mouse pointer: it moves with the mouse (the pull fades as the camera settles)
    if (!this.at) this.at = { x: innerWidth / 2, y: innerHeight / 2 }; const g = this.goal || (this.goal = { x: this.at.x, y: this.at.y });   // the mouse sets a goal; the arrow springs after it (see update)
    if (document.pointerLockElement) { g.x += e.movementX; g.y += e.movementY } else { g.x = e.clientX + this.tipOff.x; g.y = e.clientY + this.tipOff.y }
    g.x = Math.max(0, Math.min(innerWidth, g.x)); g.y = Math.max(0, Math.min(innerHeight, g.y));
  },
  placeCur() { if (this.at && this.cur) curEl.style.transform = `translate(${(this.at.x - this.tipOff.x - this.cur.hx).toFixed(1)}px,${(this.at.y - this.tipOff.y - this.cur.hy).toFixed(1)}px)` },
  logoStep(dt) {   // the logo in the camera's frame: from the splash's spot, rushing at you while the gap under the W's middle slides to the middle and you pass through it
    const T = Math.max(.5, LOOK.logoTime ?? 2.6), q = Math.min(1, (this.lt += dt) / T), e = Math.pow(q, LOOK.logoAccel ?? 2.2), G = this.lg;
    const z = -G.Z0 + (G.Z0 + G.dz * 1.6 + G.Z0 * .02) * e, c = sstep(e, 0, .8), W = innerWidth, H = innerHeight, th = Math.tan(camera.fov * Math.PI / 360), dx = this.at ? this.at.x - W / 2 : 0, dy = this.at ? this.at.y - H / 2 : 0;
    logo3d.position.set(G.x0 * (1 - c) - dx / W * 2 * th * W / H * -z, G.y0 * (1 - c) + dy / H * 2 * th * -z, z).applyQuaternion(camera.quaternion).add(camera.position); logo3d.quaternion.copy(camera.quaternion);   // undo the frame shift that keeps the pointer under the mouse: the logo stays put
    this.lshift = (G.Z0 + G.dz * 1.6 + G.Z0 * .02) * e;   // how far the logo has come at you: the stars come with it
    if (q >= 1) { logo3d.visible = false; this.curHide = 3; this.ph = 2 }   // the flat pointer stays a few frames more, until the 3D one is surely drawn in its place   // through: the pointer becomes the ship and the camera starts in
  },
  pose(t) {   // the camera at a point of the move: from straight overhead round to just above and behind the ship, looking at it until, at the very end, it looks ahead past it
    const ez = this.ez(t), w0 = Math.min(.95, LOOK.introLook ?? .45), w = sstep(ez, w0, 1);   /* turns from the pointer to the view ahead gradually, as part of the one move */   // it keeps the pointer dead centre until it's all but landed, then looks ahead past it
    const b = _ib.copy(INTRO_END).normalize(), ang = Math.acos(b.y), d = Math.exp(Math.log(this.D0) * (1 - ez) + Math.log(INTRO_END.length()) * ez);
    camera.position.copy(_ia.set(0, 1, 0).applyAxisAngle(_ix.set(1, 0, 0), ang * ez).multiplyScalar(d)).applyQuaternion(rig.q).add(player.pos);
    const toShip = _ib.copy(player.pos).sub(camera.position).normalize(), fwd = _ix.set(0, 0, -1).applyQuaternion(rig.q), dir = toShip.lerp(fwd, w).normalize();
    const up = this.upW.copy(this.up0).applyQuaternion(rig.q).lerp(_iu.set(0, 1, 0).applyQuaternion(rig.q), ez).normalize();
    _il.lookAt(_ia.set(0, 0, 0), dir, up); camera.quaternion.setFromRotationMatrix(_il);
    if (this.at) { const on = 1 - 1 / (reduceMotion ? 2.5 : this.dur), k = 1 - sstep(t, .12, on * .95), W = innerWidth, H = innerHeight; if (k > 0) camera.setViewOffset(W, H, -(this.at.x - W / 2) * k, -(this.at.y - H / 2) * k, W, H); else camera.clearViewOffset() }   // the pointer follows your mouse at first, less and less as the camera swings in behind it
    camera.updateMatrixWorld();
  },
  update(dt) {
    sStars.update(dt, this.ph === 1 ? this.lshift || 0 : null);
    avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat); avatar.visible = this.ph === 2; avatar.userData.flame.material.opacity = 0;
    if (this.at && this.goal && dt > 0) {   // elastic: a soft spring with a touch of overshoot, so any flick of the mouse reads as one smooth swing
      const K = 90 * (LOOK.introSpring ?? 1), C = 2 * Math.sqrt(K) * .78, h = Math.min(dt, 1 / 30);
      for (const a of ['x', 'y']) { this.av[a] += ((this.goal[a] - this.at[a]) * K - this.av[a] * C) * h; this.at[a] += this.av[a] * h }
    }
    if (this.curHide && --this.curHide <= 0) { this.curHide = 0; curEl.style.display = 'none' }
    if (this.ph === 1) { this.pose(0); this.placeCur(); this.logoStep(dt); return }
    if (this.t < 1) this.t = Math.min(1, this.t + dt / (reduceMotion ? 2.5 : this.dur));
    this.pose(this.t);
    const dur = reduceMotion ? 2.5 : this.dur, on = 1 - 1 / dur;   // engine and instruments are fully on a second before the camera lands
    if (this.lowDpr && this.t >= .27) { this.lowDpr = false; setDpr(Math.min(LOOK.maxDpr, devicePixelRatio || 1), true) }   // full resolution back just before the galaxy shows
    veil.material.opacity = 1 - sstep(this.t, .3, .9); veil.scale.setScalar(camera.position.distanceTo(player.pos) + .45);
    emitGlow = quint(sstep(this.t, on - .26, on));
    if (!this.lit && this.t >= on - .2) { this.lit = true; igniteK = 1; engineLook.burst = 1.5 }   // ignition: a big bloom that settles, as the engine lights in the last of the swing
    if (this.t >= on - .22 && !this.hud) { this.hud = true; document.body.classList.remove('intro'); flickIn(Math.max(.3, (on - this.t) * dur)) }   // and the instruments flicker in, all landed by then
    if (!booted && this.t >= 1) { introActive = false; handOver() }   // yours to fly only once it has landed, so nothing jumps at the end
    if (this.t >= 1) this.finish();   // landed exactly where the flight camera sits: nothing left to jump
  },
  finish() {
    if (logo3d) logo3d.visible = false; curEl.style.display = 'none'; this.ph = 2; if (this.lowDpr) { this.lowDpr = false; setDpr(Math.min(LOOK.maxDpr, devicePixelRatio || 1), true) }
    if (!this.active) return; this.active = introActive = false; veil.visible = false; emitGlow = 1; camera.clearViewOffset(); this.at = null;
    camRel.copy(INTRO_END); camRelV.set(0, 0, 0); camHold = { at: INTRO_END.clone().applyQuaternion(rig.quat).add(player.pos) }; if (!this.hud) { document.body.classList.remove('intro'); flickIn() } if (!booted) handOver();
  },
};
// the instruments fade in together as the opening ends
function flickIn(within = 1.8) {   // fully on within this many seconds
  document.querySelectorAll('.hud:not([hidden]), #labels').forEach(e => { e.style.setProperty('--fd', (within * .8).toFixed(2) + 's'); e.style.setProperty('--fdl', '0s'); e.classList.remove('flk-go'); void e.offsetWidth; e.classList.add('flk-go') });
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
  const SCN = [scene, softScene, hazeScene, volScene, trailScene, arcScene, shipScene], had = SCN.map(sc => new Set(sc.children));   // the exotics put glows in other scenes too: note what was there
  const warm = new THREE.Group(); scene.add(warm); camera.updateMatrixWorld();
  Object.entries(EXO_KINDS).forEach(([k, K], j) => { const b = K.build(K.P, EXO_SHARED[k] ??= {}); b.obj.scale.setScalar(.02); b.obj.position.set((j - 4) * 60, 0, -900).applyQuaternion(camera.quaternion).add(camera.position); warm.add(b.obj) });
  bodies.mesh.count = 1; bodies.mesh.setMatrixAt(0, new THREE.Matrix4().compose(new V3(0, 0, -900).applyQuaternion(camera.quaternion).add(camera.position), new Q4(), new V3(10, 10, 10)));
  // compile every scene's shaders in parallel and off the main thread where the browser allows, ticking the ring as each lands
  const jobs = [[renderer, scene], [renderer, softScene], [renderer, hazeScene], [renderer, volScene], [renderer, trailScene], [renderer, arcScene], [shipRenderer, shipScene]]; let done = 0;
  try { await Promise.all(jobs.map(([r, sc]) => r.compileAsync(sc, camera).catch(() => { }).then(() => loadProg(.6 + .3 * ++done / jobs.length)))) } catch (e) { }
  pipeline.render(); loadProg(.95); await new Promise(r => setTimeout(r, 0)); pipeline.render();   // the post chain on top
  scene.remove(warm); bodies.mesh.count = 0; SCN.forEach((sc, i) => sc.children.filter(o => !had[i].has(o)).forEach(o => sc.remove(o)));   // and take every bit of it away again, so nothing shows at the start
}
function cursorPic(def, sc) {   // the pointer drawn flat like a real one: black, with a white rim; sc = device px per pointer px
  const pad = 2, c = document.createElement('canvas'); c.width = c.height = Math.ceil(26 * sc); const g = c.getContext('2d'); g.scale(sc, sc); g.translate(pad, pad);
  g.beginPath(); def.parts.forEach(p => { const o = Array.isArray(p) ? { o: p, h: [] } : p; [o.o, ...o.h].forEach(r => r.forEach(([x, y], i) => i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() });
  g.lineJoin = 'round'; g.strokeStyle = '#fff'; g.lineWidth = 2.2; g.stroke(); g.fillStyle = '#000'; g.fill('evenodd'); return { url: c.toDataURL(), size: c.width, hx: (def.tip[0] + pad) * sc, hy: (def.tip[1] + pad) * sc };
}
if (store.get('sotd-ship-k') != null) try {   // the start screen's mouse pointer is the ship you flew last
  const def = CURSORS[shipK] || CURSORS[0], a1 = cursorPic(def, 1), a2 = cursorPic(def, 2), hx = Math.round(a1.hx), hy = Math.round(a1.hy);
  $('intro').style.cursor = `url(${a1.url}) ${hx} ${hy}, auto`; $('intro').style.cursor = `-webkit-image-set(url(${a1.url}) 1x, url(${a2.url}) 2x) ${hx} ${hy}, auto`;
} catch (e) { }
function begin(withSound, e) {
  logoShapes();
  { const m = document.querySelector('#intro .mark'), r0 = m && m.getBoundingClientRect(); intro.logoAt = r0 && r0.width ? { x: r0.left + r0.width * LOGO_THRU[0] / 509, y: r0.top + r0.height * LOGO_THRU[1] / 149, w: r0.width } : null }   // the 3D logo starts exactly over the splash's
  { const r = $('enter').getBoundingClientRect(); intro.at = e && e.detail && e.clientX ? { x: e.clientX, y: e.clientY } : r.width ? { x: r.left + r.width / 2, y: r.top + r.height / 2 } : null }   // the pointer appears right where you clicked Start
  if (e && e.pointerType !== 'touch' && e.clientX) { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true }   // the pointer is already where you clicked: no second click to wake it
  if (withSound) { setMuted(false); setMusicOff(false); audio() }
  if (!coarse && !lockFailed && !TEST) { let f = Math.max(0, LOOK.introCurFrames ?? 4); const go = () => f-- > 0 ? requestAnimationFrame(go) : requestLock(); go() }   // your own pointer stays a few frames more, until the drawn one is surely in its place
  $('intro').hidden = true; document.body.classList.remove('splash');   // straight to black: then only the pointer fades in
  if (!TEST) { intro.start(); const skip = e => { if (booted) return removeEventListener('keydown', skip); if (e.key !== 'Escape' && e.key !== ' ') return; intro.finish(); removeEventListener('keydown', skip) }; setTimeout(() => addEventListener('keydown', skip), 400) }   // clicks never skip it; Esc or Space does
  else handOver();
}
if (TEST) { $('intro').hidden = true; document.body.classList.remove('intro'); LOOK.adaptive = 0; handOver() }
else {
  const enter = $('enter'); if (window.__introProgress) window.__introProgress(1); else document.body.classList.add('ready');   // the ring opens Start when it closes
  enter.onclick = e => begin(true, e); $('enterQuiet').onclick = e => { setMuted(true); setMusicOff(true); begin(false, e) };
  addEventListener('keydown', function k(e) { if ($('intro').classList.contains('gone')) return removeEventListener('keydown', k); if (e.target.closest && e.target.closest('#intro button')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeEventListener('keydown', k); begin(true) } });
}
/* the ship back to where it starts, at once: still, facing the core, no trail behind it */
function toSpawn() {
  if (S.mode !== 'fly') { setMode('fly'); tween = null }
  warp = null; auto = null; lockI = -1; stopTour(); sparks.stop(); player.pos.copy(HOME_P); player.vel.set(0, 0, 0); player.cruise = 0;
  aimAt(GC.clone().sub(player.pos), 1); rig.quat.copy(rig.q); player.base.copy(rig.q); player.quat.copy(rig.q); strands.length = 0; curStrand = null; camRelV.set(0, 0, 0); camHold = null;
}
/* back to the splash, to record the opening again: everything closes, the title card and Start come back */
function toSplash() {
  if (isOpen('lookPanel') || isOpen('panel')) togglePanel(''); rmenu.close(); if (document.pointerLockElement) document.exitPointerLock();
  if (S.mode !== 'fly') { setMode('fly'); tween = null }
  if (intro.active) intro.finish(); toSpawn(); player.vel.set(0, 0, 0); lockI = -1; auto = null; warp = null; sparks.stop(); coach.end && coach.i >= 0 && coach.end();
  const el = $('intro'); el.hidden = false; el.classList.remove('gone'); document.body.classList.add('intro', 'ready', 'splash');
  const enter = $('enter'); enter.onclick = e => begin(true, e); $('enterQuiet').onclick = e => { setMuted(true); setMusicOff(true); begin(false, e) };
}
let vt = performance.now();
if (!TEST) requestAnimationFrame(t => { last = t; loop(t) });
else last = vt;
window.__ready = true;
window.__sky = { warpOn: () => !!warp, holdCam: () => { INTRO_END.set(0, rig.dist * (LOOK.camHeight ?? .42), rig.dist).multiplyScalar(LOOK.introDist ?? 1); camRel.copy(INTRO_END); camRelV.set(0, 0, 0); updateCamera(0); camHold = { at: INTRO_END.clone().applyQuaternion(rig.quat).add(player.pos) } }, ascent, sparks, whiteout, dustK: () => [dustHissK, streakDens, sstep(player.vel.length(), 150, 4000) * Math.min(1, streakDens * 1.5)], slowmo, mapZone, mouse,  HALOS: () => HALO.live, starR, hazeVis: v => haze.mesh.visible = v, softVis: v => softScene.children.forEach(o => { if (o.isMesh || o.isSprite || o.isGroup) o.visible = v }), starsVis: v => stars.mesh.visible = v, tickOnly(dtMs = 16.7) { vt += dtMs; tick(vt) }, lockI: () => lockI, applyFilter, matchCount: () => matchCount, avatar, outpost, ringPoint, stopR, aimAt, GQ, toLocal, async run(n = 1, dtMs = 16.7) { for (let i = 0; i < n; i++) { vt += dtMs; tick(vt) } await new Promise(r => requestAnimationFrame(r)); vt += dtMs; tick(vt); if (GPU) await renderer.backend.device.queue.onSubmittedWorkDone(); await new Promise(r => requestAnimationFrame(r)) }, keys, regionOf, setDpr, THREE, get LOOK() { return LOOK }, player, rig, camera, renderer, perf, S, setMode, focus, applyLook, D, P, GC, starPos, get GPU() { return GPU }, intro, pipeline, U, PU, orbit, zoom, rotateRig, mapHover, ringAt, ringZoom, mapLvl, get mapYrs() { return mapYrs }, ruler, timeRings, bh, BH, setBH, armPhase, nearest, get nearI() { return nearI }, get contact() { return contactK }, avatarTail: () => avatar.userData.tail, tip, get hovI() { return hovI }, updateHover, get ringHov() { return ringHov }, coach, runBench, bench, peerUpdate, Net, showCard, SATS, flyTo, navStep, GOT, setShip, CURSORS, HALO, get gotN() { return gotN }, startTour, TOURS, get tour() { return tour }, get warp() { return warp }, rmenu };
