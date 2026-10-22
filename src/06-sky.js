/* ───────────────────────── the sky: background stars, haze, nebulae, arcs, gas ───────────────────────── */

/* background stars: thousands of faint points far away, squeezed forward and tinted near light speed */
const bgStars = (() => {
  const u = { op: uniform(.7) }, B = BG_STARS, m = skyMat({ blend: 'alpha' });
  const vC = varyingProperty('vec3', 'vC'), vB = varyingProperty('float', 'vB');
  m.vertexNode = Fn(() => {
    const ab = aberrate(ia('aP', 'vec3')), b = ia('aB', 'float');
    vB.assign(mix(.08, 1, b)); vC.assign(mix(vec3(.62, .6, .86), vec3(.95, .92, 1), b));
    return billboardPx(cameraViewMatrix.mul(vec4(ab, 1)), b.mul(1.9).add(1.1).mul(U.dpr.mul(.5).add(.5)));
  })();
  m.fragmentNode = Fn(() => { const d = radial().mul(.5); Discard(d.greaterThan(.5)); return vec4(vC.mul(vB), u.op.mul(vB).mul(smoothstep(.5, .15, d))) })();
  const mesh = layer(new THREE.Mesh(quads(B.n, { aP: [B.p, 3], aB: [B.br, 1] }), m), scene, -50);
  return { mesh, u };
})();

/* wallpaper sky: a deep blue glow behind everything (optional) */
const wallSky = (() => {
  const u = { op: uniform(0), up: uniform(new V3(0, 1, 0).applyQuaternion(GQ)) }, m = skyMat({ blend: 'alpha', side: THREE.BackSide });
  m.fragmentNode = Fn(() => { const d = normalize(positionGeometry), b = dot(d, u.up), band = exp(b.mul(b).mul(-5)); return vec4(mix(vec3(.02, .07, .2), vec3(.07, .2, .48), band).add(vec3(.02, .05, .12).mul(hash3(floor(d.mul(300))))), u.op) })();
  const mesh = layer(new THREE.Mesh(new THREE.SphereGeometry(9e6, 48, 24), m), softScene, -100);
  return { mesh, u };
})();
/* a few big sparkling foreground stars that go with the wallpaper */
const sparkle = (() => {
  const n = 320, p = new Float32Array(n * 3), s = new Float32Array(n), r_ = mulberry32(1234);
  for (let i = 0; i < n; i++) { const z = r_() * 2 - 1, a = r_() * 6.283, q = Math.sqrt(1 - z * z), r = 7e6; p.set([q * Math.cos(a) * r, z * r, q * Math.sin(a) * r], i * 3); s[i] = Math.pow(r_(), 3) }
  const u = { op: uniform(0) }, m = skyMat(), vS = varyingProperty('float', 'vS');
  m.vertexNode = Fn(() => { vS.assign(ia('aS', 'float')); return billboardPx(modelViewMatrix.mul(vec4(ia('aP', 'vec3'), 1)), vS.mul(30).add(6)) })();
  m.fragmentNode = Fn(() => {
    const p = uv().sub(.5), d = length(p), core = exp(d.mul(d).mul(-260)), hal = exp(d.mul(d).mul(-30)).mul(.35);
    const sp = exp(abs(p.x).mul(-70)).add(exp(abs(p.y).mul(-70))).mul(pow(max(0, d.mul(-2).add(1)), 2)).mul(.6).mul(vS);
    return vec4(vec3(.85, .92, 1).mul(core.add(hal).add(sp)).mul(u.op), 1)
  })();
  const mesh = layer(new THREE.Mesh(quads(n, { aP: [p, 3], aS: [s, 1] }), m), scene, -49);
  return { mesh, u };
})();

/* arm haze: big, very soft puffs that overlap into one continuous glow. Each fades before it gets large on
   screen (no discs drifting past the camera) and the black hole stays clear. Accumulated on its own and
   soft-clipped when composited, so overlapping puffs saturate gently instead of blowing out. */
