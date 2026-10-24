/* ───────────────────────── the world model ─────────────────────────
   One galaxy. Time spirals inward: 2000 sits on the rim, today circles the black hole at the core.
   Everything random is drawn from one seeded stream in a fixed order, so the sky is the same on every visit
   background stars → haze → nebulae → lanes → arcs → winners → extra nebulae and lanes. */
const SHIP_K = .1, PLAYER_R = 2.4 * SHIP_K, SHIP_SC = .1;   // SHIP_SC: the ship and the camera's distance to it, scaled together (it looks the same size, it's just much smaller in the galaxy)              // the pilot: everything else is measured against this
const SPIRAL = !!SHAPE.spiral;   // one single spiral carrying the whole timeline, instead of arms crossing date rings
const GAL_OUT = 850000 * (SPIRAL ? SHAPE.ssize : 1), GAL_R0 = SHAPE.r0 * (SPIRAL ? SHAPE.shole : 1), GAL_LEN = GAL_OUT - GAL_R0, WIND = SHAPE.wind, ARMS = SPIRAL ? 1 : SHAPE.arms, UNI_D = 2.4e6;
const SP_TW = 2 * Math.PI * 5.4 * SHAPE.turns;   // the single spiral's total turn, core to rim (one turn per five years by default)
/* the single spiral turns at an even pace through time (τ: 0 today, 1 for 2000), but its radius opens geometrically, so the
   windings sit SP_G times further apart at the core than at the rim. u = ρ(τ) is the radius fraction, τ = spTau(u) its inverse
   (carried on in straight lines outside 0…1). */
const SP_G = SHAPE.sgap, SP_LG = Math.log(SP_G), SP_FLAT = Math.abs(SP_LG) < 1e-3, SP_S0 = SP_FLAT ? 1 : (SP_G - 1) / (SP_G * SP_LG), SP_S1 = SP_FLAT ? 1 : (SP_G - 1) / SP_LG;
const spRho = tau => SP_FLAT ? tau : SP_G * (1 - Math.pow(SP_G, -tau)) / (SP_G - 1);
const spTau = u => { if (SP_FLAT) return u; const c = Math.max(0, Math.min(1, u)); return -Math.log(1 - c * (SP_G - 1) / SP_G) / SP_LG + (u - c) * (u < 0 ? SP_S0 : SP_S1) };
const NGAL = 1, GAL_YRS = 5, NERA = 7;   // (the eras are now the years of a galaxy)
const MIN_SEP = SHAPE.sep;          // no two winners closer than this, centre to centre

/* background dust (not data): drawn first so the seeded stream stays in step */
const BG_STARS = (() => {
  const n = 7000, p = new Float32Array(n * 3), br = new Float32Array(n);
  for (let i = 0; i < n; i++) { const u = R() * 2 - 1, a = R() * Math.PI * 2, s = Math.sqrt(1 - u * u); p.set([s * Math.cos(a) * 2.5e7, u * 2.5e7, s * Math.sin(a) * 2.5e7], i * 3); br[i] = Math.pow(R(), 3.2) }
  return { n, p, br };
})();

const GC = new V3(0, -260000, -980000), GQ = new Q4().setFromEuler(new THREE.Euler(.06, .4, ANDRO ? -.3 : -.03)), GQI = GQ.clone().invert();
const GM4 = new THREE.Matrix4().compose(GC, GQ, new V3(1, 1, 1));
const GQ3 = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(GQ)), GQI3 = new THREE.Matrix3().setFromMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(GQI));
const GAL = { name: 'The Galaxy', y0: 2000, arms: ARMS, center: GC, quat: GQ };
/* the universe: 27 galaxies, one per year, strung along a slow helix through space (2026 where you start, each year before
   it a step further along), each turned its own way. UNI.c and UNI.q hold each one's centre and turn in universe coordinates;
   the world you see is the universe moved and turned (UNI.R) so that the galaxy you're in always sits at GC the way GQ
   says, where all its detail is built (far from home the numbers would otherwise lose their precision). */
