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
/* the portal opening: the FWA mark as a window onto the galaxy. A black wall with the letters cut out of it hangs in front
   of the camera (on the ship's layer, so the real galaxy on the main canvas shows through the letters), the letters'
   walls run back from it, and a glow traces their outline. Scrolling brings it at you, through the notch at the top of
   the W's middle; round the letters the black dissolves as you get close, and the camera dives from a far view of the
   galaxy down to your pointer, where the usual opening takes over */
function makePortal() {
  const shapes = logoShapes(); if (!shapes) return null; const L = LOOK, g = new THREE.Group(), inner = new THREE.Group(); g.add(inner);   // inner: the mark in its own units (svg, y down); g: placed and scaled in front of the camera
  const contour = c => { const r = []; for (const p of c.getPoints(24)) { const q = r[r.length - 1]; if (!q || Math.hypot(p.x - q[0], p.y - q[1]) > 1e-3) r.push([p.x, p.y]) } while (r.length > 3 && Math.hypot(r[0][0] - r[r.length - 1][0], r[0][1] - r[r.length - 1][1]) <= 1e-3) r.pop(); return r }, outers = shapes.map(sh => contour(sh)), holes = shapes.flatMap(sh => sh.holes.map(contour));   // (contour: no repeated points where the curves join, they'd break the triangulation and the stroke's corners)
  const toV2 = pts => pts.map(([x, y]) => new THREE.Vector2(x, y));
  // the wall: a huge black sheet with every letter cut out (and the letters' own holes, their counters, filled back in)
  const wall = new THREE.Shape(toV2([[-30000, -30000], [30000, -30000], [30000, 30000], [-30000, 30000]])); outers.forEach(o => wall.holes.push(new THREE.Path(toV2(o))));
  const wallGeo = new THREE.ShapeGeometry([wall, ...holes.map(h => new THREE.Shape(toV2(h)))]);
  const scuff = () => [SCUFF.rough.clone(), SCUFF.bump.clone()], [fR, fB] = scuff(), [sR, sB] = scuff();   // the ship's worn metal (same pattern, its own scale here)
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x000000, metalness: 1, roughness: .59, roughnessMap: fR, bumpMap: fB, bumpScale: .35, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const wallM = new THREE.Mesh(wallGeo, wallMat); wallM.renderOrder = -11;   /* (drawn before anything else on the layer, so your pointer always shows over it) */ inner.add(wallM);
  // the letters themselves, black at first: they fade away as the galaxy comes up behind them
  const fillMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide });
  const fill = new THREE.Mesh(new THREE.ShapeGeometry(shapes, 16), fillMat); fill.renderOrder = 2; inner.add(fill);
  // the letters' walls, running back into the distance: dark metal
  const ex = new THREE.ExtrudeGeometry(shapes, { depth: 1, bevelEnabled: false, curveSegments: 16 }), gr = ex.groups[1], pa = ex.getAttribute('position'), na = ex.getAttribute('normal'), P_ = new Float32Array(gr.count * 3), N_ = new Float32Array(gr.count * 3);
  const U_ = new Float32Array(gr.count * 2), dz = L.portalDepth ?? 200;   // uv in the mark's own units: along the wall, and back into it
  for (let i = 0; i < gr.count; i++) { const k = gr.start + i; P_.set([pa.getX(k), pa.getY(k), -pa.getZ(k)], i * 3); N_.set([na.getX(k), na.getY(k), -na.getZ(k)], i * 3); U_.set([Math.abs(na.getX(k)) > Math.abs(na.getY(k)) ? pa.getY(k) : pa.getX(k), pa.getZ(k) * dz], i * 2) } ex.dispose();
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(P_, 3)); sg.setAttribute('normal', new THREE.BufferAttribute(N_, 3)); sg.setAttribute('uv', new THREE.BufferAttribute(U_, 2));
  const sideMat = new THREE.MeshStandardMaterial({ color: 0x030206, metalness: 1, roughness: L.portalWallRough ?? .59, roughnessMap: sR, bumpMap: sB, bumpScale: .35, side: THREE.DoubleSide, depthWrite: false });   // (writes no depth: your pointer always shows over the mark)
  const sides = new THREE.Mesh(sg, sideMat); sides.renderOrder = -12; inner.add(sides);
  // the outline: a solid white stroke just outside every edge of the letters (away from the letter, into the black), and a soft
  // glow fading out beyond it (additive, so it never darkens). Rebuilt when its width changes (rimAt: stroke and glow, in the mark's units)
  const rp = [], rc = [], ri = [], area = c => c.reduce((s, p, i) => { const q = c[(i + 1) % c.length]; return s + p[0] * q[1] - q[0] * p[1] }, 0);
  const strip = (pts, sg, across) => { const n = pts.length, b = rp.length / 3, m = across.length;   // across: [offset outward, brightness] from the edge
    const sw = across[2][0]; for (let i = 0; i < n; i++) { const a = pts[(i + n - 1) % n], [x, y] = pts[i], c = pts[(i + 1) % n], nl = (u, v) => { const dx = v[0] - u[0], dy = v[1] - u[1], l = Math.hypot(dx, dy) || 1; return [-dy / l * sg, dx / l * sg] };
      const n1 = nl(a, pts[i]), n2 = nl(pts[i], c), bx = n1[0] + n2[0], by = n1[1] + n2[1], bl = Math.hypot(bx, by) || 1, ml = Math.min(3, 1 / Math.max(.33, (bx * n1[0] + by * n1[1]) / bl)), nx = bx / bl * ml, ny = by / bl * ml;   // mitred: the stroke keeps its width round every corner, no notches or slivers
      for (const [o, k] of across) { const f = o > sw + 1e-6 ? Math.min(1, 1.3 / ml) : 1; rp.push(x + nx * o * f, y + ny * o * f, 0); rc.push(k, k, k, k) } }   // (the glow past the stroke doesn't spike out of sharp corners)
    for (let i = 0; i < n; i++) { const A = b + i * m, B = b + ((i + 1) % n) * m; for (let j = 0; j < m - 1; j++) ri.push(A + j, B + j, A + j + 1, B + j, B + j + 1, A + j + 1) } };
  const rimMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor, depthWrite: false, depthTest: false, side: THREE.DoubleSide });   // light added; and on the ship's see-through layer only as opaque as it's bright (else its faint edges would black out the galaxy behind)
  const rimS = { m: null, key: '' }; const rimAt = (sw, w) => { const key = sw.toFixed(2) + '|' + w; if (key === rimS.key) return; rimS.key = key; if (rimS.m) { inner.remove(rimS.m); rimS.m.geometry.dispose() } rp.length = rc.length = ri.length = 0;
    const across = [[-.35, 0], [0, 1], [sw, 1], [sw, .14], [sw + w * .35, .05], [sw + w, 0]];   // a crisp stroke, then a faint glow (so the stroke reads at its own width)
    outers.forEach(c => strip(c, area(c) > 0 ? -1 : 1, across)); holes.forEach(c => strip(c, area(c) > 0 ? 1 : -1, across));   // outward from the letter: out of an outline, into a counter
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.Float32BufferAttribute(rp, 3)); hg.setAttribute('color', new THREE.Float32BufferAttribute(rc, 4)); hg.setIndex(ri); rimS.m = new THREE.Mesh(hg, rimMat); rimS.m.renderOrder = 3; inner.add(rimS.m) };
  rimAt(1.5, L.portalRimW ?? 6);
  g.visible = false; shipScene.add(g);
  const wallBasic = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, depthWrite: false, depthTest: false, side: THREE.DoubleSide });   // the face with no metal: pure black, nothing on it catches light
  return { g, inner, wallM, wallBasic, fill, wallMat, fillMat, sideMat, sides, rimMat, rimAt, maps: [fR, fB, sR, sB] };
}
/* the portal lab (a page of its own: window.__PORTAL_LAB, or #portal-lab): the opening held still under a scrubber, from
   outside the mark (0) through it to the pointer (1) and on in to the ship (2), with the Look panel open on its sliders */