const haze = (() => {
  const H = HAZE, u = { op: uniform(.22), size: uniform(1), soft: uniform(1), near: uniform(1), pal: uniform(.6), mono: uniform(0), h: uniform(1), g: uniform(1), ev: uniform(0), cut: uniform(0), csz: uniform(1), keep: uniform(0), reach: uniform(.18) };
  const m = skyMat(), vC = varyingProperty('vec3', 'vC'), vA = varyingProperty('float', 'vA');
  m.vertexNode = Fn(() => {
    const ctr = ia('aCtr', 'vec3'), dl = U.GQI.mul(ia('aP', 'vec3').sub(ctr)).mul(vec3(u.g, u.h, u.g)), P = ctr.add(U.GQ.mul(dl)).toVar();
    const mv = cameraViewMatrix.mul(vec4(P, 1)).toVar(), z = mv.z.negate();
    const rr = length(toGal(ctr).xz).div(GAL_R0 + GAL_LEN);   // 0 at the core, 1 on the rim
    const even = pow(clamp(rr, .02, 1), u.ev).mul(smoothstep(u.cut.mul(.3), u.cut.add(.001), rr));   // thin the haze toward the core (the rim stays as it is), and clear a hole of radius cut
    const ps = ia('aS', 'float').mul(u.size).mul(mix(u.csz, 1, clamp(rr.mul(2), 0, 1))).mul(pxScale).div(max(z, 1)).toVar(), big = max(60, u.near.mul(320));
    const cw = exp(rr.div(u.reach).pow(2).negate());   // 1 at the core, fading out by `reach`: that haze is brighter and ignores the distance dimming
    vA.assign(mix(farDim(z), 1, cw).mul(u.keep.mul(cw).add(1)).mul(u.op).mul(even).mul(smoothstep(big.mul(.5), big, ps).oneMinus()).mul(smoothstep(.6, 3, ps)).mul(smoothstep(U.bhClear, U.bhClear.mul(2.6), distance(P, U.GC))));
    const c = monoTint(mix(ia('aC', 'vec3'), ia('aPal', 'vec3'), u.pal), u.mono).toVar();
    vC.assign(mix(c, radCol(length(toGal(ctr).xz)).mul(luma(c).mul(1.4).add(.3)), U.rad));
    return billboardPx(mv, min(ps, big));
  })();
  m.fragmentNode = Fn(() => { const d = radial(); Discard(d.greaterThan(1)); const a = exp(d.mul(d).mul(-2.6).mul(u.soft)).mul(d.mul(d).oneMinus()).mul(vA); return vec4(vC.mul(a), a) })();
  const mesh = layer(new THREE.Mesh(quads(H.n, { aP: [H.p, 3], aCtr: [H.ctr, 3], aC: [H.c, 3], aPal: [H.c2, 3], aS: [H.sz, 1] }), m), hazeScene, 0);
  return { mesh, u };
})();