const UNI_Y0 = 2000, UNI_SPANS = Array.from({ length: 27 }, (_, k) => [2000 + k, 2000 + k]), UNI_N = UNI_SPANS.length;   // a galaxy for every year
const galOfYear = y => { for (let k = 0; k < UNI_N; k++) if (y <= UNI_SPANS[k][1]) return k; return UNI_N - 1 };
const galKey = k => UNI_SPANS[k][0], galName = k => UNI_SPANS[k][0] === UNI_SPANS[k][1] ? String(UNI_SPANS[k][0]) : UNI_SPANS[k][0] + '–' + UNI_SPANS[k][1];   // a galaxy's key (its first year, for its saved settings) and its name
// the clusters: five of five years (2000 began in May, so the first holds 2005 too; the last has six), the galaxies of each gathered round its middle
const CL_SPANS = [[2000, 2005], [2006, 2010], [2011, 2015], [2016, 2020], [2021, 2026]], CL_N = CL_SPANS.length;
const clOf = k => { const y = UNI_SPANS[k][0]; for (let c = 0; c < CL_N; c++) if (y <= CL_SPANS[c][1]) return c; return CL_N - 1 }, clName = c => CL_SPANS[c][0] + '–' + CL_SPANS[c][1];
const clGals = c => { const r = []; for (let k = 0; k < UNI_N; k++) if (clOf(k) === c) r.push(k); return r };
const UNI = { c: Array.from({ length: UNI_N }, () => new V3()), q: Array.from({ length: UNI_N }, () => GQ.clone()), k: UNI_N - 1, home: null, look: null, R: new Q4(), RI: new Q4(), cl: Array.from({ length: CL_N }, () => new V3()) };   // cl: each cluster's middle (universe)   // home/look: where you start and what you face (universe), when the layout has its own
function uniLayout(L = LOOK) {
  const Rg = GAL_OUT, gap = Math.max(2.2, L.uniGap ?? 4.5) * Rg, th = (L.uniTurn ?? 40) * Math.PI / 180, h = gap * Math.max(0, Math.min(.95, L.uniRise ?? .35)), c = Math.sqrt(Math.max(0, gap * gap - h * h));
  const up = new V3(0, 1, 0).applyQuaternion(GQ), x0 = new V3(1, 0, 0).applyQuaternion(GQ), tl = (L.uniTilt ?? 35) * Math.PI / 180, az = (L.uniAz ?? 0) * Math.PI / 180;
  const A = up.clone().applyAxisAngle(x0, tl).applyAxisAngle(up, az).normalize(), B = new V3().crossVectors(A, Math.abs(A.dot(x0)) > .9 ? up : x0).normalize(), C = new V3().crossVectors(A, B);   // the helix's axis, and two directions across it
  const Rh = Math.abs(th) > 1e-3 ? c / (2 * Math.sin(Math.abs(th) / 2)) : 0, mode = Math.round(L.uniLayout ?? 0), rnd = mulberry32(9100 + Math.round(L.uniSeed ?? 1)), rv = () => new V3(rnd() * 2 - 1, rnd() * 2 - 1, rnd() * 2 - 1);
  UNI.home = null; UNI.look = null;
  if (mode === 4) {   // clusters on a semicircle round you: the five clusters from one end of the arc to the other (the oldest a little nearer),
    // each cluster's galaxies spread round its middle in all directions; you start at the arc's centre, facing its middle
    const rr = Math.max(8, L.uniArcR ?? 26) * Rg, sp = L.uniSpread ?? .4, cr = Math.max(1.6, L.uniClusterR ?? 2.8) * Rg, M = new V3(), ga = Math.PI * (3 - Math.sqrt(5));
    for (let c = 0; c < CL_N; c++) { const f = c / (CL_N - 1), a = -Math.PI / 2 + Math.PI * f, r = rr * (1 - sp * (1 - f)); UNI.cl[c].copy(C).multiplyScalar(Math.cos(a) * r).addScaledVector(B, Math.sin(a) * r);
      const ks = clGals(c), n = ks.length, q = new Q4().setFromAxisAngle(rv().normalize(), rnd() * Math.PI);   // round the middle: an even spread over a sphere, turned at random
      ks.forEach((k, j) => { const y = 1 - 2 * (j + .5) / n, rs = Math.sqrt(1 - y * y), t = j * ga; UNI.c[k].set(Math.cos(t) * rs, y, Math.sin(t) * rs).applyQuaternion(q).multiplyScalar(cr * (.85 + .3 * rnd())).add(UNI.cl[c]) }) }
    const off = GC.clone().sub(UNI.c[UNI_N - 1]); UNI.c.forEach(c => c.add(off)); UNI.cl.forEach(c => c.add(off)); UNI.home = M.add(off); UNI.look = C.clone().multiplyScalar(rr).add(UNI.home);
  } else if (mode === 3) {   // all round you: every year's galaxy at about the same distance in its own direction (spread evenly over the sky, one year
    // to the next as neighbours), the oldest nearest; you start in the middle. Laid out round the middle, then moved so 2026 sits at GC
    const n = UNI_N, ga = Math.PI * (3 - Math.sqrt(5)), sp = L.uniSpread ?? .6, M = new V3(), q = new Q4().setFromUnitVectors(new V3(0, 1, 0), A);
    for (let k = 0; k < n; k++) { const y = 1 - 2 * (k + .5) / n, r = Math.sqrt(1 - y * y), t = k * ga, dir = new V3(Math.cos(t) * r, y, Math.sin(t) * r).applyQuaternion(q); UNI.c[k].copy(dir).multiplyScalar(gap * (1 + sp * k / (n - 1))) }
    const off = GC.clone().sub(UNI.c[n - 1]); UNI.c.forEach(c => c.add(off)); UNI.home = M.add(off);
  } else if (mode === 1) {   // a filament: each year a step on from the last, its heading wandering (the cosmic web's strands are like this)
    const d = A.clone().negate(), p = GC.clone(), w = L.uniWander ?? .6; UNI.c[UNI_N - 1].copy(p);
    for (let s = 1; s < UNI_N; s++) { d.addScaledVector(rv(), w).normalize().lerp(A.clone().negate(), .12).normalize(); p.addScaledVector(d, gap * (.75 + .5 * rnd())); UNI.c[UNI_N - 1 - s].copy(p) }
  } else if (mode === 2) {   // groups: five years at a time gathered in a small group (as galaxies are, the Milky Way's Local Group), the groups strung out far apart
    const d = A.clone().negate(), p = GC.clone(), gg = Math.max(1.5, L.uniGroups ?? 3) * gap;
    for (let s = 0; s < UNI_N; s++) { const y = 2026 - s, era = Math.floor((Math.min(y, 2024) - 2000) / 5), first = s === 0 || era !== Math.floor((Math.min(y + 1, 2024) - 2000) / 5);
      if (first && s) { d.addScaledVector(rv(), .5).normalize(); p.addScaledVector(d, gg) }
      const o = UNI.c[UNI_N - 1 - s].copy(p); if (s) o.addScaledVector(rv().normalize(), gap * (.45 + .5 * rnd())) }
  } else for (let k = 0; k < UNI_N; k++) { const s = UNI_N - 1 - k, a = s * th, o = UNI.c[k].copy(GC).addScaledVector(A, -h * s);   // the helix. s: years back from 2026
    if (Rh) o.addScaledVector(B, (Math.cos(a) - 1) * Rh).addScaledVector(C, Math.sin(a) * Rh); else o.addScaledVector(B, c * s) }
  const j = (L.uniJitter ?? 0) * gap * .5; if (j > 0) for (let k = 0; k < UNI_N - 1; k++) UNI.c[k].addScaledVector(rv(), j);   // a little randomness on top (2026 stays put)
  if (mode >= 3) for (let k = 0; k < UNI_N; k++) if (UNI.c[k].distanceTo(UNI.home) < gap * .8) UNI.c[k].sub(UNI.home).setLength(gap * .8).add(UNI.home);   // (none right on top of you)
  const m = Rg * 2.6; for (let it = 0; it < 40; it++) { let moved = false; for (let a = 0; a < UNI_N; a++) for (let b = a + 1; b < UNI_N; b++) { const v = UNI.c[b].clone().sub(UNI.c[a]), l = v.length(); if (l < m) { moved = true; v.setLength((m - l) * .5 + 1); if (b !== UNI_N - 1) UNI.c[b].add(v); if (a !== UNI_N - 1) UNI.c[a].sub(v); else UNI.c[b].add(v) } } if (!moved) break }   // never closer than 2.6 radii
  if (mode !== 4) for (let c = 0; c < CL_N; c++) { const ks = clGals(c); UNI.cl[c].set(0, 0, 0); ks.forEach(k => UNI.cl[c].add(UNI.c[k])); UNI.cl[c].divideScalar(ks.length) }   // (other layouts: a cluster's middle is the mean of its galaxies)
  // and each turned its own way: tipped over by up to uniTiltVar, spun round its own axis (2026, the first, as built)
  const tv = (L.uniTiltVar ?? 70) * Math.PI / 180, sv = L.uniSpinVar ?? 1, rq = mulberry32(7300 + Math.round(L.uniSeed ?? 1)), _x = new V3(), _q = new Q4();
  for (let k = 0; k < UNI_N; k++) { const ax = _x.set(rq() * 2 - 1, 0, rq() * 2 - 1).normalize().applyQuaternion(GQ), tilt = tv * Math.sqrt(rq()), spin = sv * rq() * 2 * Math.PI;
    if (k === UNI_N - 1) { UNI.q[k].copy(GQ); continue } UNI.q[k].setFromAxisAngle(ax, tilt).multiply(GQ).multiply(_q.setFromAxisAngle(new V3(0, 1, 0), spin)) }
  uniFrame();
}
// the world as it is now: the galaxy you're in at GC, turned to GQ
function uniFrame() { UNI.R.copy(GQ).multiply(UNI.q[UNI.k].clone().invert()); UNI.RI.copy(UNI.R).invert() }
const uniToWorld = (u, out = new V3()) => out.copy(u).sub(UNI.c[UNI.k]).applyQuaternion(UNI.R).add(GC);
const worldToUni = (p, out = new V3()) => out.copy(p).sub(GC).applyQuaternion(UNI.RI).add(UNI.c[UNI.k]);
uniLayout();
const uniAt = (k, out = new V3()) => uniToWorld(UNI.c[k], out);   // galaxy k's centre in the world as it is now
const uniQ = (k, out = new Q4()) => out.copy(UNI.R).multiply(UNI.q[k]);   // and its turn
/* THE MERGE: a galaxy for every five years. Each one's first January on the rim and its last December round the black hole, so
   the dates below are always those of the galaxy you're in (GYEAR its first year, GEND its last); setGal switches them over */