const PORTAL_LAB = !!window.__PORTAL_LAB || /portal-?lab/.test(location.hash);
function makePortalLab(I) {
  const el = document.createElement('div'); el.id = 'portalLab';
  el.innerHTML = '<button type="button" class="pl-play">Play</button><input type="range" id="plRange" min="0" max="2" step="0.001" value="0" aria-label="Opening progress"><span class="pl-v">Outside</span><button type="button" class="pl-look">Sliders</button>';
  document.body.appendChild(el); document.body.classList.add('plab');
  const r = el.querySelector('input'), lbl = el.querySelector('.pl-v'), pb = el.querySelector('.pl-play'), S_ = { v: 0, playing: false };
  const setPlay = on => { S_.playing = on; pb.textContent = on ? 'Pause' : 'Play' };
  r.oninput = () => { S_.v = +r.value; setPlay(false) };
  pb.onclick = () => { if (!S_.playing && S_.v >= 1.999) S_.v = 0; setPlay(!S_.playing) };
  el.querySelector('.pl-look').onclick = () => togglePanel('lookPanel');
  S_.toggle = () => pb.click();
  S_.wheel = e => { setPlay(false); S_.v = Math.max(0, Math.min(2, S_.v + (e.deltaMode ? e.deltaY * 33 : e.deltaY) * .0006 * (LOOK.portalScroll ?? 1))) };
  S_.step = dt => {
    const L = LOOK; if (S_.playing) { S_.v += dt / Math.max(.5, S_.v < 1 ? L.portalPlay ?? 3.5 : 3 * Math.max(.3, L.portalSettle ?? 2.2)); if (S_.v >= 2) { S_.v = 2; setPlay(false) } }
    r.value = S_.v; const v = S_.v;
    if (v < 1) { I.ph = 0; I.pq = I.pqT = v; I.portalView(); I.pt.g.visible = true; avatar.visible = false; emitGlow = 0; I.portalStep(0, true); lbl.textContent = `Through the mark ${Math.round(v * 100)}%` }
    else {   // after the mark: the settle, replayed from the moment you come through (scrolling at the play-through speed)
      I.pq = I.pqT = 1; I.portalView(); I.portalStep(0, true); I.pt.g.visible = false; avatar.visible = true; I.settleStart(1 / Math.max(.5, L.portalPlay ?? 3.5));   // from the exact moment you come out of the mark
      const T = (v - 1) * 3 * Math.max(.3, L.portalSettle ?? 2.2), n = Math.ceil(T * 60); for (let i = 0; i < n; i++) I.settleStep(T / n); if (!n) I.settleStep(0);
      lbl.textContent = `In to the ship ${Math.round((v - 1) * 100)}%` }
  };
  if (!isOpen('lookPanel')) togglePanel('lookPanel'); $('lookFind').value = 'opening'; findLook();   // the opening's sliders, ready
  return S_;
}
/* the splash's star field: simple twinkling points around the logo, in 3D (they sit nearer and further than it). On the
   splash it's drawn flat on its own canvas; from Start the same stars, in the same places, are 3D points in front of the
   camera that rush past with the logo, then fade a second after you're through it, as the galaxy comes up */
