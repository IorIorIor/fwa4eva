/* ───────────────────────── the winners ─────────────────────────
   Far away each winner is a point-spread function (a white-hot core in a halo of its colour). Close up the
   nearest few become real suns, and the exotic ones are built from the sandbox objects. */
const COL = new Float32Array(N * 3), ALPHA = new Float32Array(N), TA = new Float32Array(N).fill(1);
loadProg(.45);
const stars = (() => {
  const geo = quads(N, { aP: [P, 3], aSize: [SIZE, 1], aType: [TYPE, 1] });
  geo.setAttribute('aColor', new THREE.InstancedBufferAttribute(COL, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(ALPHA, 1).setUsage(THREE.DynamicDrawUsage));
  const u = { coreW: uniform(.18), haloW: uniform(.12), fall: uniform(1.4), spikes: uniform(0), white: uniform(.55), twink: uniform(0), hi: uniform(0), size: uniform(1), glow: uniform(1), flare: uniform(1), sharp: uniform(0), far: uniform(1) };
  const m = skyMat(), vC = varyingProperty('vec3', 'vC'), vA = varyingProperty('float', 'vA'), vT = varyingProperty('float', 'vT'), vPs = varyingProperty('float', 'vPs'), vDot = varyingProperty('float', 'vDot');
  m.vertexNode = Fn(() => {
    const ab = aberrate(ia('aP', 'vec3')), al = ia('aAlpha', 'float');
    const mv = cameraViewMatrix.mul(vec4(ab, 1)).toVar(), on = step(.5, al).mul(u.hi), z = mv.z.negate();
    const ps = ia('aSize', 'float').mul(u.size).mul(on.mul(6).add(1)).mul(pxScale).div(z).toVar(), dot1 = U.dpr.mul(1.9);
    // far away a winner is still a crisp white pixel, out past half the galaxy; beyond that it slowly dims
    vDot.assign(smoothstep(dot1.mul(2.6), dot1, ps)); vPs.assign(clamp(ps, mix(dot1, U.dpr.mul(4), on), 220)); vC.assign(ia('aColor', 'vec3')); vT.assign(ia('aType', 'float'));
    // on the map every winner stays a white pixel; in flight the far ones thin out and fade away
    const flyK = clamp(ps.div(dot1), .3, 1).mul(smoothstep(3.5e5, 1.2e6, z).oneMinus());
    vA.assign(al.mul(mix(.95, 1, smoothstep(dot1, dot1.mul(2), ps))).mul(mix(1, flyK, u.far)));
    return billboardPx(mv, vPs);
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
    If(u.flare.greaterThan(.5).and(vT.greaterThan(.5)).and(vT.lessThan(1.5)), () => {      // Site of the Month: cross flare
      const fx = exp(abs(p.y).mul(-110)).mul(smoothstep(0, .5, abs(p.x)).oneMinus()), fy = exp(abs(p.x).mul(-110)).mul(smoothstep(0, .5, abs(p.y)).oneMinus()), f = fx.add(fy).mul(.85);
      col.addAssign(mix(vC, vec3(1), .55).mul(f)); a.addAssign(f);
    }).ElseIf(u.flare.greaterThan(.5).and(vT.greaterThan(1.5)), () => {                     // FWA of the Year: a small sun, slow-turning rays, corona
      const ang = atan(p.y, p.x), r1 = pow(abs(cos(ang.mul(4).add(U.now.mul(.25)))), 22), r2 = pow(abs(cos(ang.mul(7).sub(U.now.mul(.15)))), 40);
      const fall = smoothstep(.03, .5, d).oneMinus(), rays = r1.mul(.75).add(r2.mul(.45)).mul(fall).mul(fall), cx = d.sub(.14).mul(24), cor = exp(cx.mul(cx).negate()).mul(.55);
      col.addAssign(mix(vC, vec3(1, .94, .82), .6).mul(rays.add(cor)).add(vec3(1, .9, .7).mul(core).mul(.8))); a.addAssign(rays.add(cor));
    });
    col.mulAssign(mix(1, .62, u.sharp.mul(smoothstep(3, 16, vPs).oneMinus())));   // tiny stars stay crisp, below the bloom threshold
    // the far-off dot: a flat, near-white disc that fills its pixel instead of a point-spread too small to land on one
    const dotA = smoothstep(.5, .32, d), dotC = mix(vC, vec3(1), .7).mul(mix(1.05, .85, u.far));   // on the map every winner is a full white pixel
    col.assign(mix(col, dotC, vDot)); a.assign(mix(a, dotA, vDot));
    const k = a.mul(vA); return vec4(col.mul(k), k);
  })();
  const mesh = layer(new THREE.Mesh(geo, m), scene, 2);
  return { mesh, u, aColor: geo.attributes.aColor, aAlpha: geo.attributes.aAlpha };
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

/* constellations: filtered winners joined in date order. Pulses travel from older to newer along each line. */
const CON_MAX = Math.max(1500, N);   // enough segments to chain any filter, date to date
const AG_PAL = ['#ffb547', '#5ee0b0', '#ff6fae', '#7aa2ff', '#c58bff', '#ffd166', '#6ff0d0', '#ff8a5b'], agCol = new Map();
const agColor = a => agCol.get(a) || '#ffb547';
const conPos = new Float32Array(CON_MAX * 2 * 3), conSeq = new Float32Array(CON_MAX * 2), conCol = new Float32Array(CON_MAX * 2 * 3);
const constellation = (() => {
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(conPos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aSeq', new THREE.BufferAttribute(conSeq, 1).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aCol', new THREE.BufferAttribute(conCol, 3).setUsage(THREE.DynamicDrawUsage)); g.setDrawRange(0, 0);
  const u = { t: uniform(0), cur: uniform(-10), op: uniform(0), glow: uniform(1) }, m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const seq = attribute('aSeq', 'float'), seg = floor(seq), f = seq.sub(seg);
  const pulse = smoothstep(.8, 1, fract(f.sub(u.t.mul(.35)))).mul(.9).add(smoothstep(.93, 1, fract(f.mul(3).sub(u.t.mul(1.05)))).mul(.35));
  const isCur = abs(seg.sub(u.cur)).lessThan(.5), hl = select(isCur.or(abs(seg.sub(u.cur.sub(1))).lessThan(.5)), 1, 0), out = hl.mul(select(isCur, 1, .55));
  m.colorNode = mix(attribute('aCol', 'vec3'), vec3(1), pulse.mul(.6).add(out.mul(.3))).mul(pulse.add(.3).add(out.mul(.9))).mul(u.glow);
  m.opacityNode = clamp(pulse.mul(.75).add(.22).add(out.mul(.6)).mul(u.op).mul(u.glow), 0, 1);
  const mesh = layer(new THREE.LineSegments(g, m), scene, 3); mesh.u = u; return mesh;
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