let GYEAR = 2021, GEND = 2026, T_A = Date.UTC(2021, 0, 1), T_B = Date.UTC(2027, 0, 1);
function setGal(k) { GYEAR = UNI_SPANS[k][0]; GEND = UNI_SPANS[k][1]; T_A = Date.UTC(GYEAR, 0, 1); T_B = Date.UTC(GEND + 1, 0, 1) }
setGal(UNI_N - 1);
const tFrac = t => Math.max(0, Math.min(1, (t - T_A) / (T_B - T_A)));
const tFracAll = t => Math.max(0, Math.min(1, (t - Date.UTC(2000, 0, 1)) / (Date.UTC(2027, 0, 1) - Date.UTC(2000, 0, 1))));   // across all 27 years (a winner's age)
const yearU = t => SPIRAL ? spRho(1 - tFrac(t)) : Math.pow(1 - tFrac(t), .62);                  // 0 = core (today), 1 = rim (2000)
const uToT = u => { u = Math.max(0, Math.min(1, u)); return T_A + (1 - (SPIRAL ? spTau(u) : Math.pow(u, 1 / .62))) * (T_B - T_A) };
const yrsPerU = u => (T_B - T_A) / 3.15576e10 * (SPIRAL ? (SP_FLAT ? 1 : SP_S0 * Math.pow(SP_G, spTau(u))) : 1 / .62 * Math.pow(Math.max(u, .03), 1 / .62 - 1));   // years per unit of u here
// u0 = inner edge (the era's end), u1 = outer edge (its start)
const MON_N = 'January February March April May June July August September October November December'.split(' ');
const ERAS = Array.from({ length: NERA }, (_, k) => ({ k, get y0() { return GYEAR + k }, get name() { return String(GYEAR + k) }, get u0() { return GYEAR + k > GEND ? -1 : GYEAR + k === GEND ? 0 : yearU(Date.UTC(GYEAR + k + 1, 0, 1)) }, get u1() { return GYEAR + k > GEND ? -1 : k ? yearU(Date.UTC(GYEAR + k, 0, 1)) : 1 } }));   // the eras: the galaxy's years
const galOf = y => Math.max(0, Math.min(5, Math.floor((y - 2000) / GAL_YRS)));   // (five-year bands: the chimes' keys)
const eraOfU = u => { if (u >= 1) return 0; for (let k = 0; k < NERA; k++) if (u >= ERAS[k].u0 && u <= ERAS[k].u1) return k; return NERA - 1 };
/* the black hole, sized from its mass on the winners' own scale: a Sun-like winner is ~27 units across one solar radius,
   so a horizon (2.95 km per solar mass) comes out at ~1.1e-4 units per solar mass. Andromeda's 1.4e8 suns: ~16 000 units. */