const sStars = (() => {
  // one field of stars in a tunnel ahead of you, depth 0 (here) … ZF (far). Each star sits at a fixed spot on the screen for
  // its depth (lateral = screen spot × depth), so at rest they fill the screen evenly and only twinkle. From Start you rush
  // in, faster and faster (exponentially), each star streaking back along its path; one that passes you comes back far off
  // at a new spot, so the field never clumps
  const n = 900, ZF = 8, r = mulberry32(4242), X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), B = new Float32Array(n), P = new Float32Array(n), F = new Float32Array(n);
  const spawn = (i, z) => { const u = (r() * 2 - 1) * 1.15, v = (r() * 2 - 1) * 1.15; Z[i] = z; X[i] = u * z; Y[i] = v * z };
  for (let i = 0; i < n; i++) { spawn(i, .35 + r() * (ZF - .35)); B[i] = .25 + .75 * Math.pow(r(), 2.2); P[i] = r() * 6.283; F[i] = .6 + r() * 2.4 }
  const S = { k: 1, after: -1, t: 0, run: -1 };
  const bright = (i, t, z) => B[i] * (.62 + .38 * Math.sin(t * F[i] + P[i]) + .9 * Math.pow(Math.max(0, Math.sin(t * F[i] * .37 + P[i] * 3)), 40)) * Math.min(1, (z - .04) / .35) * Math.min(1, (ZF - z) / 1.6);   // a gentle twinkle and, now and then, a sparkle; soft at both ends of the tunnel
  const cv = $('splashStars'), g = cv && cv.getContext('2d');
  const flat = now => {
    if (!g) return; const live = !$('intro').hidden || (intro.active && S.k > 0 && S.after < 1e3); if (!live) { if (cv.width) g.clearRect(0, 0, cv.width, cv.height); requestAnimationFrame(flat); return } const W = cv.clientWidth, H = cv.clientHeight, d = Math.min(2, devicePixelRatio || 1); if (cv.width !== Math.round(W * d)) { cv.width = Math.round(W * d); cv.height = Math.round(H * d) }
    const t = now / 1000, fdt = Math.min(.1, Math.max(0, (now - (S.prevT ?? now)) / 1000)); S.prevT = now; g.setTransform(d, 0, 0, d, 0, 0); g.clearRect(0, 0, W, H);
    let v = $('intro').hidden ? 0 : LOOK.splashDrift ?? .12; if (intro.active && S.run >= 0) { S.run += fdt; v = Math.min(LOOK.splashMaxV ?? 60, (LOOK.splashRush ?? .25) * (Math.exp((LOOK.splashAccel ?? 1.4) * S.run) - 1) + (LOOK.splashDrift ?? .12)) }   // still until Start, then exponentially faster
    const dz = v * fdt, tl = v * (LOOK.splashStreak ?? .12), fk = intro.active ? S.k : 1, hw = W / 2, hh = H / 2, ar = Math.max(1, W / H), am = Math.max(1, H / W); g.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      if (dz) { Z[i] -= dz; if (Z[i] < .04) spawn(i, Z[i] + ZF - .4) }
      const z = Z[i], x = hw + X[i] / z * hw * am, y = hh - Y[i] / z * hh * ar; if (x < -60 || x > W + 60 || y < -60 || y > H + 60) continue;   // (squared up on a portrait or landscape screen)
      const b = bright(i, t, z) * (LOOK.splashStars ?? 1) * fk; if (b < .02) continue; const sz = (.6 + 1.1 * B[i]) * Math.min(2.6, Math.sqrt(2.2 / z));
      const z2 = z + tl, x2 = hw + X[i] / z2 * hw * am, y2 = hh - Y[i] / z2 * hh * ar, L = Math.hypot(x - x2, y - y2), a = Math.min(1, b).toFixed(3);
      if (L > sz) { const gr = g.createLinearGradient(x2, y2, x, y); gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(1, `rgba(255,255,255,${a})`); g.strokeStyle = gr; g.lineWidth = sz; g.beginPath(); g.moveTo(x2, y2); g.lineTo(x, y); g.stroke() }   // the trail thins out behind the star
      else { g.fillStyle = `rgba(255,255,255,${a})`; g.fillRect(x - sz / 2, y - sz / 2, sz, sz) }
    }
    requestAnimationFrame(flat);
  };
  requestAnimationFrame(flat);
  S.update = dt => {   // the fade: a while after you're through the logo
    if (!intro.active) return;
    S.t += dt; if (intro.ph === 2) { if (S.after < 0) S.after = 0; S.after += dt }
    S.k = Math.min(S.lk ?? 1, 1 - sstep(S.after, LOOK.splashStarsHold ?? 1, (LOOK.splashStarsHold ?? 1) + (LOOK.splashStarsFade ?? 1)));
  };
  S.reset = () => { S.after = -1; S.t = 0; S.k = 1; S.lk = 1; S.run = 0; if (cv && cv.parentNode !== document.body) { document.body.appendChild(cv); cv.classList.add('fly') } };   // from Start the canvas leaves the title card and floats over everything
  S.home = () => { S.run = -1; if (cv && cv.parentNode === document.body) { $('intro').prepend(cv); cv.classList.remove('fly') } };
  S.far = () => 0;
  return S;
})();
const curEl = (() => { const e = document.createElement('img'); e.id = 'introCur'; e.alt = ''; e.style.cssText = 'position:fixed;left:0;top:0;z-index:60;pointer-events:none;display:none'; document.body.appendChild(e); return e })();   // the opening's plain mouse pointer
// the pointer looks like a real one (flat black, white rim, no light on it) until it turns into the ship: k = 1 flat, 0 the ship's own metal
const SHIP_MAT0 = { m: SHIP_MAT.black.metalness, r: SHIP_MAT.black.roughness, e: SHIP_MAT.black.envMapIntensity ?? 1, we: SHIP_MAT.white.emissiveIntensity };
function flatPtr(k) { const b = SHIP_MAT.black, w = SHIP_MAT.white, a = 1 - k; b.metalness = SHIP_MAT0.m * a; b.roughness = SHIP_MAT0.r + (1 - SHIP_MAT0.r) * k; b.envMapIntensity = SHIP_MAT0.e * a; w.emissiveIntensity = SHIP_MAT0.we + (1 - SHIP_MAT0.we) * k }
const intro = {
  logoAt: null,
  active: false, t: 0, glow: 0, dur: 8, D0: 10, up0: new V3(), upW: new V3(), ph: 2, lt: 0,
  start(portal = false) {
    this.portal = portal;
    // every time: the ship faces the galaxy's core and the camera's frame is the ship's own, so the opening always looks the same
    aimAt(uniFace().sub(player.pos), 1); player.base.copy(rig.q); player.quat.copy(rig.q); player.vel.set(0, 0, 0);
    camera.fov = LOOK.fov; camera.updateProjectionMatrix(); this.dur = Math.max(1.5, LOOK.introDur ?? 5);
    this.D0 = .503 * SHIP_SC * innerHeight / (2 * Math.tan(LOOK.fov * Math.PI / 360) * 21);   // the arrow about 21 px tall: a real pointer's size
    this.up0.set(Math.sin(ARROW.ax), 0, -Math.cos(ARROW.ax));   // screen-up for a pointer on a screen (its left edge upright), in the ship's frame
    INTRO_END.set(0, rig.dist * (LOOK.camHeight ?? .42), rig.dist).multiplyScalar(LOOK.introDist ?? 1);   /* it lands right where the flight camera sits, so nothing moves on afterwards */ this.lit = false;   // where the opening ends up: close behind the pointer
    this.goal = null; this.av.x = this.av.y = 0;
    document.body.classList.add('opening'); if (!portal) sStars.reset(); this.lshift = 0; this.t = 0; this.glow = 0; this.hud = false; emitGlow = 0; camNear = 0; camNearGo = false; camHold = null; this.active = introActive = true;
    document.body.classList.add('intro'); if (portal) { veil.visible = false; veil.material.opacity = 0 } else { veil.visible = true; veil.material.opacity = 1; this.wipe = true }   // one frame through the black veil, so the warm-up's last picture doesn't linger on the canvas
    if (!portal) { setDpr(.5, true); this.lowDpr = true }   // nothing but black, the pointer and the logo to draw at first: the lowest resolution is plenty
    const wantLogo = !portal && LOOK.logoIntro && this.logoAt && !reduceMotion && (logo3d || (logo3d = makeLogo3d())); if (logo3d) logo3d.visible = false;
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
      logo3d.scale.set(s, s, s * .003); logo3d.visible = true; this.logoStep(0);
    }
  },
  startPortal() {   // the portal opening (see makePortal): from a far view of the whole galaxy, framed by the mark, down to your pointer
    if (!logoShapes() || !(this.pt || (this.pt = makePortal()))) return false;
    $('intro').hidden = true; document.body.classList.remove('splash');
    this.at = null; this.start(true);
    document.body.classList.remove('opening'); this.ptrOn = false; this.ready = !!this.lab; $('plEnter').classList.remove('ready'); $('plEnter').querySelector('span').textContent = 'Loading';   // your own mouse pointer until you start: only then the 3D one takes over
    this.ph = 0; this.pq = this.pqT = 0; this.play = 0; this.pt0 = performance.now(); this.heard = false; this.qv = 0; this.mx = this.my = this.mxs = this.mys = 0;
    this.C0 = player.pos.clone(); camera.clearViewOffset();
    { const f = uniFace().sub(this.C0).normalize();   // the heading you'll fly off with, wherever you start (saved spot or not): straight at the galaxy's core. It's the camera's too, all through the opening: the core sits dead centre behind the mark from the first frame, and never moves
      rig.q.copy(lookAtQ(f, Math.abs(f.dot(GAL_UP)) > .99 ? _ix.set(1, 0, 0) : GAL_UP)); rig.quat.copy(rig.q); player.base.copy(rig.q); player.quat.copy(rig.q) }
    this.pose(0); this.P0 = { p: camera.position.clone(), q: camera.quaternion.clone() };   // where the dive ends: just above the ship, which from there looks exactly like a mouse pointer
    { const qi = this.P0.q.clone().invert(); this.relQ = qi.clone().multiply(player.quat); this.relP = player.pos.clone().sub(this.P0.p).applyQuaternion(qi) }   // the ship as that camera sees it: from now on it IS your pointer, flat, carried in front of the camera
    this.portalView();
    this.pt.g.visible = true; this.portalStep(0);
    const gesture = () => { if (this.heard) return; this.heard = true; setMuted(false); setMusicOff(false); audio() };   // sound needs a click or a key, so the first one starts it
    const go = () => { if (this.lab) { this.lab.toggle(); return } if (!this.ready) return; this.play = 1;   /* (not while it's still loading) */ gesture(); if (!coarse && !lockFailed) requestLock() };
    let down = null;
    const pmv = e => { if (document.pointerLockElement) { this.mx += e.movementX * 2 / innerWidth; this.my -= e.movementY * 2 / innerHeight } else { this.mx = e.clientX / innerWidth * 2 - 1; this.my = -(e.clientY / innerHeight * 2 - 1) } this.mx = Math.max(-1, Math.min(1, this.mx)); this.my = Math.max(-1, Math.min(1, this.my)) };   // the 3D pointer follows your mouse
    const off = e => e.target && e.target.closest && e.target.closest('#lookPanel,#portalLab');   // (the lab's own controls)
    const wheel = e => { if (off(e)) return; e.preventDefault(); if (this.lab) { this.lab.wheel(e); return } if (LOOK.portalEnter) return; this.play = 0; this.pqT = Math.max(0, Math.min(1.1, this.pqT + (e.deltaMode ? e.deltaY * 33 : e.deltaY) * .0006 * (LOOK.portalScroll ?? 1))) };
    const pdown = e => { if (off(e)) return; down = { x: e.clientX, y: e.clientY, y0: e.clientY }; gesture() };
    const pmove = e => { if (!down || e.pointerType === 'mouse' || LOOK.portalEnter) return; this.play = 0; this.pqT = Math.max(0, Math.min(1.1, this.pqT + (down.y - e.clientY) * .0025 * (LOOK.portalScroll ?? 1))); down.y = e.clientY };   // a finger drags it, like scrolling a page
    const pup = e => { if (off(e)) { down = null; return } if (down && Math.abs(e.clientY - down.y0) + Math.abs(e.clientX - down.x) < 8 && (!LOOK.portalEnter || e.target.closest && e.target.closest('#plEnter'))) go(); down = null };   // a click or a tap plays it through (the Enter opening: on its button)
    const key = e => { if (e.target.matches && e.target.matches('input,textarea')) return; if (e.key === ' ' || e.key === 'Enter' || e.key === 'ArrowDown') { e.preventDefault(); go() } else if (e.key === 'ArrowUp' && !LOOK.portalEnter) { this.play = 0; this.pqT = Math.max(0, this.pqT - .1) } else if (e.key === 'Escape' && !this.lab) { gesture(); this.finish() } };
    addEventListener('wheel', wheel, { passive: false }); addEventListener('pointerdown', pdown, true); addEventListener('pointermove', pmove, true); addEventListener('pointermove', pmv, true); addEventListener('pointerup', pup, true); addEventListener('keydown', key, true);
    this.portalOff = () => { removeEventListener('wheel', wheel, { passive: false }); removeEventListener('pointerdown', pdown, true); removeEventListener('pointermove', pmove, true); removeEventListener('pointerup', pup, true); removeEventListener('keydown', key, true); $('portalLoad').hidden = true; this.portalOff = null };
    this.pmvOff = () => { removeEventListener('pointermove', pmv, true); this.pmvOff = null };   // (the mouse still steers the ship a moment past the mark)
    const load = $('portalLoad'); load.hidden = false; this.pf = 0;
    const reveal = () => { if (this.pf < 4 && !this.lab) return requestAnimationFrame(reveal); const dev = GPU && renderer.backend && renderer.backend.device; Promise.race([dev ? dev.queue.onSubmittedWorkDone() : Promise.resolve(), new Promise(r => setTimeout(r, 700))]).then(() => requestAnimationFrame(show), show) };   // (never waiting long on the GPU)   // the black lifts only once the portal view has really been drawn, so no earlier frame ever shows
    const show = () => { this.pt0 = performance.now();   /* (the galaxy's fade in behind the letters starts as it shows) */ load.classList.add('live'); $('plTxt').textContent = coarse ? 'Swipe up to continue' : 'Scroll to continue'; $('plEnter').classList.remove('gone'); $('plTag').classList.remove('gone'); $('plEnter').querySelector('span').textContent = 'Enter'; $('plEnter').classList.add('ready'); this.ready = true }; requestAnimationFrame(reveal);   // scroll, or (the other opening) an Enter button   // the 3D mark is drawn in the same place: the flat one hands over
    if (PORTAL_LAB) this.lab = makePortalLab(this);
    return true;
  },
  fovAt(p) { const L = LOOK, f0 = L.fov, f1 = Math.max(f0, L.portalFov ?? 120); return f0 + (f1 - f0) * Math.pow(1 - Math.max(0, Math.min(1, p)), 1.6) },   // wide while the mark is up, your own by the time you land (p: 0 … 1 over the whole opening)
  setFov(p) { const f = this.fovAt(p); if (Math.abs(camera.fov - f) > 1e-4) { camera.fov = f; camera.updateProjectionMatrix() } },
  portalView() {   // where the dive starts: just behind the ship's spot, looking the way you'll fly (the camera never turns: only its path bends)
    const L = LOOK, R = GAL_R0 + GAL_LEN, D = this.D0 * Math.max(1, L.portalDist ?? 1.25);   // the camera starts just back from where your pointer is pointer-sized: it barely moves
    this.fwd = new V3(0, 0, -1).applyQuaternion(rig.q); this.offE = INTRO_END.clone().normalize().applyQuaternion(rig.q); this.rgt = new V3(1, 0, 0).applyQuaternion(rig.q); this.upv = new V3(0, 1, 0).applyQuaternion(rig.q);
    this.lnPV = Math.log(D); this.lnEnd = Math.log(INTRO_END.length()); this.lnD0 = Math.log(this.D0); this.shR = R;   // lnD0: there the ship looks exactly like a mouse pointer
    this.PV = { p: this.camAt(this.C0, this.lnPV, new V3()), q: rig.q.clone() };
  },
  camAt(A, ln, out) {   // the camera at log distance ln from the point A it closes in on: straight back along the view far off (the core dead ahead), coming round to the flying position (above and behind) at the end
    const bl = 1 - sstep(ln, this.lnEnd, this.lnD0 + 1.4);
    return out.copy(this.fwd).multiplyScalar(-(1 - bl)).addScaledVector(this.offE, bl).normalize().multiplyScalar(Math.exp(ln)).add(A);
  },
  portalStep(dt, lab = false) {
    const L = LOOK, P = this.pt; let crossed = 0; if (!lab) { if (this.play) this.pqT = Math.min(1.1, this.pqT + dt / Math.max(.5, L.portalPlay ?? 3.5));   // (the target runs a little past 1: you come out of the mark still moving, never easing to a stop just short of it)
      const q0 = this.pq; this.pq += (this.pqT - this.pq) * (1 - Math.exp(-dt * 6)); if (dt > 0) this.qv = (this.pq - q0) / dt; if (this.pq >= 1) { crossed = Math.max(1e-6, dt * (this.pq - 1) / Math.max(1e-9, this.pq - q0)); this.pq = 1 } }   // crossed: the part of this frame after you came through   // qv: how fast you're going through right now (it carries on past the mark)
    const q = Math.min(1, this.pq), eL = Math.pow(q, L.portalAccel ?? 2.2), lam = this.lam();
    // the dive, in log distance from the ship's spot: slow, then a rush, then easing out, but never to a stop: it arrives still moving
    // in at a share (lam) of its pace, and that is the speed the camera carries on with past the mark (so nothing jumps there)
    const x = Math.pow(q, L.portalAccel ?? 2.2), eC = (1 - lam) * (1 - (1 - x) * (1 - x)) + lam * q, lnd = this.lnD0 + (this.lnPV - this.lnD0) * (1 - eC);
    this.setFov(.6 * q); this.camAt(this.C0, lnd, camera.position); camera.quaternion.copy(rig.q); camera.updateMatrixWorld();   // it only closes in: the galaxy never turns
    const W = innerWidth, H = innerHeight, th = Math.tan(camera.fov * Math.PI / 360), Z0 = this.D0 * .6, wpx = Math.min(W * (L.portalSize ?? .62), H * 2.2), s = wpx / H * 2 * Z0 * th / 509, dep = (L.portalDepth ?? 200) * s;
    const z = -Z0 + (Z0 + dep * 1.05 + Z0 * .02) * eL;   // the mark comes at you, faster and faster, until you're out of the back of its walls
    P.g.position.set(0, 0, z).applyQuaternion(camera.quaternion).add(camera.position); P.g.quaternion.copy(camera.quaternion); P.g.scale.set(s, -s, dep);
    { const sl = sstep(q, .05, .75); P.inner.position.set(-(254.5 + ((L.portalAimX ?? 244) - 254.5) * sl), -(74.5 + ((L.portalAimY ?? 38) - 74.5) * sl), 0) }   // the mark sits centred, and as it comes at you it slides so you go through the gap (the galaxy never moves)
    const up = sstep((performance.now() - this.pt0) / 1000, 0, Math.max(.01, L.portalFadeIn ?? 1.4)), tint = L.portalTint ?? 0;   // the galaxy fades up behind the letters (under any tint)
    P.fillMat.opacity = Math.max(1 - up, tint * .85); P.fillMat.color.setHSL(L.portalTintHue ?? .7, .7, .45 * up);
    const oa = L.portalOpenAt ?? 1; P.wallMat.opacity = (L.portalSurround ?? 1) * (1 - (L.portalWallpaper ?? 0)) * (oa >= 1 ? 1 : 1 - sstep(q, oa, Math.max(oa + .01, L.portalOpenEnd ?? 1)));   // (portalWallpaper: the wallpaper sky shows round the mark)   // round the letters the black stays (or goes, as you close in, if you set it to)
    { const tr = P.wallMat.opacity < .999; if (tr !== P.wallMat.transparent) { P.wallMat.transparent = tr; P.wallMat.needsUpdate = true } }   // solid, it draws before your pointer, so the pointer is never hidden behind it
    P.rimMat.color.setHSL(L.portalRimHue ?? .72, L.portalRimSat ?? 0, .5).multiplyScalar(2 * (L.portalRim ?? 1.08)); P.rimAt(Math.round((L.portalStroke ?? 1.5) * 509 / wpx * 20) / 20, L.portalRimW ?? 6);   // the stroke in screen px
    { const sp = (L.portalStroke ?? 1.5) + 'px'; if (sp !== this.plsW) { this.plsW = sp; document.documentElement.style.setProperty('--pls', sp) } }   // (the loading outline's stroke, the same width)
    { const line = !!L.portalLine; P.wallM.visible = P.fill.visible = !line; P.sides.visible = !line && !L.portal2D }   // the switch: only the white stroke and its glow
    P.sideMat.roughness = L.portalWallRough ?? .59; P.sideMat.metalness = L.portalWallMetal ?? 1; P.sideMat.color.setHSL(L.portalWallHue ?? .7, L.portalWallSat ?? .3, L.portalWallBright ?? .012);
    { const fc = L.portalFace ?? 0, rs = .006 * (L.portalScuffScale ?? 1); P.wallMat.roughness = P.sideMat.roughness; P.wallMat.metalness = (L.portalWallMetal ?? 1) * fc; P.wallMat.color.setHSL(L.portalWallHue ?? .7, L.portalWallSat ?? .3, (L.portalFaceBright ?? .06) * fc);   // the face: the same worn metal as the walls
      P.wallMat.bumpScale = P.sideMat.bumpScale = .35 * (L.portalScuff ?? 1); P.maps.forEach(t => t.repeat.set(rs, rs));
      P.wallBasic.opacity = P.wallMat.opacity; if (P.wallBasic.transparent !== P.wallMat.transparent) { P.wallBasic.transparent = P.wallMat.transparent; P.wallBasic.needsUpdate = true } P.wallM.material = fc > .001 ? P.wallMat : P.wallBasic }
    const en = !!LOOK.portalEnter; $('plTxt').hidden = en || !this.ready; $('plEnter').hidden = !en && this.ready;   // (the button is the loading bar either way; scrolling, it gives way to the hint once loaded)
    { const pw = Math.round(wpx) + 'px'; if (pw !== this.pwS) { this.pwS = pw; document.documentElement.style.setProperty('--pw', pw) } }   // the flat outline and the tagline stay exactly on the 3D mark   // (the opening's Enter switch can be flipped right here)
    $('plTxt').classList.toggle('gone', q > .03); $('plTag').classList.toggle('gone', q > .03); $('plEnter').classList.toggle('gone', q > .01 || this.play > 0);
    // the pointer: the 3D ship, flat, right under your mouse. In the last stretch it starts to come closer, at exactly the pace the
    // camera will carry on closing in at, so past the mark it just keeps growing the same way (G: the rest of a smoothstep's area)
    { const f = Math.min(1, dt * 14 || 1); this.mxs += (this.mx - this.mxs) * f; this.mys += (this.my - this.mys) * f;
      const qa = .9, tt = Math.max(0, Math.min(1, (q - qa) / (1 - qa))), G = (1 - qa) * (.5 - tt * tt * tt + tt * tt * tt * tt / 2), ty = Math.tan(camera.fov * Math.PI / 360), dp = Math.exp(this.lnD0 + lam * (this.lnPV - this.lnD0) * G) * Math.tan(LOOK.fov * Math.PI / 360) / ty;   // (with the wide lens it sits nearer, so it stays exactly pointer-sized)
      avatar.position.set(this.mxs * ty * camera.aspect * dp, this.mys * ty * dp, -dp).applyQuaternion(camera.quaternion).add(camera.position); avatar.quaternion.copy(camera.quaternion).multiply(this.relQ); avatar.renderOrder = 5;
      flatPtr(1); const on = this.play > 0 || this.pq > .002 || lab; if (on !== this.ptrOn) { this.ptrOn = on; document.body.classList.toggle('opening', on) } avatar.visible = on }   // the 3D pointer only from Start (or the first scroll), right where your mouse is
    if (crossed && !lab) { P.g.visible = false; this.portalOff && this.portalOff(); this.settleStart(this.qv); this.settleStep(crossed) }   // (and that part of the frame is already the settle: no hitch)   // out the other side: the camera carries on, in to the ship
  },
  lam() { return Math.max(.02, Math.min(.9, LOOK.portalCarry ?? .45)) },
  // after the mark, one movement: the camera carries on closing in at the speed it came through with and settles (springs, no
  // fixed timing) into the flying position behind the ship, swinging round from straight above as it slows. The ship keeps
  // following your mouse at first and lets go of it gradually, coming to rest wherever it ends up; the point the camera works
  // round (A) slides from where you came through over to the ship. sx: log of the camera's distance, sa: its angle from overhead
  settleStart(qv) {
    const L = LOOK, b = _ib.copy(INTRO_END).normalize();
    this.ph = 3; this.st = 0; this.reflGo = false; this.S = avatar.position.clone(); this.A = this.C0.clone(); avatar.renderOrder = 0; this.Qf = avatar.quaternion.clone();   // Qf: the pointer as it came through, flat to you
    this.sx = this.lnD0; this.sa = 0; this.saEnd = Math.acos(b.y); this.sxEnd = Math.log(INTRO_END.length());
    this.svx = Math.max(-6, -this.lam() * (this.lnPV - this.lnD0) * Math.max(qv, .02)); this.sva = 0; this.lit = false; this.hud = false;   // exactly the dive's pace as it arrived
    const gap = Math.max(1e-3, this.sx - this.sxEnd); this.sw = Math.max(1.1, Math.min(6, -this.svx / gap));   // its pace: the one at which that speed coasts to a stop right behind the ship (x = gap·e^(−wt): no push, only slowing)
  },
  settleStep(dt) {   // the camera keeps its heading; it closes in (a spring that only slows) on the point A, which slides over to wherever the ship is
    const L = LOOK, w = this.sw * 2.2 / Math.max(.3, L.portalSettle ?? 2.2), n = Math.max(1, Math.ceil(dt * 120));
    for (let i = 0; i < n; i++) { const s = dt / n; this.svx += (w * w * (this.sxEnd - this.sx) - 2 * w * this.svx) * s; this.sx += this.svx * s }
    this.st += dt; const u = Math.max(0, Math.min(1, (this.lnD0 - this.sx) / Math.max(1e-6, this.lnD0 - this.sxEnd)));   // how far in it has come
    this.A.copy(this.S).sub(this.C0).multiplyScalar(sstep(u, .05, 1)).add(this.C0);
    this.setFov(.6 + .4 * u); this.camAt(this.A, this.sx, camera.position); camera.quaternion.copy(rig.q); camera.updateMatrixWorld();
    // the ship: under your (smoothed) mouse, letting go of it gradually all the way in, only still once the camera has landed; and it turns from the flat pointer to show you its back
    const g = Math.pow(1 - u, Math.max(.2, L.portalLetGo ?? 1.4));
    if (g > 1e-4) { const f = Math.min(1, dt * 14 || 1) * g; this.mxs += (this.mx - this.mxs) * f; this.mys += (this.my - this.mys) * f;
      const qi = _q.copy(camera.quaternion).invert(), dz = -_ia.copy(this.S).sub(camera.position).applyQuaternion(qi).z, ty = Math.tan(camera.fov * Math.PI / 360);
      if (dz > 1e-6) { const tgt = _ib.set(this.mxs * ty * camera.aspect * dz, this.mys * ty * dz, -dz).applyQuaternion(camera.quaternion).add(camera.position), al = 1 - Math.pow(1 - g, Math.max(dt, 0) * 60); this.S.lerp(tgt, al) } }
    player.pos.copy(this.S); avatar.position.copy(this.S); avatar.quaternion.copy(this.Qf).slerp(player.quat, sstep(u, .05, .85)); flatPtr(1 - sstep(u, .05, .85));   // the pointer becomes the ship as it turns
    emitGlow = quint(sstep(u, .55, .95));
    if (!this.lit && u > .8) { this.lit = true; if (!this.lab) { igniteK = 1; engineLook.burst = 1.5 } }   // ignition as it comes in behind
    if (u > .7) this.reflGo = true;   // the ship's reflections start fading in (over two seconds: about the rest of the move)
    if (!this.hud && u > .7 && !this.lab) { this.hud = true; document.body.classList.remove('intro'); flickIn(1.2) }
    return g < .01 && Math.abs(this.sx - this.sxEnd) < .02 && Math.abs(this.svx) < .05;   // close enough: the flying camera takes over from exactly here
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
    const z = -G.Z0 + (G.Z0 + G.dz * 1.6 + G.Z0 * .02) * e, c = sstep(e, 0, .8), W = innerWidth, H = innerHeight, th = Math.tan(camera.fov * Math.PI / 360), dx = 0, dy = 0;   /* (no frame shift to undo: see update) */
    logo3d.position.set(G.x0 * (1 - c) - dx / W * 2 * th * W / H * -z, G.y0 * (1 - c) + dy / H * 2 * th * -z, z).applyQuaternion(camera.quaternion).add(camera.position); logo3d.quaternion.copy(camera.quaternion);   // undo the frame shift that keeps the pointer under the mouse: the logo stays put
    const ext = Math.max(.003, sstep(q, 0, Math.max(.02, LOOK.logoExtrude ?? .35))), dzNow = G.dz * ext; logo3d.scale.z = G.s * (LOOK.logoDepth ?? .12) * ext;   // it starts flat, as on the splash, and extrudes back away from you
    sStars.lk = 1 - sstep(z, 0, Math.max(1e-6, dzNow));   // the stars are gone by the time you come out of the back of it
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
    sStars.update(dt);
    avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat); avatar.visible = this.ph >= 2; avatar.userData.flame.material.opacity = 0;
    if (this.lab) { this.lab.step(dt); return }   // the portal lab: the scrubber drives it
    if (this.at && this.goal && dt > 0) {   // elastic: a soft spring with a touch of overshoot, so any flick of the mouse reads as one smooth swing
      const K = 90 * (LOOK.introSpring ?? 1), C = 2 * Math.sqrt(K) * .78, h = Math.min(dt, 1 / 30);
      for (const a of ['x', 'y']) { this.av[a] += ((this.goal[a] - this.at[a]) * K - this.av[a] * C) * h; this.at[a] += this.av[a] * h }
    }
    if (this.curHide) { this.placeCur(); if (--this.curHide <= 0) { this.curHide = 0; curEl.style.display = 'none' } }   /* (still following the mouse, so it can't be left behind where the ship was) */
    if (this.ph === 0) { this.portalStep(dt); return }
    if (this.ph === 3) { if (this.settleStep(dt)) { this.settled = true; this.ph = 2; this.finish() } return }
    if (this.ph === 1) { this.pose(0); camera.clearViewOffset(); camera.updateMatrixWorld(); this.placeCur(); this.logoStep(dt); return }   // through the logo the view is dead on: the vanishing point in the middle of the screen
    if (this.t < 1) this.t = Math.min(1, this.t + dt / (reduceMotion ? 2.5 : this.dur));
    this.pose(this.t);
    const dur = reduceMotion ? 2.5 : this.dur, on = 1 - 1 / dur;   // engine and instruments are fully on a second before the camera lands
    if (this.lowDpr) { this.lowDpr = false; setDpr(Math.min(LOOK.maxDpr, devicePixelRatio || 1), true) }   // full resolution back just before the galaxy shows
    veil.material.opacity = 1 - sstep(this.t * dur, LOOK.introRevealAt ?? 1, (LOOK.introRevealAt ?? 1) + (LOOK.introReveal ?? .6));   /* through the logo, the galaxy is right there */ veil.scale.setScalar(camera.position.distanceTo(player.pos) + .45);
    emitGlow = quint(sstep(this.t, on - .26, on));
    if (!this.lit && this.t >= on - .2) { this.lit = true; igniteK = 1; engineLook.burst = 1.5 }   // ignition: a big bloom that settles, as the engine lights in the last of the swing
    if (this.t >= on - .22 && !this.hud) { this.hud = true; document.body.classList.remove('intro'); flickIn(Math.max(.3, (on - this.t) * dur)) }   // and the instruments flicker in, all landed by then
    if (!booted && this.t >= 1) { introActive = false; handOver() }   // yours to fly only once it has landed, so nothing jumps at the end
    if (this.t >= 1) this.finish();   // landed exactly where the flight camera sits: nothing left to jump
  },
  finish() {
    if (this.pt) this.pt.g.visible = false; this.portalOff && this.portalOff(); this.pmvOff && this.pmvOff();
    if (logo3d) logo3d.visible = false; curEl.style.display = 'none'; this.ph = 2; if (this.lowDpr) { this.lowDpr = false; setDpr(Math.min(LOOK.maxDpr, devicePixelRatio || 1), true) }
    document.body.classList.remove('opening'); flatPtr(0); if (!this.active) return; this.active = introActive = false; veil.visible = false; emitGlow = 1; camera.clearViewOffset(); this.at = null;
    if (this.settled) camRel.copy(camera.position).sub(player.pos).applyQuaternion(_q.copy(rig.q).invert()); else camRel.copy(INTRO_END); camRelV.set(0, 0, 0); this.settled = false; fovS = camera.fov;   /* after the portal's settle: from exactly where the camera is, so the hand-over can't jump */ /* (the lens carries on from where the opening left it) */ camHold = { from: player.pos.clone(), dir: INTRO_END.clone().normalize(), d0: INTRO_END.length() }; if (!this.hud) { document.body.classList.remove('intro'); flickIn() } if (!booted) handOver();
  },
};
// the instruments fade in together as the opening ends
function flickIn(within = 1.8) {   // fully on within this many seconds
  document.querySelectorAll('.hud:not([hidden]), #labels').forEach(e => { e.style.setProperty('--fd', (within * .8).toFixed(2) + 's'); e.style.setProperty('--fdl', '0s'); e.classList.remove('flk-go'); void e.offsetWidth; e.classList.add('flk-go') });
  setTimeout(() => document.querySelectorAll('.flk-go').forEach(e => e.classList.remove('flk-go')), within * 1000 + 300);
}
function handOver() { booted = true; updateLockUI(); region = null; lastInput = performance.now(); coach.start() }

