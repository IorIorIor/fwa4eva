/* ───────────────────────── the game: fly through the rings ─────────────────────────
   With "rings" on every winner is a ring the size of its star. Fly through one and it's collected: it turns warm white
   and glows, you lose a little speed, a chime rings and its record opens for a few seconds. Collected winners are kept in
   this browser; the count sits at the top. */
const introK = () => intro.active ? (intro.ph === 1 ? 0 : sstep(intro.t, .05, .35)) : 1;   // in the opening the rings stay away until the logo is gone, then fade in
const ringHide = new Map(); let ringPop = 0, ringIn = -1, gotCard = { i: -1, t: 0 }, gotN = 0;
for (let i = 0; i < N; i++) gotN += GOT[i];
function ringCheck(p) {   // called by the flight after it moves you: you get a ring when you cross its plane inside it
  if (LOOK.ringPlay) return;
  for (const h of HALO.live) {
    if (h.done || !h.nSet) continue; const s = _rk.copy(p.pos).sub(h.c).dot(h.n);
    if (h.sPrev > 0 && s <= 0 && _rk.copy(p.pos).sub(h.c).addScaledVector(h.n, -s).length() < h.r * 1.02) ringHit(h);
    h.sPrev = s;
  }
}
const _rk = new V3();
function ringHit(h) {   // through the plane: it's yours, and time starts back up from here
  whiteout.hit();
  slowmo.after = 0; ringIn = h.i; HALO.pop(h);
  h.done = true; collect(h.i);
}
/* the whiteout: closing in on a ring a bloom of white swells from it until the whole screen is white; through it, the
   white clears quickly (in real time, whatever bullet time is doing) */
const whiteout = (() => {
  const el = document.createElement('div'); el.id = 'whiteout'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el);
  const W = { lv: 0, near: 0, at: new V3(), out: 0, k: 0, kv: 0, fv: 0, fov: 0 }, _p = new V3();
  W.vt = -1; W.hit = () => { W.out = 1; W.fv = 1; W.vt = 0 };
  W.update = rdt => {
    const L = LOOK, amt = L.ringFlash ?? 1, inK = Math.pow(W.near, 1.6); W.near = 0;
    if (W.out > 0) W.out = Math.max(0, W.out - rdt / Math.max(.05, L.ringFlashOut ?? .35));
    if (W.fv > 0) W.fv = Math.max(0, W.fv - rdt / Math.max(.05, L.ringHitFovTime ?? .6)); W.fov = (L.ringHitFov ?? 50) * Math.pow(W.fv, 2.2);   // through: the lens stretches wide at once, then eases back
    const b = S.mode === 'fly' ? Math.max(inK, W.out * W.out * (3 - 2 * W.out)) : 0; W.k = b;   // b drives the exposure and glow (their own sliders); the white veil is b × its amount
    let v = 0; if (W.vt >= 0) { W.vt += rdt; const h = L.ringVeilHold ?? .15, o = Math.max(.05, L.ringVeilOut ?? 1.2); v = W.vt < h ? 1 : Math.pow(Math.max(0, 1 - (W.vt - h) / o), L.ringVeilEase ?? 2); if (W.vt > h + o) W.vt = -1; v *= S.mode === 'fly' ? (L.ringVeil ?? 1) : 0 }   // through: one big white veil over the screen that holds, then fades out
    W.lv = v; W.k = Math.max(b, v * (L.ringVeilBloom ?? 0));   // the veil is levels on the whole frame (see the grade), not a sheet laid over it
    const k = b * amt; if (Math.abs(k - W.kv) < .002 && k !== 0) return; W.kv = k;
    if (k <= .002) { el.style.opacity = 0; return }
    _p.copy(W.at).project(camera); const x = ((_p.x * .5 + .5) * 100).toFixed(1), y = ((-_p.y * .5 + .5) * 100).toFixed(1), r = (20 + 140 * k).toFixed(0);
    el.style.background = `radial-gradient(circle at ${x}% ${y}%, #fff 0, #fff ${(r * .35).toFixed(0)}vmax, rgba(255,255,255,${Math.min(1, k * 1.4).toFixed(3)}) ${r}vmax), rgba(255,255,255,${Math.pow(k, 2.2).toFixed(3)})`;
    el.style.opacity = Math.min(1, k * 1.25).toFixed(3);
  };
  return W;
})();
/* the sparks a ring bursts into: white points flung out from its middle, slowing as they go, twinkling out. All on the
   GPU: each has a direction and a speed, and the shader places it by the burst's age (game time, so bullet time slows them too) */