/* sprite clouds: domain-warped nebula tiles (glowing clouds, dark dust lanes, the category nebulae) */
function cloudLayer(fields, u, frag, { blend = 'add', target = softScene, order = -2 } = {}) {
  const n = fields.reduce((s, f) => s + f.n, 0), cat = k => { const s = fields[0][k].length / fields[0].n, a = new Float32Array(n * s); let o = 0; fields.forEach(f => { a.set(f[k], o); o += f[k].length }); return [a, s] };
  const m = skyMat({ blend }), vUv = varyingProperty('vec2', 'vTile'), vCol = varyingProperty('vec3', 'vCol'), vCol2 = varyingProperty('vec3', 'vCol2'), vA = varyingProperty('float', 'vA');
  m.vertexNode = Fn(() => {
    const off = ia('aOff', 'vec3'), Lc = toGal(off).mul(vec3(1, u.flatY, 1)), O = fromGal(Lc).toVar();
    const sc = pow(ia('aSc', 'float').div(60000), u.sizeVar).mul(60000).mul(u.scale).toVar(), rot = ia('aRot', 'float');
    const ang = rot.add(U.time.mul(u.drift).mul(fract(rot.mul(7.3)).sub(.5))), c = cos(ang), s = sin(ang), p = positionGeometry.xy;
    const q = vec2(c.mul(p.x).sub(s.mul(p.y)), s.mul(p.x).add(c.mul(p.y)));
    const tile = ia('aTile', 'float');
    vUv.assign(clamp(uv(), .02, .98).add(vec2(mod(tile, 2), floor(tile.div(2)).oneMinus())).mul(.5));
    const rc = radCol(length(toGal(off).xz)), k = U.rad.mul(u.radOn);
    vCol.assign(mix(ia('aCol', 'vec3'), rc, k)); vCol2.assign(mix(ia('aCol2', 'vec3'), rc.mul(.55), k));
    const dd = distance(cameraPosition, O);
    vA.assign(sin(U.time.mul(.6).add(rot.mul(13))).mul(u.pulse).mul(.5).add(1).mul(farDim(dd)).mul(ia('aAl', 'float')).mul(smoothstep(sc.mul(.1).mul(u.nearK), sc.mul(.75).mul(u.nearK), dd)));
    const mv = cameraViewMatrix.mul(vec4(O, 1));
    return cameraProjectionMatrix.mul(vec4(mv.xy.add(q.mul(sc)), mv.z, 1));
  })();
  m.fragmentNode = frag({ vUv, vCol, vCol2, vA, vQ: uv() });
  const geo = quads(n, { aOff: cat('off'), aSc: cat('sc'), aCol: cat('c1'), aCol2: cat('c2'), aRot: cat('rot'), aAl: cat('al'), aTile: cat('tl') });
  return layer(new THREE.Mesh(geo, m), target, order);
}
const cloudU = (o = {}) => ({ scale: uniform(1), flatY: uniform(1), nearK: uniform(1), drift: uniform(0), sizeVar: uniform(1), pulse: uniform(0), radOn: uniform(1), ...o });
const NEB_U = cloudU({ det: uniform(0), dsz: uniform(4), dsh: uniform(1), neb: uniform(1), mono: uniform(0), cloud: uniform(1), fil: uniform(1), soft: uniform(1), contrast: uniform(1), hot: uniform(1), sat: uniform(1), hue: uniform(0), edge: uniform(1), bright: uniform(1), alphaMax: uniform(1) });
const nebula = cloudLayer([NEB_A, NEB_B], NEB_U, ({ vUv, vCol, vCol2, vA, vQ }) => Fn(() => {
  const u = NEB_U, w = smoothstep(.5, u.soft.mul(-.2).add(.5), length(vQ.sub(.5))), t = texture(nebAtlas, vUv);
  const dq = vec3(vUv.mul(u.dsz.mul(8)), 0), det = pow(noise3(dq).mul(.65).add(noise3(dq.mul(2.3).add(5.1)).mul(.35)).mul(1.5).sub(.15).max(0), u.dsh);   // fine detail: two octaves of noise breaking each cloud up
  const dn = pow(t.r.mul(w).mul(mix(1, det, u.det)), u.contrast), fil = t.g.mul(w);
  const c = mix(vCol2, vCol, smoothstep(u.edge.mul(.15), .85, dn)).add(vec3(1, .95, .9).mul(fil).mul(.4).mul(u.hot)).toVar();
  c.assign(hueRot(c, u.hue.mul(6.2832))); c.assign(mix(vec3(luma(c)), c, u.sat).mul(u.bright)); c.assign(monoTint(c, u.mono));
  const al = min(u.alphaMax, dn.mul(.32).mul(u.cloud).add(fil.mul(.22).mul(u.fil)).mul(vA).mul(u.neb));
  return vec4(c.mul(al), al);
})());
const LANE_U = cloudU({ lane: uniform(.6), detail: uniform(.6), dscale: uniform(1), contrast: uniform(1.2), thin: uniform(.1), soft: uniform(1), warm: uniform(.3), amax: uniform(.9) });
const lanes = cloudLayer([LANE_A, LANE_B, LANE_C], LANE_U, ({ vUv, vA, vQ }) => Fn(() => {
  const u = LANE_U, q = vQ.sub(.5), sd = vA.mul(37.1), f = u.dscale.mul(7);
  // the soft atlas blob, broken up by two octaves of finer noise into fibres and holes, then thinned and sharpened
  const fib = noise3(vec3(q.mul(f), sd)).mul(.6).add(noise3(vec3(q.mul(f.mul(2.7)).add(4.1), sd.add(9))).mul(.4));
  const base = texture(nebAtlas, vUv).r.mul(smoothstep(.5, u.soft.mul(-.18).add(.48), length(q)));
  const dn = pow(smoothstep(u.thin, 1, base.mul(mix(1, fib.mul(1.7), min(u.detail, 1))).mul(pow(fib.mul(1.7), max(u.detail.sub(1), 0).mul(.35)))), u.contrast);   // past 1 the fibres keep cutting deeper
  return vec4(mix(vec3(.012, .008, .02), vec3(.075, .042, .024), u.warm), clamp(dn.mul(.8).mul(vA).mul(u.lane), 0, u.amax));
})(), { blend: 'alpha', order: -1 });
/* the galaxy core's glow, seen from afar */
const spriteGlow = (map, col, scale, op, target = softScene, order = -1) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op })); s.scale.setScalar(scale); s.renderOrder = order; target.add(s); return s };
const coreGlow = spriteGlow(glowTex, 0xffffff, 300000, .3); coreGlow.position.copy(GC);

