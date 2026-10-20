/* ───────────────────────── flight ─────────────────────────
   Third-person, Halo-vehicle style: the mouse turns a camera rig freely; the ship's nose follows the reticle (always,
   or only while you drive, per the Look switch) at a turn rate that gets heavier with speed. W builds cruise speed
   along a curve (cruise in ~10 s, light speed after ~25 s straight); boost is a second gas pedal: with W it adds more,
   on its own it pushes you on along the way you're already going. Heading into a winner's neighbourhood slows you,
   gently at first and firmly close in; aim away and it lets go. Winners are springy: touch one slowly and you bounce off. */
const S = { mode: 'fly', mapPick: -1, colorBy: 'type', y0: 2000, y1: 2026, awards: new Set(), cats: new Set(), techs: new Set(), agencies: new Set(), country: '', q: '', minScore: 7, sel: -1 };
const player = { pos: HOME_P.clone(), vel: new V3(), quat: new Q4(), base: new Q4(), roll: 0, cruise: 0 };   // base: the ship's own heading, separate from the camera
const rig = { q: new Q4().setFromEuler(new THREE.Euler(.18, 0, 0, 'YXZ')), dist: 30, quat: new Q4() };
const orbit = { target: new V3(), dist: 12000, theta: .7, phi: .9 }, MAP_MIN = 6;   // the map zooms right down to a star
const Yv = new V3(0, 1, 0), _q = new Q4(), _qi = new Q4(), _ax = new V3(), tmp = new V3(), tmp2 = new V3(), _sd = new V3(), _iq = new Q4(), _m4 = new THREE.Matrix4();
const camRel = new V3(0, .8, 3.4), camRelV = new V3(), prevVel = new V3();
let worldT = 0, tdil = 1, beta = 0, coreK = 0, coreIn = 0, boostE = 1, boostK = 0, boosting = false, thrusting = false, gasOn = false, contactK = 0;
let nearI = -1, nearCD = Infinity, openI = -1, openA = 0, lockI = -1, auto = null, tween = null, shipStill = 0, shipSaved = false;

function rotateRig(dyaw, dpitch) { rig.q.multiply(_q.setFromAxisAngle(_ax.set(0, 1, 0), dyaw)).multiply(_q.setFromAxisAngle(_ax.set(1, 0, 0), dpitch)).normalize() }   // loop, roll over, keep going; nothing clamps
function lookAtQ(dir, up, out = new Q4()) { return out.setFromRotationMatrix(_m4.lookAt(tmp2.set(0, 0, 0), dir, up)) }
function aimAt(dir, k) {   // ease the rig toward a world direction, keeping its current "up"
  if (dir.lengthSq() < 1e-6) return; const d = dir.clone().normalize(), up = Yv.clone().applyQuaternion(rig.q);
  rig.q.slerp(lookAtQ(d, Math.abs(up.dot(d)) > .999 ? new V3(1, 0, 0).applyQuaternion(rig.q) : up, _qi), k);
}
const lookQuat = (eye, target, up = new V3(0, 1, 0)) => new Q4().setFromRotationMatrix(new THREE.Matrix4().lookAt(eye, target, up));
function tweenCam(pos, quat, dur, done, around = null) { tween = { fp: camera.position.clone(), fq: camera.quaternion.clone(), tp: pos, tq: quat, t: 0, dur, done, c: around } }
// fly a camera from a to b around a centre: direction swings on the sphere, distance eases in log space (every ×10 takes as long)
const _ta = new V3(), _tb = new V3(), _tx = new V3(), _tqq = new Q4();
function lerpLogPolar(out, a, b, c, e) {
  _ta.copy(a).sub(c); _tb.copy(b).sub(c); const da = Math.max(1e-3, _ta.length()), db = Math.max(1e-3, _tb.length()); _ta.divideScalar(da); _tb.divideScalar(db);
  const ang = Math.acos(Math.max(-1, Math.min(1, _ta.dot(_tb)))); _tx.crossVectors(_ta, _tb); if (_tx.lengthSq() < 1e-10) _tx.set(0, 1, 0); _tx.normalize();
  return out.copy(_ta).applyQuaternion(_tqq.setFromAxisAngle(_tx, ang * e)).multiplyScalar(Math.exp(Math.log(da) * (1 - e) + Math.log(db) * e)).add(c);
}
// the map orbits in the galaxy's own frame: phi is measured from the disk's axis, so the map looks down on the disk
const GAL_UP = new V3(0, 1, 0).applyQuaternion(GQ);
function orbitPose() { const o = orbit, p = new V3(Math.sin(o.phi) * Math.sin(o.theta), Math.cos(o.phi), Math.sin(o.phi) * Math.cos(o.theta)).applyQuaternion(GQ).multiplyScalar(o.dist).add(o.target); return { p, q: lookQuat(p, o.target, GAL_UP) } }
const mapPhi = () => (90 - Math.max(5, Math.min(90, LOOK.mapAngle ?? 70))) * Math.PI / 180 + 1e-3;   // 70° above the disk by default
const mapHomeD = () => (GAL_R0 + GAL_LEN) * 1.6;   // the whole disk, filling the view