const _cd = new V3();
const sparks = (() => {
  /* the comet: through a ring, white light trails are born just in front of the ship's tip and stream back past it, spreading
     as they go, like a comet's tail. Each trail lives in the ship's frame as it was at its birth (so it follows the ship but
     lags when you turn), measured in camera distances so it looks the same at any speed. Drawn as glowing ribbons from head
     to tail, worked out on the CPU */
  const n = 360, rn = new Float32Array(n * 4), r = mulberry32(77);
  for (let i = 0; i < n; i++) rn.set([r() * 6.2832, Math.sqrt(r()), r(), r()], i * 4);   // angle round the axis, radius (even over a disc), speed, twinkle
  const g = new THREE.InstancedBufferGeometry(); g.index = QUAD.index; g.setAttribute('position', QUAD.attributes.position); g.setAttribute('uv', QUAD.attributes.uv);
  const pa = new Float32Array(n * 3), pb = new Float32Array(n * 3), fa = new Float32Array(n), sp = new Float32Array(n); for (let i = 0; i < n; i++) sp[i] = rn[i * 4 + 3];
  [['aA', pa, 3], ['aB', pb, 3], ['aS', sp, 1], ['aF', fa, 1]].forEach(([k, arr, c]) => g.setAttribute(k, new THREE.InstancedBufferAttribute(arr, c).setUsage(THREE.DynamicDrawUsage))); g.instanceCount = n;
  const u = { t: uniform(0), sz: uniform(3), k: uniform(1), glow: uniform(1) }, m = skyMat(), vD = varyingProperty('float', 'vSd'), vAl = varyingProperty('float', 'vSal'), vLn = varyingProperty('float', 'vSln'), vA = varyingProperty('float', 'vSa'), vW = varyingProperty('float', 'vSw');
  m.vertexNode = Fn(() => {   // aA = head, aB = tail (camera-relative); aF = 0..1 life (outside: hidden)
    const tl = ia('aF', 'float'), A = vec4(cameraViewMatrix.mul(vec4(ia('aA', 'vec3'), 0)).xyz, 1), B = vec4(cameraViewMatrix.mul(vec4(ia('aB', 'vec3'), 0)).xyz, 1);
    const cA = cameraProjectionMatrix.mul(A), cB = cameraProjectionMatrix.mul(B), half = U.res.mul(.5), sA = cA.xy.div(cA.w).mul(half), sB = cB.xy.div(cB.w).mul(half);
    const dv = sB.sub(sA), L = max(length(dv), 1e-3), dir = dv.div(L), nrm = vec2(dir.y.negate(), dir.x), hw = u.sz.mul(.5).mul(U.dpr).mul(u.glow.mul(2).add(1)), t = uv().x, side = positionGeometry.y.mul(2);
    const c = mix(cA, cB, t), off = nrm.mul(side.mul(hw)).add(dir.mul(t.mul(2).sub(1).mul(hw)));
    vD.assign(side.mul(hw)); vAl.assign(t.mul(2).sub(1).mul(hw).add(t.mul(L))); vLn.assign(L); vW.assign(u.sz.mul(.5).mul(U.dpr));
    const tw = sin(u.t.mul(ia('aS', 'float').mul(17).add(6))).mul(.15).add(.85); vA.assign(smoothstep(0, .08, tl).mul(sq(float(1).sub(tl))).mul(tw).mul(u.k).mul(step(tl, 1)).mul(step(0, tl)));
    return c.add(vec4(off.div(half).mul(c.w), 0, 0));
  })();
  m.fragmentNode = Fn(() => {   // like the ship's trail: a white-hot core in a soft glow, brightest at the head, fading to nothing at the tail
    const d = length(vec2(max(0, max(vAl.negate(), vAl.sub(vLn))), vD)).div(vW.max(.5)), along = pow(clamp(float(1).sub(vAl.div(vLn.max(1))), 0, 1), 1.4);
    const core = exp(sq(d).mul(-2.5)), halo = exp(sq(d).mul(-.25)).mul(.35).mul(u.glow);
    const k = clamp(core.add(halo).mul(along).mul(vA), 0, 1); return vec4(vec3(k), k);
  })();
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false; shipScene.add(mesh);
  const tb = new Float32Array(n), fq = new Float32Array(n * 4), q = new THREE.Quaternion(), hd = new V3(), tlv = new V3();
  let on = false, t = 0, emit = .5;
  const born = (i, at0) => { tb[i] = at0; fq.set([player.base.x, player.base.y, player.base.z, player.base.w], i * 4) };   // the ship's frame at birth
  const ez = (x, e) => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), e);
  // where trail i is at age a, in the ship's frame (x right, y up, z back), in camera distances
  const at = (i, a, life, out) => { const L = LOOK, k = ez(a / life, L.ringCometEase ?? 2.5), s = .6 + .4 * rn[i * 4 + 2], rr = rn[i * 4 + 1] * ((L.ringCometSpread0 ?? .05) + (L.ringCometSpread ?? .5) * k * s), an = rn[i * 4];
    return out.set(Math.cos(an) * rr, Math.sin(an) * rr, -(L.ringCometAhead ?? .35) + (L.ringCometBack ?? 2.5) * k * s) };
  return {
    mesh, u,
    stop() { on = false; mesh.visible = false },
    burst() {
      const L = LOOK; if (!(L.ringSpark ?? 1)) return; emit = Math.max(.01, L.ringCometEmit ?? .6); t = 0; on = true;
      const nn = Math.min(n, L.ringCometN ?? 160); for (let i = 0; i < n; i++) tb[i] = i < nn ? emit * i / nn : 1e9;   // born one after another over the emit time
      for (let i = 0; i < n; i++) fq.set([player.base.x, player.base.y, player.base.z, player.base.w], i * 4);
    },
    update(dt) {
      const L = LOOK, loop = !!L.ringSparkLoop; if (loop && !on) this.burst();   // the toggle: the comet streams forever, to play with
      if (!on) { mesh.visible = false; return } t += dt; u.t.value = t;
      const life = Math.max(.05, L.ringCometLife ?? 1.2), tailK = L.ringCometTail ?? .35, nn = Math.min(n, L.ringCometN ?? 160);
      if (!loop && t > emit + life) { on = false; mesh.visible = false; return }
      u.sz.value = L.ringCometW ?? 2; u.k.value = L.ringSpark || 1; u.glow.value = L.ringCometGlow ?? 1;
      const cd = Math.max(1e-3, camera.position.distanceTo(player.pos)), cp = camera.position, P = player.pos;
      for (let i = 0; i < n; i++) {
        if (i >= nn) { fa[i] = -1; continue }
        if (loop && t - tb[i] >= life) born(i, tb[i] + life * Math.floor((t - tb[i]) / life))   // reborn at the tip, in the ship's frame now
        const a = t - tb[i], k3 = i * 3; if (a < 0 || a > life) { fa[i] = -1; continue } fa[i] = a / life;
        q.set(fq[i * 4], fq[i * 4 + 1], fq[i * 4 + 2], fq[i * 4 + 3]);
        at(i, a, life, hd).applyQuaternion(q).multiplyScalar(cd).add(P).sub(cp); at(i, Math.max(0, a - tailK * life), life, tlv).applyQuaternion(q).multiplyScalar(cd).add(P).sub(cp);
        pa[k3] = hd.x; pa[k3 + 1] = hd.y; pa[k3 + 2] = hd.z; pb[k3] = tlv.x; pb[k3 + 1] = tlv.y; pb[k3 + 2] = tlv.z;
      }
      g.attributes.aA.needsUpdate = g.attributes.aB.needsUpdate = g.attributes.aF.needsUpdate = true; mesh.visible = S.mode === 'fly';
    },
  };
})();
/* the halos: up close each ring is a real 3D crystal halo, holographic and glinting, turned to face you. It reads your
   course: when you're about to pass through, it starts to shrink and slides onto your path, and collapses on you */