// restore the ship where it was last parked, facing the core otherwise
{ const k = uniHomeK(); if (k !== UNI.k) uni.rebase(k); uniHome(player.pos) }   // start where the layout says (in the middle of them all): the nearest galaxy is the one built in full
aimAt(uniFace().sub(player.pos), 1); player.base.copy(rig.q); player.quat.copy(rig.q);
{ const sv = store.json('sotd-ship'); if (sv && sv.p && sv.p.every(Number.isFinite)) { if (Number.isInteger(sv.g) && sv.g !== UNI.k) uni.rebase(sv.g); player.pos.fromArray(sv.p); player.base.fromArray(sv.q); player.quat.copy(player.base); rig.q.fromArray(sv.r) } }
camera.position.copy(player.pos).add(new V3(0, .3, 1));
recolor(); applyFilter(); refreshLabels(); renderLook(); applyLook(); uni.galLook(); updateLockUI(); Net.connect(); resize();
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
/* the special opening (a test, from its own button on the splash): the FWA mark as a block of holographic glass with
   a field of stars sealed inside it, bending the stars behind it like a lens. It holds where the splash logo was, then
   you rush at it, into the top of the W's middle; everything goes black, and the galaxy is simply there */
const specialIntro = (() => {
  let run = null;
  function build() {
    const svg = document.querySelector('#logo svg'), path = new SVGLoader().parse(svg.outerHTML).paths[0], shapes = SVGLoader.createShapes(path), D = 509, H = 149, DEP = LOOK.spDepth ?? 46;
    const geo = new THREE.ExtrudeGeometry(shapes, { depth: DEP, bevelEnabled: true, bevelThickness: 3, bevelSize: 2.2, bevelSegments: 3, curveSegments: 12 }); geo.translate(-D / 2, -H / 2, -DEP / 2); geo.scale(1, -1, 1); geo.computeVertexNormals();
    const scn = new THREE.Scene(), t = uniform(0), refr = uniform(LOOK.spRefr ?? 1);
    // glass: what's behind (the sealed stars, the sky) bent toward the edges and split into colours, a thin-film sheen that runs with the angle, bright rims
    const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
    m.colorNode = Fn(() => {
      const n = normalize(normalView), v = normalize(positionView.negate()), fr = float(1).sub(abs(dot(n, v))), pl = positionLocal;
      const off = n.xy.mul(refr.mul(.07)).mul(fr.mul(.85).add(.15)), ca = off.mul(.4);
      const bg = vec3(viewportSharedTexture(screenUV.add(off.add(ca))).r, viewportSharedTexture(screenUV.add(off)).g, viewportSharedTexture(screenUV.add(off.sub(ca))).b);
      const fh = fract(fr.mul(2.6).add(pl.x.mul(.004)).add(pl.y.mul(.006)).add(t.mul(.05))), film = clamp(abs(fract(vec3(fh).add(vec3(0, .667, .333))).mul(6).sub(3)).sub(1), 0, 1);
      const glint = pow(max(noise3(pl.mul(.05).add(vec3(t.mul(.3), t.mul(-.2), 0))), 0), 18).mul(30).mul(fr);
      const col = bg.mul(1.1).add(film.mul(pow(fr, 1.2)).mul(.55)).add(vec3(1).mul(pow(fr, 6).mul(1.1).add(glint))).add(vec3(.5, .55, .7).mul(.05));
      return vec4(col, clamp(fr.mul(.55).add(.38), 0, 1));
    })();
    const logo = new THREE.Mesh(geo, m); logo.renderOrder = 2; scn.add(logo);
    // the stars sealed inside: points scattered through the letters' volume (tested against the mark drawn flat)
    const cv = document.createElement('canvas'); cv.width = D; cv.height = H; const g = cv.getContext('2d'); g.fillStyle = '#fff'; svg.querySelectorAll('path').forEach(pth => g.fill(new Path2D(pth.getAttribute('d')))); const px = g.getImageData(0, 0, D, H).data;
    const rnd = mulberry32(77), N_IN = LOOK.spStars ?? 2600, N_BG = 1400, quad = new THREE.PlaneGeometry(1, 1);
    const mkStars = (n, place) => { const sm = new THREE.MeshBasicMaterial({ map: softDot, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }), im = new THREE.InstancedMesh(quad, sm, n), M4 = new THREE.Matrix4(), c = new C3(), p = new V3();
      im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); for (let i = 0; i < n; i++) { const sz = place(p, c); M4.makeScale(sz, sz, sz).setPosition(p); im.setMatrixAt(i, M4); im.setColorAt(i, c) } im.frustumCulled = false; return im };
    const inside = mkStars(N_IN, (p, c) => { let x, y; for (let k = 0; k < 60; k++) { x = rnd() * D; y = rnd() * H; if (px[((y | 0) * D + (x | 0)) * 4 + 3] > 128) break } p.set(x - D / 2, H / 2 - y, (rnd() - .5) * DEP * .9); const b = .35 + .65 * Math.pow(rnd(), 2.5), hue = rnd(); c.setHSL(.55 + hue * .35, .5 * rnd(), .6).multiplyScalar(b * 2.2); return 1 + 2.8 * Math.pow(rnd(), 3) });
    inside.renderOrder = 1; scn.add(inside);
    const back = mkStars(N_BG, (p, c) => { const z = -300 - rnd() * 2600, r = Math.sqrt(rnd()) * (900 + -z * .9), a = rnd() * 6.283; p.set(Math.cos(a) * r, Math.sin(a) * r * .7, z); c.setScalar(.25 + .75 * Math.pow(rnd(), 3)); return 2 + 3 * rnd() });   // the sky behind it, for the glass to bend
    back.renderOrder = 0; scn.add(back);
    return { scn, logo, inside, back, t, D, H, DEP, geo, mats: [m, inside.material, back.material] };
  }
  function start(withSound) {
    const B = build(), cam = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .5, 20000), W = innerWidth, Hh = innerHeight, th = Math.tan(20 * Math.PI / 180);
    const mk = document.querySelector('#intro .mark'), r0 = mk && mk.getBoundingClientRect(), w = r0 && r0.width ? r0.width : Math.min(240, W * .5), cx = r0 && r0.width ? r0.left + r0.width / 2 : W / 2, cy = r0 && r0.width ? r0.top + r0.height / 2 : Hh * .42;
    const Z0 = 600, s = w / Hh * 2 * Z0 * th / B.D;   // the glass mark sits exactly where the splash logo was
    B.logo.scale.setScalar(s); B.inside.scale.setScalar(s); B.logo.position.set((cx / W * 2 - 1) * th * W / Hh * Z0, (1 - cy / Hh * 2) * th * Z0, -Z0); B.inside.position.copy(B.logo.position);
    const tgt = new V3(244 - B.D / 2, B.H / 2 - 34, B.DEP * .5 + 3).multiplyScalar(s).add(B.logo.position);   // the top of the W's middle, on the front face
    const black = document.createElement('div'); black.id = 'spBlack'; document.body.appendChild(black); const fade = document.createElement('div'); fade.id = 'spFade'; document.body.appendChild(fade);
    if (withSound) { setMuted(false); setMusicOff(false); audio() }
    black.hidden = true; const go = () => { black.hidden = false; $('intro').hidden = true; document.body.classList.remove('splash'); document.body.classList.add('intro', 'opening') };   // the splash stays up while the glass compiles
    setDpr(Math.min(LOOK.maxDpr, devicePixelRatio || 1), true);
    const hold = LOOK.spHold ?? .9, fly = Math.max(.8, LOOK.spFly ?? 2.6), from = new V3(0, 0, 0), look = new V3();
    run = { B, cam, done: false }; let t0 = -1;
    const step = () => {
      if (!run || run.done) return; if (t0 < 0) t0 = performance.now(); const T = TEST_EARLY || QS.has('sptime') ? window.__spT ?? 0 : (performance.now() - t0) / 1000;   /* (?sptime: a test sets the clock) */ B.t.value = T;   /* the clock starts with the first frame actually drawn */
      const q = Math.max(0, Math.min(1, (T - hold) / fly)), k = LOOK.spAccel ?? 4.5, e = (Math.exp(k * q) - 1) / (Math.exp(k) - 1);   // still, then faster and faster (exponentially) into the glass
      cam.position.lerpVectors(from, tgt, e); cam.position.z = from.z + (tgt.z - B.DEP * .3 * s - from.z) * e;   /* ending inside the glass */ look.copy(tgt).lerp(B.logo.position, 0).setZ(tgt.z - 200); cam.quaternion.identity();   /* always straight ahead: dead on, the vanishing point in the middle */
      cam.updateMatrixWorld(); shipRenderer.render(B.scn, cam);
      fade.style.opacity = sstep(e, .86, .995).toFixed(3);   // the last moment, inside the glass: everything goes black
      if (q >= 1) { run.done = true; finish(); return } requestAnimationFrame(step);
    };
    B.logo.updateMatrixWorld(); cam.updateMatrixWorld();
    (shipRenderer.compileAsync ? shipRenderer.compileAsync(B.scn, cam).catch(() => { }) : Promise.resolve()).then(() => { go(); shipRenderer.render(B.scn, cam); requestAnimationFrame(() => requestAnimationFrame(step)) });   // shaders ready before the clock runs
    function finish() {   // black: the galaxy is right there, at the ship, as the usual opening ends
      B.geo.dispose(); B.mats.forEach(x => x.dispose()); shipRenderer.clear(); black.remove(); run = null;
      intro.at = null; intro.logoAt = null; intro.start(); intro.finish();
      const at = LOOK.spRevealAt ?? .3, dur = LOOK.spReveal ?? 1.2; fade.style.transition = `opacity ${dur}s ease ${at}s`; requestAnimationFrame(() => { fade.style.opacity = '0'; setTimeout(() => fade.remove(), (at + dur) * 1000 + 100) });
    }
  }
  return { start, get on() { return !!run } };
})();
function beginSpecial(withSound) {
  logoShapes(); if (!coarse && !lockFailed && !TEST) requestLock();
  specialIntro.start(withSound);
}
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
if (TEST) { $('intro').hidden = true; document.body.classList.remove('intro'); LOOK.adaptive = 0; handOver(); if (BH_LAB) bhLab.start() }
else if (BH_LAB) { document.documentElement.classList.remove('portal'); $('portalLoad').hidden = true; $('intro').hidden = true; document.body.classList.remove('intro', 'splash'); booted = true; updateLockUI(); region = null; lastInput = performance.now(); bhLab.start() }   // the black hole lab: straight into the fall
else {
  const portalOn = document.documentElement.classList.contains('portal') && ((LOOK.portalIntro ?? 1) || PORTAL_LAB) && intro.startPortal(); if (!portalOn) { document.documentElement.classList.remove('portal'); $('portalLoad').hidden = true }   // the portal opening, or the old splash with its Start button
  const enter = $('enter'); if (window.__introProgress) window.__introProgress(1); else document.body.classList.add('ready');   // the ring opens Start when it closes
  enter.onclick = e => begin(true, e); $('enterQuiet').onclick = e => { setMuted(true); setMusicOff(true); begin(false, e) };
  if (!portalOn) addEventListener('keydown', function k(e) { if ($('intro').classList.contains('gone')) return removeEventListener('keydown', k); if (e.target.closest && e.target.closest('#intro button')) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeEventListener('keydown', k); begin(true) } });
}
/* the ship back to where it starts, at once: still, facing the core, no trail behind it */
function toSpawn() {
  if (S.mode !== 'fly') { setMode('fly'); tween = null }
  warp = null; auto = null; lockI = -1; stopTour(); sparks.stop(); uni.rebase(uniHomeK()); uniHome(player.pos); player.vel.set(0, 0, 0); player.cruise = 0;
  aimAt(uniFace().sub(player.pos), 1); rig.quat.copy(rig.q); player.base.copy(rig.q); player.quat.copy(rig.q); strands.length = 0; curStrand = null; camRelV.set(0, 0, 0); camHold = null;
}
/* back to the splash, to record the opening again: everything closes, the title card and Start come back */
function toSplash() {
  if (isOpen('lookPanel') || isOpen('panel')) togglePanel(''); rmenu.close(); if (document.pointerLockElement) document.exitPointerLock();
  if (S.mode !== 'fly') { setMode('fly'); tween = null }
  if (intro.active) intro.finish(); toSpawn(); player.vel.set(0, 0, 0); lockI = -1; auto = null; warp = null; sparks.stop(); coach.end && coach.i >= 0 && coach.end();
  if (document.documentElement.classList.contains('portal')) { const pl = $('portalLoad'); pl.classList.remove('live'); $('plTxt').classList.remove('gone'); intro.startPortal(); return }   // the portal opening again, from the top
  sStars.home(); const el = $('intro'); el.hidden = false; el.classList.remove('gone'); document.body.classList.add('intro', 'ready', 'splash');
  const enter = $('enter'); enter.onclick = e => begin(true, e); $('enterQuiet').onclick = e => { setMuted(true); setMusicOff(true); begin(false, e) };
}
let vt = performance.now();
if (!TEST) requestAnimationFrame(t => { last = t; loop(t) });
else last = vt;
window.__ready = true;
window.__sky = { gwarp, openLab: () => galLab.open(), closeLab: () => galLab.close(), labCopy: () => galLab.copyText(), uni, gplay, UNI, uniAt, worldToUni, uniToWorld, GAL_UP, get LOOK_PLAY() { return LOOK_PLAY }, get GYEAR() { return GYEAR }, fall, embers, bhLab, rec, specialIntro, flags, flagDlg, say, portal, phone, togglePanel, sing, paperPics, shipScene, collect: i => collect(i), get camHold() { return camHold }, get camRel() { return camRel }, warpOn: () => !!warp, holdCam: () => { INTRO_END.set(0, rig.dist * (LOOK.camHeight ?? .42), rig.dist).multiplyScalar(LOOK.introDist ?? 1); camRel.copy(INTRO_END); camRelV.set(0, 0, 0); updateCamera(0); camHold = { from: player.pos.clone(), dir: INTRO_END.clone().normalize(), d0: INTRO_END.length() } }, ascent, sparks, whiteout, dustK: () => [dustHissK, streakDens, sstep(player.vel.length(), 150, 4000) * Math.min(1, streakDens * 1.5)], slowmo, mapZone, mouse,  HALOS: () => HALO.live, starR, hazeVis: v => haze.mesh.visible = v, softVis: v => softScene.children.forEach(o => { if (o.isMesh || o.isSprite || o.isGroup) o.visible = v }), starsVis: v => stars.mesh.visible = v, tickOnly(dtMs = 16.7) { vt += dtMs; tick(vt) }, lockI: () => lockI, applyFilter, matchCount: () => matchCount, avatar, outpost, ringPoint, stopR, aimAt, GQ, toLocal, async run(n = 1, dtMs = 16.7) { for (let i = 0; i < n; i++) { vt += dtMs; tick(vt) } await new Promise(r => requestAnimationFrame(r)); vt += dtMs; tick(vt); if (GPU) await renderer.backend.device.queue.onSubmittedWorkDone(); await new Promise(r => requestAnimationFrame(r)) }, keys, regionOf, setDpr, THREE, get LOOK() { return LOOK }, player, rig, camera, renderer, perf, S, setMode, focus, applyLook, D, P, GC, starPos, get GPU() { return GPU }, intro, pipeline, U, PU, orbit, zoom, rotateRig, mapHover, ringAt, ringZoom, mapLvl, get mapYrs() { return mapYrs }, ruler, timeRings, bh, BH, setBH, armPhase, nearest, get nearI() { return nearI }, get contact() { return contactK }, avatarTail: () => avatar.userData.tail, tip, get hovI() { return hovI }, updateHover, get ringHov() { return ringHov }, coach, runBench, bench, peerUpdate, Net, showCard, SATS, flyTo, navStep, GOT, setShip, CURSORS, HALO, get gotN() { return gotN }, startTour, TOURS, get tour() { return tour }, get warp() { return warp }, rmenu };
