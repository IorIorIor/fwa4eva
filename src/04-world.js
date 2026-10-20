/* ───────────────────────── the world model ─────────────────────────
   One galaxy. Time spirals inward: 2000 sits on the rim, today circles the black hole at the core.
   Everything random is drawn from one seeded stream in a fixed order, so the sky is the same on every visit
   background stars → haze → nebulae → lanes → arcs → winners → extra nebulae and lanes. */
const SHIP_K = .1, PLAYER_R = 2.4 * SHIP_K;              // the pilot: everything else is measured against this
const SPIRAL = !!SHAPE.spiral;   // one single spiral carrying the whole timeline, instead of arms crossing date rings
const GAL_OUT = 850000 * (SPIRAL ? SHAPE.ssize : 1), GAL_R0 = SHAPE.r0 * (SPIRAL ? SHAPE.shole : 1), GAL_LEN = GAL_OUT - GAL_R0, WIND = SHAPE.wind, ARMS = SPIRAL ? 1 : SHAPE.arms, UNI_D = 2.4e6;
const SP_TW = 2 * Math.PI * 5.4 * SHAPE.turns;   // the single spiral's total turn, core to rim (one turn per five years by default)
/* the single spiral turns at an even pace through time (τ: 0 today, 1 for 2000), but its radius opens geometrically, so the
   windings sit SP_G times further apart at the core than at the rim. u = ρ(τ) is the radius fraction, τ = spTau(u) its inverse
   (carried on in straight lines outside 0…1). */