const HALO_N = 6;
const HALO = (() => {
  let geo = null, tw = -1; const iCol = new Float32Array(HALO_N * 3), iA = new Float32Array(HALO_N), iImg = new Float32Array(HALO_N * 4);
  const u = { spark: uniform(1), holo: uniform(1), br: uniform(.55), refr: uniform(1), disp: uniform(.35), glass: uniform(1), film: uniform(1), filmF: uniform(3), rim: uniform(1) };
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });   // glass: it bends what's behind it (blended, not added)
  m.colorNode = Fn(() => {
    const n = normalize(normalView), v = normalize(positionView.negate()), fr = float(1).sub(abs(dot(n, v))), pl = positionLocal;   // view space: precise this far from the origin
    const hue = fract(atan(pl.y, pl.x).div(6.2832).add(fr.mul(.9)).add(U.now.mul(.06))), rgb = clamp(abs(fract(vec3(hue).add(vec3(0, .667, .333))).mul(6).sub(3)).sub(1), 0, 1);
    const hI = attribute('hImg', 'vec4'), tint = mix(mix(attribute('hCol', 'vec3'), mix(vec3(1), rgb, .85), u.holo), hI.rgb.mul(fr.mul(.6).add(.7)), hI.a), body = tint.mul(fr.mul(1.5).add(.18)).add(vec3(1).mul(pow(fr, 5)).mul(.9)).mul(u.br);
    const glint = pow(max(noise3(pl.mul(22).add(vec3(U.now.mul(.7), U.now.mul(-.5), 0))), 0), 24).mul(60).mul(u.spark).mul(fr), facet = pow(abs(sin(atan(pl.y, pl.x).mul(48).add(U.now))), 30).mul(.5);
    // glass: the sky behind, bent by the tube (more toward its edges) and split into colours like a prism
    const off = n.xy.mul(u.refr.mul(.06)).mul(fr.mul(.8).add(.2)), ca = off.mul(u.disp);
    const bg = vec3(viewportSharedTexture(screenUV.add(off.add(ca))).r, viewportSharedTexture(screenUV.add(off)).g, viewportSharedTexture(screenUV.add(off.sub(ca))).b);
    // thin-film colour, like oil on water or a hologram foil: hue runs with the viewing angle round the tube
    const fh = fract(fr.mul(u.filmF).add(atan(pl.y, pl.x).div(6.2832).mul(2)).add(U.now.mul(.04))), film = clamp(abs(fract(vec3(fh).add(vec3(0, .667, .333))).mul(6).sub(3)).sub(1), 0, 1).mul(pow(fr, 1.5)).mul(u.film);
    const lit = body.add(vec3(1).mul(glint.add(facet.mul(fr)))).add(film.mul(.8)).add(vec3(1).mul(pow(fr, 8)).mul(u.rim)), hA = attribute('hA', 'float');
    const col = mix(lit, bg.mul(1.05).add(lit.mul(.55)), u.glass);
    return vec4(col, clamp(hA.mul(mix(fr.mul(.8).add(.2), 1, u.glass)), 0, 1));
  })();
  let mesh = null;
  const build = w => {   // a fresh mesh whenever the thickness changes
    tw = w; geo = new THREE.TorusGeometry(1, Math.max(.01, w * .45), 24, 160); geo.setAttribute('hCol', new THREE.InstancedBufferAttribute(iCol, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('hA', new THREE.InstancedBufferAttribute(iA, 1).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('hImg', new THREE.InstancedBufferAttribute(iImg, 4).setUsage(THREE.DynamicDrawUsage));
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose() } mesh = new THREE.InstancedMesh(geo, m, HALO_N); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  };
  build(LOOK.ringWidth ?? .1);
  /* lensing round each ring, like a black hole's: a disc in the ring's plane (ext × its radius) shows the sky behind it,
     each point taken from where the bent light would come from. Modes: 1 a ring of mass (outside it bends like a point
     mass, inside it doesn't bend at all), 2 a black hole (bends inside too, the middle mirrored), 3 frame dragging (the sky
     swirls round the tube), 4 a glass lens (the sky swells toward the tube). The sample point is worked out per vertex
     on a fine grid and projected, so it's exact in screen space at any angle. */
  // a cloud round the month's and the year's best: soft, slowly churning gas in their colour, turned to face you
  const clouds = Array.from({ length: HALO_N }, () => {
    const cu = { col: uniform(new C3(1, 1, 1)), k: uniform(0), t: uniform(0), seed: uniform(0) }, cm = skyMat({ side: THREE.DoubleSide, depthTest: false });
    cm.colorNode = Fn(() => {
      const p = uv().mul(2).sub(1), r = length(p), q = vec3(p.mul(1.7), cu.t.mul(.05).add(cu.seed));
      const n = noise3(q).mul(.5).add(noise3(q.mul(2.3).add(5.1)).mul(.3)).add(noise3(q.mul(5.2).add(9.7)).mul(.2)).mul(.5).add(.5), w = noise3(vec3(p.mul(.8), cu.t.mul(.03).add(cu.seed.mul(2)))).mul(.5).add(.5);
      const a = smoothstep(1, .3, r.add(w.sub(.5).mul(.35))).mul(pow(n, 1.6)).mul(mix(.35, 1, smoothstep(.15, .4, r))).mul(cu.k);
      return vec4(mix(cu.col, vec3(1), .25).mul(a), a);
    })();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), cm); m.frustumCulled = false; m.renderOrder = 2.4; m.visible = false; m.cu = cu; scene.add(m); return m;
  });
  const LU = { mode: uniform(1), k: uniform(.5), ext: uniform(3) }, lensMats = [], lens = Array.from({ length: HALO_N }, () => {
    const a = uniform(0), kb = uniform(1), lm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide }), vS = varying(vec2(), 'vLens');
    lm.positionNode = Fn(() => {
      const p = positionGeometry.xy, q = p.mul(LU.ext), rho = max(length(q), 1e-3), k = LU.k.mul(kb), md = LU.mode, fade = smoothstep(1, .72, length(p));
      const bMass = select(rho.greaterThan(1), q.mul(float(1).sub(k.div(rho.mul(rho)))), q);
      const bHole = q.mul(float(1).sub(k.div(max(rho.mul(rho), .04))));
      const ang = k.mul(2.2).mul(exp(sq(rho.sub(1)).div(-.18))), cs = cos(ang), sn = sin(ang), bSwirl = vec2(q.x.mul(cs).sub(q.y.mul(sn)), q.x.mul(sn).add(q.y.mul(cs)));
      const bGlass = q.sub(q.div(rho).mul(k.mul(.5).mul(rho.sub(1)).mul(exp(sq(rho.sub(1)).div(-.12)))));
      const b = select(md.lessThan(1.5), bMass, select(md.lessThan(2.5), bHole, select(md.lessThan(3.5), bSwirl, bGlass)));
      const bq = q.add(b.sub(q).mul(fade)).div(LU.ext), c0 = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(positionGeometry, 1))), c1 = cameraProjectionMatrix.mul(modelViewMatrix.mul(vec4(bq, 0, 1)));
      vS.assign(c1.xy.div(c1.w).sub(c0.xy.div(c0.w)));   // how far, in screen space, the light was bent
      return positionGeometry;
    })();
    lm.colorNode = Fn(() => { const d = vS.mul(vec2(.5, -.5)); return vec4(viewportSharedTexture(screenUV.add(d)).rgb, a.mul(smoothstep(1, .8, length(positionGeometry.xy)))) })();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 96, 96), lm); m.matrixAutoUpdate = false; m.frustumCulled = false; m.renderOrder = 2.5; m.visible = false; m.a = a; m.kb = kb; scene.add(m); return m;
  });
  const _m = new THREE.Matrix4(), _q = new Q4(), _s = new V3(), _z = new V3(0, 0, 1), _d = new V3(), live = [], pool = Array.from({ length: HALO_N }, () => ({ i: -1, c: new V3(), r: 1, c0: 0, done: false, n: new V3(), ax: new V3(), ay: new V3(), nSet: false, sPrev: 0 }));
  const best = []; let fade = new Map(), minTs = Infinity;   // minTs: seconds until you pass through the nearest ring you can't miss
  function update(dt) {
    const L = LOOK, ref = S.mode === 'map' ? camera.position : player.pos; if (paperK > .5 || !(L.rings || S.mode === 'map') || (S.mode !== 'fly' && !(S.mode === 'map' && (L.mapRings ?? 1)))) { mesh.count = 0; live.length = 0; lens.forEach(m => m.visible = false); clouds.forEach(m => m.visible = false); return } /* on the map too, the rings round you (the camera) */ if (tw !== (L.ringWidth ?? .1)) build(L.ringWidth ?? .1);
    u.spark.value = L.ringSparkle ?? 1; u.holo.value = L.ringHolo ?? 1; u.br.value = L.ringBright ?? .55; u.refr.value = L.ringRefract ?? 1; u.disp.value = L.ringDisperse ?? .35; u.glass.value = L.ringGlass ?? 1; u.film.value = L.ringFilm ?? 1; u.filmF.value = L.ringFilmBands ?? 3; u.rim.value = L.ringRim ?? 1;
    best.length = 0; const px = ref.x, py = ref.y, pz = ref.z;   // the nearest few, by straight distance
    for (let i = 0; i < N; i++) { if (TA[i] < 1) continue; const dx = P[i * 3] - px, dy = P[i * 3 + 1] - py, dz = P[i * 3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz; if (best.length < HALO_N) { best.push([d2, i]); best.sort((a, b) => a[0] - b[0]) } else if (d2 < best[HALO_N - 1][0]) { best[HALO_N - 1] = [d2, i]; best.sort((a, b) => a[0] - b[0]) } }
    const v = player.vel, vv = v.lengthSq(), pred = L.ringPredict ?? .7, pxK = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
    live.length = 0; let n = 0; minTs = Infinity;
    for (const [, i] of best) {
      const h = pool[n], R = starR(i) * (L.ringSize ?? 1.6), c = starPos(i, h.c), dist = Math.sqrt(Math.max(1, camera.position.distanceToSquared(c))), rpx = R * pxK / dist;
      if (h.i !== i) { h.i = i; h.done = false; h.c0 = 0; h.nSet = false; h.sPrev = 0 }
      const play = L.ringPlay && n === 0; if (play) { c.set(0, 0, -R * (L.ringPlayDist ?? 5)).applyQuaternion(camera.quaternion).add(camera.position); h.done = false }   // playground: the nearest winner's ring, held in front of you
      let k = 0; h.ts = Infinity; if (vv > 1 && !play) { _d.copy(c).sub(player.pos); const ts = _d.dot(v) / vv, miss = _d.addScaledVector(v, -ts).length(); if (ts > 0 && ts < Math.max(pred, slowF) && miss < R * 1.15) { k = Math.max(0, 1 - ts / pred); if (!h.done && TA[i] === 1) { h.ts = ts; minTs = Math.min(minTs, ts) } } }   // about to pass through: how close (0..1), and in how long
      if (h.ts < slowF && lockI === i && player.pos.distanceTo(c) < (LOOK.lockLetGo ?? 1000)) { lockI = -1; auto = null; passedI = i; relockNext = true }   // time's slowing: you can't miss it now, so the lock lets go and you can pick the next ring
      h.c0 = Math.max(h.c0 * Math.exp(-3 * dt), k);
      const away = player.pos.distanceTo(c);
      if (!h.nSet && !h.done && k > 0) { h.n.copy(player.pos).sub(c).normalize(); h.ax.set(0, 1, 0).applyQuaternion(camera.quaternion).cross(h.n).normalize(); h.ay.crossVectors(h.n, h.ax); h.nSet = true; h.sPrev = player.pos.clone().sub(c).dot(h.n) }   // committed: the ring stops turning to face you, so its plane is a real finish line
      if (h.nSet && !h.done && away > R * 4) h.nSet = false;   // turned away without passing
      if (h.done && away > R + (L.ringReset ?? 200)) { h.done = false; h.nSet = false; fade.delete(i); if (ringIn === i) ringIn = -1 }   // clear of it: the ring is back (in its collected colour), portal and all
      h.r = R; const gone = h.done ? (fade.get(i) ?? 1) : 1; if (h.done) fade.set(i, Math.max(0, gone - dt * 4));
      if ((L.ringPortal ?? 1) && rpx > (L.ringPortalPre ?? 4)) shot(D[i]);   /* the picture starts loading well before the ring shows, for every ring nearby */
      const sp = L.ringShowPx ?? 34, a = (play ? 1 : sstep(rpx, sp * .4, sp) * gone) * introK(); if (a <= .005 || h.r < 1e-3) { n++; continue }
      _q.setFromUnitVectors(_z, h.nSet ? h.n : _s.copy(ref).sub(c).normalize()); mesh.setMatrixAt(live.length, _m.compose(c, _q, _s.setScalar(h.r))); { const lz = lens[live.length], on = (L.ringLens ?? 0) > 0 && (L.ringLensMode ?? 1) > 0; lz.visible = on; if (on) { lz.matrix.compose(c, _q, _s.setScalar(h.r * (L.ringLensSize ?? 3))); lz.matrixWorldNeedsUpdate = true; lz.a.value = Math.min(1, a); lz.kb.value = 1 + (L.ringLensNear ?? 2) * (h.near || 0) }
      { const cl = clouds[live.length], ck = (L.ringCloud ?? 1) * (TYPE[i] > 1.5 ? 1.4 : TYPE[i] > .5 ? 1 : 0); cl.visible = ck > 0; if (ck > 0) { cl.position.copy(c); cl.quaternion.copy(camera.quaternion); cl.scale.setScalar(h.r * (L.ringCloudSize ?? 3)); cl.cu.k.value = Math.min(1, a) * ck * .5; cl.cu.col.value.setRGB(COL[i * 3], COL[i * 3 + 1], COL[i * 3 + 2]); cl.cu.t.value = U.now.value; cl.cu.seed.value = (i * .618) % 7 } } /* the month's and year's best sit in a cloud */ }
      const got = GOT[i], j = live.length * 3; iCol[j] = got ? 1 : COL[i * 3]; iCol[j + 1] = got ? .86 : COL[i * 3 + 1]; iCol[j + 2] = got ? .58 : COL[i * 3 + 2]; iA[live.length] = a * (got ? 1.3 : 1);
      { const tx = texCache.get(i), ac = tx && tx.avgCol, o = live.length * 4; if (ac) { iImg[o] = ac.r; iImg[o + 1] = ac.g; iImg[o + 2] = ac.b } iImg[o + 3] = ac ? Math.min(1, L.ringImgTint ?? .75) * (got ? .5 : 1) : 0 }   // the ring takes on the colour of the picture inside it
      live.push(h); n++;
    }
    if (fade.size > 40) fade = new Map([...fade].slice(-20));
    for (let j = live.length; j < HALO_N; j++) { lens[j].visible = false; clouds[j].visible = false } LU.mode.value = L.ringLensMode ?? 1; LU.k.value = L.ringLens ?? 0; LU.ext.value = L.ringLensSize ?? 3;
    mesh.count = live.length; if (live.length) { mesh.instanceMatrix.needsUpdate = true; geo.attributes.hCol.needsUpdate = geo.attributes.hA.needsUpdate = geo.attributes.hImg.needsUpdate = true }
  }
  // the portal: inside the nearest ring, its winner's screenshot, set back behind the ring like a window into another room.
  // Each pixel follows your line of sight through the disc onto a plane some way behind it, so as you move the picture
  // shifts behind the opening. It starts loading a little before the ring appears
  const pt = { cur: placeholderShot(D[0]), taps: [], nx: null, ntaps: [], slide: uniform(0), gap: uniform(1.4), rot: uniform(0), bgImg: uniform(1), bgScale: uniform(1.3), bgBlur: uniform(5.5), bgDim: uniform(.6), hit: uniform(new THREE.Vector2()), st: uniform(0), white: uniform(0), brk: uniform(0), dis: uniform(0), gl: uniform(0), lv: uniform(0), ex: uniform(0), bg: uniform(new C3(0, 0, 0)), depth: uniform(.8), size: uniform(1.25), a: uniform(0), glow: uniform(new C3(1, 1, 1)), dark: uniform(.85), lens: uniform(.6), ca: uniform(.5) };
  const pm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  pm.positionNode = Fn(() => { const q = positionLocal.xy.sub(pt.hit), w = exp(dot(q, q).mul(-3.2)); return positionLocal.add(vec3(0, 0, pt.st.mul(w))) })();
  pm.colorNode = Fn(() => {
    const X = modelViewMatrix.mul(vec4(1, 0, 0, 0)).xyz, Y = modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz, O = modelViewMatrix.mul(vec4(0, 0, 0, 1)).xyz, r = length(X), Xn = X.div(r), Yn = normalize(Y), Nn = cross(Xn, Yn);   // the disc's own axes, in view space (precise this far out)
    const Pp = O.sub(Nn.mul(pt.depth.mul(r))), dir = normalize(positionView), t = dot(Pp, Nn).div(dot(dir, Nn)), loc = dir.mul(t).sub(Pp);
    const rr = length(positionGeometry.xy), rim = smoothstep(.55, 1, rr), S = pt.size.mul(r), qa0 = vec2(dot(loc, Xn).div(S), dot(loc, Yn).div(S.div(1.6))), cr = cos(pt.rot), sr = sin(pt.rot), qa = vec2(qa0.x.mul(cr).sub(qa0.y.mul(sr).div(1.6)), qa0.x.mul(sr).mul(1.6).add(qa0.y.mul(cr)));   /* (spun like a record while it plays) */
    // and it warps: a slow liquid wobble plus rings running out from the middle, as strong as dis
    const q0 = qa.mul(float(1).sub(pt.dis.div(dot(qa, qa).add(.05))));   // and, closing in, it's lensed like the sky round a black hole: the middle swells and folds over into a ring
    // the edge acts like thick glass: the picture bulges outward near the rim and its colours fringe apart
    const bulge = pt.lens.mul(pow(rr, 4)).mul(.35), fr = pt.ca.mul(pow(rr, 4)).mul(.04), at = k => q0.mul(float(1).sub(bulge.add(k))).mul(.5).add(.5);
    const inside = uvI => step(0, uvI.x).mul(step(uvI.x, 1)).mul(step(0, uvI.y)).mul(step(uvI.y, 1));
    const uR = at(fr), uG = at(0), uB = at(fr.negate()), tap = uv => { const t = texture(pt.cur, uv); pt.taps.push(t); return t }, tapN = uv => { const t = texture(pt.cur, uv); pt.ntaps.push(t); return t };
    // the pictures side by side: sliding (pt.slide 0 → 1) moves this one off to the left as the next comes in from the right, with a small gap
    // round and between the pictures: the same picture, a little larger and blurred right out (a tiny mip level), dimmed
    const bgT = texture(pt.cur, uG.sub(.5).div(pt.bgScale).add(.5)).level(pt.bgBlur); pt.taps.push(bgT); const bgPic = mix(pt.bg, bgT.rgb.mul(pt.bgDim), pt.bgImg);
    const pic = uv => { const g1 = pt.slide.mul(pt.gap), uc = uv.add(vec2(g1, 0)), un = uv.add(vec2(g1.sub(pt.gap), 0));   /* the next one starts a full width plus a gap away, well outside the window */ return mix(mix(bgPic, tapN(un).rgb, inside(un).mul(step(.0005, pt.slide))), tap(uc).rgb, inside(uc)) };
    const img = vec3(pic(uR).r, pic(uG).g, pic(uB).b);   // keep the sampling nodes, so a new winner's picture can be swapped in   // shadowed toward the rim (depth), lit by the ring's glow right at the edge
    // closing in: old-school levels (the white point comes down, so the picture goes whiter), exposure, and a glow (its own
    // bright parts, blurred and added back), all rising the closer you get
    const bl = (r, w) => [[1, 0], [-1, 0], [0, 1], [0, -1], [.7, .7], [-.7, .7], [.7, -.7], [-.7, -.7]].map(([x, y]) => pic(uG.add(vec2(x * r, y * r * 1.6)))).reduce((a, b) => a.add(b)).mul(w / 8);
    const blur = bl(.02, .5).add(bl(.05, .5)), bright = blur.mul(smoothstep(.25, 1, dot(blur, vec3(.3, .55, .15))));
    const imgL = mix(clamp(img.mul(pt.ex.add(1)).div(float(1).sub(pt.lv.mul(.85))), 0, 1.5), vec3(1.5), pt.lv.mul(pt.lv).mul(pt.lv).add(pt.ex.div(4).clamp(0, 1).pow(2)).clamp(0, 1)).add(bright.mul(pt.gl));   /* levels at 1 (or exposure at 4) take even the blacks to white */
    const c = imgL.mul(pt.dark).mul(rim.mul(.75).oneMinus()).add(pt.glow.mul(pow(rr, 6)).mul(.35)).add(mix(pt.glow, vec3(1), .5).mul(smoothstep(.93, .995, rr)).mul(.6));
    Discard(rr.greaterThan(1));
    const nz = noise3(vec3(positionGeometry.xy.mul(7), 3.1)).mul(.5).add(noise3(vec3(positionGeometry.xy.mul(19), 7.7)).mul(.25)).add(.5), cut = pt.brk.mul(1.15).sub(.08);
    Discard(pt.brk.greaterThan(.001).and(nz.lessThan(cut)));   // the break: it tears away in shards
    const edge = smoothstep(cut.add(.06), cut, nz).mul(step(.001, pt.brk));   // white-hot along each tear
    const cf = mix(c, vec3(1), pt.white).add(vec3(1, .95, .85).mul(edge).mul(2));
    return vec4(cf, pt.a.mul(smoothstep(1, .97, rr)).mul(pt.brk.mul(.6).oneMinus()));
  })();
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 48, 48), pm); portal.frustumCulled = false; portal.renderOrder = 2; portal.visible = false; portal.matrixAutoUpdate = false; shipScene.add(portal);   // on the ship's layer: the galaxy's glows and star clouds are drawn after the scene and would speckle over the picture
  let pI = -1, pop = null; const _mn = new V3(), _mv = new V3(), _ldp = new V3(), _pm = new THREE.Matrix4(), _up = new V3(), pInfo = { on: false, i: -1, c: new V3(), r: 1 };   // where the portal is, for the record that floats beside it
  function portalUpdate(dt) {
    const L = LOOK, ref = S.mode === 'map' ? camera.position : player.pos; pInfo.on = false; if (paperK > .5 || !(L.ringPortal ?? 1) || !(L.rings || S.mode === 'map') || (S.mode !== 'fly' && !(S.mode === 'map' && (L.mapRings ?? 1)))) { portal.visible = false; return }
    if (pop) {   // through it: the white, fully warped picture shrinks to a point, then bursts into sparks
      pop.t += dt / Math.max(.05, L.ringShrink ?? .35); const s = Math.pow(Math.max(0, 1 - pop.t), 1.7); pInfo.on = false;
      portal.matrix.copy(pop.m).multiply(_m.makeScale(s, s, 1)); portal.matrixWorldNeedsUpdate = true; pt.white.value = 1; pt.dis.value = 2.2 * (L.ringMemWarp ?? 1); pt.st.value = 0; pt.brk.value = 0; pt.a.value = 1; portal.visible = s > .002;
      if (pop.t >= 1) { sparks.burst(pop.c, pop.r); pop = null; portal.visible = false } return;
    }
    let near = -1; if (best.length) { const i = best[0][1], R = starR(i) * (L.ringSize ?? 1.6), dist = Math.sqrt(best[0][0]), pxK = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)); if (R * pxK / dist > (L.ringPortalPre ?? 4) || L.ringPlay) near = i }   // a little before the ring shows
    if (near >= 0 && (near !== pI || (gal.t < 0 && gal.k === 0 && texCache.get(near) !== pt.cur))) { if (near !== pI) gal.idle = 0; pI = near; gal.list = gallery(near); gal.k = 0; gal.t = -1; pt.slide.value = 0; pt.cur = gal.list[0]; pt.taps.forEach(t => t.value = pt.cur); pt.ntaps.forEach(t => t.value = pt.cur); pt.glow.value.setRGB(COL[near * 3], COL[near * 3 + 1], COL[near * 3 + 2]) }
    const h = live.find(x => x.i === pI); if (!h || near < 0 || h.done) { portal.visible = false; return }   // a ring you've just taken has no picture until it's back
    { const ac = pt.cur && pt.cur.avgCol, dk = 1 - (L.ringPortalBg ?? .6); if (ac) pt.bg.value.copy(ac).multiplyScalar(dk); else pt.bg.value.setRGB(0, 0, 0) }   // round the picture: its own average colour, darkened
    pt.ld = pt.cur && pt.cur.avgCol ? Math.min(1, (pt.ld || 0) + dt * 6) : 0;   // the picture fades in once it's loaded (no placeholder)
    const k = live.indexOf(h); pt.a.value = pt.ld * iA[k] / (GOT[pI] ? 1.3 : 1); pt.depth.value = L.ringPortalDepth ?? .8; pt.size.value = L.ringPortalSize ?? 1.25; pt.dark.value = L.ringPortalBright ?? .85; pt.lens.value = L.ringPortalLens ?? .6; pt.ca.value = L.ringPortalCA ?? .5;
    pt.white.value = 0; pt.brk.value = 0; pt.hit.value.set(0, 0); pt.st.value = 0; pt.dis.value = 0; pt.gl.value = 0; pt.lv.value = 0; pt.ex.value = 0;
    let sh = 1; h.near = 0;
    if (!h.done && !L.ringPlay) {   // by how long until you reach it: clear on the way in, then in the last moment the picture is lensed harder and harder, turns white and shrinks to a point just as you arrive
      const n = h.nSet ? h.n : _mn.copy(player.pos).sub(h.c).normalize(), s = _mv.copy(player.pos).sub(h.c).dot(n), vn = -player.vel.dot(n), tt = vn > 1 && s > 0 ? s / vn : Infinity;
      const tin = L.ringMemIn ?? .5, near = tin > .001 ? Math.pow(Math.max(0, 1 - tt / tin), 1.4) : 0, shT = Math.max(.02, L.ringShrink ?? .25); h.near = near;
      pt.dis.value = near * .3 * (L.ringMemWarp ?? 1); { const nd = 1 - sstep(player.pos.distanceTo(h.c), 0, h.r * (L.ringNearDist ?? 3)), nw = Math.pow(nd, L.ringNearCurve ?? 8); pt.white.value = nw * (L.ringMemWhite ?? 0); pt.gl.value = nd * (L.ringNearGlow ?? 1.5); pt.lv.value = nw * (L.ringNearLevels ?? .6); pt.ex.value = nw * (L.ringNearExpo ?? .5) }   /* white, levels and exposure hold back until the very last moment (the curve), the glow comes on gradually */ whiteout.near = Math.max(whiteout.near, 1 - sstep(player.pos.distanceTo(h.c), h.r * .1, h.r * (L.ringFlashDist ?? 1.5))); whiteout.at.copy(h.c);   // the whiteout goes by plain distance: only right up close
    }
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion); _pm.lookAt(h.nSet ? _ldp.copy(h.c).add(h.n) : ref, h.c, _up);   /* once committed the portal stays put, facing the way you came */ portal.matrix.makeScale(1, 1, 1).copy(_pm).setPosition(h.c); { const k = h.r * (1 - (L.ringWidth ?? .1) * .5) * sh; portal.matrix.multiply(_m.makeScale(k, k, 1)) } portal.matrixWorldNeedsUpdate = true; portal.visible = pt.a.value > .005 && sh > .003; Object.assign(pInfo, { on: portal.visible && !h.done, i: pI, r: h.r }); pInfo.c.copy(h.c);   // just inside the ring's tube, so the ring still frames it
  }
  // paging through a winner's pictures: a click on the picture slides it away left and the next one in from the right
  const gal = { list: [], k: 0, t: -1, idle: 0 };
  function nextPic() { if (!pInfo.on || gal.t >= 0 || !gal.list.length) return false; gal.idle = 0; const nk = (gal.k + 1) % gal.list.length; gal.nk = nk; pt.nx = gal.list[nk]; pt.ntaps.forEach(t => t.value = pt.nx); gal.t = 0; return true }
  function slideStep(rdt) {
    pt.rot.value = rec.spin; pt.bgImg.value = LOOK.ringBgPic ?? 1; pt.bgScale.value = LOOK.ringBgScale ?? 1.3; pt.bgBlur.value = LOOK.ringBgBlur ?? 5.5; pt.bgDim.value = LOOK.ringBgDim ?? .6;
    pt.gap.value = 1 + (LOOK.ringSlideGap ?? .4);
    if (gal.t < 0) { const ap = LOOK.ringAutoPlay ?? 3.5; if (ap > 0 && pInfo.on) { gal.idle += rdt; if (gal.idle > ap && nextPic()) gal.idle = 0 } else gal.idle = 0; return }   /* autoplay: the next picture every few seconds while one is up */ gal.t += rdt / Math.max(.1, LOOK.ringSlideTime ?? .6); const x = Math.min(1, gal.t); pt.slide.value = x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
    if (gal.t >= 1) { gal.k = gal.nk; pt.cur = gal.list[gal.k]; pt.taps.forEach(t => t.value = pt.cur); pt.slide.value = 0; gal.t = -1 }
  }
  const update0 = update; function updateAll(dt) { const rdt = Math.min(.05, dt / Math.max(.03, slowmo.k)); update0(dt); portalUpdate(dt); sparks.update(dt); slideStep(rdt); wave.update(rdt); ringRiser(S.mode === 'fly' && LOOK.rings && Number.isFinite(minTs) ? 1 - sstep(minTs, 0, LOOK.ringRiseTime ?? 2.5) : 0) }   // (the slide runs in real time, whatever bullet time does)
  const popAt = h => { sparks.burst(h.c, h.r) };   // through: the picture has just shrunk to its point, and it bursts into sparks   // straight to the sparks
  return { update: updateAll, pop: popAt, nextPic, live, u, portal, pt, pInfo, get ts() { return minTs } };
})();
/* bullet time: once a ring can't be missed, all of time slows, exponentially, to all but a standstill as you pass through it,
   then winds back up just as it slowed */
