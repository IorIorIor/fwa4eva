/* ───────────────────────── exotic winners ─────────────────────────
   Every FWA of the Year and about half the Sites of the Month are one of these, built with the settings chosen in
   the sandbox and scaled so their central star or horizon sits at about an ordinary winner's size. Materials and
   geometry are shared per kind; an object is only assembled when you first come near it. */
const hsl = (h, s = .7, l = .65) => new C3().setHSL(h, s, l);
const _exoMat = new Map(), exoMat = (key, make) => _exoMat.get(key) || (_exoMat.set(key, make()), _exoMat.get(key));   // materials are built once and shared
const exoBits = {
  black: r => new THREE.Mesh(new THREE.SphereGeometry(r, 48, 32), exoMat('black', () => new THREE.MeshBasicMaterial({ color: 0 }))),
  star: (col, r) => { const c = new C3(col); return new THREE.Mesh(new THREE.SphereGeometry(r, 32, 20), exoMat('star' + c.getHex(), () => new THREE.MeshBasicMaterial({ color: c }))) },
  glow: (col, sc, op) => { const c = new C3(col), s = new THREE.Sprite(exoMat('glow' + c.getHex() + '/' + op, () => new THREE.SpriteMaterial({ map: softDot, color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op }))); s.scale.setScalar(sc); return s },
  disk(r0, r1, u) { const m = new THREE.Mesh(new THREE.RingGeometry(r0, r1, 160, 4), exoMat('disk' + r0 + '/' + r1, () => diskMat(r0, r1, u))); m.rotation.x = -Math.PI / 2; return m },
  jets(len, width, mat) { const g = new THREE.Group(); [1, -1].forEach(sg => { const cg = new THREE.CylinderGeometry(width, width * .012, len, 24, 24, true); cg.translate(0, len / 2, 0); const m = new THREE.Mesh(cg, mat); m.scale.y = sg; g.add(m) }); return g },   // pencil-thin at the base, opening slowly
  shell(n, Rr, cA, cB, size, wob, seed, thick = .04) {
    const proto = exoMat('shell' + seed, () => {
      const R_ = mulberry32(seed), p = new Float32Array(n * 3), cl = new Float32Array(n * 3), cc = new C3(), w = new C3(1, 1, 1);
      for (let k = 0; k < n; k++) { const z = R_() * 2 - 1, a = R_() * 6.2832, q = Math.sqrt(1 - z * z), fil = Math.sin(a * 7 + z * 9) * Math.sin(a * 3 - z * 13), r = Rr * (1 + wob * fil + thick * (R_() - .5)); p.set([q * Math.cos(a) * r, z * r, q * Math.sin(a) * r], k * 3); cc.set(fil > 0 ? cA : cB).lerp(w, R_() * .3); cl.set([cc.r, cc.g, cc.b], k * 3) }
      const m = softPoints(p, { cols: cl, size, target: scene }); scene.remove(m); return m;
    });
    return proto.clone();
  },
};
// each kind: params from the sandbox, a builder that returns { obj, tick(t, dt) }. Shared resources live in `S`.
const EXO_KINDS = {
  'Stellar black hole': { P: { size: .43, disk: 1, outer: 3, spin: 1, glowA: .35, tilt: .4 }, build(P, S) {
    const g = new THREE.Group(), r = 120 * P.size; S.du ??= { spin: uniform(P.spin), hot: uniform(1), br: uniform(P.disk) };
    g.add(exoBits.black(r), exoBits.disk(r * 1.25, r * P.outer, S.du), exoBits.glow(0xffb27a, 1400 * P.size, P.glowA)); g.rotation.z = P.tilt; return { obj: g } } },
  'Jetted black hole': { P: { size: 2.43, disk: 1, jetLen: 2100, jetW: 270, jetBr: .25, spin: 2.03, tilt: .58 }, build(P, S) {
    const g = new THREE.Group(), r = 70 * P.size; S.du ??= { spin: uniform(P.spin), hot: uniform(1), br: uniform(P.disk) }; S.ju ??= { br: uniform(P.jetBr), base: P.jetBr }; S.jm ??= jetMat(S.ju);
    g.add(exoBits.black(r), exoBits.disk(r * 1.35, r * 3.6, S.du), exoBits.jets(P.jetLen, P.jetW, S.jm), exoBits.glow(0x9fd0ff, 1300 * P.size, .35)); g.rotation.z = P.tilt; return { obj: g } } },
  'Pulsar': { P: { beamLen: 2400, beamW: 420, beamBr: .21, spin: 4.55, mtilt: .55 }, build(P, S) {
    const g = new THREE.Group(), spin = new THREE.Group(), tilt = new THREE.Group(); S.bu ??= { a: uniform(P.beamBr) }; S.bm ??= beamMat(S.bu); g.add(spin); spin.add(tilt); tilt.rotation.z = P.mtilt;
    [1, -1].forEach(sg => { const cg = new THREE.ConeGeometry(P.beamW, P.beamLen, 32, 1, true); cg.translate(0, -P.beamLen / 2, 0); const b = new THREE.Mesh(cg, S.bm); b.scale.y = -sg; tilt.add(b) });
    spin.add(exoBits.star(0xeaf2ff, 45), exoBits.glow(0xbfd8ff, 700, .9));
    return { obj: g, tick(t, dt) { spin.rotation.y += dt * P.spin } } } },
  'Wolf–Rayet star': { P: { radius: 300, count: 1100, size: 50, wob: .15, hue: .57, glowA: .94, rot: .06 }, build(P) {
    const g = new THREE.Group(); g.add(exoBits.shell(P.count, P.radius, hsl(P.hue, .8, .75), hsl(P.hue + .12, .7, .55), P.size, P.wob, 11), exoBits.glow(hsl(P.hue, .8, .75), P.radius * 2.4, P.glowA), exoBits.star(0xeaffff, 60));
    return { obj: g, tick(t, dt) { g.rotation.y += dt * P.rot } } } },
  'Red supergiant': { P: { env: 4110, shellR: 860, shellN: 800, warm: .044, core: .71 }, build(P) {
    const g = new THREE.Group(); g.add(exoBits.glow(hsl(P.warm, .95, .55), P.env, .55), exoBits.glow(hsl(P.warm + .03, .9, .75), P.env * .37, P.core), exoBits.shell(P.shellN, P.shellR, '#ff9a6a', '#a8402a', 110, .22, 22));
    return { obj: g, tick(t, dt) { g.rotation.y += dt * .02 } } } },
  'Planetary nebula': { P: { ringR: 360, thick: 695, height: 340, count: 4900, mix: .46, size: 40 }, build(P) {
    const g = new THREE.Group(), R_ = mulberry32(33), n = P.count, p = new Float32Array(n * 3), cl = new Float32Array(n * 3), cc = new C3();
    for (let k = 0; k < n; k++) { const a = R_() * 6.2832, r = P.ringR + (R_() - .5) * P.thick, y = (R_() - .5) * P.height * (1 - Math.min(1, Math.abs(r - P.ringR) / (P.thick * .8))); p.set([Math.cos(a) * r, y, Math.sin(a) * r], k * 3); cc.set(R_() < P.mix ? '#7fffd4' : '#ff7fb0'); cl.set([cc.r, cc.g, cc.b], k * 3) }
    const ring = exoMat('pn', () => { const m = softPoints(p, { cols: cl, size: P.size, target: scene }); scene.remove(m); return m }).clone();
    g.add(ring, exoBits.glow(0x9ffff0, P.ringR * 1.9, .5), exoBits.star(0xffffff, 30)); g.rotation.x = .5;
    return { obj: g, tick(t, dt) { g.rotation.y += dt * .04 } } } },
  'Protostar': { P: { diskR: 630, dark: .57, glowA: .86, tilt: .5 }, build(P) {
    const g = new THREE.Group(), dk = new THREE.Mesh(new THREE.RingGeometry(P.diskR * .2, P.diskR, 96, 2), exoMat('protodisk', () => new THREE.MeshBasicMaterial({ color: 0x1a0c06, transparent: true, opacity: P.dark, side: THREE.DoubleSide, depthWrite: false }))); dk.rotation.x = -Math.PI / 2;
    g.add(exoBits.glow(0xff9e6e, P.diskR * 2, P.glowA), dk, exoBits.star(0xffd6b0, 50)); g.rotation.z = P.tilt; return { obj: g } } },
  'Supernova remnant': { P: { radius: 1910, count: 3400, size: 120, wob: .31, hueA: .3, hueB: .65, expand: .02 }, build(P) {
    const g = new THREE.Group(); g.add(exoBits.shell(P.count, P.radius, hsl(P.hueA, .8, .7), hsl(P.hueB, .8, .7), P.size, P.wob, 44));
    return { obj: g, tick(t, dt) { g.rotation.y += dt * .02; g.scale.setScalar(1 + P.expand * Math.sin(t * .6)) } } } },
  'Binary star': { P: { sep: 1700, size: 90, hue: .1, orbit: .15 }, build(P) {
    const g = new THREE.Group(), orb = new THREE.Group(), col = hsl(P.hue, .6, .85); g.add(orb, exoBits.star(0xfff6e8, 150), exoBits.glow(0xfff0d8, 1800, .8));
    const c = exoBits.star(col, P.size), gl = exoBits.glow(col, P.size * 11, .9); c.position.x = gl.position.x = P.sep; orb.add(c, gl); g.rotation.x = .35;
    return { obj: g, tick(t, dt) { orb.rotation.y += dt * P.orbit } } } },
};
const EXO_K = .2, EXO_SHARED = {};
const landmarks = D.map((d, i) => KIND[i] >= EXO0 ? { i, kind: EXO_NAMES[KIND[i] - EXO0], g: null, b: null } : null).filter(Boolean);
function updateLandmarks(dt) {
  const on = !!LOOK.landmarks;
  for (const L of landmarks) {
    const near = on && camera.position.distanceToSquared(starPos(L.i, _lmP)) < 120000 * 120000;
    if (near && !L.g) {   // assemble on first approach
      const K = EXO_KINDS[L.kind], S = EXO_SHARED[L.kind] ??= {}, b = K.build(K.P, S), g = new THREE.Group(); g.add(b.obj);
      starPos(L.i, g.position); g.scale.setScalar(EXO_K * CR[L.i] / 140); g.rotation.y = (L.i * 2.39996) % 6.283; scene.add(g); L.g = g; L.b = b;
    }
    if (L.g) { L.g.visible = near; if (near && L.b.tick) L.b.tick(worldT, dt * tdil) }
  }
  for (const k in EXO_SHARED) { const S = EXO_SHARED[k]; if (S.ju) S.ju.br.value = S.ju.base * LOOK.bhJets }
}
const _lmP = new V3();