const BH = {};
function setBH(logM) { BH.M = Math.pow(10, logM); BH.rs = 2.953 * BH.M * (26.6 / 6.96e5); BH.sh = BH.rs * 2.598; BH.isco = BH.rs * 3; BH.disk1 = BH.rs * LOOK.bhDiskOut }   // horizon, shadow (√27/2 rs), inner disk edge, outer disk edge
setBH(LOOK.bhMass);
const OUT_L = new V3().sub(GC).applyQuaternion(GQI), THETA_O = Math.atan2(OUT_L.z, OUT_L.x);   // where the outpost sits, seen from the core
const THR = THETA_O - .3;   // the date ruler's direction (year labels sit along it)
function ringPoint(u, th, y, out = new V3()) { const r = GAL_R0 + u * GAL_LEN; return out.set(Math.cos(th) * r, y, Math.sin(th) * r).applyQuaternion(GQ).add(GC) }
/* the arms: a log spiral near the core; between the 2025 and 2000 rings each arm turns the same angle every five
   years (armBeat × the spacing between arms), so with armBeat 1 every arm crosses every era ring at the same spots.
   The pieces are blended over a short stretch (h, in log radius) so the arm never kinks. armLock mixes in the plain spiral. */
const ARM = (() => {
  const r25 = GAL_R0 + yearU(Date.UTC(2025, 0, 1)) * GAL_LEN, r00 = GAL_R0 + GAL_LEN;
  return { lock: SPIRAL ? 0 : SHAPE.lock, d: SHAPE.beat * 2 * Math.PI / ARMS, x25: Math.log(r25), x00: Math.log(r00), ph25: WIND * Math.log(r25 / GAL_R0), h: .12 };
})();
const eraE = r => { const u = Math.max(0, Math.min(1, (r - GAL_R0) / GAL_LEN)); return 5.4 * (1 - Math.pow(u, 1 / .62)) };   // 0 on the 2000 ring, 5 on 2025
function armPhase(r) {
  if (SPIRAL) return SP_TW * spTau((r - GAL_R0) / GAL_LEN);   // one turn per five years; the windings open out toward the core
  const x = Math.log(Math.max(r, GAL_R0 * .5)), base = WIND * (x - Math.log(GAL_R0)); if (!ARM.lock) return base;
  const mid = ARM.ph25 + (5 - eraE(r)) * ARM.d, out = ARM.ph25 + 5 * ARM.d + WIND * (x - ARM.x00);
  const w1 = sstep(x, ARM.x25 - ARM.h, ARM.x25 + ARM.h), w2 = sstep(x, ARM.x00 - ARM.h, ARM.x00 + ARM.h);
  return base + (((base + (mid - base) * w1) * (1 - w2) + out * w2) - base) * ARM.lock;
}
const armSlope = r => (armPhase(r * 1.01) - armPhase(r / 1.01)) / (2 * Math.log(1.01));   // dφ/d ln r: how tightly the arm winds here
// arms widen toward the rim: 1 at the start of the arms, 1 + widen at the rim (shape setting, so fixed once built)
const armWAt = r => 1 + SHAPE.widen * Math.pow(Math.min(1, Math.max(0, (r - GAL_R0) / GAL_LEN)), SHAPE.wcurve);
function galPoint(g, arm, u, dr, dth, y, out = new V3()) {
  const wk = armWAt(GAL_R0 + u * GAL_LEN) / (SHAPE.widen + 1); dr *= wk; dth *= wk;   // everything placed across an arm spreads wider further out (the rim keeps its width, the inner arms draw in)
  const r0 = GAL_R0 + u * GAL_LEN, r = Math.max(GAL_R0 * .3, r0 + dr), th = arm * 2 * Math.PI / g.arms + armPhase(SPIRAL ? r0 : r) + dth;   // on the single spiral a step outward stays at its date (the angle of its own place on the line); with arms it follows the arm
  return out.set(Math.cos(th) * r, y, Math.sin(th) * r).applyQuaternion(g.quat).add(g.center);
}
const toLocal = (p, out = new V3()) => out.copy(p).sub(GC).applyQuaternion(GQI);     // galaxy frame: disk in xz
// how far round the spiral a local point sits: 0 on an arm's centre line, 1 halfway between arms
function armDist(lx, lz) { const rr = Math.hypot(lx, lz), ph = Math.atan2(lz, lx) - armPhase(rr); return Math.abs(((ARMS * ph / (2 * Math.PI) + .5) % 1 + 1) % 1 - .5) * 2 }
const NEB_PAL = [['#62d6dc', '#2c6fa8'], ['#b9d4f0', '#5a6fd8'], ['#ff4fa3', '#7c3cff'], ['#b06bff', '#3b2a9e'], ['#ffd28e', '#e0703a'], ['#ff9e7a', '#ff4f7b']];