/* face-on spiral disc: what the galaxy looks like from far away */
const disc = (() => {
  const SZ = 512, S = GAL_R0 + GAL_LEN * 1.15;
  const tex = canvasTex(SZ, SZ, g => {
    const sc = SZ / 2 / S, cc = new C3(); g.globalCompositeOperation = 'lighter';
    const cg = g.createRadialGradient(SZ / 2, SZ / 2, 0, SZ / 2, SZ / 2, SZ * .16); cg.addColorStop(0, 'rgba(255,240,220,.9)'); cg.addColorStop(.4, NEB_PAL[0][0] + '55'); cg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = cg; g.fillRect(0, 0, SZ, SZ);
    const rr = mulberry32(77), gs = gaussOf(rr);
    for (let i = 0; i < 22000; i++) {
      const arm = i % ARMS, u = Math.pow(rr(), .9), r = GAL_R0 + u * GAL_LEN + gs() * (5250 + u * GAL_LEN * .06), th = arm * 2 * Math.PI / ARMS + armPhase(r) + gs() * .12;
      const x = SZ / 2 + Math.cos(th) * r * sc, y = SZ / 2 + Math.sin(th) * r * sc, rad = 1 + rr() * 3.5; cc.set(NEB_PAL[0][rr() < .6 ? 0 : 1]);
      g.fillStyle = `rgba(${cc.r * 255 | 0},${cc.g * 255 | 0},${cc.b * 255 | 0},${.05 + rr() * .08})`; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill()
    }
  });
  const geo = new THREE.PlaneGeometry(S * 2, S * 2); geo.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, opacity: 0 }));
  m.position.copy(GC); m.quaternion.copy(GQ); return layer(m, softScene, -3);
})();

/* long-exposure arcs: each arc is a thin camera-facing ribbon (so it can be any width and soft), drifting
   around the core at its orbital speed. One instanced mesh: 7 segments per arc. */