function setMode(m) {
  if (m === S.mode) return; S.mode = m; document.body.classList.toggle('map', m === 'map');
  $('vFly').setAttribute('aria-pressed', m === 'fly'); $('vMap').setAttribute('aria-pressed', m === 'map');
  player.vel.set(0, 0, 0); player.cruise = 0; auto = null; lockI = -1;
  if (m === 'map') {
    if (document.pointerLockElement) document.exitPointerLock();
    // the whole galaxy, seen from the side your ship is on: one continuous pull back and up
    const rel = tmp.copy(camera.position).sub(GC).applyQuaternion(GQI), up = rel.y < 0 ? -1 : 1;
    Object.assign(orbit, { target: GC.clone(), dist: mapHomeD(), theta: Math.atan2(rel.x, rel.z), phi: up > 0 ? mapPhi() : Math.PI - mapPhi() });   // from whichever face of the disk you were on
    const o = orbitPose(); tweenCam(o.p, o.q, 2.4, null, GC.clone());
  } else { tween = { fp: camera.position.clone(), fq: camera.quaternion.clone(), t: 0, dur: 2.2, c: true }; if (S.mapPick >= 0) { const i = S.mapPick; S.mapPick = -1; focus(i) } }
  refreshLabels(); updateLockUI();
}
function focus(i) {
  if (i < 0) return; S.sel = i; const p = starPos(i);
  if (S.mode === 'fly') { if (lockI !== i) buzz(14); lockI = i; auto = null }   // lock only turns the ship toward it; W takes you there
  else { S.mapPick = i; orbit.target.copy(p); orbit.dist = CR[i] * 14; const o = orbitPose(); tweenCam(o.p, o.q, 1.8) }
}
function goHome() {
  if (S.mode === 'map') { Object.assign(orbit, { target: GC.clone(), dist: mapHomeD(), phi: orbit.phi > Math.PI / 2 ? Math.PI - mapPhi() : mapPhi() }); const o = orbitPose(); tweenCam(o.p, o.q, 1.6); return }
  auto = { i: -1, dest: HOME_P.clone() }; lockI = -1;
}

