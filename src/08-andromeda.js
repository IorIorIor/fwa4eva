/* ───────────────────────── Andromeda-style scenery ─────────────────────────
   A big warm bulge, thin brown dust filaments hugging the inside edge of each arm, pink star-forming knots,
   blue star clouds, a soft blue outer disk and two satellite galaxies. */
// soft round points sized in world units (like PointsMaterial with size attenuation), optionally dimmed with distance
function softPoints(pos, { cols = null, size, color = 0xffffff, op = 1, far = false, target = softScene, order = 0 }) {
  const n = pos.length / 3, u = { op: uniform(op), color: uniform(new C3(color)) }, attrs = { aP: [pos, 3] }; if (cols) attrs.aC = [cols, 3];
  const m = skyMat(), vC = varyingProperty('vec3', 'vC');
  m.vertexNode = Fn(() => {
    const mv = modelViewMatrix.mul(vec4(ia('aP', 'vec3'), 1)).toVar(), z = mv.z.negate();
    const ws = length(modelWorldMatrix.mul(vec4(1, 0, 0, 0)).xyz);   // points shrink with whatever they're part of (the exotic winners are scaled down)
    const px = float(size).mul(ws).mul(U.res.y).mul(.5).div(max(z, 1e-3)).toVar(), minPx = target === scene ? float(1) : U.minSoft;
    vC.assign((cols ? ia('aC', 'vec3') : vec3(1)).mul(u.color).mul(far ? farDim(z) : 1).mul(min(1, px.div(minPx).mul(px.div(minPx)))));   // never below a pixel; dimmer instead
    return billboardPx(mv, clamp(px, minPx, 1024));
  })();
  m.fragmentNode = Fn(() => { const a = texture(softDot, uv()).a.mul(u.op); return vec4(vC.mul(a), a) })();
  const mesh = layer(new THREE.Mesh(quads(n, attrs), m), target, order);
  mesh.u = u; return mesh;
}
const andro = new THREE.Group(); softScene.add(andro);
const bulgeR = (GAL_R0 + GAL_LEN) * .25;
const bulgeSpr = [[.7, .55], [1.3, .32], [2.4, .14]].map(([k, o]) => { const s = spriteGlow(softDot, 0xffe2b8, 1, o, softScene, -1); s.userData = { o, k }; s.position.copy(GC); andro.add(s); return s });
const bulgePts = (() => {
  const n = 6000, p = new Float32Array(n * 3), R_ = mulberry32(808), g = gaussOf(R_), q = new V3(), c = new Float32Array(n * 3), cc = new C3();
  for (let i = 0; i < n; i++) { q.set(g(), g() * .55, g()).multiplyScalar(bulgeR * .42); if (q.length() < BH.sh * 2) q.setLength(BH.sh * 2 + R_() * bulgeR * .3); q.applyMatrix4(GM4); p.set([q.x, q.y, q.z], i * 3); cc.setHSL(.08 + R_() * .04, .55, .6 + R_() * .2); c.set([cc.r, cc.g, cc.b], i * 3) }
  const m = softPoints(p, { cols: c, size: 9000, op: .05, far: true, order: -1 }); andro.add(m); return m;
})();
/* dust filaments: thin dark ribbons following the spiral, mostly on the inner edge of each arm (one instanced mesh) */
const dustFil = (() => {
  const n = 7000, SEG = 10, R_ = mulberry32(909), K = ['aR0', 'aOf', 'aTh0', 'aLen', 'aW', 'aA', 'aY', 'aJ', 'aK'], A = Object.fromEntries(K.map(k => [k, new Float32Array(n)]));
  for (let i = 0; i < n; i++) {
    const arm = i % ARMS, u = .08 + Math.pow(R_(), .8) * .95, r = GAL_R0 + u * GAL_LEN, sd = 7700 + r * .045, inner = R_() < .72;
    const off = inner ? -(sd * (.7 + R_() * .6)) : (R_() - .5) * sd * 5, th = arm * 2 * Math.PI / ARMS + armPhase(r) + (R_() - .5) * .06, len = (.04 + R_() * .16) * (inner ? 1 : .6), w = (500 + R_() * 2200) * (1 - u * .3), a = (.4 + R_() * .6) * (inner ? 1 : .55), y = (R_() - .5) * 900, j = R_();
    A.aR0[i] = r; A.aOf[i] = off; A.aTh0[i] = th; A.aLen[i] = len; A.aW[i] = w; A.aA[i] = a; A.aY[i] = y; A.aJ[i] = j; A.aK[i] = Math.max(.5, armSlope(r));
  }
  const g = new THREE.InstancedBufferGeometry(), s = [], sd = [], idx = [];
  for (let k = 0; k <= SEG; k++) for (const sg of [-1, 1]) { s.push(k / SEG); sd.push(sg) }
  for (let k = 0; k < SEG; k++) { const p = k * 2; idx.push(p, p + 1, p + 2, p + 1, p + 3, p + 2) }
  g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(s.length * 3), 3)); g.setAttribute('aS', new THREE.Float32BufferAttribute(s, 1)); g.setAttribute('aSd', new THREE.Float32BufferAttribute(sd, 1)); g.setIndex(idx);
  packInstances(g, n, Object.fromEntries(K.map(k => [k, [A[k], 1]]))); g.instanceCount = n; g.userData.n = n;
  const u = { dust: uniform(1), nearD: uniform(20000), wid: uniform(1), blur: uniform(0), armW: uniform(1), c: uniform(new C3(.1, .055, .035)), len: uniform(1), wig: uniform(.3), rag: uniform(.6), fib: uniform(1), brk: uniform(.45) };
  const m = skyMat({ blend: 'alpha', side: THREE.DoubleSide }), vN = varyingProperty('float', 'vN'), vV = varyingProperty('float', 'vV'), vS = varyingProperty('float', 'vS'), vA = varyingProperty('float', 'vA'), vJ = varyingProperty('float', 'vJ');
  m.vertexNode = Fn(() => {
    const aS = attribute('aS', 'float'), aSd = attribute('aSd', 'float'), len = ia('aLen', 'float').mul(u.len), aJ = ia('aJ', 'float');
    const th = ia('aTh0', 'float').add(aS.mul(len)), r = ia('aR0', 'float').add(ia('aOf', 'float').mul(u.armW)).mul(exp(aS.mul(len).div(ia('aK', 'float'))));   // follows the arm's local winding
    const rr = r.add(aSd.mul(ia('aW', 'float')).mul(.5).mul(u.wid).mul(u.blur.mul(2).add(1))).add(sin(aS.mul(len).mul(90).add(aJ.mul(40))).mul(ia('aW', 'float')).mul(u.wig));   // a slow meander
    const w = fromGal(vec3(cos(th).mul(rr), ia('aY', 'float'), sin(th).mul(rr))).toVar();
    vN.assign(smoothstep(u.nearD.mul(.3), u.nearD, distance(cameraPosition, w))); vV.assign(aSd); vS.assign(aS); vA.assign(ia('aA', 'float')); vJ.assign(ia('aJ', 'float'));
    return cameraProjectionMatrix.mul(cameraViewMatrix.mul(vec4(w, 1)));
  })();
  const h1 = x => fract(sin(x.mul(127.1)).mul(43758.5)), n1 = x => { const i = floor(x), f = fract(x), e = f.mul(f).mul(f.mul(-2).add(3)); return mix(h1(i), h1(i.add(1)), e) };
  m.fragmentNode = Fn(() => {
    const prof = exp(vV.mul(vV).negate().mul(mix(3.2, .9, u.blur))).mul(smoothstep(.8, 1, abs(vV)).oneMinus()).div(u.blur.mul(1.2).add(1));
    const lo = u.brk.mul(.5), brk = smoothstep(lo, lo.add(.4), n1(vS.mul(14).add(vJ.mul(97))).mul(.65).add(n1(vS.mul(41).add(vJ.mul(31))).mul(.35)));
    // ragged, fibrous edges: noise running along the filament (stretched) and across it
    const fb = noise3(vec3(vS.mul(u.fib.mul(70)), vV.mul(u.fib.mul(2.2)), vJ.mul(31))).mul(.65).add(noise3(vec3(vS.mul(u.fib.mul(190)), vV.mul(u.fib.mul(5)), vJ.mul(17).add(3))).mul(.35));
    const rag = mix(1, smoothstep(.2, .72, fb.sub(abs(vV).mul(.25))).mul(1.35), u.rag);
    return vec4(u.c, clamp(prof.mul(rag).mul(brk).mul(sin(vS.mul(3.14159))).mul(vA).mul(u.dust).mul(.8).mul(vN), 0, .92));
  })();
  const mesh = layer(new THREE.Mesh(g, m), scene, 1); mesh.u = u; return mesh;
})();
/* pink star-forming knots on the arms, blue star clouds in the outer disk */
const knotPts = (() => {
  const mk = (n, u0, u1, cols, size, op, spread, seed) => {
    const R_ = mulberry32(seed), p = new Float32Array(n * 3), c = new Float32Array(n * 3), q = new V3(), cc = new C3(), W = new C3(1, 1, 1);
    for (let i = 0; i < n; i++) { const u = u0 + R_() * (u1 - u0), r = GAL_R0 + u * GAL_LEN, sd = (7700 + r * .045) * spread, arm = (R_() * ARMS) | 0; galPoint(GAL, arm, u, (R_() - .5) * sd * 2, (R_() - .5) * sd * 2 / r, (R_() - .5) * 1500, q); p.set([q.x, q.y, q.z], i * 3); cc.set(cols[(R_() * cols.length) | 0]).lerp(W, R_() * .25); c.set([cc.r, cc.g, cc.b], i * 3) }
    const m = softPoints(p, { cols: c, size, op, far: true, order: 0 }); m.userData.o = op; andro.add(m); return m
  };
  return { knots: mk(1500, .12, 1, ['#ff6fa8', '#ff85b8', '#ff4f8f', '#ffa0c8'], 2600, .5, .8, 1001), clouds: mk(2600, .55, 1.05, ['#9ec3ff', '#b7d4ff', '#cfe0ff'], 6000, .16, 2.2, 1002) };
})();
/* soft outer disk: fades into a blue glow beyond the rim */
const outerDisk = (() => {
  const Rr = (GAL_R0 + GAL_LEN) * 1.6, g = new THREE.PlaneGeometry(Rr * 2, Rr * 2); g.rotateX(-Math.PI / 2);
  const u = { op: uniform(1), c: uniform(new C3(.24, .4, .85)) }, m = skyMat({ side: THREE.DoubleSide });
  const vD = varying(modelViewMatrix.mul(vec4(positionGeometry, 1)).z.negate(), 'vD');
  m.fragmentNode = Fn(() => { const r = length(positionGeometry.xz).div(Rr), a = smoothstep(.2, .5, r).mul(smoothstep(.55, 1, r).oneMinus()).mul(farDim(vD)); return vec4(u.c.mul(a).mul(.16).mul(u.op), 1) })();
  const mesh = new THREE.Mesh(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); mesh.renderOrder = -3; mesh.frustumCulled = false; andro.add(mesh); mesh.u = u; return mesh;
})();
/* two satellite galaxies: a compact bright one near the disk (like M32) and a big diffuse one (like M110) */
const SATS = [{ name: 'M32', local: new V3(.42, .16, -.22).multiplyScalar(GAL_R0 + GAL_LEN), r: 26000, n: 2600, core: 1, stretch: 1.25 }, { name: 'M110', local: new V3(-.95, -.3, .85).multiplyScalar(GAL_R0 + GAL_LEN), r: 80000, n: 4500, core: .35, stretch: 2.4 }].map((d, k) => {
  const g = new THREE.Group(); g.position.copy(d.local).applyMatrix4(GM4); g.rotation.set(.3 * k, 1.1 * k, .4); andro.add(g); const R_ = mulberry32(77 + k), n = d.n, p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const z = R_() * 2 - 1, a = R_() * 6.283, q = Math.sqrt(1 - z * z), rr = d.r * Math.pow(R_(), 1.6); p.set([q * Math.cos(a) * rr * d.stretch, z * rr, q * Math.sin(a) * rr], i * 3) }
  const pts = softPoints(p, { size: d.r * .09, color: 0xfff0dc, op: .35 }); g.add(pts);
  const glow = spriteGlow(softDot, 0xfff3e0, 1, .5 * d.core, softScene, 0); glow.scale.set(d.r * 3 * d.stretch, d.r * 3, 1);
  const core = spriteGlow(softDot, 0xffffff, d.r * .8, .9 * d.core, softScene, 0); g.add(glow, core);
  return { ...d, g, pos: g.position.clone(), pts, glow, core };
});