let slowF = .3;   // how long before a ring time starts to slow (game s), after speed has had its say
const slowmo = { k: 1, after: 1e9,
  step(rdt) {
    const L = LOOK, amt = L.rings ? L.ringSlow ?? 1 : 0; this.after += rdt * this.k; if (amt <= 0 || L.ringPlay) { this.k = 1; return }
    const lo = Math.max(.001, L.ringSlowMin ?? .06), ts = HALO.ts, sm = x => Math.pow(Math.max(0, Math.min(1, x)), 1.6);   // a soft start, then each moment a fixed share slower
    if (this.k > .995) { const v0 = Math.max(1, L.ringSlowV0 ?? 500), v1 = Math.max(v0 * 1.01, L.ringSlowV1 ?? 6e4), sp = Math.max(1, player.vel.length()); this.sk = sstep(Math.log(sp), Math.log(v0), Math.log(v1)) }   // your speed coming in (held once time starts to slow)
    const dk = (L.ringSlowSlowK ?? .3) + ((L.ringSlowFastK ?? 1.6) - (L.ringSlowSlowK ?? .3)) * (this.sk ?? 1); slowF = Math.max(.02, (L.ringSlowFrom ?? .5) * dk);   // slow: a short dip, so you aren't left waiting; fast: a long one, so you don't shoot straight through
    const F = slowF; let k = Math.pow(lo, sm(1 - ts / F));   // softly in, then exponentially slower: all but still at the moment you cross
    k = Math.min(k, Math.pow(lo, sm(1 - this.after / Math.max(.02, (L.ringSlowAfter ?? F) * dk))));   // and out again the same way, mirror image
    this.k = 1 - amt * (1 - k);
  },
};
/* the shockwave: from the ring you took, a bright shell runs out through the stars round it, lighting each as it passes */
const wave = (() => {
  const tex = radialTex(256, [[0, 'rgba(255,255,255,0)'], [.82, 'rgba(255,255,255,0)'], [.94, 'rgba(255,240,215,.75)'], [.985, 'rgba(255,255,255,.25)'], [1, 'rgba(255,255,255,0)']]);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); sp.visible = false; sp.frustumCulled = false; scene.add(sp);
  let t = -1, c = new V3(), r0 = 1;
  return {
    go(i) { if (!(LOOK.ringWave ?? 1)) return; t = 0; starPos(i, c); r0 = starR(i) * (LOOK.ringSize ?? 1.6); stars.u.wc.value.copy(c); sp.position.copy(c) },
    update(rdt) {
      if (t < 0) return; t += rdt; const T = Math.max(.2, LOOK.ringWaveTime ?? 1.8), x = Math.min(1, t / T), e = 1 - Math.pow(1 - x, 2.2), R = r0 + (LOOK.ringWaveReach ?? 90000) * e, k = (LOOK.ringWave ?? 1) * (1 - x) * (1 - x);
      stars.u.wr.value = R; stars.u.ww.value = 2500 + R * .08; stars.u.wk.value = k; sp.visible = S.mode === 'fly' && k > .003; sp.scale.setScalar(R * 2.1); sp.material.opacity = k * .55;
      if (x >= 1) { t = -1; stars.u.wk.value = 0; sp.visible = false }
    },
  };
})();
/* the collection moment: the winner's title stamps in large in the middle, holds, then shrinks away into the collected count */
const stamp = (() => {
  const el = document.createElement('div'); el.id = 'stamp'; el.setAttribute('aria-hidden', 'true'); document.body.appendChild(el); let an = null;
  return i => {
    if (!(LOOK.ringStamp ?? 1)) return; const d = D[i], t = new Date(d.date + 'T00:00:00Z'); el.innerHTML = `<small>${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}</small><b>${esc(d.title)}</b>`;
    if (an) an.cancel(); const p = $('gotPill').getBoundingClientRect(), dx = (p.left + p.width / 2) - innerWidth / 2, dy = (p.top + p.height / 2) - innerHeight * .42, hold = (LOOK.ringStampHold ?? .9) * 1000, wait = (LOOK.ringStampWait ?? .35) * 1000;
    an = el.animate([{ opacity: 0, transform: 'translate(-50%,-50%) scale(1.25)', filter: 'blur(8px)' }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', filter: 'blur(0)', offset: .18 }, { opacity: 1, transform: 'translate(-50%,-50%) scale(1)', filter: 'blur(0)', offset: .62 }, { opacity: 0, transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.12)`, filter: 'blur(0)' }], { duration: hold / .44 + 0, delay: wait, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'both' });
    an.onfinish = () => { const g = $('gotPill'); g.classList.remove('pop'); void g.offsetWidth; g.classList.add('pop') };
  };
})();
function collectSound(v = 1) {   // two quick rising notes, bright and glassy, with a soft whoosh under them
  if (!AC || AC.state !== 'running' || !master) return; const t = AC.currentTime + .005;
  [0, 7, 12].forEach((st, k) => { const f = 880 * Math.pow(2, st / 12), o = AC.createOscillator(), g = AC.createGain(); o.type = k ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f * .985, t + k * .055); o.frequency.exponentialRampToValueAtTime(f, t + k * .055 + .03); g.gain.setValueAtTime(0, t + k * .055); g.gain.linearRampToValueAtTime(.18 * v / (1 + k * .5), t + k * .055 + .006); g.gain.exponentialRampToValueAtTime(.0001, t + k * .055 + .55); o.connect(g); g.connect(master); o.start(t + k * .055); o.stop(t + k * .055 + .6) });
  const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const bp = AC.createBiquadFilter(), g = AC.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(3200, t + .35); g.gain.value = .12 * v; n.buffer = b; n.connect(bp); bp.connect(g); g.connect(master); n.start(t);
}
function collect(i) {
  coach.ring = true; passedI = i;
  if (relockNext && (LOOK.ringNext ?? 0)) {   // you were locked on it: lock onto the next ring ahead (the nearest in front of you), and swing round to it slowly
    relockNext = false; const v = _rk.copy(player.vel).normalize(), pp = player.pos; let best = -1, bd = Infinity;
    for (let j = 0; j < N; j++) { if (j === i || TA[j] < 1 || GOT[j] && LOOK.ringNextNew) continue; const dx = P[j * 3] - pp.x, dy = P[j * 3 + 1] - pp.y, dz = P[j * 3 + 2] - pp.z, d = Math.hypot(dx, dy, dz); if (d < 1 || (dx * v.x + dy * v.y + dz * v.z) / d < .2) continue; if (d < bd) { bd = d; best = j } }
    if (best >= 0) { focus(best); aimSlow = LOOK.ringNextTime ?? 2.5 }
  } ascent.sparkle(GOT[i] ? .6 : 1); ringBell(i); wave.go(i); stamp(i);
  if (lockI === i) { lockI = -1; auto = null }   // through it: the camera's free again
  player.vel.multiplyScalar(1 + Math.max(0, LOOK.ringBurst ?? .25)); engineLook.peak = Math.max(engineLook.peak || 0, 1.3 * (LOOK.ringPopBurst ?? .6)); ringPop = 1; boostK = Math.max(boostK, LOOK.ringBoost ?? .8); collectSound(GOT[i] ? .6 : 1);   // a festive kick: speed, a burst of light from the engine, the boost look   // a kick: speed, the engine flaring, a bright little sound
  ringHide.set(i, performance.now() + (LOOK.ringBallDelay ?? 1) * 1000);   // the star itself comes back only a moment after you're through
  buzz(18);
  if (GOT[i]) return; GOT[i] = 1; gotN++; stars.aGot.needsUpdate = true;
  store.set('sotd-got', JSON.stringify(D.flatMap((d, k) => GOT[k] ? [d.date] : [])));
  const el = $('gotPill'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); rings.show();
  const nk = CURSORS.findIndex((c, k) => k > 0 && SHIP_UNLOCK(k) === gotN), nt = TRAILS.findIndex((c, k) => k > 0 && TRAIL_UNLOCK(k) === gotN);
  if (nt > 0) { el.dataset.new = `New trail: ${TRAILS[nt].name}`; el.classList.add('unlock'); setTimeout(() => el.classList.remove('unlock'), 4000) }
  if (nk > 0) { el.dataset.new = `New ship: ${CURSORS[nk].name}`; el.classList.add('unlock'); setTimeout(() => el.classList.remove('unlock'), 4000) }   // a new pointer unlocked
}
// unlockable trail colours (the Upgrades panel): slow end and fast end of the trail
const TRAILS = [
  { name: 'Your colour', c: null },
  { name: 'Gold', c: (a, b) => { a.setHSL(.11, 1, .5); b.setHSL(.13, .9, .72) } },
  { name: 'Ice', c: (a, b) => { a.setHSL(.53, .9, .62); b.setHSL(.55, .5, .88) } },
  { name: 'Ember', c: (a, b) => { a.setHSL(.01, 1, .5); b.setHSL(.07, 1, .6) } },
  { name: 'Neon pink', c: (a, b) => { a.setHSL(.91, 1, .58); b.setHSL(.86, 1, .72) } },
  { name: 'Aurora', c: (a, b) => { a.setHSL(.38, .95, .52); b.setHSL(.47, .9, .62) } },
  { name: 'Plasma', c: (a, b) => { a.setHSL(.74, 1, .6); b.setHSL(.62, 1, .66) } },
  { name: 'Ghost', c: (a, b) => { a.setHSL(.62, .15, .82); b.setHSL(.6, .05, .97) } },
  { name: 'Chrome', c: (a, b, s) => { const g = .55 + .35 * Math.sin(performance.now() * .004 + s * 9); a.setHSL(.6, .25, g); b.setHSL(.58, .35, .9) } },
  { name: 'Rainbow', c: (a, b, s) => { const h = (performance.now() * .00012 + s * .4) % 1; a.setHSL(h, 1, .58); b.setHSL((h + .08) % 1, 1, .68) } },
];
const TRAIL_UNLOCK = k => 0;   // all unlocked for now (was k * 7)
let trailK = 0; { const k = +store.get('sotd-trail-k') || 0; if (k > 0 && k < TRAILS.length && gotN >= TRAIL_UNLOCK(k)) trailK = k }
function setTrail(k) { trailK = k; store.set('sotd-trail-k', String(k)) }
// the mode switch: the ring button by the sound button (or R) turns the game on and off
function setRings(on) { LOOK.rings = on ? 1 : 0; saveLook(); $('gbtn').setAttribute('aria-pressed', !!on); $('gbtn').title = on ? 'Rings game on (R)' : 'Rings game off (R)'; rings.show(); const c = document.querySelector('#lk-rings'); if (c) c.checked = !!on }
$('gbtn').onclick = () => setRings(!LOOK.rings);
{ const k = +store.get('sotd-ship-k') || 0; if (k > 0 && gotN >= SHIP_UNLOCK(k)) setShip(k) }   // the pointer you flew last time
const rings = (() => {
  const el = $('gotPill');
  const show = () => { el.hidden = !LOOK.rings || S.mode !== 'fly'; el.innerHTML = `<b>${gotN.toLocaleString('en')}</b> / ${N.toLocaleString('en')}` };
  show(); $('gbtn').setAttribute('aria-pressed', !!LOOK.rings);
  return {
    show,
    update(dt) {
      const L = LOOK, u = stars.u; u.ring.value = L.rings || S.mode === 'map' ? introK() : 0;   /* the map always shows rings */ u.rsz.value = (L.ringSize ?? 1.6) * L.bodySize; u.rw.value = L.ringWidth ?? .1; u.gotGlow.value = L.ringGlow ?? 1.8;
      if (gotCard.t > 0) gotCard.t -= dt; ringPop *= Math.exp(-dt / Math.max(.05, L.ringPopTime ?? .7)); HALO.update(dt);
      const want = !L.rings || S.mode !== 'fly'; if (el.hidden !== want) show();
    },
  };
})();
