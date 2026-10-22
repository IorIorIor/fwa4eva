/* ───────────────────────── the comet, and the fall ─────────────────────────
   The comet: fast, the ship sheds sparks, hot points torn off its edges that stream back past it, cooling from white
   through orange to a dull red, so it flies like a comet. Through the black hole's disk it sheds a storm of them, and near
   the hole it heats up and sheds them too, and they fall in. The fall: near the hole time thickens, the lens widens, space
   twists round the hole and is drawn in toward it, the view spins with it, the ship stretches toward it and the camera
   rumbles; crossing the disk flashes and jolts. All of it builds with how far in you are (in log distance, so it keeps
   building all the way down). */
const fall = (() => {
  const F = { k: 0, kc: 0, fov: 0, blur: 0, ab: 0, flash: 0, jolt: 0, rumble: 0, diskK: 0, cross: false, after: 0, prevY: NaN, t: 0, roll: 0 };
  const lp = new V3(), nH = new V3(), sm = new THREE.Matrix4(), zero = new V3(), sv = new V3(), sq_ = new Q4(), se = new THREE.Euler(), zAx = new V3(0, 0, 1), qi = new Q4();
  F.update = (dt, rdt) => {   // after the ship has moved: how far in, the disk, the spin, the stretch
    const L = LOOK, d = player.pos.distanceTo(GC), sh = BH.sh, R = sh * Math.max(2, L.bhFx ?? 12);
    const k = Math.max(0, Math.min(1, Math.log(R / Math.max(d, 1e-6)) / Math.log(R / (sh * 1.45))));
    F.k += (k - F.k) * Math.min(1, rdt * 8); F.kc = Math.pow(F.k, L.bhFxCurve ?? 1.6); F.t += rdt;
    // the disk: in its plane (in horizon radii), between its inner and outer edge
    lp.copy(player.pos).sub(GC).applyQuaternion(GQI).divideScalar(BH.rs); const rho = Math.hypot(lp.x, lp.z), rout = Math.max(3.5, L.bhDiskOut);
    const inD = sstep(rho, 2.7, 3.3) * (1 - sstep(rho, rout * .85, rout * 1.05));
    F.diskK = inD * (1 - sstep(Math.abs(lp.y), 0, Math.max(.01, L.sparkDiskH ?? 1.2)));
    F.cross = Number.isFinite(F.prevY) && F.prevY * lp.y < 0 && Math.abs(F.prevY - lp.y) < 40 && inD > .2 && !sing.busy;   // (a jump across it is a teleport, not a crossing)
    if (F.cross) { F.jolt = L.bhCrossShake ?? 1; F.flash = Math.max(F.flash, L.bhCrossFlash ?? .8); F.after = 1; buzz([25, 40, 60]); boostWhoosh() }
    F.prevY = lp.y; F.after = Math.max(0, F.after - rdt / Math.max(.05, L.sparkDiskAfter ?? 1.4));
    F.jolt *= Math.exp(-rdt * 5); F.flash *= Math.exp(-rdt * 3); F.rumble = (L.bhShake ?? .5) * F.kc * F.kc;
    F.fov = (L.bhFov ?? 45) * F.kc; F.blur = (L.bhBlur ?? .6) * F.kc; F.ab = (L.bhAberr ?? .8) * F.kc;
    { const w = (L.bhRoll ?? 25) * Math.PI / 180 * F.kc * rdt; if (w > 1e-6) { F.roll += w; if (!(bhLab && bhLab.driving)) rig.q.multiply(sq_.setFromAxisAngle(zAx, w)).normalize() } }   // the view turns with the hole's spin
    // spaghettification: longer toward the hole, thinner across (the volume kept), about the ship's middle
    const s = 1 + (L.bhStretch ?? 1) * 2.5 * Math.pow(F.kc, 3);
    if (s > 1.002) {
      nH.copy(GC).sub(player.pos).normalize(); const c = 1 / Math.sqrt(s), e = s - c, x = nH.x, y = nH.y, z = nH.z;
      sm.set(c + e * x * x, e * x * y, e * x * z, 0, e * y * x, c + e * y * y, e * y * z, 0, e * z * x, e * z * y, c + e * z * z, 0, 0, 0, 0, 1);
      avatar.matrixAutoUpdate = false; avatar.matrix.compose(zero, avatar.quaternion, avatar.scale).premultiply(sm).setPosition(avatar.position); avatar.matrixWorldNeedsUpdate = true;
    } else avatar.matrixAutoUpdate = true;
  };
  F.cam = () => {   // the rumble near the horizon and the jolt through the disk, on top of wherever the camera is
    const a = F.jolt + F.rumble; if (a < 1e-4 || S.mode !== 'fly') return; const t = F.t, cd = camera.position.distanceTo(player.pos);
    const nx = Math.sin(t * 37.1) * .6 + Math.sin(t * 61.7 + 1.3) * .4, ny = Math.sin(t * 43.3 + 2.1) * .6 + Math.sin(t * 71.9 + .4) * .4, nz = Math.sin(t * 29.3 + 4.2) * .6 + Math.sin(t * 53.1 + 2.7) * .4;
    camera.position.add(sv.set(nx, ny, nz * .5).applyQuaternion(camera.quaternion).multiplyScalar(a * cd * .035));
    camera.quaternion.multiply(sq_.setFromEuler(se.set(ny * a * .012, nx * a * .012, nz * a * .02)));
  };
  F.post = (dt, rdt) => {   // after the camera: the picture's share (swirl round the hole, the flash), and the sparks
    const L = LOOK, fly = S.mode === 'fly' && booted && !intro.active, kc = fly ? F.kc : 0;
    if (!fly) { F.fov = F.blur = F.ab = F.rumble = 0; avatar.matrixAutoUpdate = true }
    // where the hole is on screen, and how big its shadow looks there
    sv.copy(GC).sub(camera.position).applyQuaternion(qi.copy(camera.quaternion).invert()); const dd = sv.length(), ty = Math.tan(camera.fov * Math.PI / 360);
    const front = sstep(-sv.z / Math.max(dd, 1e-6), .05, .35), zz = Math.min(-1e-6, sv.z);
    PU.swC.value.set(sv.x / -zz / (ty * camera.aspect) * .5 + .5, (1 - sv.y / -zz / ty) * .5); PU.asp.value = camera.aspect;
    PU.swR.value = Math.max(.01, Math.min(.6, (L.bhSwirlR ?? 3) * Math.tan(Math.asin(Math.min(.999, BH.sh / Math.max(dd, 1e-6)))) * .5 / ty));
    PU.sw.value = (L.bhSwirl ?? 1.2) * kc * front; PU.swP.value = (L.bhPinch ?? .4) * kc * front;
    PU.exp.value *= 1 + F.flash * 1.6;
    embers.update(fly ? dt : 0, fly);
  };
  return F;
})();

