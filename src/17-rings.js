/* ───────────────────────── the game: fly through the rings ─────────────────────────
   With "rings" on every winner is a ring the size of its star. Fly through one and it's collected: it turns warm white
   and glows, you lose a little speed, a chime rings and its record opens for a few seconds. Collected winners are kept in
   this browser; the count sits at the top. */
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
  slowmo.after = 0; ringIn = h.i;
  h.done = true; collect(h.i);
}
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
  const _m = new THREE.Matrix4(), _q = new Q4(), _s = new V3(), _z = new V3(0, 0, 1), _d = new V3(), live = [], pool = Array.from({ length: HALO_N }, () => ({ i: -1, c: new V3(), r: 1, c0: 0, done: false, n: new V3(), ax: new V3(), ay: new V3(), nSet: false, sPrev: 0 }));
  const best = []; let fade = new Map(), minTs = Infinity;   // minTs: seconds until you pass through the nearest ring you can't miss
  function update(dt) {
    const L = LOOK; if (!L.rings || S.mode !== 'fly') { mesh.count = 0; live.length = 0; return } if (tw !== (L.ringWidth ?? .1)) build(L.ringWidth ?? .1);
    u.spark.value = L.ringSparkle ?? 1; u.holo.value = L.ringHolo ?? 1; u.br.value = L.ringBright ?? .55; u.refr.value = L.ringRefract ?? 1; u.disp.value = L.ringDisperse ?? .35; u.glass.value = L.ringGlass ?? 1; u.film.value = L.ringFilm ?? 1; u.filmF.value = L.ringFilmBands ?? 3; u.rim.value = L.ringRim ?? 1;
    best.length = 0; const px = player.pos.x, py = player.pos.y, pz = player.pos.z;   // the nearest few, by straight distance
    for (let i = 0; i < N; i++) { if (TA[i] < 1) continue; const dx = P[i * 3] - px, dy = P[i * 3 + 1] - py, dz = P[i * 3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz; if (best.length < HALO_N) { best.push([d2, i]); best.sort((a, b) => a[0] - b[0]) } else if (d2 < best[HALO_N - 1][0]) { best[HALO_N - 1] = [d2, i]; best.sort((a, b) => a[0] - b[0]) } }
    const v = player.vel, vv = v.lengthSq(), pred = L.ringPredict ?? .7, pxK = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
    live.length = 0; let n = 0; minTs = Infinity;
    for (const [, i] of best) {
      const h = pool[n], R = starR(i) * (L.ringSize ?? 1.6), c = starPos(i, h.c), dist = Math.sqrt(Math.max(1, camera.position.distanceToSquared(c))), rpx = R * pxK / dist;
      if (h.i !== i) { h.i = i; h.done = false; h.c0 = 0; h.nSet = false; h.sPrev = 0 }
      const play = L.ringPlay && n === 0; if (play) { c.set(0, 0, -R * (L.ringPlayDist ?? 5)).applyQuaternion(camera.quaternion).add(camera.position); h.done = false }   // playground: the nearest winner's ring, held in front of you
      let k = 0; h.ts = Infinity; if (vv > 1 && !play) { _d.copy(c).sub(player.pos); const ts = _d.dot(v) / vv, miss = _d.addScaledVector(v, -ts).length(); if (ts > 0 && ts < Math.max(pred, L.ringSlowFrom ?? .5) && miss < R * 1.15) { k = Math.max(0, 1 - ts / pred); if (!h.done && TA[i] === 1) { h.ts = ts; minTs = Math.min(minTs, ts) } } }   // about to pass through: how close (0..1), and in how long
      if (h.ts < (L.ringSlowFrom ?? .5) && lockI === i) { lockI = -1; auto = null }   // time's slowing: you can't miss it now, so the lock lets go and you can pick the next ring
      h.c0 = Math.max(h.c0 * Math.exp(-3 * dt), k);
      const away = player.pos.distanceTo(c);
      if (!h.nSet && !h.done && k > 0) { h.n.copy(player.pos).sub(c).normalize(); h.ax.set(0, 1, 0).applyQuaternion(camera.quaternion).cross(h.n).normalize(); h.ay.crossVectors(h.n, h.ax); h.nSet = true; h.sPrev = player.pos.clone().sub(c).dot(h.n) }   // committed: the ring stops turning to face you, so its plane is a real finish line
      if (h.nSet && !h.done && away > R * 4) h.nSet = false;   // turned away without passing
      if (h.done && away > R + (L.ringReset ?? 200)) { h.done = false; h.nSet = false; fade.delete(i); if (ringIn === i) ringIn = -1 }   // clear of it: the ring is back (in its collected colour), portal and all
      h.r = R; const gone = h.done ? (fade.get(i) ?? 1) : 1; if (h.done) fade.set(i, Math.max(0, gone - dt * 4));
      const a = play ? 1 : sstep(rpx, 14, 34) * gone; if (a <= .005 || h.r < 1e-3) { n++; continue }
      _q.setFromUnitVectors(_z, h.nSet ? h.n : _s.copy(player.pos).sub(c).normalize()); mesh.setMatrixAt(live.length, _m.compose(c, _q, _s.setScalar(h.r)));
      const got = GOT[i], j = live.length * 3; iCol[j] = got ? 1 : COL[i * 3]; iCol[j + 1] = got ? .86 : COL[i * 3 + 1]; iCol[j + 2] = got ? .58 : COL[i * 3 + 2]; iA[live.length] = a * (got ? 1.3 : 1);
      { const tx = texCache.get(i), ac = tx && tx.avgCol, o = live.length * 4; if (ac) { iImg[o] = ac.r; iImg[o + 1] = ac.g; iImg[o + 2] = ac.b } iImg[o + 3] = ac ? Math.min(1, L.ringImgTint ?? .75) * (got ? .5 : 1) : 0 }   // the ring takes on the colour of the picture inside it
      live.push(h); n++;
    }
    if (fade.size > 40) fade = new Map([...fade].slice(-20));
    mesh.count = live.length; if (live.length) { mesh.instanceMatrix.needsUpdate = true; geo.attributes.hCol.needsUpdate = geo.attributes.hA.needsUpdate = geo.attributes.hImg.needsUpdate = true }
  }
  // the portal: inside the nearest ring, its winner's screenshot, set back behind the ring like a window into another room.
  // Each pixel follows your line of sight through the disc onto a plane some way behind it, so as you move the picture
  // shifts behind the opening. It starts loading a little before the ring appears
  const pt = { cur: placeholderShot(D[0]), taps: [], hit: uniform(new THREE.Vector2()), st: uniform(0), white: uniform(0), brk: uniform(0), dis: uniform(0), depth: uniform(.8), size: uniform(1.25), a: uniform(0), glow: uniform(new C3(1, 1, 1)), dark: uniform(.85), lens: uniform(.6), ca: uniform(.5) };
  const pm = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide });
  // the membrane: it bulges toward you as you come in (st, in world units; local +z faces you)
  pm.positionNode = Fn(() => { const q = positionLocal.xy.sub(pt.hit), w = exp(dot(q, q).mul(-3.2)); return positionLocal.add(vec3(0, 0, pt.st.mul(w))) })();
  pm.colorNode = Fn(() => {
    const X = modelViewMatrix.mul(vec4(1, 0, 0, 0)).xyz, Y = modelViewMatrix.mul(vec4(0, 1, 0, 0)).xyz, O = modelViewMatrix.mul(vec4(0, 0, 0, 1)).xyz, r = length(X), Xn = X.div(r), Yn = normalize(Y), Nn = cross(Xn, Yn);   // the disc's own axes, in view space (precise this far out)
    const Pp = O.sub(Nn.mul(pt.depth.mul(r))), dir = normalize(positionView), t = dot(Pp, Nn).div(dot(dir, Nn)), loc = dir.mul(t).sub(Pp);
    const rr = length(positionGeometry.xy), rim = smoothstep(.55, 1, rr), S = pt.size.mul(r), qa = vec2(dot(loc, Xn).div(S), dot(loc, Yn).div(S.div(1.6)));
    // and it warps: a slow liquid wobble plus rings running out from the middle, as strong as dis
    const wv = vec2(noise3(vec3(qa.mul(2.2), U.now.mul(.8))), noise3(vec3(qa.mul(2.2).add(7.3), U.now.mul(.8).add(3.1)))), rip = sin(rr.mul(24).sub(U.now.mul(8))).mul(.05), q0 = qa.add(wv.mul(pt.dis.mul(.5))).add(positionGeometry.xy.mul(rip.mul(pt.dis)));
    // the edge acts like thick glass: the picture bulges outward near the rim and its colours fringe apart
    const bulge = pt.lens.mul(pow(rr, 4)).mul(.35), fr = pt.ca.mul(pow(rr, 4)).mul(.04), at = k => q0.mul(float(1).sub(bulge.add(k))).mul(.5).add(.5);
    const inside = uvI => step(0, uvI.x).mul(step(uvI.x, 1)).mul(step(0, uvI.y)).mul(step(uvI.y, 1));
    const uR = at(fr), uG = at(0), uB = at(fr.negate()), tap = uv => { const t = texture(pt.cur, uv); pt.taps.push(t); return t }, img = vec3(tap(uR).r.mul(inside(uR)), tap(uG).g.mul(inside(uG)), tap(uB).b.mul(inside(uB)));   // keep the sampling nodes, so a new winner's picture can be swapped in   // shadowed toward the rim (depth), lit by the ring's glow right at the edge
    const c = img.mul(pt.dark).mul(rim.mul(.75).oneMinus()).add(pt.glow.mul(pow(rr, 6)).mul(.35)).add(mix(pt.glow, vec3(1), .5).mul(smoothstep(.93, .995, rr)).mul(.6));
    Discard(rr.greaterThan(1));
    const nz = noise3(vec3(positionGeometry.xy.mul(7), 3.1)).mul(.5).add(noise3(vec3(positionGeometry.xy.mul(19), 7.7)).mul(.25)).add(.5), cut = pt.brk.mul(1.15).sub(.08);
    Discard(pt.brk.greaterThan(.001).and(nz.lessThan(cut)));   // the break: it tears away in shards
    const edge = smoothstep(cut.add(.06), cut, nz).mul(step(.001, pt.brk));   // white-hot along each tear
    const cf = mix(c, vec3(1), pt.white).add(vec3(1, .95, .85).mul(edge).mul(2));
    return vec4(cf, pt.a.mul(smoothstep(1, .97, rr)).mul(pt.brk.mul(.6).oneMinus()));
  })();
  const portal = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 48, 48), pm); portal.frustumCulled = false; portal.renderOrder = 2; portal.visible = false; portal.matrixAutoUpdate = false; shipScene.add(portal);   // on the ship's layer: the galaxy's glows and star clouds are drawn after the scene and would speckle over the picture
  let pI = -1; const _mn = new V3(), _mv = new V3(), _ldp = new V3(), _pm = new THREE.Matrix4(), _up = new V3(), pInfo = { on: false, i: -1, c: new V3(), r: 1 };   // where the portal is, for the record that floats beside it
  function portalUpdate(dt) {
    const L = LOOK; pInfo.on = false; if (!(L.ringPortal ?? 1) || !L.rings || S.mode !== 'fly') { portal.visible = false; return }
    let near = -1; if (best.length) { const i = best[0][1], R = starR(i) * (L.ringSize ?? 1.6), dist = Math.sqrt(best[0][0]), pxK = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)); if (R * pxK / dist > (L.ringPortalPre ?? 4) || L.ringPlay) near = i }   // a little before the ring shows
    if (near >= 0 && (near !== pI || texCache.get(near) !== pt.cur)) { pI = near; pt.cur = shot(D[near]); pt.taps.forEach(t => t.value = pt.cur); pt.glow.value.setRGB(COL[near * 3], COL[near * 3 + 1], COL[near * 3 + 2]) }
    const h = live.find(x => x.i === pI); if (!h || near < 0) { portal.visible = false; return }
    const k = live.indexOf(h); pt.a.value = iA[k] / (GOT[pI] ? 1.3 : 1); pt.depth.value = L.ringPortalDepth ?? .8; pt.size.value = L.ringPortalSize ?? 1.25; pt.dark.value = L.ringPortalBright ?? .85; pt.lens.value = L.ringPortalLens ?? .6; pt.ca.value = L.ringPortalCA ?? .5;
    pt.white.value = 0; pt.brk.value = 0; pt.hit.value.set(0, 0); pt.st.value = 0; pt.dis.value = 0; let memA = 1;
    if ((L.ringMembrane ?? 1) && !h.done && !L.ringPlay) {   // the membrane, by how long until you reach it: wobbly far off, clear on the way in, then in the last moment it warps hard and fades as you go through
      const n = h.nSet ? h.n : _mn.copy(player.pos).sub(h.c).normalize(), s = _mv.copy(player.pos).sub(h.c).dot(n), vn = -player.vel.dot(n), tt = vn > 1 && s > 0 ? s / vn : Infinity;
      const tin = Math.max(.05, L.ringMemIn ?? .5), clr = Math.max(tin * 1.2, L.ringMemClear ?? 1.4), near = Math.pow(Math.max(0, 1 - tt / tin), 1.4), far = sstep(tt, clr, clr * 2.2);
      pt.dis.value = far * (L.ringMemFar ?? .35) + near * 2.2 * (L.ringMemWarp ?? 1); pt.st.value = near * h.r * (L.ringMemBulge ?? .35); memA = 1 - sstep(near, .6, .97);
    }
    _up.set(0, 1, 0).applyQuaternion(camera.quaternion); _pm.lookAt(h.nSet ? _ldp.copy(h.c).add(h.n) : player.pos, h.c, _up);   /* once committed the portal stays put, facing the way you came */ portal.matrix.makeScale(1, 1, 1).copy(_pm).setPosition(h.c); { const k = h.r * (1 - (L.ringWidth ?? .1) * .5); portal.matrix.multiply(_m.makeScale(k, k, 1)) } portal.matrixWorldNeedsUpdate = true; pt.a.value *= memA; portal.visible = pt.a.value > .005; Object.assign(pInfo, { on: portal.visible && !h.done, i: pI, r: h.r }); pInfo.c.copy(h.c);   // just inside the ring's tube, so the ring still frames it
  }
  const update0 = update; function updateAll(dt) { update0(dt); portalUpdate(dt) }
  return { update: updateAll, live, u, portal, pt, pInfo, get ts() { return minTs } };
})();
/* bullet time: once a ring can't be missed, all of time slows, exponentially, to all but a standstill as you pass through it,
   then winds back up just as it slowed */