/* arm haze: big, very soft puffs that overlap into a continuous glow */
const HAZE = (() => {
  const n = 104000, ctr = new Float32Array(n * 3), ctrP = new V3(), p = new Float32Array(n * 3), c = new Float32Array(n * 3), c2 = new Float32Array(n * 3), sz = new Float32Array(n), col = new C3(), pc = new C3(), pt = new V3();
  for (let i = 0; i < n; i++) {
    const k = i % NGAL, u = Math.pow(R(), .85 * SHAPE.hc) * 1.05, r = GAL_R0 + u * GAL_LEN, s = 10500 + r * .07;
    const arm = (R() * GAL.arms) | 0; galPoint(GAL, arm, u, gauss() * s, gauss() * s / r * .9, gauss() * (1750 + 21000 * Math.exp(-r / 105000)), pt); p.set([pt.x, pt.y, pt.z], i * 3);
    galPoint(GAL, arm, u, 0, 0, 0, ctrP); ctr.set([ctrP.x, ctrP.y, ctrP.z], i * 3);
    col.setHSL(.68 + R() * .12, .6, .25 + R() * .25); c.set([col.r, col.g, col.b], i * 3);
    pc.set(NEB_PAL[k][R() < .55 ? 0 : 1]).multiplyScalar(.45 + R() * .4); c2.set([pc.r, pc.g, pc.b], i * 3);
    sz[i] = 2400 * (.55 + Math.pow(R(), 2) * 1.9)
  }
  return { n, ctr, p, c, c2, sz };
})();

/* sprite clouds: n camera-facing quads, each a tile of the nebula atlas */
function cloudField(count, place, pal) {
  const n = count, off = new Float32Array(n * 3), sc = new Float32Array(n), c1 = new Float32Array(n * 3), c2 = new Float32Array(n * 3), rot = new Float32Array(n), al = new Float32Array(n), tl = new Float32Array(n), pt = new V3(), cc = new C3();
  for (let i = 0; i < n; i++) {
    place(pt, i, sc, al);
    const pp = pal ? pal(i) : NEB_PAL[0]; off.set([pt.x, pt.y, pt.z], i * 3);
    cc.set(pp[0]).offsetHSL((R() - .5) * .06, 0, (R() - .5) * .1); c1.set([cc.r, cc.g, cc.b], i * 3); cc.set(pp[1]).offsetHSL((R() - .5) * .06, 0, 0); c2.set([cc.r, cc.g, cc.b], i * 3);
    rot[i] = R() * 6.283; tl[i] = (R() * 4) | 0
  }
  return { n, off, sc, c1, c2, rot, al, tl };
}
const armPlace = (spread, ys) => (pt, i, sc, al) => {
  const u = Math.pow(R(), .5 * Math.pow(2.4, 1 - 2 * SHAPE.nebOut)), r = GAL_R0 + u * GAL_LEN, sd = spread + r * .05;   // nebOut .5 spreads them evenly over the disk's area, lower gathers them in, higher pushes them out
  galPoint(GAL, (R() * GAL.arms) | 0, u, gauss() * sd, gauss() * sd / r * .8, gauss() * (ys + 14000 * Math.exp(-r / 87500)), pt); sc[i] = (35000 + R() * 105000) * (1 - u * .35); al[i] = .35 + R() * .5
};
const NEB_A = cloudField(640, armPlace(17500, 2450));
const LANE_A = cloudField(270, armPlace(8750, 1400));

/* long-exposure arcs: short orbital arcs of the star field, plus very bright ones hugging the inner edge
   of each arm (the rim). Positions are computed on the GPU so the arcs drift around the core. */
const ARCS = (() => {
  const per = 28000, rimN = 3600, arcs = [];
  for (let i = 0; i < per + rimN; i++) {
    const rim = i >= per; let r, th, y, len, b, arcOff = [0, 0];
    if (!rim) {
      const u = Math.pow(R(), .85) * 1.02, arm = (R() * GAL.arms) | 0; r = GAL_R0 * .6 + u * GAL_LEN + gauss() * (6000 + u * GAL_LEN * .07);
      { const ctr = GAL_R0 * .6 + u * GAL_LEN; arcOff = [r - ctr, 0] } th = arm * 2 * Math.PI / GAL.arms + armPhase(r); arcOff[1] = gauss() * .22; arcOff[0] = r - (GAL_R0 * .6 + u * GAL_LEN); r -= arcOff[0]; y = gauss() * (1400 + 12000 * Math.exp(-r / 100000)); len = (.5 + R()) * (R() < .15 ? 2.2 : 1); b = Math.pow(R(), 2.4) * 1.2 + .05
    } else { const u = Math.pow(R(), 1.3) * .55, arm = (R() * GAL.arms) | 0; r = GAL_R0 * .9 + u * GAL_LEN + gauss() * 1500; th = arm * 2 * Math.PI / GAL.arms + armPhase(r) - .12 + gauss() * .025; y = gauss() * 600; len = 1.5 + R() * 2; b = 1.1 + R() * 1.6 }
    arcs.push([r, th, y, len, b, rim ? 1 : 0, Math.random(), rim ? 0 : arcOff[0], rim ? 0 : arcOff[1]])
  }
  arcs.sort((a, b) => b[5] - a[5]);   // rim arcs first, so "arc count" thins only the ordinary ones
  return { arcs, rimN };
})();