const embers = (() => {
  const n = 1400, r = mulberry32(2026), P = new Float32Array(n * 3), V = new Float32Array(n * 3), age = new Float32Array(n).fill(1e9), life = new Float32Array(n).fill(1), ph = new Float32Array(n * 3);
  for (let i = 0; i < n * 3; i++) ph[i] = r() * 6.2832;
  const g = new THREE.InstancedBufferGeometry(); g.index = QUAD.index; g.setAttribute('position', QUAD.attributes.position); g.setAttribute('uv', QUAD.attributes.uv);
  const pa = new Float32Array(n * 3), pb = new Float32Array(n * 3), fa = new Float32Array(n).fill(-1), ha = new Float32Array(n);
  [['aA', pa, 3], ['aB', pb, 3], ['aF', fa, 1], ['aH', ha, 1]].forEach(([k, arr, c]) => g.setAttribute(k, new THREE.InstancedBufferAttribute(arr, c).setUsage(THREE.DynamicDrawUsage))); g.instanceCount = n;
  const u = { sz: uniform(1.6), k: uniform(1), glow: uniform(.6), cool: uniform(1.4), heat: uniform(1), eps: uniform(.004) }, m = skyMat();
  const vD = varyingProperty('float', 'vEd'), vAl = varyingProperty('float', 'vEal'), vLn = varyingProperty('float', 'vEln'), vW = varyingProperty('float', 'vEw'), vF = varyingProperty('float', 'vEf'), vH = varyingProperty('float', 'vEh'), vN = varyingProperty('float', 'vEn');
  m.vertexNode = Fn(() => {   // aA = head, aB = tail (camera-relative); aF = 0..1 life (outside: hidden); aH = heat at birth
    const f = ia('aF', 'float'), A = cameraViewMatrix.mul(vec4(ia('aA', 'vec3'), 0)).xyz, B0 = cameraViewMatrix.mul(vec4(ia('aB', 'vec3'), 0)).xyz;
    const tc = A.z.add(u.eps).div(A.z.sub(B0.z).min(-1e-6)), B = select(B0.z.greaterThan(u.eps.negate()), A.add(B0.sub(A).mul(clamp(tc, 0, 1))), B0);   // a tail reaching behind the camera is cut at its near plane
    const cA = cameraProjectionMatrix.mul(vec4(A, 1)), cB = cameraProjectionMatrix.mul(vec4(B, 1)), half = U.res.mul(.5), sA = cA.xy.div(cA.w).mul(half), sB = cB.xy.div(cB.w).mul(half);
    const dv = sB.sub(sA), Ln = max(length(dv), 1e-3), dir = dv.div(Ln), nrm = vec2(dir.y.negate(), dir.x), hw = u.sz.mul(.5).mul(U.dpr).mul(u.glow.mul(2).add(1)), t = uv().x, side = positionGeometry.y.mul(2);
    const c = mix(cA, cB, t), off = nrm.mul(side.mul(hw)).add(dir.mul(t.mul(2).sub(1).mul(hw)));
    vD.assign(side.mul(hw)); vAl.assign(t.mul(2).sub(1).mul(hw).add(t.mul(Ln))); vLn.assign(Ln); vW.assign(u.sz.mul(.5).mul(U.dpr)); vF.assign(f); vH.assign(ia('aH', 'float'));
    vN.assign(smoothstep(u.eps, u.eps.mul(8), A.z.negate()));   // fades out as it passes the camera
    const live = f.greaterThanEqual(0).and(f.lessThanEqual(1)).and(A.z.lessThan(u.eps.negate()));
    return select(live, c.add(vec4(off.div(half).mul(c.w), 0, 0)), vec4(0, 0, 2, 1));
  })();
  m.fragmentNode = Fn(() => {   // a white-hot core in a soft glow, brightest at the head; its colour is its temperature, cooling as it ages
    const d = length(vec2(max(0, max(vAl.negate(), vAl.sub(vLn))), vD)).div(vW.max(.5)), along = pow(clamp(float(1).sub(vAl.div(vLn.max(1))), 0, 1), 1.2);
    const core = exp(sq(d).mul(-2.5)), halo = exp(sq(d).mul(-.25)).mul(.35).mul(u.glow), f = clamp(vF, 0, 1);
    const T = pow(f.oneMinus(), u.cool).mul(vH.mul(u.heat).mul(7200)).add(900), br = pow(clamp(T.div(6600), 0, 2.2), 1.5);
    const fade = smoothstep(0, .03, f).mul(pow(f.oneMinus(), .5)).mul(vN);
    const col = bbRGB(T).mul(br).mul(fade).mul(u.k).mul(core.add(halo)).mul(mix(1, along, .7));
    return vec4(col, min(1, max(col.r, max(col.g, col.b))));
  })();
  const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.visible = false; shipScene.add(mesh);
  // where the hull sheds: points along the cursor's outline (the edges facing forward weighted up, by sparkEdge)
  let segs = [], segsOf = null; const cum = [];
  function hullSegs() {
    segsOf = ARROW; segs = [];
    ARROW.polys.forEach(p => { const o = p.o, nn = o.length; let ar = 0; for (let i = 0; i < nn; i++) { const a = o[i], b = o[(i + 1) % nn]; ar += a[0] * b[1] - b[0] * a[1] } const sg = Math.sign(ar) || 1;
      for (let i = 0; i < nn; i++) { const a = o[i], b = o[(i + 1) % nn], dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy); if (l > 1e-6) segs.push({ a, b, l, nx: sg * dy / l, nz: -sg * dx / l }) } });
  }
  let head = 0, live = 0, accS = 0, accD = 0, accH = 0, cdU = 1;
  const hp = new V3(), lq = new V3(), nv = new V3(), back = new V3(), toH = new V3(), tg = new V3(), off = new V3(), w = new V3();
  function spawn(heat, kind) {   // kind 0: speed, 1: the disk's plasma, 2: the hole's heat
    const L = LOOK, i = head; head = (head + 1) % n; let x = r() * cum[cum.length - 1], j = 0; while (j < cum.length - 1 && cum[j] < x) j++;
    const s = segs[j], t = r(), sc = avatar.scale.x, SL = cdU, sp = (L.sparkSpray ?? .3) * SL * (.35 + .65 * r()) * (kind === 1 ? 1.8 : 1);
    hp.set(s.a[0] + (s.b[0] - s.a[0]) * t, (r() - .5) * .9, s.a[1] + (s.b[1] - s.a[1]) * t).multiplyScalar(sc).applyQuaternion(player.quat);
    nv.set(s.nx, (r() - .5) * .8, s.nz).normalize().applyQuaternion(player.quat);
    const k3 = i * 3; P[k3] = hp.x; P[k3 + 1] = hp.y; P[k3 + 2] = hp.z;
    V[k3] = nv.x * sp + back.x * SL * .3 * r(); V[k3 + 1] = nv.y * sp + back.y * SL * .3 * r(); V[k3 + 2] = nv.z * sp + back.z * SL * .3 * r();
    if (kind === 1) { V[k3] += tg.x * SL * .8 * r(); V[k3 + 1] += tg.y * SL * .8 * r(); V[k3 + 2] += tg.z * SL * .8 * r() }   // the disk's gas is orbiting: it sweeps its sparks round with it
    age[i] = 0; life[i] = Math.max(.05, L.sparkLife ?? .9) * (.45 + .9 * r()) * (kind ? 1.35 : 1); ha[i] = heat * (.85 + .3 * r());
  }
  return {
    mesh,
    update(dt, fly) {
      const L = LOOK; if (!fly) { if (live) { fa.fill(-1); live = 0; g.attributes.aF.needsUpdate = true } mesh.visible = false; return }
      if (segsOf !== ARROW) hullSegs();
      { const e = L.sparkEdge ?? .7; cum.length = 0; let tot = 0; for (const s of segs) { tot += s.l * ((1 - e) + e * 3 * Math.pow(Math.max(0, -s.nz), 1.5)) + 1e-6; cum.push(tot) } }
      cdU = Math.max(SHIP_LEN, camera.position.distanceTo(player.pos));   // sizes in camera distances: the comet looks the same however far back the camera hangs
      const sp = player.vel.length(), SL = cdU, from = Math.log(Math.max(1, L.sparkFrom ?? 12000)), sK = (L.sparks ?? 1) ? sstep(Math.log(Math.max(1, sp)), from, Math.max(from + .01, Math.log(Math.max(1, L.sparkFull ?? 250000)))) : 0;   // (on a log scale: speeds here span thousands of times)
      if (sp > 1) back.copy(player.vel).divideScalar(-sp); else back.set(0, 0, 1).applyQuaternion(player.quat);
      toH.copy(GC).sub(player.pos); const dH = toH.length(); toH.divideScalar(Math.max(dH, 1e-6));
      lq.copy(player.pos).sub(GC).applyQuaternion(GQI); tg.set(lq.z, 0, -lq.x).normalize().applyQuaternion(GQ);   // the way the disk turns, here
      if (segs.length && dt > 0) {
        accS += dt * (L.sparkRate ?? 240) * sK * (1 + ((L.sparkBoost ?? 1.8) - 1) * boostK);
        accD += dt * (L.sparkDisk ?? 1600) * Math.max(fall.diskK, fall.after * fall.after); if (fall.cross) accD += L.sparkDiskBurst ?? 350;
        accH += dt * (L.sparkHole ?? 500) * Math.pow(fall.k, 3);
        let budget = 700; const emit = (acc, heat, kind) => { while (acc >= 1 && budget > 0) { acc--; budget--; spawn(heat, kind) } return Math.min(acc, 2) };   // (at most so many new ones a frame)
        const h = L.sparkHeat ?? .85; accD = emit(accD, 1.45 * h, 1); accS = emit(accS, h, 0); accH = emit(accH, 1.15 * h, 2);
      }
      u.sz.value = L.sparkSize ?? 2.2; u.k.value = L.sparkBright ?? 2.2; u.glow.value = L.sparkGlow ?? .8; u.cool.value = L.sparkCool ?? 1.4; u.eps.value = Math.max(1e-4, camera.near * 1.5);
      const W = (L.sparkWind ?? 1.5) * SL * (1 + .5 * sK), dr = 1 - Math.exp(-dt * (L.sparkDrag ?? 3)), tu = (L.sparkTurb ?? 1) * SL * .6 * dt, pl = (L.sparkPull ?? 1) * W * 3 * fall.k * fall.k * dt, stk = L.sparkStreak ?? .05;
      w.copy(back).multiplyScalar(W); off.copy(player.pos).sub(camera.position);
      live = 0;
      for (let i = 0; i < n; i++) {
        if (fa[i] < 0 && age[i] > 1e8) continue; age[i] += dt; const k3 = i * 3;
        if (age[i] >= life[i]) { fa[i] = -1; age[i] = 1e9; continue } live++;
        const a = age[i];
        V[k3] += (w.x - V[k3]) * dr + Math.sin(a * 7 + ph[k3]) * tu + toH.x * pl; V[k3 + 1] += (w.y - V[k3 + 1]) * dr + Math.sin(a * 9 + ph[k3 + 1]) * tu + toH.y * pl; V[k3 + 2] += (w.z - V[k3 + 2]) * dr + Math.sin(a * 8 + ph[k3 + 2]) * tu + toH.z * pl;
        P[k3] += V[k3] * dt; P[k3 + 1] += V[k3 + 1] * dt; P[k3 + 2] += V[k3 + 2] * dt;
        const vl = Math.hypot(V[k3], V[k3 + 1], V[k3 + 2]), sl = Math.max(stk, SL * .02 / Math.max(vl, 1e-6));   // at least a short dash, so a slow one is still a spark
        pa[k3] = off.x + P[k3]; pa[k3 + 1] = off.y + P[k3 + 1]; pa[k3 + 2] = off.z + P[k3 + 2];
        pb[k3] = pa[k3] - V[k3] * sl; pb[k3 + 1] = pa[k3 + 1] - V[k3 + 1] * sl; pb[k3 + 2] = pa[k3 + 2] - V[k3 + 2] * sl;
        fa[i] = a / life[i];
      }
      const at = g.attributes; at.aA.needsUpdate = at.aB.needsUpdate = at.aF.needsUpdate = at.aH.needsUpdate = true; mesh.visible = live > 0;
    },
  };
})();

