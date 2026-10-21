/* ───────────────────────── the winners ─────────────────────────
   Far away each winner is a point-spread function (a white-hot core in a halo of its colour). Close up the
   nearest few become real suns, and the exotic ones are built from the sandbox objects. */
const COL = new Float32Array(N * 3), ALPHA = new Float32Array(N), TA = new Float32Array(N).fill(1);
// the game: winners you've flown through (kept in this browser). 1 = collected
const GOT = new Float32Array(N); { const g = store.json('sotd-got', []); if (Array.isArray(g)) g.forEach(d => { const i = D.findIndex(x => x.date === d); if (i >= 0) GOT[i] = 1 }) }
loadProg(.45);
const stars = (() => {
  const geo = quads(N, { aP: [P, 3], aSize: [SIZE, 1], aType: [TYPE, 1], aR: [STAR_R, 1] });
  geo.setAttribute('aGot', new THREE.InstancedBufferAttribute(GOT, 1).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(COL, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(ALPHA, 1).setUsage(THREE.DynamicDrawUsage));
  const u = { coreW: uniform(.18), haloW: uniform(.12), fall: uniform(1.4), spikes: uniform(0), white: uniform(.55), twink: uniform(0), hi: uniform(0), size: uniform(1), glow: uniform(1), flare: uniform(1), sharp: uniform(0), far: uniform(1), thin: uniform(0), faint: uniform(0), shine: uniform(1), ring: uniform(0), rsz: uniform(1.6), rw: uniform(.1), gotGlow: uniform(1.8) };
  const m = skyMat(), vC = varyingProperty('vec3', 'vC'), vA = varyingProperty('float', 'vA'), vT = varyingProperty('float', 'vT'), vPs = varyingProperty('float', 'vPs'), vDot = varyingProperty('float', 'vDot'), vRing = varyingProperty('float', 'vRing'), vRon = varyingProperty('float', 'vRon'), vPx = varyingProperty('float', 'vPx'), vGot = varyingProperty('float', 'vGot');
  m.vertexNode = Fn(() => {
    const ab = aberrate(ia('aP', 'vec3')), al = ia('aAlpha', 'float');
    const mv = cameraViewMatrix.mul(vec4(ab, 1)).toVar(), on = step(.5, al).mul(u.hi), z = mv.z.negate();
    const ps = ia('aSize', 'float').mul(u.size).mul(on.mul(6).add(1)).mul(pxScale).div(z).toVar(), dot1 = U.dpr.mul(1.9);
    // far away a winner is still a crisp white pixel, out past half the galaxy; beyond that it slowly dims
    vDot.assign(smoothstep(dot1.mul(2.6), dot1, ps)); vPs.assign(clamp(ps, mix(dot1, U.dpr.mul(4), on), 220)); vC.assign(ia('aColor', 'vec3')); vT.assign(ia('aType', 'float'));
    // on the map every winner stays a white pixel; in flight the far ones thin out and fade away
    const flyK = clamp(ps.div(dot1), .3, 1).mul(smoothstep(3.5e5, 1.2e6, z).oneMinus());
    vA.assign(al.mul(mix(.95, 1, smoothstep(dot1, dot1.mul(2), ps))).mul(mix(1, flyK, u.far)).mul(mix(1, smoothstep(dot1.mul(.45), dot1.mul(1.4), ps), u.thin.mul(on.oneMinus()))).max(u.faint.mul(step(.5, al))));   // (faint: on the map every winner stays at least a faint dot)   // map, zoomed out: winners too small to see fade away instead of each staying a pixel
    // the game: a ring of the star's real size (× ring size). Once it's a few px across the sprite grows to hold it and the ring takes over
    const rpx = ia('aR', 'float').mul(u.rsz).mul(pxScale).div(max(z, .01)), ron = smoothstep(2.5, 7, rpx).mul(u.ring).mul(smoothstep(40, 18, rpx)), side = max(vPs, rpx.mul(2.6)).mul(ron).add(vPs.mul(ron.oneMinus())).min(9000);   // up close the 3D halo takes over
    vRon.assign(ron); vA.assign(vA.mul(mix(1, smoothstep(34, 18, rpx), u.ring)));   // the rings game: once the 3D ring has taken over, no star dot left in its middle
    vRing.assign(rpx.div(side.mul(.5))); vPx.assign(side); vGot.assign(ia('aGot', 'float'));
    return billboardPx(mv, side);
  })();
  m.fragmentNode = Fn(() => {
    const p = vec2(uv().x.sub(.5), uv().y.oneMinus().sub(.5)), d = length(p); Discard(d.greaterThan(.5));
    // point-spread function: a tight white-hot core, a Moffat halo in the star's colour, optional diffraction spikes
    const r = d.mul(2), cw = u.coreW.mul(select(vT.greaterThan(1.5), .5, select(vT.greaterThan(.5), .7, 1)));
    const core = exp(r.mul(r).div(cw.mul(cw)).negate());
    const halo = pow(r.mul(r).div(u.haloW.mul(u.haloW)).add(1), u.fall.negate()).mul(smoothstep(.55, 1, r).oneMinus()).mul(u.glow);
    const spk = u.spikes.mul(smoothstep(6, 24, vPs)).mul(smoothstep(36, 80, vPs).oneMinus()).mul(exp(abs(p.y).mul(-90)).add(exp(abs(p.x).mul(-90)))).mul(pow(max(0, r.oneMinus()), 2.2));
    const tw = sin(U.now.mul(fract(vC.r.mul(91.7)).mul(5).add(3)).add(vC.g.mul(71))).mul(u.twink).mul(.35).add(1);
    const col = mix(vC, vec3(1), u.white).mul(core).mul(1.5).add(vC.mul(halo).mul(.9)).add(mix(vC, vec3(1), .5).mul(spk)).mul(tw).toVar(), a = core.add(halo.mul(.7)).add(spk).toVar();
    If(u.flare.greaterThan(.5).and(u.ring.lessThan(.5)).and(vT.greaterThan(.5)).and(vT.lessThan(1.5)), () => {      // Site of the Month: cross flare
      const fx = exp(abs(p.y).mul(-110)).mul(smoothstep(0, .5, abs(p.x)).oneMinus()), fy = exp(abs(p.x).mul(-110)).mul(smoothstep(0, .5, abs(p.y)).oneMinus()), f = fx.add(fy).mul(.85);
      col.addAssign(mix(vC, vec3(1), .55).mul(f)); a.addAssign(f);
    }).ElseIf(u.flare.greaterThan(.5).and(u.ring.lessThan(.5)).and(vT.greaterThan(1.5)), () => {                     // FWA of the Year: a small sun, slow-turning rays, corona
      const ang = atan(p.y, p.x), r1 = pow(abs(cos(ang.mul(4).add(U.now.mul(.25)))), 22), r2 = pow(abs(cos(ang.mul(7).sub(U.now.mul(.15)))), 40);
      const fall = smoothstep(.03, .5, d).oneMinus(), rays = r1.mul(.75).add(r2.mul(.45)).mul(fall).mul(fall), cx = d.sub(.14).mul(24), cor = exp(cx.mul(cx).negate()).mul(.55);
      col.addAssign(mix(vC, vec3(1, .94, .82), .6).mul(rays.add(cor)).add(vec3(1, .9, .7).mul(core).mul(.8))); a.addAssign(rays.add(cor));
    });
    // the month's and the year's best shine: a slow-turning twinkle that flares now and then (stronger for the year's), with a shimmer of colour round the core
    If(u.shine.greaterThan(0).and(u.ring.lessThan(.5)).and(vT.greaterThan(.5)), () => {
      const yr = step(1.5, vT), ph = fract(vC.r.mul(17.3).add(vC.b.mul(5.1))).mul(6.28), fl = pow(sin(U.now.mul(mix(.9, 1.4, yr)).add(ph)).mul(.5).add(.5), 6).mul(mix(.8, 1.6, yr)).add(mix(.25, .5, yr));
      const an = atan(p.y, p.x).add(U.now.mul(mix(.12, -.2, yr))), nR = mix(4, 8, yr), rays = pow(abs(cos(an.mul(nR.div(2)))), mix(60, 90, yr)).mul(pow(max(0, d.mul(2).oneMinus()), 1.5));
      const hue = fract(an.div(6.2832).add(U.now.mul(.05))), rgb = clamp(abs(fract(vec3(hue).add(vec3(0, .667, .333))).mul(6).sub(3)).sub(1), 0, 1), dq = d.sub(.11).mul(30), irid = exp(dq.mul(dq).negate()).mul(mix(.25, .6, yr));
      const sh = rays.mul(fl).mul(u.shine).mul(mix(1, 1.8, yr)), ir = irid.mul(u.shine).mul(fl.mul(.5).add(.5));
      col.addAssign(vec3(1, .97, .9).mul(sh).add(mix(vec3(1), rgb, .8).mul(ir))); a.addAssign(sh.add(ir));
    });
    col.mulAssign(mix(1, .62, u.sharp.mul(smoothstep(3, 16, vPs).oneMinus())));   // tiny stars stay crisp, below the bloom threshold
    // the far-off dot: a flat, near-white disc that fills its pixel instead of a point-spread too small to land on one
    const dotA = smoothstep(.5, .32, d), dotC = mix(vC, vec3(1), .7).mul(mix(1.05, .85, u.far));   // on the map every winner is a full white pixel
    col.assign(mix(col, dotC, vDot)); a.assign(mix(a, dotA, vDot));
    // the ring: a crisp band (never under a pixel) with a soft glow, its colour until collected, then warm white and brighter
    If(vRon.greaterThan(.001), () => {
      const rf = r.mul(vPs.div(vPx)), px1 = float(2.4).div(vPx), w = max(vRing.mul(u.rw), px1), dd = rf.sub(vRing).div(w), band = exp(dd.mul(dd).negate());
      const gl = exp(sq(rf.sub(vRing).div(vRing.mul(.45).add(px1))).negate()).mul(.35), g = vGot;
      const rc = mix(mix(vC, vec3(1), .25), mix(vC, vec3(1, .88, .62), .7).mul(u.gotGlow), g), ra = band.add(gl.mul(mix(1, u.gotGlow, g)));
      col.assign(mix(col, rc.mul(band.mul(1.3).add(gl)), vRon)); a.assign(mix(a, ra, vRon));
    });
    // the rings game: no flares or rays, the month's and the year's best just burn brighter, their colour slowly cycling
    If(u.ring.greaterThan(.5).and(u.shine.greaterThan(0)).and(vT.greaterThan(.5)), () => {
      const yr = step(1.5, vT), hue = fract(U.now.mul(mix(.07, .12, yr)).add(vC.r.mul(3.1)).add(vC.b)), rgb = clamp(abs(fract(vec3(hue).add(vec3(0, .667, .333))).mul(6).sub(3)).sub(1), 0, 1);
      const br = float(1).add(u.shine.mul(mix(.45, .9, yr)).mul(sin(U.now.mul(1.7).add(vC.g.mul(9))).mul(.3).add(.7))), mx = max(col.r, max(col.g, col.b));
      col.assign(mix(col, mix(vec3(1), rgb, .85).mul(mx), u.shine.mul(mix(.4, .65, yr)).min(1)).mul(br));
    });
    const k = a.mul(vA); return vec4(col.mul(k), k);
  })();
  const mesh = layer(new THREE.Mesh(geo, m), scene, 2);
  return { mesh, u, aColor: geo.attributes.aColor, aAlpha: geo.attributes.aAlpha, aGot: geo.attributes.aGot };
})();

/* nearby winners as suns: limb darkening, boiling granulation, slow convection, a few spots, a bright rim of plasma */
const BODY_N = 12;
const bodies = (() => {
  const geo = new THREE.SphereGeometry(1, 48, 32), iCol = new Float32Array(BODY_N * 3), iA = new Float32Array(BODY_N), iSeed = new Float32Array(BODY_N).map((_, b) => b * 7.3);
  geo.setAttribute('iCol', new THREE.InstancedBufferAttribute(iCol, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('iA', new THREE.InstancedBufferAttribute(iA, 1).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('iSeed', new THREE.InstancedBufferAttribute(iSeed, 1));
  const u = { br: uniform(1) }, m = skyMat({ blend: 'alpha' });
  m.fragmentNode = Fn(() => {
    const uCol = attribute('iCol', 'vec3'), uT = U.now, mu = max(dot(normalize(normalWorld), viewDir()), 0), q = positionGeometry.add(attribute('iSeed', 'float')).toVar();
    const big = fbm5(q.mul(2.2).add(vec3(uT.mul(.03), uT.mul(.02), 0))), gran = fbm5(q.mul(26).add(vec3(0, uT.mul(.25), uT.mul(.18)))), fine = noise3(q.mul(90).add(uT.mul(.4)));
    const spots = smoothstep(.72, .78, fbm5(q.mul(3.3).sub(uT.mul(.01)))).mul(.4);
    const sat = uCol.div(max(.001, max(uCol.r, max(uCol.g, uCol.b)))), hot = mix(sat, vec3(1, .98, .94), .45);
    const c = hot.mul(big.mul(.3).add(.85)).mul(gran.mul(.34).add(.78).add(fine.mul(.08))).mul(spots.oneMinus()).toVar();
    c.mulAssign(pow(mu, .55).mul(.5).add(.5)); c.assign(mix(c, c.mul(vec3(1, .8, .62)), mu.oneMinus().mul(.5))); c.addAssign(pow(mu.oneMinus(), 3).mul(mix(sat, vec3(1), .3)).mul(.9));
    return vec4(c.mul(.95).mul(u.br), attribute('iA', 'float'));
  })();
  const mesh = new THREE.InstancedMesh(geo, m, BODY_N); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.count = 0; layer(mesh, scene, 4);
  const coronas = Array.from({ length: BODY_N }, () => { const s = spriteGlow(softDot, 0xffffff, 1, 0, scene, 3); s.visible = false; return s });
  return { mesh, u, iCol, iA, attrCol: geo.attributes.iCol, attrA: geo.attributes.iA, coronas };
})();
const bodyCand = [];

/* constellations: filtered winners joined in date order, each award to the next: still lines with a soft glow */
const CON_MAX = Math.max(1500, N);   // enough segments to chain any filter, date to date
const AG_PAL = ['#ffb547', '#5ee0b0', '#ff6fae', '#7aa2ff', '#c58bff', '#ffd166', '#6ff0d0', '#ff8a5b'], agCol = new Map();
const fPicks = () => S.agencies.size + S.cats.size, agColor = a => fPicks() === 1 ? '#ffffff' : agCol.get(a) || '#ffb547';   // one filter picked: white; several: each its own colour
const catColor = c => fPicks() === 1 ? '#ffffff' : CAT_COL[CATS.indexOf(c)];
const constellation = (() => {   // each link a screen-space ribbon: a 2 px line with a soft glow round it, the same width near or far
  const g = new THREE.InstancedBufferGeometry(); g.index = QUAD.index; g.setAttribute('position', QUAD.attributes.position); g.setAttribute('uv', QUAD.attributes.uv);
  const pa = new Float32Array(CON_MAX * 3), pb = new Float32Array(CON_MAX * 3), col = new Float32Array(CON_MAX * 3), sq = new Float32Array(CON_MAX);
  [['aA', pa, 3], ['aB', pb, 3], ['aCol', col, 3], ['aSeq', sq, 1]].forEach(([k, a, n]) => g.setAttribute(k, new THREE.InstancedBufferAttribute(a, n).setUsage(THREE.DynamicDrawUsage))); g.instanceCount = 0;
  const u = { t: uniform(0), cur: uniform(-10), op: uniform(0), glow: uniform(1), w: uniform(2), gw: uniform(10) }, m = skyMat({ blend: 'alpha', depthTest: false }), vD = varyingProperty('float', 'vD'), vC = varyingProperty('vec3', 'vC'), vH = varyingProperty('float', 'vH'), vT = varyingProperty('float', 'vAl'), vL = varyingProperty('float', 'vLn');
  m.vertexNode = Fn(() => {
    const near = float(1), A = cameraViewMatrix.mul(vec4(ia('aA', 'vec3'), 1)).toVar(), B = cameraViewMatrix.mul(vec4(ia('aB', 'vec3'), 1)).toVar();
    // clip the link to the space in front of the camera, so a line running past you never flips
    If(A.z.greaterThan(near.negate()), () => { A.assign(mix(A, B, clamp(A.z.add(near).div(A.z.sub(B.z)), 0, 1))) });
    If(B.z.greaterThan(near.negate()), () => { B.assign(mix(B, A, clamp(B.z.add(near).div(B.z.sub(A.z)), 0, 1))) });
    const cA = cameraProjectionMatrix.mul(A), cB = cameraProjectionMatrix.mul(B), half = U.res.mul(.5), sA = cA.xy.div(cA.w).mul(half), sB = cB.xy.div(cB.w).mul(half);
    const dv = sB.sub(sA), L = max(length(dv), 1e-3), dir = dv.div(L), nrm = vec2(dir.y.negate(), dir.x), hw = u.w.mul(.5).add(u.gw).mul(U.dpr), t = uv().x, side = positionGeometry.y.mul(2);
    const c = mix(cA, cB, t), off = nrm.mul(side.mul(hw)).add(dir.mul(t.mul(2).sub(1).mul(hw)));   // a little past each end, so joins round off
    vD.assign(side.mul(hw).div(U.dpr)); vT.assign(t.mul(2).sub(1).mul(hw).div(U.dpr).add(t.mul(L).div(U.dpr))); vL.assign(L.div(U.dpr)); vC.assign(ia('aCol', 'vec3'));   // across, and along (from A, in px; past each end by the cap)
    const seg = floor(ia('aSeq', 'float')), cur = abs(seg.sub(u.cur)).lessThan(.5), prev = abs(seg.sub(u.cur.sub(1))).lessThan(.5); vH.assign(select(cur, 1, select(prev, .55, 0)));
    const behind = A.z.greaterThan(near.negate().mul(.999)).and(B.z.greaterThan(near.negate().mul(.999)));
    return select(behind, vec4(0, 0, 2, 1), c.add(vec4(off.div(half).mul(c.w), 0, 0)));
  })();
  m.fragmentNode = Fn(() => {
    const d = length(vec2(max(0, max(vT.negate(), vT.sub(vL))), vD)), core = smoothstep(u.w.mul(.5).add(.5), u.w.mul(.5).sub(.5), d), glow = exp(d.div(u.gw.mul(.45)).pow(2).negate()).mul(.1);
    const k = u.op.mul(min(u.glow, 1.5)).mul(vH.mul(.5).add(.7)).mul(.6), a = clamp(max(core, glow).mul(k), 0, 1);   // blended, not added: where links cross they don't pile up into white. Distance to the segment itself, so each link ends in a round cap right on its star and the next starts from the same point
    return vec4(mix(vC, mix(vC, vec3(1), .5), core), a);
  })();
  const mesh = layer(new THREE.Mesh(g, m), scene, 3); mesh.u = u; mesh.buf = { pa, pb, col, sq }; return mesh;
})();

/* markers: the autopilot target ring, your ship on the map, and the screenshot that can float in 3D */
const targetRing = layer(new THREE.Mesh(new THREE.RingGeometry(1, 1.06, 64), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: .85, depthTest: false, side: THREE.DoubleSide })), scene, 9); targetRing.visible = false;
const youMark = (() => {
  const tex = canvasTex(128, 128, g => { g.strokeStyle = '#fff'; g.lineWidth = 7; g.beginPath(); g.arc(64, 64, 50, 0, 7); g.stroke(); g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 64, 13, 0, 7); g.fill() });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, sizeAttenuation: false, depthTest: false, depthWrite: false, transparent: true })); s.renderOrder = 30; s.visible = false; scene.add(s); return s;
})();
const SHOT = layer(new THREE.Mesh(new THREE.PlaneGeometry(1, .625), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide })), scene, 5);
SHOT.visible = false; SHOT.userData.i = -1;
const shotLight = new THREE.PointLight(0xffffff, 0, 1, 0); scene.add(shotLight);