/* ───────────── winners ─────────────
   Sites of the Day are ordinary stars, hotter and bigger the higher the jury score, with a few giants and
   dwarfs. Every FWA of the Year and about half the Sites of the Month are something exotic. */
const KINDS = [   // [name, colour, size]
  ['O-type blue star', '#9bb0ff', 1.5], ['B-type blue-white star', '#aabfff', 1.3], ['A-type white star', '#cad7ff', 1.12], ['F-type yellow-white star', '#f6f4ff', 1],
  ['G-type yellow star', '#fff2d8', .95], ['K-type orange star', '#ffd2a1', .88], ['M-type red dwarf', '#ffad7a', .7],
  ['Red giant', '#ff8c4a', 1.7], ['White dwarf', '#e6eeff', .45], ['Blue supergiant', '#a6c2ff', 2.1], ['Red supergiant', '#ff6a3a', 2.3],
  ['Yellow giant', '#ffe08a', 1.5], ['Brown dwarf', '#c4624a', .5], ['Subgiant', '#ffe7c4', 1.15], ['T Tauri star (newborn)', '#ffbf80', .85],
  ['Stellar black hole', '#ffb27a', .5], ['Jetted black hole', '#9fd0ff', .6], ['Pulsar', '#a8d8ff', .6], ['Wolf–Rayet star', '#8ff0ff', .9], ['Shedding red supergiant', '#ff6a3a', 1.2], ['Planetary nebula', '#7fffd4', .6], ['Protostar', '#ff9e6e', .7], ['Supernova remnant', '#ff7fb0', .5], ['Binary star', '#fff0d0', .9]];