/* the black hole lab (#bh-lab): no opening, the ship on a fall into the hole you can scrub or play, sliders open */
const BH_LAB = !!(window.__BH_LAB || /bh-?lab/.test(location.hash));
const bhLab = !BH_LAB ? null : (() => {
  const el = document.createElement('div'); el.id = 'bhLab';
  el.innerHTML = '<button type="button" class="pl-play">Fly in</button><input type="range" min="0" max="1" step="0.0005" value="0" aria-label="The fall"><span class="pl-v"></span><button type="button" class="pl-free">Fly myself</button><button type="button" class="pl-look">Sliders</button>';
  const rg = el.querySelector('input'), lbl = el.querySelector('.pl-v'), pb = el.querySelector('.pl-play');
  const S_ = { v: 0, v0: 0, playing: false, driving: false, done: false };
  const N = 600, ts = new Float32Array(N + 1), pt = new V3(), pt2 = new V3(), tng = new V3(), look = new V3(), upv = new V3(), qq = new Q4(), zAx = new V3(0, 0, 1);
  // the way in, in the galaxy's frame (horizon radii): in toward the hole along a log spiral turning with the disk, coming in
  // over it at a slant, through it, and on down into the horizon just under its plane
  const d1 = 1.35 * 2.598;   // the end: just inside where the singularity takes you
  function path(s, out) {
    const L = LOOK, d0 = L.bhLabFrom ?? 26, dc = Math.min(d0 * .9, Math.max(d1 * 1.1, L.bhLabCross ?? 8)), sc = Math.log(d0 / dc) / Math.log(d0 / d1);
    const d = d0 * Math.pow(d1 / d0, s), phi = (L.bhLabTilt ?? 14) * Math.PI / 180 * (sc - s) / sc, th = .6 - 2 * Math.PI * (L.bhLabTurn ?? .35) * Math.pow(s, 1.5);
    return out.set(d * Math.cos(phi) * Math.cos(th), d * Math.sin(phi), d * Math.cos(phi) * Math.sin(th)).multiplyScalar(BH.rs).applyQuaternion(GQ).add(GC);
  }
  function table() {   // time along the way: the hole comes on faster and faster (each halving of the distance takes a bit less time than the last)
    ts[0] = 0; path(0, pt);
    for (let i = 1; i <= N; i++) { path(i / N, pt2); const d = pt2.distanceTo(GC); ts[i] = ts[i - 1] + pt2.distanceTo(pt) / Math.pow(d, .65); pt.copy(pt2) }
    for (let i = 1; i <= N; i++) ts[i] /= ts[N];
  }
  const sOf = v => { let i = 1; while (i < N && ts[i] < v) i++; const a = ts[i - 1], b = ts[i]; return (i - 1 + (b > a ? (v - a) / (b - a) : 0)) / N };
  const vMax = () => { table(); let i = 0; while (i < N && path(i / N, pt).distanceTo(GC) > BH.sh * 1.5) i++; return ts[Math.max(0, i - 1)] };   // scrubbing stops short of the horizon
  function setPlay(on) { S_.playing = on; pb.textContent = on ? 'Pause' : S_.v > 0 && !S_.done ? 'Play' : 'Fly in' }
  function begin() { sing.reset(); S_.done = false; S_.driving = true; if (S.mode !== 'fly') setMode('fly'); auto = null; lockI = -1; warp = null; strands.length = 0; curStrand = null }
  pb.onclick = () => { if (S_.playing) { setPlay(false); return } if (S_.done || S_.v >= .999) { S_.v = 0; camRelV.set(0, 0, 0) } begin(); setPlay(true) };
  rg.oninput = () => { begin(); setPlay(false); S_.v = Math.min(+rg.value, vMax()) };
  el.querySelector('.pl-free').onclick = () => { S_.driving = false; setPlay(false); if (!coarse && !lockFailed) requestLock() };
  el.querySelector('.pl-look').onclick = () => togglePanel('lookPanel');
  return {
    get driving() { return S_.driving }, get v() { return S_.v },
    seek(v) { begin(); setPlay(false); S_.v = Math.max(0, Math.min(vMax(), v)) },   // (for tests: a point on the way in)
    start() {
      document.body.appendChild(el); document.body.classList.add('plab');
      if (!isOpen('lookPanel')) togglePanel('lookPanel'); $('lookFind').value = 'black hole'; findLook();
      begin(); S_.v = 0; setPlay(false); setTimeout(() => { if (!S_.playing && S_.v === 0) pb.click() }, 1500);
    },
    drive(rdt) {   // the ship on the way in (true while it's driven)
      if (!S_.driving) return false;
      if (sing.busy) { S_.driving = false; S_.done = true; setPlay(false); lbl.textContent = 'Through. Fly in again?'; return false }   // the singularity has you
      if (keys.w || keys.s || keys.shift || keys[' ']) { S_.driving = false; setPlay(false); return false }   // your hands on the controls: you fly
      table(); const L = LOOK, T = Math.max(1, L.bhLabTime ?? 12);
      if (S_.playing) S_.v = Math.min(1, S_.v + rdt / T);
      if (Math.abs(S_.v - S_.v0) > .01) { strands.length = 0; curStrand = null } S_.v0 = S_.v;   // a jump along the way leaves no trail across the gap
      const s = sOf(S_.v), ds = 1 / N; path(s, pt); path(Math.min(1, s + ds), pt2); tng.copy(pt2).sub(pt); const sl = tng.length(); tng.divideScalar(Math.max(sl, 1e-9));
      const i = Math.min(N - 1, Math.floor(s * N)), dtds = (ts[i + 1] - ts[i]) * N * T;   // seconds per unit of s here
      player.pos.copy(pt); player.vel.copy(tng).multiplyScalar(sl / ds / Math.max(dtds, 1e-6));
      upv.set(0, 1, 0).applyQuaternion(GQ); player.base.copy(lookAtQ(tng, upv, qq)); player.quat.copy(player.base);
      look.copy(GC).sub(pt).normalize().multiplyScalar(L.bhLabLook ?? .35).addScaledVector(tng, 1 - (L.bhLabLook ?? .35)).normalize();
      rig.q.copy(lookAtQ(look, upv, qq)).multiply(qq.setFromAxisAngle(zAx, fall.roll)); rig.quat.copy(rig.q);
      rg.value = S_.v; const d = pt.distanceTo(GC);
      lbl.textContent = `${(d / BH.sh).toFixed(1)} shadows out · time ×${tdil.toFixed(2)}`;
      if (S_.v >= 1 && S_.playing) setPlay(false);
      return true;
    },
  };
})();