function nearest(at = player.pos) {   // the closest visible winner, and the handful close enough to show as suns
  nearI = -1; let nd = Infinity; const px = at.x, py = at.y, pz = at.z; bodyCand.length = 0;
  for (let i = 0; i < N; i++) {
    if (TA[i] < 1) continue; const dx = P[i * 3] - px, dy = P[i * 3 + 1] - py, dz = P[i * 3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz; if (d2 < nd) { nd = d2; nearI = i }
    const br = STAR_R[i] * 90; if (d2 < br * br && KIND[i] < EXO0) bodyCand.push([d2, i])   // exotic objects carry their own centre
  }
  nearCD = Math.sqrt(nd); bodyCand.sort((a, b) => a[0] - b[0]);
}
function pushOut(p, n, depth) { p.pos.addScaledVector(n, depth); const vn = p.vel.dot(n); if (vn < 0) p.vel.addScaledVector(n, -vn) }
function collideOutpost(p) {   // in the outpost's own (unscaled) units: hub capsule, ring torus, landing pad
  const K = SHIP_K, x = p.pos.x / K, y = p.pos.y / K, z = p.pos.z / K, rr = Math.hypot(x, z), pr = PLAYER_R / K, push = (n, d) => pushOut(p, n, d * K);
  if (Math.abs(x) < OUT.padHalf + pr && Math.abs(z) < OUT.padHalf + pr && y < OUT.padY + 2 + pr && y > OUT.padY - 2 - pr) { const up = OUT.padY + 2 + pr - y, dn = y - (OUT.padY - 2 - pr); if (up < dn) push(new V3(0, 1, 0), up); else push(new V3(0, -1, 0), dn) }
  const cy = Math.max(-OUT.hubH, Math.min(OUT.hubH, y)), hd = Math.hypot(x, y - cy, z), hm = OUT.hubR + pr;
  if (hd < hm && hd > 1e-3) push(new V3(x, y - cy, z).divideScalar(hd), hm - hd);
  if (rr > 1e-3) { const qx = rr - OUT.ringR, td = Math.hypot(qx, y), tm = OUT.ringT + pr; if (td < tm && td > 1e-3) push(new V3(x / rr * qx, y, z / rr * qx).divideScalar(td), tm - td) }
}
const steerCurve = v => { const a = Math.max(0, Math.abs(v) - .15) / .85; return Math.sign(v) * a * a };
const _hf = new V3(), _hr = new V3(), _hq = new Q4(), fwd = new V3(), wish = new V3();
const _nq = new Q4(), _vn = new V3(), _su = new V3(), _su2 = new V3(), _rf = new V3();
function updatePlayer(dt) {
  const p = player, L = LOOK;
  if (lockFailed && mouse.in && !down) rotateRig(-steerCurve(mouse.x / innerWidth * 2 - 1) * 1.8 * dt, -steerCurve(mouse.y / innerHeight * 2 - 1) * 1.4 * dt);   // lock-less desktop fallback
  rig.quat.copy(rig.q);
  const fw = (keys.w || keys.arrowup || touchThrust ? 1 : 0) - (keys.s || keys.arrowdown || touchBrake ? 1 : 0), rl = (keys.a || keys.arrowleft ? 1 : 0) - (keys.d || keys.arrowright ? 1 : 0);
  if (rl) p.base.multiply(_q.setFromAxisAngle(_ax.set(0, 0, 1), rl * 2.2 * dt)).normalize();   // A/D roll the ship itself; the camera stays level
  const prevF = _hf.set(0, 0, -1).applyQuaternion(p.base), prevR = _hr.set(1, 0, 0).applyQuaternion(p.base), sp0 = p.vel.length();
  // boost: Shift or Space. A short tank that drains while boosting and refills when you don't.
  const wantB = (keys.shift || keys[' '] || touchBoost) && !auto;
  if (wantB && boostE > 0) { if (!boosting) { camRelV.add(_sd.set(0, .15, 2.2)); boostWhoosh() } boosting = true; boostE *= Math.exp(-3 * dt / Math.max(.5, L.boostTime)); if (boostE < .05) boostE = 0 }   // eased: it drains fast at first, then ever slower
  else { if (boosting && boostE <= 0) buzz([22, 50, 22]); boosting = false; boostE += (1 - boostE) * (1 - Math.exp(-3 * dt / Math.max(.5, L.boostRecharge))); if (boostE > .995) boostE = 1 }   // and refills the same way, slowing as it tops up
  gasOn = fw > 0; const pedal = gasOn || boosting;
  // the nose turns toward its target keeping the ship's own roll (so A/D rolls stick)
  const shipUp = _su.set(0, 1, 0).applyQuaternion(p.base), aimQ = d => lookAtQ(d, Math.abs(shipUp.dot(d)) > .995 ? _su2.set(0, 1, 0).applyQuaternion(rig.q) : shipUp, _hq);
  let steerTo = null;
  if (lockI >= 0 && pedal && !auto) { const dir = starPos(lockI, tmp).sub(p.pos); if (dir.lengthSq() > 1) steerTo = aimQ(dir.normalize()) }   // locked: the ship keeps facing its star
  else if (!auto && (gasOn || (L.follow && lockI < 0))) steerTo = aimQ(_rf.set(0, 0, -1).applyQuaternion(rig.q));                // the nose follows the reticle
  else if (auto && p.vel.lengthSq() > 4) steerTo = aimQ(p.vel.clone().normalize());
  let turnAmt = 0;
  if (steerTo) { const ang = p.base.angleTo(steerTo); if (!auto && pedal) turnAmt = sstep(ang, .06, .5); if (ang > 1e-4) { const rate = L.turnRate * (1 - L.turnHeavy * sstep(sp0, 3000, 800000)) * (1 + (L.turnSlow ?? 2.5) * (1 - sstep(sp0, 40, 4000))); p.base.slerp(steerTo, Math.min(1, rate * dt / ang)) } }
  fwd.set(0, 0, -1).applyQuaternion(p.base);
  const braking = fw < 0;
  // W drives along the nose; boost on its own keeps the course you're already on
  if (gasOn) wish.copy(fwd); else if (boosting) { if (sp0 > 1) wish.copy(p.vel).divideScalar(sp0); else wish.copy(fwd) } else wish.set(0, 0, 0);
  thrusting = pedal; if (thrusting && auto) auto = null;
  const turnSide = _hf.set(0, 0, -1).applyQuaternion(p.base).sub(prevF).dot(prevR) / Math.max(dt, 1e-4);   // bank from the ship's own turning

  nearest();
  if (lockI >= 0 && TA[lockI] < 1) lockI = -1;
  const gap = nearI >= 0 ? nearCD - stopR(nearI) : 1e9;   // distance left to the stand-off point

  if (auto) {   // arrive steering: speed proportional to remaining distance
    const tgt = auto.i >= 0 ? starPos(auto.i, tmp2) : auto.dest;
    tmp.copy(p.pos).sub(tgt); const Ld = tmp.length() || 1;
    const dest = auto.i >= 0 ? tmp.multiplyScalar(dockDist(auto.i) / Ld).add(tgt) : tgt.clone();
    tmp.copy(dest).sub(p.pos); const dd = tmp.length();
    p.vel.lerp(tmp.setLength(Math.min(5e6, Math.sqrt(2 * 2.5e6 * dd), dd * 3)), 1 - Math.exp(-6 * dt));
    if (dd < .15 && p.vel.length() < 4) { p.vel.set(0, 0, 0); auto = null }
  } else {
    // heading toward the nearest winner: 1 straight at it, fading to 0 as you aim past it or away
    let ap = 0, apW = 0; if (nearI >= 0) { starPos(nearI, tmp).sub(p.pos); const L0 = Math.max(1, tmp.length()); if (sp0 > 1) ap = sstep(p.vel.dot(tmp) / (sp0 * L0), .1, .92); if (thrusting) apW = sstep(wish.dot(tmp) / L0, .1, .92) }   // apW: the same for where you're pushing
    // the speed a winner allows: slow beside it, rising faster than the distance, so far out you hardly notice it
    const Z = nearI >= 0 ? starR(nearI) * L.nearZone : 1, g0 = Math.max(0, gap), z = g0 / Z, nearCap = 30 + g0 * L.nearRate * (1 + z * z);   // the zone scales with the star
    const lockCap = lockI >= 0 && lockI === nearI ? 4 + g0 * L.approachRate : Infinity;   // a locked star always eases you to a stop beside it
    const awayK = 1 / Math.max(1, L.nearAway ?? 12), capIn = Math.min(nearCap, lockCap) / Math.max(ap, awayK), capW = thrusting ? Math.min(nearCap, lockCap) / Math.max(apW, awayK) : Infinity;   // strict heading in, nearAway times looser heading out
    const prox = nearI >= 0 ? (1 - sstep(g0, 0, Z * .5)) * L.nearCalm * (thrusting ? apW : 1) : 0;   // close to a winner the engine is gentle, unless you're pushing away from it
    /* orbiting: close to a star you aren't locked onto, its gravity takes over. Sized so a circular orbit at r0 = orbitR × its
       radius takes orbitT seconds: v0 = 2πr0/T and GM = v0²·r0 = 4π²r0³/T², pulling GM/r² toward it. In there the glide drag
       is off (orbits keep going), the engine is a gentle orbitThrust × GM/r0² for nudging between orbits, and speed is held
       under 1.3 × escape velocity √(2GM/r), so you can be captured and can always climb out. ob blends it in at the zone's edge. */
    let ob = 0, GM = 0, oR = 0;
    if (L.orbit && nearI >= 0 && lockI !== nearI) { const Rs = starR(nearI), r0 = Rs * L.orbitR, Ro = Rs * Math.max(L.orbitZone, L.orbitR * 1.5); GM = 4 * Math.PI * Math.PI * r0 * r0 * r0 / (L.orbitT * L.orbitT); oR = r0; ob = 1 - sstep(nearCD, Ro * .6, Ro); if (thrusting) { starPos(nearI, tmp2).sub(p.pos).normalize(); ob *= 1 - sstep(-wish.dot(tmp2), .2, .7) } }   // pushing away from the star breaks orbit: full engine, out you go
    const T1 = Math.max(1, L.cruiseTime), T2 = Math.max(T1 + 1, L.lightTime), V1 = L.cruiseSpeed, VL = LIGHT * .97;
    const vAt = c => { const t = c * T2; return t <= T1 ? 150 * Math.pow(V1 / 150, t / T1) : V1 * Math.pow(VL / V1, Math.min(1, (t - T1) / (T2 - T1))) };   // cruise = seconds of straight thrust / T2
    const cAt = v => { v = Math.max(150, v); const t = v <= V1 ? T1 * Math.log(v / 150) / Math.log(V1 / 150) : T1 + (T2 - T1) * Math.log(v / V1) / Math.log(VL / V1); return Math.min(1, t / T2) };
    const hold = vAt(p.cruise) > capIn;   // held back near a star: cruise doesn't keep building, and drifts down to what's allowed
    if (pedal) { if (!hold) p.cruise = Math.min(1, p.cruise + dt / T2 * (boosting ? L.boostCruise * (gasOn ? 1 : .8) : 1) * (1 - prox)); else p.cruise -= (p.cruise - cAt(capIn * 1.5)) * Math.min(1, dt * .8) }
    else p.cruise = Math.max(0, p.cruise - dt / Math.max(.2, L.glide));
    if (turnAmt > 0) { const capC = T1 / T2 * Math.min(1, L.steerCap / V1); if (p.cruise > capC) p.cruise -= (p.cruise - capC) * Math.min(1, turnAmt * L.steerSlow * 2.5 * dt) }   // steering bleeds the build-up back to cruise
    const vC = vAt(p.cruise) * (1 + boostK * L.boostTop), spNow = p.vel.length();
    const accel = (160 + vC * 1.35) * (1 + boostK * L.boostAccel * (1 - sstep(spNow, L.boostFade * .15, L.boostFade))) * (gasOn && boosting ? 1.35 : 1) * Math.min(1, capW / Math.max(1, vC)) * (1 - prox);   // boost is a launch: strong off the line, gone by cruising speed
    p.vel.addScaledVector(wish, (accel + (GM / (oR * oR || 1) * L.orbitThrust - accel) * ob) * dt);
    if (gasOn) { const vf = p.vel.dot(fwd); tmp.copy(p.vel).addScaledVector(fwd, -vf); p.vel.addScaledVector(tmp, -(1 - Math.exp(-2.8 * dt))) }
    p.vel.multiplyScalar(Math.exp(-(braking ? 5.5 : thrusting ? .9 : 1 / Math.max(.1, L.glide)) * (1 - ob * (braking ? .6 : 1)) * dt));   // let go and it glides (in orbit it coasts)
    const vmax = Math.min(thrusting ? vC : Infinity, turnAmt > 0 ? Math.min(vC, L.steerCap) + Math.max(0, vC - L.steerCap) * (1 - turnAmt) : Infinity);
    { const sp = p.vel.length(); if (sp > vmax) p.vel.setLength(Math.max(vmax, sp * Math.exp(-(thrusting ? 4 : 1 / Math.max(.1, L.glide)) * dt))) }   // eases down, never snaps
    {   // heading into a winner your speed eases down to what it allows (which shrinks as you close in), and never lets you slam in
      const sp = p.vel.length();
      const capO = ob > 0 ? Math.sqrt(2 * GM / Math.max(nearCD, 1)) * 1.3 : Infinity, capX = ob > 0 ? capIn + (capO - capIn) * ob : capIn;   // in orbit the cap is escape speed, not the approach limit
      if (sp > capX) p.vel.multiplyScalar((capX + (sp - capX) * Math.exp(-3 * L.nearBrake * dt)) / sp);
      if (ob < .5 && ap > .5 && gap > 0 && gap < Z * .5) { const s2 = p.vel.length(), tau = gap / Math.max(1, s2 * ap); if (tau < .5 && s2 > 60) p.vel.multiplyScalar(Math.exp(-1.5 / Math.max(.05, tau) * dt)) }
    }
    if (ob > 0) { starPos(nearI, tmp2).sub(p.pos); const r = Math.max(tmp2.length(), 1); p.vel.addScaledVector(tmp2, GM / (r * r * r) * ob * dt) }   // gravity: GM/r² toward the star
    if (nearI >= 0 && !thrusting && ob < .01) {   // let go beside a winner and it gently draws you to the docking distance
      const w0 = 1 - sstep(nearCD, dockDist(nearI), stopR(nearI) * 2.5), w = w0 * w0;
      if (w > 0) { starPos(nearI, tmp); tmp2.copy(p.pos).sub(tmp).setLength(dockDist(nearI)).add(tmp).sub(p.pos); p.vel.addScaledVector(tmp2, 7 * w * L.wellPull * dt); p.vel.multiplyScalar(Math.exp(-3.5 * w * L.wellPull * dt)) }
    }
  }
  if (braking && !auto) { const vb = p.vel.dot(fwd); if (vb < 0) p.vel.addScaledVector(fwd, -vb) }   // S only brakes, never reverses
  // move, in substeps when touching a winner: its surface is a spring that stiffens toward the star, so you bounce off
  // along the normal and keep your sideways motion. The nose swings round to the new heading.
  let touch = 0;
  if (nearI >= 0) {
    const outer = stopR(nearI), hard = Math.min(outer * .97, starR(nearI) * 1.06), shell = Math.max(.01, outer - hard), n = (nearCD - outer) < p.vel.length() * dt + shell ? 6 : 1, h = dt / n;
    starPos(nearI, tmp);
    for (let k = 0; k < n; k++) {
      tmp2.copy(p.pos).sub(tmp); const Ld = tmp2.length() || 1; tmp2.divideScalar(Ld);
      if (Ld < outer) {
        const x = Math.min(.96, (outer - Ld) / shell), vn = p.vel.dot(tmp2);
        p.vel.addScaledVector(tmp2, 90 * shell * x / (1 - x) * h);                                         // push out
        if (vn < 0) p.vel.addScaledVector(tmp2, -vn * (1 - Math.exp(-(1 - L.bounce) * 10 * h)));         // soak up some of the inward speed: less of it is bouncier
        touch = Math.max(touch, x);
      }
      p.pos.addScaledVector(p.vel, h);
    }
    tmp2.copy(p.pos).sub(tmp); const Ld = tmp2.length() || 1;   // backstop: never inside the star
    if (Ld < hard) { tmp2.multiplyScalar(hard / Ld); p.pos.copy(tmp).add(tmp2); const nn = tmp2.normalize(), vn = p.vel.dot(nn); if (vn < 0) p.vel.addScaledVector(nn, -vn * (1 + L.bounce * .6)) }
  } else p.pos.addScaledVector(p.vel, dt);
  contactK += (touch - contactK) * Math.min(1, dt * 10);
  if (touch > 0 && !auto && lockI !== nearI) { const sp = p.vel.length(); if (sp > 1) p.base.slerp(lookAtQ(_vn.copy(p.vel).divideScalar(sp), Yv.clone().applyQuaternion(p.base), _nq), Math.min(1, dt * 6 * Math.min(1, touch * 3))) }   // pushed: the nose follows the bounce
  {
    tmp.copy(p.pos).sub(GC); const d = tmp.length(), mn = BH.sh * 1.3;
    if (d < mn) { tmp.setLength(mn); p.pos.copy(GC).add(tmp); const n = tmp.normalize(), vn = p.vel.dot(n); if (vn < 0) p.vel.addScaledVector(n, -vn) }
    else if (d < BH.sh * 18 && !auto) { const sp = p.vel.length(), cap = 60 + (d - mn) * 6; if (sp > cap) p.vel.setLength(Math.max(cap, sp * Math.exp(-3 * dt))); p.vel.addScaledVector(tmp.normalize(), -dt * 250 * L.bhPull * (1 - sstep(d, mn, BH.sh * 5))) }   // only a gentle tug, and only close in
  }
  p.roll += (Math.max(-.75, Math.min(.75, -turnSide * .45)) - p.roll) * (1 - Math.exp(-5 * dt));   // a cosmetic bank into turns
  p.quat.copy(p.base).multiply(_q.setFromAxisAngle(_ax.set(0, 0, 1), p.roll));
}

/* camera: rotation is rigid with the rig (the ship never drifts when you look around); position rides a spring */
function updateCamera(dt) {
  const L = LOOK;
  if (S.mode === 'fly') {
    const sp = player.vel.length(), pull = 1 + L.speedPull * (sstep(sp, 40, 3000) * .6 + sstep(Math.log10(Math.max(1, sp)), L.fovFrom, Math.max(L.fovFrom + .1, L.fovTo)) * 1.4) + boostK * .45;   // the second part follows the FOV's curve: they widen and pull back together
    tmp2.set(0, rig.dist * L.camHeight * Math.sqrt(pull), rig.dist * pull);                 // where the camera wants to sit, in the ship's frame (rising as it pulls back, so the arrow's face stays in view)
    if (camNear > 0) { if (booted && thrusting) camNearGo = true; if (camNearGo) { camNear = Math.max(0, camNear - dt / 3.5); if (!camNear) camNearGo = false } tmp2.lerp(INTRO_END, ease(camNear)) }   // after the intro the camera stays close until your first push
    const k = 60 / Math.max(.15, L.elastic), c = 2 * Math.sqrt(k) * .62;                    // underdamped: a little overshoot
    camRelV.addScaledVector(tmp2.sub(camRel), k * dt).multiplyScalar(Math.exp(-c * dt));
    _sd.copy(player.vel).sub(prevVel).applyQuaternion(_iq.copy(rig.quat).invert()); prevVel.copy(player.vel); const kick = Math.min(_sd.length(), 400); if (kick > 1e-3) camRelV.addScaledVector(_sd.setLength(kick), -.06 * L.elastic * SHIP_K);   // acceleration kicks the camera back
    camRel.addScaledVector(camRelV, dt); const maxL = rig.dist * pull * 2.2; if (camRel.length() > maxL) camRel.setLength(maxL);
    tmp.copy(camRel).applyQuaternion(rig.quat).add(player.pos);
    if (tween) { tween.t += dt / (reduceMotion ? .2 : tween.dur || 1.2); const e = ease(Math.min(1, tween.t)); if (tween.c) lerpLogPolar(camera.position, tween.fp, tmp, player.pos, e); else camera.position.lerpVectors(tween.fp, tmp, e); camera.quaternion.copy(tween.fq).slerp(rig.quat, e); if (tween.t >= 1) { const d = tween.done; tween = null; d && d() } }
    else { camera.position.copy(tmp); camera.quaternion.copy(rig.quat) }
    const fov = Math.min(150, L.fov + L.fovKick * sstep(Math.log10(Math.max(1, player.vel.length())), L.fovFrom, Math.max(L.fovFrom + .1, L.fovTo)) + boostK * L.boostFov);   // wider the faster you go
    camera.fov += (fov - camera.fov) * (1 - Math.exp(-4 * dt)); camera.updateProjectionMatrix();
  } else {
    const mx = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0), mz = (keys.w || keys.arrowup ? 1 : 0) - (keys.s || keys.arrowdown ? 1 : 0), zq = (keys.q ? 1 : 0) - (keys.e ? 1 : 0);
    if ((mx || mz || zq) && !tween) {
      const o = orbitPose(), r = tmp.set(1, 0, 0).applyQuaternion(o.q).projectOnPlane(GAL_UP), fz = tmp2.set(0, 0, -1).applyQuaternion(o.q).projectOnPlane(GAL_UP);
      if (fz.lengthSq() < 1e-4) fz.set(0, 1, 0).applyQuaternion(o.q).projectOnPlane(GAL_UP); r.normalize(); fz.normalize();
      orbit.target.addScaledVector(r, mx * orbit.dist * .6 * dt).addScaledVector(fz, mz * orbit.dist * .6 * dt); if (zq) orbit.dist = Math.max(MAP_MIN, Math.min(4e7, orbit.dist * Math.exp(zq * 1.2 * dt)))
    }
    if (orbit.ang !== LOOK.mapAngle) { if (orbit.ang != null && !tween) { const want = orbit.phi > Math.PI / 2 ? Math.PI - mapPhi() : mapPhi(); orbit.phi += (want - orbit.phi) * Math.min(1, dt * 6); if (Math.abs(want - orbit.phi) < 1e-3) orbit.ang = LOOK.mapAngle } else if (orbit.ang == null) orbit.ang = LOOK.mapAngle }   // the angle slider tilts the map live
    if (tween) { tween.t += dt / (reduceMotion ? .2 : tween.dur); const e = ease(Math.min(1, tween.t)); if (tween.c) lerpLogPolar(camera.position, tween.fp, tween.tp, tween.c, e); else camera.position.lerpVectors(tween.fp, tween.tp, e); camera.quaternion.copy(tween.fq).slerp(tween.tq, e); if (tween.t >= 1) { const d = tween.done; tween = null; d && d() } }
    else { const o = orbitPose(); camera.position.copy(o.p); camera.quaternion.copy(o.q) }
    if (Math.abs(camera.fov - L.fov) > .01) { camera.fov = L.fov; camera.updateProjectionMatrix() }
    thrusting = false;
  }
  camera.updateMatrixWorld();
}