const EXO_NAMES = ['Stellar black hole', 'Jetted black hole', 'Pulsar', 'Wolf–Rayet star', 'Red supergiant', 'Planetary nebula', 'Protostar', 'Supernova remnant', 'Binary star'];
const EXO0 = 15, KIND = new Uint8Array(N);
{
  const hr = mulberry32(777), pickK = (w, h) => { let s = 0; for (const x of w) s += x[1]; let r = h * s; for (const x of w) { r -= x[1]; if (r <= 0) return x[0] } return w[w.length - 1][0] };
  D.forEach((d, i) => {
    const h = hr(), age = 1 - tFracAll(d.t), sc = (d.score - 7) / 2.8;
    if (d.award === 'FOTY') { KIND[i] = EXO0 + Math.floor(h * 9); return }
    if (d.award === 'SOTM') { if (h < .45) { KIND[i] = EXO0 + Math.floor(h / .45 * 9); return } KIND[i] = pickK([[0, 2], [1, 3], [7, 2], [11, 2], [9, .6], [10, .6], [2, 2]], (h - .45) / .55); return }
    KIND[i] = pickK([[0, 1 + sc * 2], [1, 4 + sc * 4], [2, 8], [3, 10], [4, 12], [5, 13], [6, 12], [7, 3 + age * 7], [8, 1 + age * 6], [11, 2 + age * 2], [12, 2], [13, 3 + age * 3], [14, .5 + (1 - age) * 4], [9, .4], [10, .4]], h)
  })
}
const P = new Float32Array(N * 3), CR = new Float32Array(N), SIZE = new Float32Array(N), TYPE = new Float32Array(N), STAR_R = new Float32Array(N);
// each winner's galaxy (its year), where it sits in it (PL: from that galaxy's centre, in full precision), and the first and last winner of every galaxy
const GI = new Uint8Array(N), PL = new Float64Array(N * 3), UNI_I0 = new Int32Array(UNI_N).fill(-1), UNI_I1 = new Int32Array(UNI_N).fill(-1), UNI_CX = new Float64Array(N * 3);
// every winner sits on its year's timeline: its distance from the core is its date, on one of the arms
D.forEach((d, i) => {
  const k = galOfYear(d.year); GI[i] = k; if (UNI_I0[k] < 0) UNI_I0[k] = i; UNI_I1[k] = i; if (GYEAR !== UNI_SPANS[k][0]) setGal(k);
  const u = yearU(d.t), r = GAL_R0 + u * GAL_LEN, s = 7700 + r * .045, arm = (R() * GAL.arms) | 0, hug = SHAPE.hug;   // hug: a year's few hundred winners can keep close to its line
  const W = SHAPE.bw * hug, H = SHAPE.bh * (2600 + 15000 * SHAPE.ch * Math.exp(-r / 105000)), A = SHAPE.ba;   // the band the winners sit in: width across the arm, height off the disk, spread along it
  const v = SPIRAL ? galPoint(GAL, 0, u, gauss() * s * .7 * W, gauss() * .1 * A * s / r, gauss() * H)   // on the spiral the date is how far along it you are
    : galPoint(GAL, arm, u, gauss() * s * .2 * W, gauss() * 1.1 * A * s / r, gauss() * H);
  const c = UNI.c[k]; v.sub(GC).add(c); UNI_CX.set([c.x, c.y, c.z], i * 3);
  P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
  const aw = d.award === 'FOTY' ? 2 : d.award === 'SOTM' ? 1 : 0;
  CR[i] = [100, 140, 200][aw]; TYPE[i] = aw;
  SIZE[i] = CR[i] * 3.2 * [1, 1.6, 2.4][aw] * KINDS[KIND[i]][2];
  STAR_R[i] = Math.min(110, 28 * KINDS[KIND[i]][2] * [1, 1.3, 1.6][aw]);   // physical radius: fills the sky when parked beside it, neighbours never touch
});
// relax: push winners apart until every pair is at least MIN_SEP apart (a spatial hash keeps this linear). Pushes along
// the direction that carries the date (the radius; along the arm on the single spiral) are damped, so dates barely move.
const P0 = P.slice(), _pw = new V3(), _p0 = new V3(), _p1 = new V3();   // where each date put its winner, before spacing
(function relax(A, n, min) {
  const m2 = min * min, inv = 1 / min, rad = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const lx = A[i * 3] - UNI_CX[i * 3], ly = A[i * 3 + 1] - UNI_CX[i * 3 + 1], lz = A[i * 3 + 2] - UNI_CX[i * 3 + 2], nx = new V3(lx, ly, lz).applyQuaternion(GQI); nx.y = 0; if (SPIRAL) nx.set(-nx.z, 0, nx.x); nx.normalize().applyQuaternion(GQ); rad.set([nx.x, nx.y, nx.z], i * 3) }   // (round each winner's own galaxy's core)
  // cells live in a flat hash (typed arrays, no strings or per-pair arrays); same visiting order as before, so the sky is unchanged
  let HS = 1; while (HS < n * 2) HS <<= 1; const mask = HS - 1, cx = new Int32Array(n), cy = new Int32Array(n), cz = new Int32Array(n), hb = new Int32Array(n), cnt = new Int32Array(HS + 1), ord = new Int32Array(n);
  const hash = (x, y, z) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(z, 83492791)) & mask;
  const damp = (o, c) => { const k = c[0] * rad[o] + c[1] * rad[o + 1] + c[2] * rad[o + 2]; c[0] -= rad[o] * k * .85; c[1] -= rad[o + 1] * k * .85; c[2] -= rad[o + 2] * k * .85 };
  const fi = [0, 0, 0], fj = [0, 0, 0];
  for (let it = 0; it < 60; it++) {
    cnt.fill(0);
    for (let i = 0; i < n; i++) { const x = cx[i] = Math.floor(A[i * 3] * inv), y = cy[i] = Math.floor(A[i * 3 + 1] * inv), z = cz[i] = Math.floor(A[i * 3 + 2] * inv); cnt[(hb[i] = hash(x, y, z)) + 1]++ }
    for (let b = 0; b < HS; b++) cnt[b + 1] += cnt[b];
    { const fillAt = cnt.slice(0, HS); for (let i = 0; i < n; i++) ord[fillAt[hb[i]]++] = i }   // stable: each bucket keeps ascending i
    let moved = 0;
    for (let i = 0; i < n; i++) {
      const x = Math.floor(A[i * 3] * inv), y = Math.floor(A[i * 3 + 1] * inv), z = Math.floor(A[i * 3 + 2] * inv);   // where i is now (it may have been pushed this pass)
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const X = x + dx, Y = y + dy, Z = z + dz, b = hash(X, Y, Z);
        for (let q = cnt[b], qe = cnt[b + 1]; q < qe; q++) {
          const j = ord[q]; if (j <= i || cx[j] !== X || cy[j] !== Y || cz[j] !== Z) continue;
          let ex = A[j * 3] - A[i * 3], ey = A[j * 3 + 1] - A[i * 3 + 1], ez = A[j * 3 + 2] - A[i * 3 + 2]; const d2 = ex * ex + ey * ey + ez * ez;
          if (d2 < m2) {
            let d = Math.sqrt(d2); if (d < 1e-3) { ex = R() - .5; ey = R() - .5; ez = R() - .5; d = Math.hypot(ex, ey, ez) } const push = (min - d) * .5 + .5, f = push / d;
            fi[0] = fj[0] = ex * f; fi[1] = fj[1] = ey * f; fi[2] = fj[2] = ez * f; damp(i * 3, fi); damp(j * 3, fj);
            A[i * 3] -= fi[0]; A[i * 3 + 1] -= fi[1]; A[i * 3 + 2] -= fi[2]; A[j * 3] += fj[0]; A[j * 3 + 1] += fj[1]; A[j * 3 + 2] += fj[2]; moved++
          }
        }
      }
    }
    if (!moved) break;
  }
})(P, N, MIN_SEP);
// spacing may nudge a winner, never carry it off: in the disk at most about one band-width from where its date put it (else
// on the tight inner windings it can land on another year's turn), and a little up or down
const _gcx = new V3(), uLocal = (p, i, out) => out.copy(p).sub(_gcx.fromArray(UNI_CX, i * 3)).applyQuaternion(GQI);   // in winner i's own galaxy's frame
for (let i = 0; i < N; i++) {
  const o = i * 3; uLocal(_pw.set(P0[o], P0[o + 1], P0[o + 2]), i, _p0); uLocal(_pw.set(P[o], P[o + 1], P[o + 2]), i, _p1); const r = Math.hypot(_p0.x, _p0.z), cap = (7700 + r * .045) * .7 * SHAPE.bw * (SPIRAL ? .9 : 3), capY = SHAPE.bh * (2600 + 15000 * SHAPE.ch * Math.exp(-r / 105000)) * 1.5;
  const dx = _p1.x - _p0.x, dz = _p1.z - _p0.z, dh = Math.hypot(dx, dz), k = dh > cap ? cap / dh : 1, dy = Math.max(-capY, Math.min(capY, _p1.y - _p0.y));
  _p1.set(_p0.x + dx * k, _p0.y + dy, _p0.z + dz * k).applyQuaternion(GQ); PL[o] = _p1.x; PL[o + 1] = _p1.y; PL[o + 2] = _p1.z; _p1.add(_gcx.fromArray(UNI_CX, o)); P[o] = _p1.x; P[o + 1] = _p1.y; P[o + 2] = _p1.z;
}
setGal(UNI_N - 1);
// the winners' world positions, from their galaxies' centres as they are now (after the universe has moved, or its layout changed)
const PLL = new Float64Array(N * 3); { const v = new V3(); for (let i = 0; i < N; i++) { v.fromArray(PL, i * 3).applyQuaternion(GQI); PLL[i * 3] = v.x; PLL[i * 3 + 1] = v.y; PLL[i * 3 + 2] = v.z } }   // each winner in its galaxy's own frame
// a galaxy's own dice: the same number in [-1, 1] every time for galaxy k and a salt (a number or a setting's name)
const galRnd = (k, salt) => { let h = typeof salt === 'string' ? [...salt].reduce((a, ch) => Math.imul(a ^ ch.charCodeAt(0), 16777619), 2166136261) : salt * 2654435761; h = Math.imul(h ^ Math.imul(k + 1, 374761393), 668265263); h = Math.imul(h ^ h >>> 13, 1274126177); return ((h ^ h >>> 16) >>> 0) / 4294967296 * 2 - 1 };
// seen from afar every galaxy has its own size and winding (its picture and its winners scaled, and turned by an angle that grows
// with the radius); the galaxy you're in is built at the one size, so as its detail comes in it eases into that (m: 1 its own form … 0 the built one)
const galForm = (k, m = 1, out = {}) => { let L = LOOK; try { L = LOOK_FLY || LOOK } catch (e) { }   // (LOOK_FLY comes later; at load they're one)
  const rj = L.galRand ?? 1, s = Math.exp(galRnd(k, 'size') * .6 * (L.galSizeVar ?? 1) * Math.min(1.5, rj)), w = galRnd(k, 'wind'), tw = (w > 0 ? w * 10 : w * 6) * (L.galWindVar ?? 1) * rj;   /* (tw > 0 unwinds it toward open arms, < 0 winds it tighter) */ out.s = 1 + (s - 1) * m; out.tw = tw * m; return out };
