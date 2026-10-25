/* ───────────────────────── time on the disk ─────────────────────────
   Hairline circles (always 1 px). On the map they come in by zoom: the five-year dividers first, single years once
   about ten are in view, months closer still. A ring under the cursor lights up. A date ruler runs from core to rim and
   turns with the camera so its numbers stay in view. In flight they're off unless you ask for them. */
const _rq = new Q4(), _ry = new V3(0, 1, 0);
const timeRings = (() => {
  const SEGS = 360, rings = [];
  for (let y = GYEAR; y <= GEND; y++) for (let m = 0; m < 12; m++) rings.push([y + m / 12, 2]);   // month rings (built for the galaxy you start in)
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
  m.colorNode = vec3(.92, .95, 1); m.opacityNode = vA; m.positionNode = warpL(positionGeometry);
  const mesh = new THREE.LineSegments(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 1);
  return { mesh, u };
})();
// the date ruler: a line from the core to the rim with a notch per era, year and month, built along +x and turned in place
const ruler = (() => {
  const pos = [], aC = [], push = (x, z, c) => { pos.push(x, 0, z); aC.push(c) };
  push(GAL_R0, 0, 3); push(GAL_R0 + GAL_LEN, 0, 3);
  for (let y = GYEAR; y <= GEND; y++) for (let m = 0; m < 12; m++) {
    const uu = yearU(Date.UTC(y, m, 1)); if (uu <= .001) continue; const r = GAL_R0 + uu * GAL_LEN, c = 5, L = 1400;   // months only
    push(r, -L, c); push(r, L, c);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('aC', new THREE.Float32BufferAttribute(aC, 1));
  const u = { era: uniform(.35), yr: uniform(.3), mo: uniform(.3), moR: uniform(100000) }, m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.opacityNode = varying(Fn(() => { const aC = attribute('aC', 'float'), near = smoothstep(u.moR.mul(.4), u.moR, distance(cameraPosition, positionWorld)).oneMinus(); return select(aC.lessThan(3.5), u.era, select(aC.lessThan(4.5), u.yr, u.mo.mul(near))) })(), 'vRulA');
  m.colorNode = vec3(.92, .95, 1); m.positionNode = warpL(positionGeometry);
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
// the black hole bends everything behind it, but these thin lines are drawn on top: where they'd cross its lensed sphere they fade out
const BHM = { c: uniform(new V3()), r: uniform(0) };   // the hole's centre in view space, and its lensing radius
const bhMask = () => { const d = normalize(positionView), t = dot(BHM.c, d), m = length(BHM.c.sub(d.mul(t))); return select(t.greaterThan(0), smoothstep(BHM.r.mul(.45), BHM.r.mul(.9), m), float(1)) };
// the single spiral's own line, core (today) to rim (2000): on the map, and in flight once you're far enough out to see it whole
const spiralLine = SPIRAL ? (() => {
  const pos = [], n = 2400, tau0 = 0;   // the whole year, December at the core to January on the rim
  for (let k = 0; k <= n; k++) { const tau = tau0 + (1 - tau0) * k / n, r = GAL_R0 + spRho(tau) * GAL_LEN, th = armPhase(r); pos.push(Math.cos(th) * r, 0, Math.sin(th) * r) }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const u = { a: uniform(0) }, m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.colorNode = vec3(.92, .95, 1); m.opacityNode = u.a.mul(bhMask()); m.positionNode = warpL(positionGeometry);
  const mesh = new THREE.Line(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 1); mesh.u = u; mesh.visible = false; return mesh;
})() : null;
// month dividers along the spiral timeline: a short tick across the line at the start of every month (a longer one each January)
const monthTicks = SPIRAL ? (() => {
  const pos = [[], [], []], at = u => { const r = GAL_R0 + u * GAL_LEN, th = armPhase(r); return [Math.cos(th) * r, Math.sin(th) * r] };
  const months = () => { const p = []; for (let y = GYEAR; y <= GEND; y++) for (let m = 0; m < 12; m++) { const u = yearU(Date.UTC(y, m, 1)); if (u <= .001 || u >= .999) continue;
    const [x0, z0] = at(u), [x1, z1] = at(u + .0004), tx = x1 - x0, tz = z1 - z0, l = Math.hypot(tx, tz) || 1, nx = -tz / l, nz = tx / l;
    p.push(x0 - nx, 0, z0 - nz, x0 + nx, 0, z0 + nz) } return p };   // unit-length ticks across the line, scaled by their length below: months only (the galaxy's own years)
  pos[0] = months();
  pos[1].push(0, 0, 0, 0, 0, 0); pos[2].push(0, 0, 0, 0, 0, 0);   // (no year or five-year lines: a single empty tick each)
  const u = { a: uniform(0), ya: uniform(0), fade: uniform(.6) }, vE = varying(attribute('aE', 'float'));
  const geoOf = p => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aE', new THREE.Float32BufferAttribute(p.map((_, k) => k % 6 < 3 ? -1 : 1).filter((_, k) => k % 3 === 0), 1)); return g };
  const mk = (p, op) => { const g = geoOf(p);
    const m = new THREE.LineBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }); m.positionNode = warpL(positionGeometry); m.colorNode = vec3(.92, .95, 1);
    m.opacityNode = op.mul(smoothstep(1, float(1).sub(u.fade).clamp(0, .999), abs(vE)).mul(u.fade).add(u.fade.oneMinus())).mul(bhMask());   // each line fades out toward both its tips
    const l = new THREE.LineSegments(g, m); l.userData.base = new Float32Array(p); l.frustumCulled = false; return l };
  const mesh = mk(pos[0], u.a), years = mk(pos[1], u.ya), eras = mk(pos[2], u.ya); mesh.add(years, eras); mesh.years = years;   // the year lines stay on at any zoom; months only up close
  mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 1); years.renderOrder = eras.renderOrder = mesh.renderOrder; mesh.u = u; mesh.visible = false;
  mesh.setLen = (L, YL = L * 2.2, EL = YL) => { const key = L + ',' + YL + ',' + EL + ',' + (LOOK.mapTickCore ?? .8); if (mesh.userData.len === key) return; mesh.userData.len = key; [[mesh, L], [years, YL], [eras, EL]].forEach(([o, L0]) => { const base = o.userData.base, ga = o.geometry.attributes.position, p = ga.array; for (let i = 0; i < p.length; i += 6) { const cx = (base[i] + base[i + 3]) / 2, cz = (base[i + 2] + base[i + 5]) / 2, f = Math.pow(Math.min(1, Math.max(.12, Math.hypot(cx, cz) / (GAL_R0 + GAL_LEN))), LOOK.mapTickCore ?? .8), L = L0 * f; p[i] = cx + (base[i] - cx) * L; p[i + 2] = cz + (base[i + 2] - cz) * L; p[i + 3] = cx + (base[i + 3] - cx) * L; p[i + 5] = cz + (base[i + 5] - cz) * L } ga.needsUpdate = true }) };   // half-lengths in u: months, years, every fifth year
  mesh.gal = GYEAR; mesh.rebuild = () => { if (mesh.gal === GYEAR) return; mesh.gal = GYEAR; const p = months(); mesh.geometry.dispose(); mesh.geometry = geoOf(p); mesh.userData.base = new Float32Array(p); mesh.userData.len = null };   // another galaxy: its own months
  return mesh;
})() : null;