const slowmo = { k: 1, after: 1e9,
  step(rdt) {
    const L = LOOK, amt = L.rings ? L.ringSlow ?? 1 : 0; this.after += rdt * this.k; if (amt <= 0 || L.ringPlay) { this.k = 1; return }
    const lo = Math.max(.001, L.ringSlowMin ?? .06), F = Math.max(.05, L.ringSlowFrom ?? .5), ts = HALO.ts, sm = x => Math.pow(Math.max(0, Math.min(1, x)), 1.6);   // a soft start, then each moment a fixed share slower
    let k = Math.pow(lo, sm(1 - ts / F));   // softly in, then exponentially slower: all but still at the moment you cross
    k = Math.min(k, Math.pow(lo, sm(1 - this.after / F)));   // and out again the same way, mirror image
    this.k = 1 - amt * (1 - k);
  },
};
function collectSound(v = 1) {   // two quick rising notes, bright and glassy, with a soft whoosh under them
  if (!AC || AC.state !== 'running' || !master) return; const t = AC.currentTime + .005;
  [0, 7, 12].forEach((st, k) => { const f = 880 * Math.pow(2, st / 12), o = AC.createOscillator(), g = AC.createGain(); o.type = k ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f * .985, t + k * .055); o.frequency.exponentialRampToValueAtTime(f, t + k * .055 + .03); g.gain.setValueAtTime(0, t + k * .055); g.gain.linearRampToValueAtTime(.18 * v / (1 + k * .5), t + k * .055 + .006); g.gain.exponentialRampToValueAtTime(.0001, t + k * .055 + .55); o.connect(g); g.connect(master); o.start(t + k * .055); o.stop(t + k * .055 + .6) });
  const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const bp = AC.createBiquadFilter(), g = AC.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(3200, t + .35); g.gain.value = .12 * v; n.buffer = b; n.connect(bp); bp.connect(g); g.connect(master); n.start(t);
}
function collect(i) {
  coach.ring = true;
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
  const show = () => { el.hidden = !LOOK.rings || S.mode !== 'fly'; el.innerHTML = `<b>${gotN.toLocaleString('en')}</b> / ${N.toLocaleString('en')} collected` };
  show(); $('gbtn').setAttribute('aria-pressed', !!LOOK.rings);
  return {
    show,
    update(dt) {
      const L = LOOK, u = stars.u; u.ring.value = L.rings ? 1 : 0; u.rsz.value = (L.ringSize ?? 1.6) * L.bodySize; u.rw.value = L.ringWidth ?? .1; u.gotGlow.value = L.ringGlow ?? 1.8;
      if (gotCard.t > 0) gotCard.t -= dt; ringPop *= Math.exp(-dt / Math.max(.05, L.ringPopTime ?? .7)); HALO.update(dt);
      const want = !L.rings || S.mode !== 'fly'; if (el.hidden !== want) show();
    },
  };
})();