const arcs = (() => {
  const SEG = 6, A = ARCS.arcs, n = A.length, cols = ['aR', 'aTh', 'aY', 'aLen', 'aB', 'aRim', 'aJ', 'aDr', 'aDt'], I = {};
  cols.forEach((k, c) => { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = A[i][c]; I[k] = [a, 1] });
  const g = new THREE.InstancedBufferGeometry(), s = [], side = [], idx = [];
  for (let j = 0; j <= SEG; j++) for (const sd of [-1, 1]) { s.push(j / SEG); side.push(sd) }
  for (let j = 0; j < SEG; j++) { const p = j * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2) }
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(s.length * 3), 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1)); g.setIndex(idx);
  packInstances(g, n, I);
  g.instanceCount = n;
  const u = { efade: uniform(0), efar: uniform(300000), eang: uniform(.17), len: uniform(.3), spin: uniform(1), op: uniform(0), rim: uniform(0), cold: uniform(new C3(.62, .76, 1)), armW: uniform(1), pxW: uniform(.001), width: uniform(1.2), blur: uniform(.3), warm: uniform(0), vari: uniform(1), core: uniform(.4), near: uniform(1) };
  const m = skyMat({ side: THREE.DoubleSide }), vA = varyingProperty('float', 'vA'), vRim = varyingProperty('float', 'vRim'), vV = varyingProperty('float', 'vV'), vJ = varyingProperty('float', 'vJ'), vRc = varyingProperty('vec3', 'vRc');
  m.vertexNode = Fn(() => {
    const aS = attribute('aS', 'float'), aSide = attribute('aSide', 'float'), aR = ia('aR', 'float');
    const aWk = armWT(aR).div(SHAPE.widen + 1), Rr = aR.add(ia('aDr', 'float').mul(u.armW).mul(aWk)), w = u.spin.mul(.0035).mul(sqrt(float(GAL_R0).div(max(Rr, GAL_R0 * .3))));
    const th = ia('aTh', 'float').add(ia('aDt', 'float').mul(u.armW).mul(aWk)).add(U.time.mul(w)).add(aS.sub(.5).mul(ia('aLen', 'float')).mul(u.len).mul(.25)).toVar();
    const l = vec3(cos(th).mul(Rr), ia('aY', 'float'), sin(th).mul(Rr)), tl = vec3(sin(th).negate(), 0, cos(th));
    const wp = fromGal(l).toVar(), tw = normalize(U.GQ.mul(tl)), toC = cameraPosition.sub(wp), dist = length(toC).toVar();
    const sd0 = cross(tw, toC.div(max(dist, 1))), sl = length(sd0), sd = select(sl.greaterThan(1e-4), sd0.div(sl), vec3(0));
    const spread = u.blur.mul(4).add(1), wpx = u.width.mul(spread);
    wp.addAssign(sd.mul(aSide).mul(wpx).mul(u.pxW).mul(dist));
    const graze = smoothstep(u.eang, u.eang.mul(.4), abs(dot(toC.div(max(dist, 1)), U.GQ.mul(vec3(0, 1, 0))))), efade = mix(1, smoothstep(u.efar.mul(3), u.efar, dist), graze.mul(u.efade));   // seen rim-on, far arcs fade out
    vV.assign(aSide); vJ.assign(ia('aJ', 'float')); vRim.assign(ia('aRim', 'float')); vRc.assign(radCol(aR));
    vA.assign(farDim(dist).mul(efade).mul(pow(ia('aB', 'float'), u.vari)).mul(sin(aS.mul(3.14159))).mul(mix(u.op.mul(.3), u.rim.mul(.45), vRim)).div(spread).div(max(1, u.width.mul(.7))).mul(smoothstep(0, u.near.mul(4000), dist)));
    return cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(wp, 1)));
  })();
  m.fragmentNode = Fn(() => {
    const prof = exp(vV.mul(vV).negate().mul(mix(9, 1.3, u.blur))).mul(smoothstep(.85, 1, abs(vV)).oneMinus());
    const c = mix(u.cold, vec3(1, .82, .62), u.warm.mul(vJ.mul(.4).add(.6))).toVar();
    c.assign(mix(c, vRc, U.rad)); c.assign(mix(c, vec3(.92, .96, 1), vRim.mul(.7))); c.assign(mix(c, vec3(1), u.core.mul(exp(vV.mul(vV).mul(-30)))));
    return vec4(c.mul(vA).mul(prof).mul(2), 1);
  })();
  const mesh = layer(new THREE.Mesh(g, m), arcScene, 0);
  return { mesh, u, rimN: ARCS.rimN, n };
})();