const SP_G = SHAPE.sgap, SP_LG = Math.log(SP_G), SP_FLAT = Math.abs(SP_LG) < 1e-3, SP_S0 = SP_FLAT ? 1 : (SP_G - 1) / (SP_G * SP_LG), SP_S1 = SP_FLAT ? 1 : (SP_G - 1) / SP_LG;
const spRho = tau => SP_FLAT ? tau : SP_G * (1 - Math.pow(SP_G, -tau)) / (SP_G - 1);
const spTau = u => { if (SP_FLAT) return u; const c = Math.max(0, Math.min(1, u)); return -Math.log(1 - c * (SP_G - 1) / SP_G) / SP_LG + (u - c) * (u < 0 ? SP_S0 : SP_S1) };
const NGAL = 1, GAL_YRS = 5, NERA = 6;
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
const T_A = Date.UTC(2000, 0, 1), T_B = Date.UTC(2027, 0, 1);
const tFrac = t => Math.max(0, Math.min(1, (t - T_A) / (T_B - T_A)));
const yearU = t => SPIRAL ? spRho(1 - tFrac(t)) : Math.pow(1 - tFrac(t), .62);                  // 0 = core (today), 1 = rim (2000)
const uToT = u => { u = Math.max(0, Math.min(1, u)); return T_A + (1 - (SPIRAL ? spTau(u) : Math.pow(u, 1 / .62))) * (T_B - T_A) };
const yrsPerU = u => SPIRAL ? 27 * (SP_FLAT ? 1 : SP_S0 * Math.pow(SP_G, spTau(u))) : 27 / .62 * Math.pow(Math.max(u, .03), 1 / .62 - 1);   // years per unit of u here
// u0 = inner edge (the era's end), u1 = outer edge (its start)
const ERAS = Array.from({ length: NERA }, (_, k) => { const y0 = 2000 + k * GAL_YRS; return { k, y0, name: k < NERA - 1 ? `${y0}–${y0 + GAL_YRS - 1}` : `${y0}–now`, u0: k < NERA - 1 ? yearU(Date.UTC(y0 + GAL_YRS, 0, 1)) : 0, u1: k ? yearU(Date.UTC(y0, 0, 1)) : 1 } });
const galOf = y => Math.max(0, Math.min(NERA - 1, Math.floor((y - 2000) / GAL_YRS)));
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
function galPoint(g, arm, u, dr, dth, y, out = new V3()) {
  const r = Math.max(GAL_R0 * .3, GAL_R0 + u * GAL_LEN + dr), th = arm * 2 * Math.PI / g.arms + armPhase(r) + dth;
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
  const u = Math.pow(R(), .8), r = GAL_R0 + u * GAL_LEN, sd = spread + r * .05;
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
    const h = hr(), age = 1 - tFrac(d.t), sc = (d.score - 7) / 2.8;
    if (d.award === 'FOTY') { KIND[i] = EXO0 + Math.floor(h * 9); return }
    if (d.award === 'SOTM') { if (h < .45) { KIND[i] = EXO0 + Math.floor(h / .45 * 9); return } KIND[i] = pickK([[0, 2], [1, 3], [7, 2], [11, 2], [9, .6], [10, .6], [2, 2]], (h - .45) / .55); return }
    KIND[i] = pickK([[0, 1 + sc * 2], [1, 4 + sc * 4], [2, 8], [3, 10], [4, 12], [5, 13], [6, 12], [7, 3 + age * 7], [8, 1 + age * 6], [11, 2 + age * 2], [12, 2], [13, 3 + age * 3], [14, .5 + (1 - age) * 4], [9, .4], [10, .4]], h)
  })
}
const P = new Float32Array(N * 3), CR = new Float32Array(N), SIZE = new Float32Array(N), TYPE = new Float32Array(N), STAR_R = new Float32Array(N);
// every winner sits on the timeline: its distance from the core is its date, on one of the arms
D.forEach((d, i) => {
  const u = yearU(d.t), r = GAL_R0 + u * GAL_LEN, s = 7700 + r * .045, arm = (R() * GAL.arms) | 0;
  const W = SHAPE.bw, H = SHAPE.bh * (2600 + 15000 * Math.exp(-r / 105000)), A = SHAPE.ba;   // the band the winners sit in: width across the arm, height off the disk, spread along it
  const v = SPIRAL ? galPoint(GAL, 0, u, gauss() * s * .7 * W, gauss() * .1 * A * s / r, gauss() * H)   // on the spiral the date is how far along it you are
    : galPoint(GAL, arm, u, gauss() * s * .2 * W, gauss() * 1.1 * A * s / r, gauss() * H);
  P[i * 3] = v.x; P[i * 3 + 1] = v.y; P[i * 3 + 2] = v.z;
  const aw = d.award === 'FOTY' ? 2 : d.award === 'SOTM' ? 1 : 0;
  CR[i] = [100, 140, 200][aw]; TYPE[i] = aw;
  SIZE[i] = CR[i] * 3.2 * [1, 1.6, 2.4][aw] * KINDS[KIND[i]][2];
  STAR_R[i] = Math.min(110, 28 * KINDS[KIND[i]][2] * [1, 1.3, 1.6][aw]);   // physical radius: fills the sky when parked beside it, neighbours never touch
});
// relax: push winners apart until every pair is at least MIN_SEP apart (a spatial hash keeps this linear). Pushes along
// the direction that carries the date (the radius; along the arm on the single spiral) are damped, so dates barely move.
(function relax(A, n, min) {
  const m2 = min * min, inv = 1 / min, rad = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const lx = A[i * 3] - GC.x, ly = A[i * 3 + 1] - GC.y, lz = A[i * 3 + 2] - GC.z, nx = new V3(lx, ly, lz).applyQuaternion(GQI); nx.y = 0; if (SPIRAL) nx.set(-nx.z, 0, nx.x); nx.normalize().applyQuaternion(GQ); rad.set([nx.x, nx.y, nx.z], i * 3) }
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
const NEB_B = cloudField(1600, armPlace(17500, 2450));
const LANE_B = cloudField(500, armPlace(8750, 1400));
const starPos = (i, out = new V3()) => out.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]);
const starR = i => STAR_R[i] * LOOK.bodySize, stopR = i => starR(i) * LOOK.stopK, dockDist = i => stopR(i) * 1.02;

/* the outpost: a small station adrift beyond the rim, where every flight starts */
const OUT = { hubR: 40, hubH: 60, ringR: 150, ringT: 20, padY: 64, padHalf: 45 };
// no station any more: every pilot starts just outside the rim and well above the disk, at a random point round it
const HOME_P = (() => { const a = Math.random() * Math.PI * 2, R = GAL_R0 + GAL_LEN; return new V3(Math.cos(a) * R * 1.12, R * .42, Math.sin(a) * R * 1.12).applyQuaternion(GQ).add(GC) })();
const LIGHT = 1.2e6;   // the speed of light, in world units per second
