/* ───────────────────────── time on the disk ─────────────────────────
   Hairline circles (always 1 px). On the map they come in by zoom: the five-year dividers first, single years once
   about ten are in view, months closer still. A ring under the cursor lights up. A date ruler runs from core to rim and
   turns with the camera so its numbers stay in view. In flight they're off unless you ask for them. */
const _rq = new Q4(), _ry = new V3(0, 1, 0);
const timeRings = (() => {
  const SEGS = 360, rings = [];
  for (let y = 2000; y <= 2026; y++) { rings.push([y, y % 5 === 0 ? 0 : 1]); for (let m = 1; m < 12; m++) rings.push([y + m / 12, 2]) }
  const pos = [], aY = [], aC = [], push = (x, z, y, c) => { pos.push(x, 0, z); aY.push(y); aC.push(c) };
  rings.forEach(([y, c]) => {
    const u = yearU(Date.UTC(Math.floor(y), Math.round((y % 1) * 12), 1)); if (u <= .001) return; const r = GAL_R0 + u * GAL_LEN;
    for (let j = 0; j < SEGS; j++) { const a0 = j / SEGS * 6.2832, a1 = (j + 1) / SEGS * 6.2832; push(Math.cos(a0) * r, Math.sin(a0) * r, y, c); push(Math.cos(a1) * r, Math.sin(a1) * r, y, c) }
  });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aY', new THREE.Float32BufferAttribute(aY, 1)); g.setAttribute('aC', new THREE.Float32BufferAttribute(aC, 1));
  const u = { era: uniform(.3), yr: uniform(.1), mo: uniform(.1), moR: uniform(100000), armOnly: uniform(.75), armK: uniform(SPIRAL ? 70 : 6), y0: uniform(2000), y1: uniform(2026), hi: uniform(-1), hiA: uniform(0) };
  const m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const vA = varying(Fn(() => {
    const aC = attribute('aC', 'float'), aY = attribute('aY', 'float'), p = positionGeometry;
    const d = distance(cameraPosition, positionWorld), near = smoothstep(u.moR.mul(.4), u.moR, d).oneMinus();
    const a = select(aC.lessThan(.5), u.era, select(aC.lessThan(1.5), u.yr, u.mo.mul(near))).toVar();
    const da = armDaT(p.x, p.z).div(armWT(length(p.xz))); a.mulAssign(mix(1, exp(da.mul(da).mul(u.armK.negate())), u.armOnly));   // only through the arms (on the spiral: a short notch across it)
    const yr = floor(aY.add(.0001));
    a.mulAssign(mix(.12, 1, step(u.y0.sub(.01), yr).mul(step(yr, u.y1.add(.01)))));   // filtered years stand out as a lit band
    return select(abs(aY.sub(u.hi)).lessThan(.005), max(a, u.hiA.mul(.95)), a);        // the ring under the cursor lights up, all the way round
  })(), 'vRingA');
  m.colorNode = vec3(.92, .95, 1); m.opacityNode = vA;
  const mesh = new THREE.LineSegments(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 1);
  return { mesh, u };
})();
// the date ruler: a line from the core to the rim with a notch per era, year and month, built along +x and turned in place
const ruler = (() => {
  const pos = [], aC = [], push = (x, z, c) => { pos.push(x, 0, z); aC.push(c) };
  push(GAL_R0, 0, 3); push(GAL_R0 + GAL_LEN, 0, 3);
  for (let y = 2000; y <= 2026; y++) for (let m = 0; m < 12; m++) {
    const uu = yearU(Date.UTC(y, m, 1)); if (uu <= .001) continue; const r = GAL_R0 + uu * GAL_LEN, c = m ? 5 : y % 5 ? 4 : 3, L = m ? 1400 : y % 5 ? 4500 : 9000;
    push(r, -L, c); push(r, L, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(aC, 1));
  const u = { era: uniform(.35), yr: uniform(.3), mo: uniform(.3), moR: uniform(100000) }, m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.opacityNode = varying(Fn(() => { const aC = attribute('aC', 'float'), near = smoothstep(u.moR.mul(.4), u.moR, distance(cameraPosition, positionWorld)).oneMinus(); return select(aC.lessThan(3.5), u.era, select(aC.lessThan(4.5), u.yr, u.mo.mul(near))) })(), 'vRulA');
  m.colorNode = vec3(.92, .95, 1);
  const mesh = new THREE.LineSegments(g, m); mesh.position.copy(GC); layer(mesh, scene, 1); mesh.u = u; mesh.th = THR;
  mesh.turn = th => { mesh.th = th; mesh.quaternion.copy(GQ).multiply(_rq.setFromAxisAngle(_ry, -th)) }; mesh.turn(THR);
  return mesh;
})();
// "you are here in time": the ring at your distance from the core, slightly brighter, with a date riding on it
const youRing = (() => {
  const pts = []; for (let j = 0; j <= 512; j++) { const a = j / 512 * 6.2832; pts.push(new V3(Math.cos(a), 0, Math.sin(a))) }
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  l.position.copy(GC); l.quaternion.copy(GQ); return layer(l, scene, 1);
})();
// day ticks: a tiny ruler beside each nearby winner, one notch per day either side of its date
const DAY_N = 12, dayPos = new Float32Array(DAY_N * 7 * 2 * 3);
const dayTicks = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(dayPos, 3).setUsage(THREE.DynamicDrawUsage)); return layer(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false })), scene, 1) })();
// the single spiral's own line, core (today) to rim (2000): on the map, and in flight once you're far enough out to see it whole
const spiralLine = SPIRAL ? (() => {
  const pos = [], n = 2400, tNow = Math.min(T_B, Date.now()), tau0 = 1 - tFrac(tNow);
  for (let k = 0; k <= n; k++) { const tau = tau0 + (1 - tau0) * k / n, r = GAL_R0 + spRho(tau) * GAL_LEN, th = armPhase(r); pos.push(Math.cos(th) * r, 0, Math.sin(th) * r) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const u = { a: uniform(0) }, m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.colorNode = vec3(.92, .95, 1); m.opacityNode = u.a;
  const mesh = new THREE.Line(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 1); mesh.u = u; mesh.visible = false; return mesh;
})() : null;