UNI.m = 0;
function uniPlaceStars(only = -1) { const c = new V3(), q = new Q4(), v = new V3(), fm = {}, Rg = GAL_R0 + GAL_LEN; const i0 = only >= 0 ? Math.max(0, UNI_I0[only]) : 0, i1 = only >= 0 ? (UNI_I1[only] < 0 ? -1 : UNI_I1[only]) : N - 1;
  for (let i = i0; i <= i1; i++) { if (i === i0 || GI[i] !== GI[i - 1]) { uniAt(GI[i], c); uniQ(GI[i], q); galForm(GI[i], GI[i] === UNI.k ? UNI.m : 1, fm) } const o = i * 3; v.set(PLL[o], PLL[o + 1], PLL[o + 2]);
  if (fm.tw || fm.s !== 1) { const a = fm.tw * Math.min(Math.hypot(v.x, v.z) / Rg, 1.3), ca = Math.cos(a), sa = Math.sin(a), x = v.x * ca - v.z * sa, z = v.x * sa + v.z * ca; v.set(x * fm.s, v.y * fm.s, z * fm.s) } v.applyQuaternion(q); P[o] = c.x + v.x; P[o + 1] = c.y + v.y; P[o + 2] = c.z + v.z; PL[o] = v.x; PL[o + 1] = v.y; PL[o + 2] = v.z } }
uniPlaceStars();
const NEB_B = cloudField(7040, armPlace(17500, 2450));   // up to 7680 clouds with NEB_A (Cloud count × 640)
const LANE_B = cloudField(500, armPlace(8750, 1400));
const LANE_C = (() => { const s0 = R.state(); R.state(5150); const f = cloudField(1930, armPlace(8750, 1400)); R.state(s0); return f })();   // more dark clouds (count up to 10), drawn from their own seed so nothing else moves
const starPos = (i, out = new V3()) => out.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
const starR = i => STAR_R[i] * LOOK.bodySize, stopR = i => starR(i) * LOOK.stopK, dockDist = i => stopR(i) * 1.02;

/* the outpost: a small station adrift beyond the rim, where every flight starts */
const OUT = { hubR: 40, hubH: 60, ringR: 150, ringT: 20, padY: 64, padHalf: 45 };
// no station any more: every pilot starts just outside the rim and well above the disk, at a random point round it
const HOME_P = (() => { const a = Math.random() * Math.PI * 2, R = GAL_R0 + GAL_LEN; const d = R * (LOOK.spawnDist ?? .75), hh = LOOK.spawnH ?? 50000; return new V3(Math.cos(a) * d, hh, Math.sin(a) * d).applyQuaternion(GQ).add(GC) })();   // where you start: well above the disk, near enough that it fills the view (spawnDist × the galaxy's radius, spawnUp degrees above it)
const uniHome = (out = new V3()) => uniToWorld(UNI.home || HOME_P, out);   // where you start, in the world as it is now
const uniFace = (out = new V3()) => UNI.look ? uniToWorld(UNI.look, out) : out.copy(GC);   // what you face at the start
const uniHomeK = () => { let b = UNI_N - 1, bd = Infinity; const h = UNI.home || HOME_P; for (let k = 0; k < UNI_N; k++) { const d = UNI.c[k].distanceTo(h); if (d < bd) { bd = d; b = k } } return b };   // the galaxy nearest the start
const LIGHT = 1.2e6;   // the speed of light, in world units per second