/* volumetric gas (optional): the disk as an ellipsoid we raymarch through: spiral-arm emission with domain-warped
   noise, plus absorbing dust (Beer–Lambert). Rendered at reduced resolution behind everything else. */
const VOL_S = GAL_R0 + GAL_LEN * 1.12, VOL_H = .2;
const ign = px => fract(float(52.9829189).mul(fract(dot(px, vec2(.06711056, .00583715)))));
const vol = (() => {
  const u = { bh: uniform(1), cam: uniform(new V3()), core: uniform(new C3(NEB_PAL[0][0])), edge: uniform(new C3(NEB_PAL[0][1])), glow: uniform(1), dust: uniform(1), steps: uniform(28), noise: uniform(1), spin: uniform(1),
    wispLo: uniform(0), wispHi: uniform(0), janim: uniform(0), warp: uniform(0), armK: uniform(0), thick: uniform(0), coreV: uniform(0), dustT: uniform(0), emAbs: uniform(0), flow: uniform(0), inner: uniform(0), outer: uniform(0), opMax: uniform(0), coreMix: uniform(0), wispGain: uniform(0), base: uniform(0), detail: uniform(3), satV: uniform(0), contrast: uniform(1), armW: uniform(1), fil: uniform(0), filOff: uniform(.35), filW: uniform(.06), filWig: uniform(.3), filBreak: uniform(.45), filH: uniform(3) };
  const fbmL = Fn(([p_, detail]) => {
    const p = vec3(p_).toVar(), s = float(0).toVar(), a = float(.5).toVar(), nm = float(0).toVar();
    Loop(5, ({ i }) => { If(float(i).greaterThanEqual(detail), () => { Break() }); s.addAssign(a.mul(noise3(p))); nm.addAssign(a); p.assign(p.mul(2.11).add(vec3(1.7, 9.2, 3.1))); a.mulAssign(.5) });
    return s.div(max(nm, .01));
  }).setLayout({ name: 'volFbm', type: 'float', inputs: [{ name: 'p', type: 'vec3' }, { name: 'detail', type: 'float' }] });
  const fbmN = p => fbmL(p, u.detail);
  const m = skyMat({ blend: 'premul', side: THREE.BackSide, depthTest: false });
  m.fragmentNode = Fn(() => {
    const ro = u.cam, rd = normalize(positionGeometry.sub(u.cam)).toVar();
    const b = dot(ro, rd), c = dot(ro, ro).sub(1), disc = b.mul(b).sub(c); Discard(disc.lessThan(0));
    const sq = sqrt(disc), t0 = max(0, b.negate().sub(sq)), t1 = b.negate().add(sq); Discard(t1.lessThanEqual(t0));
    const ds = t1.sub(t0).div(u.steps).toVar(), t = t0.add(ds.mul(ign(screenUV.mul(U.res).add(floor(U.now.mul(60)).mul(u.janim).mul(5.588238))))).toVar();   // interleaved gradient noise: an even, fine grain instead of white noise; it holds still unless "grain moves" is on
    const col = vec3(0).toVar(), T = float(1).toVar();
    Loop(64, ({ i }) => {
      If(float(i).greaterThanEqual(u.steps).or(T.lessThan(.02)), () => { Break() });
      const p = ro.add(rd.mul(t)).toVar(); t.addAssign(ds);
      If(length(vec3(p.x, p.y.mul(VOL_H), p.z)).lessThan(u.bh), () => { Break() });   // the black hole swallows the ray
      const rn = length(p.xz);
      If(rn.lessThanEqual(1), () => {
        const rw = max(rn.mul(VOL_S), GAL_R0 * .5), sda = fract(atan(p.z, p.x).sub(armPhT(rw)).mul(ARMS / 6.28318).add(.5)).sub(.5).mul(2), da = abs(sda);
        const awv = u.armW.mul(armWT(rw)).div(SHAPE.widen + 1), arm = exp(da.mul(da).negate().mul(u.armK).div(awv.mul(awv))).mul(smoothstep(u.inner.mul(.2), u.inner, rn)).mul(smoothstep(u.outer, 1, rn).oneMinus());
        const vert = exp(p.y.mul(p.y).negate().mul(u.thick));
        const ra = U.time.mul(u.spin).mul(.0035).mul(sqrt(float(GAL_R0).div(max(rw, GAL_R0 * .3)))), ca = cos(ra), sa = sin(ra);   // the same differential orbit as the arcs
        const q = vec3(p.x.mul(ca).add(p.z.mul(sa)), p.y, p.z.mul(ca).sub(p.x.mul(sa))).mul(7).mul(u.noise).toVar();
        const w = fbmN(q), nn = fbmN(q.mul(1.8).add(w.mul(u.warp)).add(vec3(0, U.time.mul(.01).mul(u.flow), 0)));
        const wisp = pow(smoothstep(u.wispLo, u.wispHi, nn), u.contrast);
        const core = exp(rn.mul(rn).mul(-90)).mul(exp(p.y.mul(p.y).mul(-14))).mul(smoothstep(.07, .17, rn));
        const em = arm.mul(vert).mul(u.base.add(u.wispGain.mul(wisp))).add(core.mul(u.coreV));
        const dust = arm.mul(vert).mul(smoothstep(u.dustT, u.dustT.add(.28), w)).mul(wisp.mul(-.7).add(1)).mul(u.dust);
        // dark filaments, as volume: thin lanes of dust along the inner edge of each arm, wandering and broken up, thin in height
        const fd = sda.add(u.filOff).add(w.sub(.5).mul(u.filWig)).div(u.filW), fb = smoothstep(u.filBreak, u.filBreak.add(.2), nn);
        const fil = exp(fd.mul(fd).negate()).mul(fb).mul(exp(p.y.mul(p.y).negate().mul(u.thick).mul(u.filH))).mul(smoothstep(u.inner.mul(.2), u.inner, rn)).mul(smoothstep(u.outer, 1, rn).oneMinus()).mul(u.fil);
        const ec = mix(u.edge, u.core, smoothstep(.25, .95, wisp).mul(u.coreMix)).add(vec3(1, .93, .85).mul(core).mul(.9)).toVar();
        ec.assign(mix(vec3(luma(ec)), ec, u.satV)); ec.assign(mix(ec, radCol(rn.mul(VOL_S)).mul(wisp.mul(.8).add(.6)), U.rad));
        const sig = em.mul(.35).mul(u.emAbs).add(dust.mul(3.2)).add(fil.mul(40)).mul(ds).mul(4);
        col.addAssign(T.mul(ec).mul(em).mul(ds).mul(2.6).mul(u.glow)); T.mulAssign(exp(sig.negate()));
      });
    });
    return vec4(col, T.oneMinus().mul(u.opMax));
  })();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), m);
  mesh.position.copy(GC); mesh.quaternion.copy(GQ); mesh.scale.set(VOL_S, VOL_S * VOL_H, VOL_S); mesh.frustumCulled = false; volScene.add(mesh);
  return { mesh, u };
})();
