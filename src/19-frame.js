/* ───────────────────────── every frame ───────────────────────── */
let coreGlowV = { k: 0, s: 1 }, mapK = 0;
// map: tiny day labels beside the winners nearest the camera, once you're close enough
const dayLab = (() => {
  const box = $('dayLabels'), pool = [], cand = [], v = new V3(); let shown = 0;
  return function update() {
    const L = LOOK, on = S.mode === 'map' && !tween && (L.mapDays ?? 1) > 0 && booted; box.style.setProperty('--dls', (L.mapDaySize ?? 8) + 'px'); box.style.opacity = L.mapDays ?? 1;
    cand.length = 0; if (on) { const R = L.mapDayDist ?? 60000, R2 = R * R, cp = camera.position; for (let i = 0; i < N; i++) { if (TA[i] < 1) continue; const dx = P[i * 3] - cp.x, dy = P[i * 3 + 1] - cp.y, dz = P[i * 3 + 2] - cp.z, d2 = dx * dx + dy * dy + dz * dz; if (d2 < R2) cand.push([d2, i]) } cand.sort((a, b) => a[0] - b[0]) }
    const n = Math.min(cand.length, L.mapDayN ?? 60); let k = 0;
    for (let c = 0; c < n; c++) { const i = cand[c][1]; v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(camera); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      let el = pool[k]; if (!el) { el = pool[k] = document.createElement('span'); box.appendChild(el) } const t = new Date(D[i].date + 'T00:00:00Z'), txt = `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()].slice(0, 3)}`;
      if (el.textContent !== txt) el.textContent = txt; el.style.left = ((v.x * .5 + .5) * innerWidth).toFixed(1) + 'px'; el.style.top = ((-v.y * .5 + .5) * innerHeight).toFixed(1) + 'px'; el.hidden = false; k++ }
    for (let j = k; j < shown; j++) pool[j].hidden = true; shown = k;
  };
})();
const shipCam = new THREE.PerspectiveCamera();   // the ship layer's camera: the main one, with a near plane small enough for the tiny ship   // the core glow's strength and size, for its volumetric version
const _v2 = new THREE.Vector2();
function resize() { renderer.setSize(innerWidth, innerHeight, false); shipRenderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.getDrawingBufferSize(_v2); U.res.value.copy(_v2); U.dpr.value = _v2.y / Math.max(1, innerHeight) }
function setDpr(d, force) { d = Math.max(.5, Math.min(3, d)); if (Math.abs(d - DPR) > .01 || force) { DPR = d; renderer.setPixelRatio(d); shipRenderer.setPixelRatio(d); resize() } }
addEventListener('resize', resize);
// adaptive resolution: compare frame time with the display's own interval (60, 120, 144 Hz…); step the pixel ratio
// down when frames run long, back up when there's headroom. Stalls (hidden tab, a shader compiling) don't count.
const NORENDER = QS.has('norender');
const perf = { avg: 16.7, vsync: 16.7, slow: 0, fast: 0, cool: 0, ms: 0, js: 0 };
function adapt(dtMs) {
  if (dtMs > 100 || dtMs <= 0) { perf.slow = perf.fast = 0; return }
  perf.avg += (dtMs - perf.avg) * .05;
  perf.vsync = dtMs < perf.vsync ? perf.vsync + (dtMs - perf.vsync) * .2 : perf.vsync + (dtMs - perf.vsync) * .002;   // a slowly rising running minimum
  if (!LOOK.adaptive || !booted || document.hidden) return;
  if (perf.cool > 0) { perf.cool--; return }
  const max = Math.min(LOOK.maxDpr, devicePixelRatio || 1), min = Math.min(max, .75);
  if (perf.avg > perf.vsync * 1.3) { perf.fast = 0; if (++perf.slow > 45 && DPR > min) { setDpr(Math.max(min, DPR - .25)); perf.slow = 0; perf.cool = 90; perf.avg = perf.vsync } }
  else if (perf.avg < perf.vsync * 1.08) { perf.slow = 0; if (++perf.fast > 300 && DPR < max) { setDpr(Math.min(max, DPR + .25)); perf.fast = 0; perf.cool = 120 } }
  else perf.slow = perf.fast = 0;
}

const _dustBlack = new C3(.018, .014, .02);
const farDimJS = d => 1 - LOOK.farDim * sstep(d, LOOK.farStart, LOOK.farStart * 6);
function updateAndro() {
  const L = LOOK, dGC = camera.position.distanceTo(GC), f = farDimJS(dGC);
  const inK = s => sstep(dGC, s * .12, s * .55);   // big glows fade once you're inside them, instead of whiting out the view
  const cg = 1 + ((L.coreGlows ?? 1) - 1) * coreIn;   // every big glow (core, bulge, haze, gas) scaled by "Glows in the core" while you're in it
  coreGlow.material.opacity = L.core * .22 * f * inK(coreGlow.scale.x) * cg; haze.u.op.value = L.haze * L.hazeBright * cg;
  wallSky.mesh.position.copy(camera.position); wallSky.u.op.value = L.wallpaper ? L.wallBlue : 0; wallSky.mesh.visible = !!L.wallpaper;
  sparkle.mesh.position.copy(camera.position); sparkle.u.op.value = L.wallpaper ? L.sparkle : 0; sparkle.mesh.visible = !!L.wallpaper && L.sparkle > 0;
  andro.visible = ANDRO; dustFil.visible = ANDRO && L.dustLanes > 0; if (!ANDRO) return;
  bulgeSpr.forEach(s => { s.scale.setScalar(bulgeR * 2 * s.userData.k * L.bulgeSize); s.material.opacity = s.userData.o * L.bulge * f * inK(s.scale.x) * cg });
  { const n = Math.round(Math.min(48, L.bulgePuffN ?? 6) * 1000), d = L.bulgePuffD ?? 1, sp = L.bulgePuffSpread ?? 1;   // finer grain: smaller puffs, each a little brighter so the bulge doesn't fade
    bulgePts.geometry.instanceCount = n; bulgePts.u.sz.value = 9000 / d / sp * (L.bulgePuffSize ?? 1); puffFx(bulgePts.u, L, 'bulgePuff'); bulgePts.u.op.value = .05 * L.bulge * L.bulgePuffs * Math.sqrt(d) * cg;
    bulgePts.scale.setScalar(sp); bulgePts.position.copy(GC).multiplyScalar(1 - sp); bulgePts.visible = L.bulgePuffs > 0 && n > 0 && !L.puffVol }
  const lp = toLocal(camera.position, tmp), rr = Math.hypot(lp.x, lp.z), inG = (1 - sstep(Math.abs(lp.y), L.dustInH * .4, L.dustInH)) * (1 - sstep(rr, GAL_R0 + GAL_LEN, (GAL_R0 + GAL_LEN) * 1.15));
  const du = dustFil.u; du.dust.value = L.dustLanes * (1 - L.dustInFade * inG); du.nearD.value = L.dustNear; du.wid.value = L.dustWidth; du.blur.value = L.dustBlur; du.armW.value = L.armWidth; du.len.value = L.dustLen; du.wig.value = L.dustWiggle; du.rag.value = L.dustRag; du.fib.value = L.dustFibre; du.brk.value = L.dustBreak;
  du.c.value.setRGB(.1, .055, .035).lerp(_dustBlack, L.dustDark); dustFil.geometry.instanceCount = Math.round(dustFil.geometry.userData.n * L.dustCount);
  knotPts.knots.u.op.value = .5 * L.knots; knotPts.knots.visible = L.knots > 0; knotPts.clouds.u.op.value = .16 * L.starClouds; knotPts.clouds.visible = L.starClouds > 0;
  outerDisk.u.op.value = L.outerGlow; outerDisk.visible = L.outerGlow > 0;
  SATS.forEach(s => { const fs = farDimJS(camera.position.distanceTo(s.pos)); s.g.visible = s.stars.visible = L.satellites > 0; s.stars.u.op.value = Math.min(1, L.satellites); s.pts.u.op.value = .18 * L.satellites * fs; s.glow.material.opacity = .5 * s.core * L.satellites * fs; s.core.material.opacity = .9 * s.core * L.satellites * fs });
}
const puffFx = (u, L, k) => { u.vari.value = L[k + 'Var'] ?? 0; u.soft.value = L[k + 'Soft'] ?? 1; u.tex.value = L[k + 'Tex'] ?? 0; u.texS.value = L[k + 'TexSize'] ?? 3; u.tint.value = L[k + 'Tint'] ?? .5; u.flick.value = L[k + 'Flick'] ?? 0 };
const _yt = liveText($('youTime'));
let rulerGoal = THR, rulerTick = 0, mapYrs = 27;
const RUL_U = { era: ERAS.map(e => e.u1).concat([ERAS[NERA - 1].u0]).filter(x => x > .001), yr: YEARS.map(y => yearU(Date.UTC(y, 0, 1))).filter(x => x > .001) };
function rulerScore(th, us) {   // how many of the dates would be on screen with the ruler turned to th, and a slight wish for it to hang down
  let n = 0; for (const uu of us) { const a = ringPoint(uu, th, 0, tmp2).project(camera); if (a.z < 1 && Math.abs(a.x) < .9 && Math.abs(a.y) < .86) n++ }
  const c = ringPoint(0, th, 0, tmp2).project(camera).clone(), e = ringPoint(1, th, 0, tmp2).project(camera); return n + .25 * Math.max(0, c.y - e.y) / Math.max(.01, Math.hypot(e.x - c.x, e.y - c.y));
}
let ringFarK = 0;
function updateTimeRings(dt) {
  const L = LOOK, u = timeRings.u, map = S.mode === 'map', fr = !!L.ringFly, lp = toLocal(map ? orbit.target : camera.position, tmp), rr = Math.hypot(lp.x, lp.z), Rr = GAL_R0 + GAL_LEN;
  if (map) {   // how many years fit across the view where you're looking decides which rings show
    const uu = Math.max(.03, Math.min(1, (Math.max(GAL_R0, rr) - GAL_R0) / GAL_LEN)), span = 2 * orbit.dist * Math.tan(camera.fov * Math.PI / 360) * Math.min(1, camera.aspect);
    mapYrs = span * yrsPerU(uu) / GAL_LEN;
    mapLvl[0] = 1; mapLvl[1] = 1 - sstep(mapYrs, L.mapYears, L.mapYears * 1.6); mapLvl[2] = 1 - sstep(mapYrs, 1.3, 2.6); mapStars = orbit.dist < 160000 ? 1 : 0;
    ringFarK = 0;
  } else {
    // far enough out (above the disk or past its rim) the timeline comes into view: the five-year marks, and the spiral itself
    const out = Math.max(Math.abs(lp.y), rr - Rr), F = Rr * (L.ringFar ?? .55); ringFarK = sstep(out, F, F * 1.6);
    const inside = (1 - sstep(Math.abs(lp.y), 60000, 200000)) * (1 - sstep(rr, Rr * 1.02, Rr * 1.2)); mapLvl[0] = fr ? 1 : ringFarK; mapLvl[1] = fr ? inside : 0; mapLvl[2] = 0; mapStars = 0;
  }
  const show = map || fr || ringFarK > .005; timeRings.mesh.visible = show && !SPIRAL && L.ruler + L.eraRings + L.ringYear > 0;   // with the single spiral, the spiral itself is the timeline ruler.visible = timeRings.mesh.visible && !SPIRAL;   // the spiral carries its own dates
  if (monthTicks) { monthTicks.visible = map && (L.mapMonths ?? 1) > 0; monthTicks.u.a.value = .55 * (L.mapMonths ?? 1) * (1 - sstep(mapYrs, L.mapMonthYrs ?? 8, (L.mapMonthYrs ?? 8) * 1.7)); monthTicks.setLen(L.mapTickLen ?? 1500) }   // month dividers once a few years fill the view
  if (spiralLine) { spiralLine.visible = show; spiralLine.u.a.value = (map ? .55 : .5 * ringFarK + (fr ? .35 : 0)) * Math.max(.3, Math.min(2, L.eraRings || 1)) }
  u.era.value = .3 * L.eraRings * mapLvl[0] * (map ? 1.3 : 1); u.yr.value = .13 * L.ringYear * mapLvl[1] * (map ? 1.4 : 1); u.mo.value = .1 * L.ringMonth * mapLvl[2] * (map ? 1.3 : 1);
  u.moR.value = map ? orbit.dist * 1.4 : L.monthRange; u.armOnly.value = SPIRAL ? 1 : L.ringArms; u.y0.value = S.y0; u.y1.value = S.y1;
  u.hiA.value += ((map && (ringHov || ringLab) ? 1 : 0) - u.hiA.value) * Math.min(1, dt * (ringHov || ringLab ? 14 : 3));
  const ru = ruler.u; ru.era.value = .35 * L.ruler * mapLvl[0]; ru.yr.value = .3 * L.ruler * mapLvl[1]; ru.mo.value = .3 * L.ruler * mapLvl[2]; ru.moR.value = u.moR.value;
  if (map && !SPIRAL) {   // the ruler turns so its dates stay in view
    if (++rulerTick % 6 === 0 && !tween) {
      const us = mapLvl[1] > .3 ? RUL_U.yr : RUL_U.era, cur = rulerScore(ruler.th, us); let best = rulerGoal, bs = -1;
      for (let k = 0; k < 24; k++) { const th = ruler.th + k / 24 * 2 * Math.PI, sc = rulerScore(th, us) - .02 * Math.min(k, 24 - k); if (sc > bs) { bs = sc; best = th } }
      if (bs > cur + .6) rulerGoal = best;
    }
    let d = (rulerGoal - ruler.th) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI;
    if (Math.abs(d) > 1e-4) ruler.turn(ruler.th + d * Math.min(1, dt * 3));
  } else if (ruler.th !== THR) { ruler.turn(THR); rulerGoal = THR }
  // you-are-here ring + date
  const pl = toLocal(player.pos, tmp2), pr = Math.hypot(pl.x, pl.z), inMe = S.mode === 'fly' ? (1 - sstep(Math.abs(pl.y), 40000, 140000)) * (1 - sstep(pr, Rr * 1.01, Rr * 1.08)) * sstep(pr, GAL_R0 * .9, GAL_R0 * 1.2) : 0;
  youRing.scale.setScalar(Math.max(1, pr)); youRing.material.opacity = .4 * L.youRing * inMe; youRing.visible = fr && inMe > .01 && L.youRing > 0;   // the date still rides along; the ring only with time rings on
  const yt = $('youTime');
  if (inMe > .01 && L.youRing > 0) {
    const t = new Date(uToT((pr - GAL_R0) / GAL_LEN)); _yt(MON3[t.getUTCMonth()] + ' ' + t.getUTCFullYear());
    const a = Math.atan2(pl.z, pl.x) + .0009 * Math.max(1, 600000 / Math.max(pr, 1)); tmp2.set(Math.cos(a) * pr, 0, Math.sin(a) * pr).applyQuaternion(GQ).add(GC).project(camera);
    if (tmp2.z < 1 && Math.abs(tmp2.x) < 1.1 && Math.abs(tmp2.y) < 1.1) { yt.hidden = false; yt.style.left = ((tmp2.x * .5 + .5) * innerWidth) + 'px'; yt.style.top = ((-tmp2.y * .5 + .5) * innerHeight) + 'px'; yt.style.opacity = Math.min(1, inMe) } else yt.hidden = true
  } else yt.hidden = true;
  // day ticks beside the nearest winners
  let v = 0;
  if (S.mode === 'fly' && L.dayTicks && fr) for (const [d2, i] of bodyCand.slice(0, DAY_N)) {
    if (d2 > 8000 * 8000) continue; const sl = toLocal(starPos(i, tmp), tmp), r0 = Math.hypot(sl.x, sl.z), ang = Math.atan2(sl.z, sl.x), rad = tmp2.set(Math.cos(ang), 0, Math.sin(ang)), tg = new V3(-rad.z, 0, rad.x), side = starR(i) * 2.4, uD = GAL_R0 + yearU(D[i].t) * GAL_LEN;
    for (let k = -3; k <= 3; k++) {
      const dr = GAL_R0 + yearU(D[i].t + k * 864e5) * GAL_LEN - uD, L2 = (k ? starR(i) * .25 : starR(i) * .55), cR = r0 + dr;
      const c = new V3(rad.x * cR, sl.y, rad.z * cR).addScaledVector(tg, side), p0 = c.clone().addScaledVector(tg, -L2 * .5), p1 = c.clone().addScaledVector(tg, L2 * .5);
      p0.applyQuaternion(GQ).add(GC); p1.applyQuaternion(GQ).add(GC); dayPos.set([p0.x, p0.y, p0.z, p1.x, p1.y, p1.z], v * 6); v++
    }
  }
  dayTicks.geometry.setDrawRange(0, v * 2); if (v) dayTicks.geometry.attributes.position.needsUpdate = true; dayTicks.visible = v > 0;
}
function updateShadow() {
  shadowMesh.visible = false; if (!LOOK.shadow || S.mode !== 'fly') return;
  const l = toLocal(player.pos, tmp), h = Math.abs(l.y), rr = Math.hypot(l.x, l.z);
  if (h < 9000 && rr < GAL_R0 + GAL_LEN) { const dens = Math.exp(-h / 3000) * (1 - sstep(rr, GAL_LEN * .6, GAL_R0 + GAL_LEN)); if (dens < .02) return; l.y = 0; shadowMesh.position.copy(l.applyQuaternion(GQ).add(GC)); shadowMesh.quaternion.copy(GQ); shadowMesh.scale.setScalar(10 * SHIP_K + h * .025); shadowMesh.material.opacity = .6 * dens; shadowMesh.visible = true }
}
// nearby winners as real bodies; they take over from the sprite's core at the same size
const _bm = new THREE.Matrix4(), _bs = new V3(), _bq = new Q4();
function updateBodies() {
  const B = bodies; let n = 0;
  for (let b = BODY_N - 1; b >= 0; b--) {   // farthest first: one instanced draw, blended back to front
    const co = B.coronas[b], c = LOOK.bodies && !LOOK.rings ? bodyCand[b] : null; co.visible = false; if (!c) continue;   // with rings, no suns
    const i = c[1], d = Math.sqrt(c[0]), ps = Math.min(220, SIZE[i] * LOOK.starSize * pxJS() / Math.max(1, d)), coreR = LOOK.starCore * (TYPE[i] > 1.5 ? .5 : TYPE[i] > .5 ? .7 : 1) * ps * .5;
    const bodyR = starR(i) * innerHeight * DPR / (2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(1, d)), a = sstep(bodyR, coreR * .8, coreR * 1.6);
    if (a <= .01) continue;
    starPos(i, tmp); B.mesh.setMatrixAt(n, _bm.compose(tmp, _bq, _bs.setScalar(starR(i)))); B.iCol.set([COL[i * 3], COL[i * 3 + 1], COL[i * 3 + 2]], n * 3); B.iA[n] = a; n++;
    co.visible = true; co.position.copy(tmp); co.scale.setScalar(starR(i) * LOOK.corona * 5); co.material.opacity = a * .55; co.material.color.setRGB(COL[i * 3], COL[i * 3 + 1], COL[i * 3 + 2]);
  }
  B.mesh.count = n; if (n) { B.mesh.instanceMatrix.needsUpdate = true; B.attrCol.needsUpdate = B.attrA.needsUpdate = true } B.u.br.value = LOOK.sunBright;
}
// streaks: dust stretched along the direction of travel; denser in the arms and the core
let streakDens = 0;
function updateStreaks(dt) {
  const L = LOOK, v = player.vel, sp = v.length(), su = streaks.u;
  su.disp.value.addScaledVector(v, dt); ['x', 'y', 'z'].forEach(k => { su.disp.value[k] %= 2 * SL_H }); streaks.position.copy(player.pos);
  su.len.value = Math.min(SL_H * .8, sp * .04 * L.streakLen); if (sp > 1e-3) su.dir.value.copy(v).divideScalar(sp);
  const lp = toLocal(player.pos, tmp), rr = Math.hypot(lp.x, lp.z), Rr = GAL_R0 + GAL_LEN;
  const disk = (1 - sstep(Math.abs(lp.y), L.streakInH * .4, L.streakInH)) * (1 - sstep(rr, Rr * .95, Rr * 1.2)), da = armDist(lp.x, lp.z) / armWAt(rr), arm = Math.exp(-da * da * 5 / (L.armWidth * L.armWidth));
  const core = Math.exp(-Math.pow(rr / (Rr * .22), 2)) * (1 - sstep(Math.abs(lp.y), Rr * .08, Rr * .25));
  streakDens = Math.max(disk * (.08 + .92 * arm), core);   // straight from where you are: it thins toward the edge of the disk and is gone past it
  streaks.geometry.setDrawRange(0, Math.floor(Math.min(SL_N, SL_N / 3 * L.streakAmt * streakDens)) * 2);
  su.op.value += (sstep(sp, 150, 4000) * .32 * L.streakBright * Math.min(1, streakDens * 3) - su.op.value) * Math.min(1, dt * 6);
  const mu = motes.u, B = L.moteBox * SHIP_K; mu.box.value = B; mu.size.value = L.moteSize * SHIP_K; mu.follow.value = L.moteFollow; mu.core.value = L.moteCore; mu.sB.value = bulgeR * .42 * (L.bulgePuffSpread ?? 1) * L.moteCoreReach; mu.bhR.value = BH.rs * Math.max(3.5, L.bhDiskOut); mu.bhZ.value = L.moteBhZone; mu.bhH.value = L.moteBhH;
  mu.op.value += ((1 - sstep(sp, 3000, 60000)) * 1.3 * L.moteBright - mu.op.value) * Math.min(1, dt * 6);
  toLocal(camera.position, tmp); tmp.set(-tmp.z, 0, tmp.x); if (tmp.lengthSq() > 1) tmp.normalize().applyQuaternion(GQ);   // orbital direction here
  mu.flow.value.addScaledVector(tmp, L.moteDrift * SHIP_K * dt * tdil); ['x', 'y', 'z'].forEach(k => { mu.flow.value[k] %= 2 * B; mu.camMod.value[k] = camera.position[k] % (2 * B) });
  motes.geometry.instanceCount = Math.floor(MOTE_N * L.moteDensity);
}

/* the TRON trail, rebuilt each frame as one ribbon for all its strands */
const strands = []; let curStrand = null, trClock = 0;
// how long a stretch of trail lives depends on how fast you were going when you laid it: a crawl leaves a short wisp, speed a long ribbon
const trLife = sp => { const L = LOOK; return L.trLifeCrawl + (L.trLifeCruise - L.trLifeCrawl) * sstep(sp, 2, 900) + (L.trLifeFast - L.trLifeCruise) * sstep(sp, 900, 600000) };
const _flc = new C3(), _amber = new C3(0xffb547), _slowC = new C3(), _fastC = new C3(), _trc = new C3(), _white = new C3(.8, .9, 1), _te = new V3(), _d = new V3(), _c = new V3(), _sdv = new V3();
// W alone lays the usual trail, boost alone a blue one, both together a light neon magenta
const _cBoost = new C3(), _cBoth = new C3(); let trW = 1, trB = 0;
function trailColour(sT, b, o, gw = 1, gb = 0) {
  if (trailK > 0) TRAILS[trailK].c(_slowC, _fastC, sT); else if (LOOK.trMyHue) { _slowC.setHSL(PILOT_HUE / 360, 1, .55); _fastC.setHSL(PILOT_HUE / 360, .9, .7) } else { _slowC.setHSL(LOOK.trHueSlow / 360, 1, .55); _fastC.setHSL(LOOK.trHueFast / 360, .95, .6) }   // your own pilot colour, the one others see
  o.copy(_slowC).lerp(_fastC, sT).lerp(_white, sstep(sT, .85, 1) * .35);
  if (gb > .001) { _cBoth.setHSL(.86, 1, .7); o.lerp(_cBoth, .32 * gb).multiplyScalar(1 + .55 * gb) }   // boost: your own colour, with a touch of magenta and brighter
  return o.multiplyScalar(b);
}
function trimStrand(st) { const Pp = st.pts; while (Pp.length > 2 && trClock - Pp[Pp.length - 2].t > Pp[Pp.length - 2].life) Pp.pop();   // whatever has outlived its time is gone
  let acc = 0; for (let k = 1; k < Pp.length; k++) { const d = Pp[k].p.distanceTo(Pp[k - 1].p); if (acc + d >= st.len) { const f = (st.len - acc) / Math.max(d, 1e-6); Pp[k].p.lerpVectors(Pp[k - 1].p, Pp[k].p, f); Pp.length = k + 1; return } acc += d } if (Pp.length > TR_STRAND) Pp.length = TR_STRAND }
function updateTrail(dt, on) {
  const L = LOOK, sp = player.vel.length(), lin = Math.max(0, Math.min(1, Math.log10(Math.max(sp, 20) / 20) / Math.max(.1, L.trRef - Math.log10(20)))), speedT = Math.pow(lin, L.trColorCurve);
  trClock += dt; const life = trLife(sp);
  const emit = (st, mul) => {
    const eng = _te.copy(avatar.userData.tail).multiplyScalar(avatar.scale.x).applyQuaternion(player.quat).add(player.pos), bright = L.trBright * (.75 + speedT * 1.4 * L.trSpeedBoost + .25) * mul, step = Math.max(.4, st.len / (TR_STRAND * .9));
    const pt = () => ({ p: eng.clone(), s: speedT, b: bright, w: trW, k: trB, t: trClock, life });
    if (st.pts.length < 2) st.pts = [pt(), pt()];   // pts[0] rides the engine; the rest are laid down in space
    else if (st.pts[1].p.distanceTo(eng) > step) st.pts.unshift(pt());
    else { const h = st.pts[0]; h.p.copy(eng); h.s = speedT; h.b = bright; h.w = trW; h.k = trB; h.t = trClock; h.life = life }
    trimStrand(st);
  };
  const laying = thrusting || holdSp >= 0;   // holding X keeps the engine (and its trail) going
  if (laying) { trW += ((gasOn || holdSp >= 0 ? 1 : 0) - trW) * Math.min(1, dt * 7); trB += ((boosting ? 1 : 0) - trB) * Math.min(1, dt * 7) }
  if (on && laying) {
    if (!curStrand) { curStrand = { pts: [], len: 0, alpha: 0, rel: null }; strands.unshift(curStrand); if (strands.length > 8) strands.pop() }
    const st = curStrand; st.rel = null; st.alpha = Math.min(1, st.alpha + dt / Math.max(.01, L.trIn ?? .3)); const want = L.trLenCrawl + (L.trLenCruise - L.trLenCrawl) * sstep(sp, 2, 900) + (L.trLenFast - L.trLenCruise) * sstep(sp, 900, 600000);
    st.len += (want - st.len) * (1 - Math.exp(-(want > st.len ? L.trGrow : L.trShrink) * dt)); emit(st, 1);
  } else if (curStrand) { const st = curStrand; st.rel = (st.rel || 0) + dt; const f = 1 - st.rel / Math.max(.05, L.trRelease); if (f <= 0 || !on || sp < 6) curStrand = null; else emit(st, f * f * (3 - 2 * f)) }   // let go: keep laying trail while it dims, then detach
  const still = sp < 6;
  for (let i = strands.length - 1; i >= 0; i--) { const st = strands[i]; if (st === curStrand) continue; const r = Math.min(still ? L.trStill : L.trFade, 6.5 / Math.max(.01, L.trOut ?? .45)); st.alpha *= Math.exp(-r * .6 * dt); st.len *= Math.exp(-r * .35 * dt); trimStrand(st); if (st.alpha < .02 || st.len < 1 || st.pts.length < 2) strands.splice(i, 1) }
  let v = 0; const pxW = Math.tan(camera.fov * Math.PI / 360) / Math.max(1, innerHeight), O = player.pos; trail.position.copy(O);   // vertices relative to the ship
  // right at the engine the ribbon is as wide as the hole it comes out of, and it widens to its own width over a few ship lengths
  const holeW = HOLE.r * 2 * avatar.scale.x * L.trHead, blend = avatar.scale.x * 22;
  const put = (p, dir, t, c, a, w, run = 1e9) => {
    if (v >= TR_MAX) return; _c.copy(camera.position).sub(p); _sdv.crossVectors(dir, _c); const l = _sdv.length(), cl = _c.length(), hmin = .75 * pxW * cl; let hw = (w * pxW * cl + (holeW * .5 - w * pxW * cl) * (1 - sstep(run, 0, blend)));
    if (hw < hmin) { a *= hw / hmin; hw = hmin }   // never thinner than about 1.5 px: below that it gets fainter instead, so it fades out smoothly rather than flickering away
    if (l > 1e-6) _sdv.multiplyScalar(hw / l); else _sdv.set(0, 0, 0);
    const x = p.x - O.x, y = p.y - O.y, z = p.z - O.z, o = v * 6; trPos[o] = x + _sdv.x; trPos[o + 1] = y + _sdv.y; trPos[o + 2] = z + _sdv.z; trPos[o + 3] = x - _sdv.x; trPos[o + 4] = y - _sdv.y; trPos[o + 5] = z - _sdv.z;
    trT[v * 2] = trT[v * 2 + 1] = t; trC[o] = trC[o + 3] = c.r; trC[o + 1] = trC[o + 4] = c.g; trC[o + 2] = trC[o + 5] = c.b; trA[v * 2] = trA[v * 2 + 1] = a; v++;
  };
  for (const st of strands) {
    const Pp = st.pts, n = Pp.length; if (n < 2) continue; let total = 0; for (let k = 1; k < n; k++) total += Pp[k].p.distanceTo(Pp[k - 1].p); if (total <= 0) continue; let run = 0;
    const live = st === curStrand;
    for (let k = 0; k < n; k++) {
      if (k > 0) run += Pp[k].p.distanceTo(Pp[k - 1].p); _d.copy(Pp[Math.min(k + 1, n - 1)].p).sub(Pp[Math.max(k - 1, 0)].p);
      const t = run / total, w = L.trWMin + (L.trWMax - L.trWMin) * Math.pow(Pp[k].s, L.trWCurve), age = Math.max(0, trClock - Pp[k].t) / Math.max(.05, Pp[k].life ?? 3), fa = st.alpha * (1 - sstep(age, .2, 1));
      trailColour(Pp[k].s, Pp[k].b, _trc, Pp[k].w ?? 1, Pp[k].k ?? 0);
      if (k === 0) put(Pp[k].p, _d, t, _trc, 0, w, live ? 0 : 1e9);
      if (k === 1 && live) for (const f of [.04, .15, .45, 1]) { if (blend * f >= run) break; _sdv.lerpVectors(Pp[0].p, Pp[1].p, blend * f / run); put(_sdv.clone(), _d, t * blend * f / run, _trc, fa, w, blend * f) }   // extra joints where it flares out of the hole
      put(Pp[k].p, _d, t, _trc, fa, w, live ? run : 1e9); if (k === n - 1) put(Pp[k].p, _d, t, _trc, 0, w);
    }
  }
  const used = Math.max(v, trail.userData.used || 0); for (let k = v; k < used; k++) { trA[k * 2] = trA[k * 2 + 1] = 0; if (v > 0) trPos.copyWithin(k * 6, (v - 1) * 6, v * 6) } trail.userData.used = v;
  trail.geometry.setDrawRange(0, Math.max(0, v - 1) * 6); if (v) ['position', 'aT', 'aC', 'aA'].forEach(n => trail.geometry.attributes[n].needsUpdate = true);
  const u = trail.u, cd = camera.position.distanceTo(player.pos); u.nearA.value = cd * .12 * L.trNearFade; u.nearB.value = cd * .5 * L.trNearFade; u.core.value = L.trCore; u.glow.value = L.trGlow; u.taper.value = L.trTaper; u.shim.value = L.trShimmer;
}

/* the engine: the light in the hole, the glow at its mouth and the flare, all in the trail's colour; brighter while you thrust */
let thrS = 0; const _fc = new C3();
function engineLook(dt) {
  const L = LOOK; thrS += (((thrusting || holdSp >= 0) && booted && S.mode === 'fly' ? (thrusting ? 1 : .35 + .5 * sstep(Math.log10(Math.max(1, holdSp)), 2, 5.5)) : 0) - thrS) * Math.min(1, dt * 6);
  const on = emitGlow * (.42 + .58 * thrS + .3 * boostK); trailColour(.4, 1, _fc, gasOn || !boosting ? 1 : 0, boosting ? 1 : 0);
  const h = avatar.userData.hole; h.col.value.copy(_fc); h.on.value = on; h.spin.value += dt * (1.2 + 26 * thrS + 30 * boostK);   // the turbine spins up with the engine
  const em = avatar.userData.emit; em.material.color.copy(_fc); em.material.opacity = Math.min(1, on * .85);
  const mouth = _te.copy(avatar.userData.tail).multiplyScalar(avatar.scale.x).applyQuaternion(avatar.quaternion).add(avatar.position);
  const back = _d.set(0, 0, 1).applyQuaternion(avatar.quaternion), toCam = _c.copy(camera.position).sub(mouth), d = toCam.length(); toCam.divideScalar(d || 1);
  // speed lengthens and brightens the spikes; pressing thrust sets off a short burst
  const thrNow = thrusting && booted && S.mode === 'fly', spNow = player.vel.length(); if (thrNow && !engineLook.was) engineLook.burst = Math.max(engineLook.burst || 0, 1 - .85 * sstep(Math.log10(Math.max(1, spNow)), 2, 5.3)); engineLook.was = thrNow;   // a push from standstill kicks hard; at speed only a little
  if (boosting && !engineLook.wasB) engineLook.burst = Math.max(engineLook.burst || 0, 1.1); engineLook.wasB = boosting;   // boost always booms engineLook.burst = (engineLook.burst || 0) * Math.exp(-dt / Math.max(.05, L.flareBurstTime ?? .5));
  const spK = sstep(Math.log(Math.max(150, player.vel.length())), Math.log(150), Math.log(Math.max(300, L.cruiseSpeed))), sp = 1 + (L.flareSpeed ?? 1) * (spK - .3), bu = engineLook.burst * (L.flareBurst ?? 1.2);
  const vis = sstep(back.dot(toCam), -.05, .3), fu = flare.u, px = L.flareLen * 2 * Math.max(.3, sp) * (1 + bu * .5) * (1 + ringPop * 2 * (L.ringPopSize ?? 1));
  fu.spk.value = L.flareSparkle ?? 1; fu.rate.value = L.flareRate ?? 2; fu.glow.value = (L.flareGlow ?? 1) * (1 + bu * .6);
  fu.col.value.copy(_fc); fu.k.value = L.flare * vis * Math.max(on * Math.max(.3, sp) * (1 + bu), igniteK * .6, ringPop * (L.ringPop ?? 1)); fu.ig.value = igniteK * (L.igniteBloom ?? 1.5); fu.pop.value = ringPop * (L.ringPop ?? 1);   // ignition flares the point and spikes only fu.n.value = L.flareSpikes; fu.half.value = L.flareHalf ? 1 : 0; fu.turn.value = L.flareTurn * Math.PI / 180; fu.px.value = px; fu.q.value = px * 3;
  flare.position.copy(mouth).addScaledVector(back, avatar.scale.x * .06); flare.scale.setScalar(px * 3 * 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, innerHeight) * d); flare.visible = S.mode === 'fly' && fu.k.value > .002;
}

/* lock-on marker, reticle and tooltip */
const fmtDist = v => v < 1000 ? v.toFixed(0) + ' u' : v < 1e6 ? (v / 1000).toFixed(v < 1e4 ? 1 : 0) + 'k u' : (v / 1e6).toFixed(2) + 'M u';
const TNAV = '<span class="tnav"><b data-n="-1" title="Previous (←)">‹</b><b data-n="1" title="Next (→)">›</b><i class="tdist"></i></span>';   // step through the archive from the star you're on
const lockMark = $('lockMark');
function updateLockMark() {
  if (S.mode === 'fly' && lockI >= 0) {
    starPos(lockI, tmp).applyMatrix4(camera.matrixWorldInverse); const behind = tmp.z > 0; tmp.applyMatrix4(camera.projectionMatrix);
    let x = tmp.x, y = tmp.y; if (behind) { x = -x; y = -y } const on = !behind && Math.abs(x) < .96 && Math.abs(y) < .94;
    if (!on) { const m = Math.max(Math.abs(x) / .92, Math.abs(y) / .88, 1e-6); x /= m; y /= m }
    const px = on ? Math.max(30, Math.min(220, starPx(lockI, Math.max(1, camera.position.distanceTo(starPos(lockI, tmp2)))) * .9)) : 26;
    lockMark.hidden = false; crossEl.classList.add('lockon'); lockMark.classList.toggle('edge', !on); lockMark.style.setProperty('--a', Math.atan2(-y, x) + 'rad'); lockMark.style.width = lockMark.style.height = px + 'px'; lockMark.style.left = ((x * .5 + .5) * innerWidth) + 'px'; lockMark.style.top = ((-y * .5 + .5) * innerHeight) + 'px';
  } else if (!lockMark.hidden) { lockMark.hidden = true; crossEl.classList.remove('lockon') }
}
let hoverT = 0, lastRing = null, hovPick = -1;
// the full record fades in piece by piece: date, title, screenshot, then each line of details
function cardFlicker() {
  const parts = [...tip.querySelectorAll('.td, .tt, canvas.tshot, dl > div, a')]; let t = 0;
  parts.forEach(e => { e.style.setProperty('--fk', 'flk' + (1 + (Math.random() * 3 | 0))); e.style.setProperty('--fd', (.35 + Math.random() * .3).toFixed(2) + 's'); e.style.setProperty('--fdl', (t += .05 + Math.random() * .06).toFixed(2) + 's'); e.classList.remove('flk-go'); void e.offsetWidth; e.classList.add('flk-go') });
} const tipAt = { x: 0, y: 0 };
const ringTip = R => { const n = R.lvl === 2 ? null : perYear[Math.floor(R.y) - 2000] || 0; return tipBox(R.lvl === 2 ? `${MONTHS[R.m]} ${R.yr}` : R.lvl === 0 ? `${R.yr} · five-year mark` : String(R.yr), R.lvl === 2 ? `${MONTHS[R.m]} ${R.yr}` : `${n.toLocaleString('en')} winners`) };
function updateHover(dt) {
  hoverT += dt; if (hoverT > .06) {
    hoverT = 0; const map = S.mode === 'map', aim = !map && (locked() || coarse), hx = aim ? innerWidth / 2 : mouse.x, hy = aim ? innerHeight / 2 : mouse.y;
    let h = -1, R = null;
    if (map) { if (mouse.in && !down && booted && !tween) { const r = mapHover(hx, hy); h = r.i; R = r.ring } }   // the map points at rings, and at winners once you're close
    else { if ((aim || mouse.in) && !down && booted) h = pick(hx, hy); if (h >= 0) { const dd = Math.max(1, camera.position.distanceTo(starPos(h, tmp))); if (dd > (LOOK.hoverDist ?? 4e5) || starPx(h, dd) < (LOOK.hoverPx ?? 2.5)) h = -1 } }   // close enough, and a few px across
    if (!down) hovPick = h; if (h === openI) h = -1;   // a click can only take a star you've just hovered
    if (h >= 0 && h !== lastHov) { starPos(h, tmp).project(camera); tingle(galOf(D[h].year), h, Math.max(-1, Math.min(1, tmp.x))) } lastHov = h;
    if (R && (!lastRing || lastRing.y !== R.y)) tingle(galOf(R.yr), 5000 + Math.round(R.y * 12), Math.max(-1, Math.min(1, hx / innerWidth * 2 - 1)));
    ringHov = R; lastRing = R; if (R) timeRings.u.hi.value = R.y;
    canvas.classList.toggle('hovering', (h >= 0 || !!R) && !aim); crossEl.classList.toggle('on', h >= 0 && aim); hovI = h; tipAt.x = hx; tipAt.y = hy;
  }
  // what the tooltip shows: a winner you point at; else the one you're beside (opened up into its full record); else your lock
  const map = S.mode === 'map', pin = cardI >= 0 ? cardI : !map && lockI >= 0 ? lockI : -1;
  const put = (key, html, full) => {
    if (tipFor !== key) { tip.innerHTML = html; tipFor = key; if (full) { drawCardImg(cardI); cardFlicker() } }
    tip.classList.toggle('full', !!full); tip.classList.toggle('dock', !!full && !coarse); tip.hidden = false };
  if (hovI >= 0 && hovI !== pin) { put('h' + hovI, tipHTML(hovI) + TNAV, false); tip.style.left = tipAt.x + 'px'; tip.style.top = tipAt.y + 'px' }
  else if (ringHov && pin < 0) { put('r' + ringHov.y, ringTip(ringHov), false); tip.style.left = tipAt.x + 'px'; tip.style.top = tipAt.y + 'px' }
  else if (pin >= 0) {
    const d = Math.max(1, camera.position.distanceTo(starPos(pin, tmp))); tmp.project(camera);
    const edge = pin === lockI && pin !== cardI && !coarse && !(tmp.z < 1 && Math.abs(tmp.x) < 1 && Math.abs(tmp.y) < 1);
    if (edge) {   // the star you're locked on is off screen: its card waits at the edge, beside the arrow pointing to it
      put('p' + pin, tipHTML(pin) + TNAV + tipMore(pin), false);
      let x = tmp.x, y = tmp.y; if (tmp.z >= 1) { x = -x; y = -y } const m = Math.max(Math.abs(x) / .92, Math.abs(y) / .88, 1e-6); x /= m; y /= m;
      const w = tip.offsetWidth, h = tip.offsetHeight, px = (x * .5 + .5) * innerWidth, py = (-y * .5 + .5) * innerHeight;
      tip.style.left = Math.max(12, Math.min(innerWidth - w - 12, px - (x > 0 ? w + 22 : -22))) + 'px'; tip.style.top = Math.max(64, Math.min(innerHeight - h - 12, py - h / 2)) + 'px';
    } else if (tmp.z < 1 && Math.abs(tmp.x) < 1.3 && Math.abs(tmp.y) < 1.3) {
      put('p' + pin, tipHTML(pin) + TNAV + tipMore(pin), pin === cardI);
      const rpx = starR(pin) * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360) * d), full = pin === cardI;   // the star's own radius on screen
      let x = (tmp.x * .5 + .5) * innerWidth + (full ? rpx * .72 : 0), y = (-tmp.y * .5 + .5) * innerHeight - (full ? rpx * .5 : 0);
      if (full && !coarse) { x = 24; y = 64; tip.style.setProperty('--cs', Math.max(.5, Math.min(LOOK.cardScale ?? 1.7, (innerHeight - 64 - 130) / Math.max(1, tip.offsetHeight), innerWidth * .5 / Math.max(1, tip.offsetWidth))).toFixed(3)) }   // the full record: top left, as big as the screen allows   // the full record waits on the left, still, whatever the camera does
      else if (full) { const w = tip.offsetWidth + 24, h = tip.offsetHeight + 24; if (x + w > innerWidth) x = Math.max(8, (tmp.x * .5 + .5) * innerWidth - rpx * .72 - w); x = Math.max(8, Math.min(innerWidth - w, x)); y = Math.max(60, Math.min(innerHeight - h - 8, y)) }
      tip.style.left = x + 'px'; tip.style.top = y + 'px';
    } else tip.hidden = true;
  } else if (!tip.hidden) { tip.hidden = true; tipFor = '' }
  { const m = !tip.hidden && /^[hp](\d+)/.exec(tipFor), el = m && tip.querySelector('.tdist'); if (el) el.textContent = fmtDist(camera.position.distanceTo(starPos(+m[1], tmp))) }   // how far it is, live
}
const RET = { L: $('arcL'), R: $('arcR'), sp: $('lSPD'), pw: $('lPWR'), sv: '', bv: '', used: +store.get('sotd-pwr-used') || 0 };
function updateBoostUI(dt = 0) {   // the reticle's brackets: speed on the left, boost power on the right; their labels until you've boosted 5 s in all
  const fly = S.mode === 'fly', sp = player.vel.length(), top = Math.min(LIGHT * .97, LOOK.topSpeed ?? Infinity), k = Math.pow(Math.min(1, Math.max(0, (Math.log10(1 + sp) - 1) / (Math.log10(1 + top) - 1))), .8), moving = fly && sp > 25;
  const arc = (el, v, key) => { const s = v.toFixed(3); if (s === RET[key]) return; RET[key] = s; el.style.strokeDasharray = `${v * 100} 100`; el.style.strokeDashoffset = (-(100 - v * 100) / 2).toFixed(2) };   // grows from its middle
  arc(RET.L, Math.max(.04, k), 'sv'); RET.L.style.opacity = moving ? .95 : 0;
  const bShow = fly && (boosting || boostE < .999) && boostE > .004; arc(RET.R, boostE, 'bv'); RET.R.style.opacity = bShow ? (boosting ? 1 : .55) : 0;
  if (boosting && RET.used < 5) { RET.used += dt; if (RET.used >= 5) store.set('sotd-pwr-used', '5') }
  const lbl = RET.used < 5 && !crossEl.classList.contains('lockon'); RET.sp.style.opacity = lbl && moving ? .32 : 0; RET.pw.style.opacity = lbl && boosting ? .32 : 0;
  crossEl.style.setProperty('--rs', LOOK.reticleSize ?? 1);
}

// a tiny readout of the renderer (press the backtick key, or open with ?stats)
const stats = { el: null, t: 0, n: 0, show(on) { if (on && !this.el) { this.el = document.createElement('div'); this.el.id = 'stats'; document.body.appendChild(this.el) } if (this.el) this.el.hidden = !on; this.on = on } };
addEventListener('keydown', e => { if (e.key === '`' && !e.target.matches('input,select,textarea')) stats.show(!stats.on) });
if (QS.has('stats')) stats.show(true);
function updateStats(dt) { if (!stats.on) return; stats.t += dt; stats.n++; if (stats.t < .5) return; stats.el.textContent = `${GPU ? 'WebGPU' : 'WebGL 2'} · ${Math.round(stats.n / stats.t)} fps · ${perf.avg.toFixed(1)} ms · js ${perf.js.toFixed(1)} ms · dpr ${DPR}`; stats.t = stats.n = 0 }
let last = performance.now(), netT = 0, cardTick = 0, conT = 0;
function tick(now) {
  const tStart = performance.now(), rawMs = now - last, dt = Math.max(0, Math.min(.05, rawMs / 1000)); last = Math.max(last, now); adapt(rawMs); if (bench.on && rawMs > 0 && rawMs < 500) bench.ms.push(rawMs);
  const L = LOOK, fly = S.mode === 'fly';
  ring2.rotation.y += dt * .05; beacons.forEach((b, k) => { b.material.emissiveIntensity = (Math.sin(now * .003 + k * 1.7) > .6) ? 2 : .2 });
  if (fly && booted) {
    if (warp) stepWarp(dt); else updatePlayer(dt); tourUpdate(dt); avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat);
    const fl = avatar.userData.flame; fl.material.opacity += ((thrusting ? .85 : holdSp >= 0 ? .5 : 0) - fl.material.opacity) * Math.min(1, dt * 10); { const fz = .6 + .4 * Math.sin(now * .04) + (thrusting ? .6 + player.cruise * 1.5 : 0); fl.scale.set(1.1 + fz * .45, 1.1 + fz * .45, 1) }   // a breathing ball, bigger while thrusting
    ;
    fl.material.color.copy(trailColour(1, 1, _flc, gasOn || !boosting ? 1 : 0, boosting ? 1 : 0).lerp(_amber, gasOn && !boosting ? 1 : 0));   // the flame takes the trail's colour
  } else if (booted) { nearest(camera.position) }   // on the map, the winners right around you become suns as you zoom in
  if (!intro.active) updateCamera(dt); else intro.update(dt);
  engineLook(dt);
  avatar.visible = fly; youMark.visible = !fly; if (!fly) { youMark.position.copy(player.pos); youMark.scale.setScalar(.028 * (1 + .18 * Math.sin(now * .005))) }
  updateBodies();
  // relativity: real aberration of where things appear, and a Doppler shift (exaggerated to taste) in the final pass
  beta = fly ? Math.min(.995, player.vel.length() / LIGHT) : 0;
  if (player.vel.lengthSq() > 1) U.vdir.value.copy(player.vel).normalize(); else U.vdir.value.set(0, 0, -1).applyQuaternion(rig.q);
  U.beta.value = Math.min(.995, beta * L.relativity); PU.betaC.value = Math.min(.8, beta * L.shift); PU.beam.value = L.beaming;
  PU.vV.value.copy(U.vdir.value).transformDirection(camera.matrixWorldInverse); PU.ty.value = Math.tan(camera.fov * Math.PI / 360); PU.tx.value = PU.ty.value * camera.aspect;
  PU.nV.value.set(0, 1, 0).applyQuaternion(GQ).transformDirection(camera.matrixWorldInverse); PU.edge.value = L.edgeDim; { const a = Math.sin(L.edgeAngle * Math.PI / 180); PU.edgeA.value = a; PU.edgeB.value = Math.min(1, Math.max(a * 1.05 + .002, a * L.edgeSoft)) }
  stars.u.far.value = fly ? 1 : 0;
  { const d = (fly ? player.pos : camera.position).distanceTo(GC); tdil = L.bhTime ? Math.max(.12, 1 - .88 * Math.exp(-Math.max(0, d - BH.sh) / (BH.sh * 2.5))) : 1; worldT += dt * tdil }
  U.time.value = worldT; U.now.value = now * .001;
  updateLandmarks(dt); updateAndro(); updateTimeRings(dt);
  { const u = arcs.u; u.efade.value = L.arcEdgeFade ?? 0; u.efar.value = L.arcEdgeFar ?? 300000; u.eang.value = Math.sin((L.arcEdgeAngle ?? 10) * Math.PI / 180); u.len.value = L.arcLen; u.spin.value = L.arcSpin; u.op.value = L.arcs; u.rim.value = L.rim; u.pxW.value = Math.tan(camera.fov * Math.PI / 360) / Math.max(1, innerHeight); u.armW.value = L.armWidth; u.width.value = L.arcWidth; u.blur.value = L.arcBlur; u.warm.value = L.arcWarm; u.vari.value = L.arcVar; u.core.value = L.arcCore; u.near.value = L.arcNear;
    arcs.mesh.geometry.instanceCount = arcs.rimN + Math.floor((arcs.n - arcs.rimN) * L.arcDensity); arcs.mesh.visible = L.arcs > 0 || L.rim > 0 }
  updateShadow();
  document.body.classList.toggle('idle', !!L.hudFade && fly && booted && !document.body.classList.contains('panel-open') && now - lastInput > L.hudIdle * 1000 && cardI < 0 && !touchThrust && !touchBoost && !touchBrake);
  conT += dt * L.pulse; constellation.u.t.value = conT;
  disc.material.opacity = L.discs * .6 * sstep(camera.position.distanceTo(GC), GAL_LEN * .9, GAL_LEN * 2.6);
  beamPivot.rotation.y += dt * .22; avatar.userData.nav.forEach((b, k) => { b.material.emissiveIntensity = Math.sin(now * .005 + k * 2.1) > .55 ? 3.2 : .25 });
  boostK += ((fly && boosting ? 1 : 0) - boostK) * Math.min(1, dt * (boosting ? 6 : 2));
  updateTrail(dt, fly && !!L.trail); trail.visible = fly && !!L.trail && trail.userData.used > 1; updateEngine(); updateBoostUI(dt);
  if (fly && booted) { if (player.vel.length() < 1 && !auto) { shipStill += dt; if (shipStill > 3 && !shipSaved) { shipSaved = true; store.set('sotd-ship', JSON.stringify({ p: player.pos.toArray(), q: player.base.toArray(), r: rig.q.toArray() })) } } else { shipStill = 0; shipSaved = false } }
  if (fly) { updateCompass(); const r = regionOf(player.pos); if (r !== region) { region = r; if (L.cards && booted) arrive(r) } } else if (region !== null) { region = null; $('arrive').classList.remove('show') }
  constellation.u.op.value += ((conOn ? 1 : 0) - constellation.u.op.value) * Math.min(1, dt * 3); constellation.visible = constellation.u.op.value > .01;
  streaks.visible = fly && !!L.streaks; motes.visible = fly && !!L.motes; if (fly) updateStreaks(dt);
  stars.u.hi.value += ((!fly && matchCount < N ? 1 : 0) - stars.u.hi.value) * Math.min(1, dt * 4);
  aimAssist(dt);
  // the black hole's ray tracer: the camera in its frame (horizon radii), the rotations it needs, and where its shadow sits for the bloom mask
  {
    const b = bh.u, rs = BH.rs; b.cam.value.copy(camera.position).sub(GC).applyQuaternion(GQI).divideScalar(rs); b.rot.value.copy(GQI3);
    b.vrot.value.setFromMatrix4(camera.matrixWorldInverse).multiply(GQ3); b.px.value = camera.projectionMatrix.elements[0]; b.py.value = camera.projectionMatrix.elements[5]; b.t.value = worldT;
    // from far off the shadow hides completely in the core's own light, and the core blooms instead; up close it's all there
    const dGC = camera.position.distanceTo(GC), F0 = BH.rs * (L.bhFar ?? 25), farK = sstep(dGC, F0, F0 * 3);
    const g = (L.bhGlow ?? 1) * (S.mode === 'map' ? .35 : .8); b.veil.value = farK; coreFlare.material.opacity = farK * Math.min(1, g); coreFlare.material.color.setRGB(1, .93, .82).multiplyScalar(Math.max(1, g)); coreFlare.visible = farK > .002 && g > 0 && !L.bhGlowVol;   // above 1 it brightens rather than just going opaque
    coreFlare.scale.setScalar(Math.max(BH.rs * (L.bhGlowMin ?? 30), dGC * (L.bhGlowSize ?? 5) / 100)); coreGlowV = { k: farK * g, s: Math.max(BH.rs * (L.bhGlowMin ?? 30), dGC * (L.bhGlowSize ?? 5) / 100) * .2 };   // the volumetric one: same strength and size
    { const R = (GAL_R0 + GAL_LEN) * (L.bhPuffR ?? .06), d = L.bhPuffD ?? 1, n = Math.round(Math.min(40, L.bhPuffN ?? 16) * 1000), nr = R * (L.bhPuffNear ?? .5);   // the core's puffs, faded in once you're a little way off
      corePuffs.scale.set(R, R * (L.bhPuffH ?? 1), R); corePuffs.geometry.instanceCount = n; corePuffs.u.sz.value = .03 / d * (L.bhPuffSize ?? 1); puffFx(corePuffs.u, L, 'bhPuff');
      corePuffs.u.op.value = .03 * (L.bhPuffs ?? 1) * Math.sqrt(d) * sstep(dGC, nr, nr * 2) * (S.mode === 'map' ? .5 : 1); corePuffs.visible = (L.bhPuffs ?? 1) > 0 && n > 0 && !L.puffVol }   // a fixed slice of the view, so the bloom reads at any distance
  }
  // the open winner: the screenshot can replace the dot; the lock holds until you let go
  openI = -1; openA = 0;
  if (fly && nearI >= 0) { const sr = stopR(nearI); openA = 1 - sstep(nearCD, sr * 1.06, sr * 1.8); if (openA > 0) openI = nearI }
  if (openI >= 0 && L.shot3d && !L.rings) {
    if (SHOT.userData.i !== openI) { SHOT.material.map = shot(D[openI]); SHOT.material.needsUpdate = true; SHOT.userData.i = openI; SHOT.quaternion.copy(camera.quaternion) }   // faces you at the moment it opens, then holds still
    starPos(openI, SHOT.position); SHOT.material.color.setScalar(L.shotBright); const e = 1 - Math.pow(1 - openA, 3); SHOT.scale.setScalar(CR[openI] * 3.4 * (.25 + .75 * e)); SHOT.material.opacity = Math.min(1, openA * 1.6); SHOT.visible = true;
    const avg = SHOT.material.map && SHOT.material.map.avgCol; if (avg) shotLight.color.copy(avg);
    shotLight.position.copy(SHOT.position).add(tmp2.copy(player.pos).sub(SHOT.position).setLength(CR[openI] * 1.1)); shotLight.distance = CR[openI] * 12; shotLight.intensity = L.shotLight ? openA * 2.6 * Math.PI : 0;
  } else { SHOT.visible = false; SHOT.userData.i = -1; shotLight.intensity = 0 }
  { const here = openA > .3 ? openI : (!fly ? S.sel : -1); constellation.u.cur.value = chainPos.has(here) ? chainPos.get(here).seg : -10 }
  if (cardI >= 0 && ++cardTick % 30 === 0) drawCardImg(cardI);   // picks up a screenshot that finished loading
  {   // the tooltip opens up once the nearest winner is a few pixels across (a little less to stay open, so it doesn't flicker)
    let open = -1;
    if (fly && nearI >= 0 && TA[nearI] === 1) { const rpx = starR(nearI) * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(1, camera.position.distanceTo(starPos(nearI, tmp)))); if (rpx >= L.tipOpen * (cardI === nearI ? .75 : 1)) open = nearI }
    else if (!fly && S.sel >= 0 && camera.position.distanceTo(starPos(S.sel, tmp)) < CR[S.sel] * 20) open = S.sel;
    if (gotCard.t > 0 && S.mode === 'fly') open = gotCard.i;   // a ring you just flew through keeps its record open a while
    showCard(open);
  }
  { let ch = false; for (let i = 0; i < N; i++) { const t = i === openI && L.shot3d ? TA[i] * (1 - Math.min(1, openA * 2)) : TA[i], d = t - ALPHA[i]; if (Math.abs(d) > .002) { ALPHA[i] += d * Math.min(1, dt * (i === openI ? 20 : 8)); ch = true } } if (ch) stars.aAlpha.needsUpdate = true }
  const ringI = auto && auto.i >= 0 && auto.i !== openI ? auto.i : -1;
  updateLockMark();
  targetRing.visible = ringI >= 0; if (ringI >= 0) { starPos(ringI, targetRing.position); targetRing.quaternion.copy(camera.quaternion); targetRing.scale.setScalar(Math.max(CR[ringI] * 1.6, camera.position.distanceTo(targetRing.position) * .03) * (1 + .05 * Math.sin(now * .005))) }
  updateHover(dt); updateLabels();
  if (fly) gauge.fly(); else gauge.map();
  netT += dt; if (netT > .1) { netT = 0; mixAmbient(player.pos); const s = Net.self; s.pos = player.pos.toArray(); s.quat = player.quat.toArray(); s.vel = player.vel.toArray(); s.mode = S.mode; s.th = thrusting ? (gasOn ? 1 : 0) | (boosting ? 2 : 0) : 0; Net.send(s) }
  updatePeers(dt); coach.update(dt); nav.update(dt); shipEnv.update(dt); rings.update(dt); musicMap(S.mode === 'map'); dayLab(); swapLook();
  mapK += ((S.mode === 'map' && !tween ? 1 : 0) - mapK) * Math.min(1, dt * 1.6); PU.bgK.value = 1 - (L.mapFade ?? .85) * mapK; bgStars.u.op.value = L.bgStars * (1 - (L.mapFade ?? .85) * mapK);   // the map clears down to the winners once the move ends
  { const toC = tmp.copy(GC).sub(camera.position), d = toC.length(), fw = tmp2.set(0, 0, -1).applyQuaternion(camera.quaternion), Rr = (GAL_R0 + GAL_LEN) * .3,
      look = sstep(fw.dot(toC.divideScalar(Math.max(d, 1))), .9, .995) * (1 - sstep(d, Rr * 2, Rr * 8)), inside = 1 - sstep(d, Rr * .6, Rr * 1.6); coreK += (Math.max(look, inside) - coreK) * Math.min(1, dt * 3); coreIn += (inside - coreIn) * Math.min(1, dt * 3) }   // looking into the core, or sitting in it
  {   // bloom swells near light speed and follows the core settings; exposure too
    const k = fly ? sstep(beta, .05, .92) * L.bloomBoost : 0, on = L.bloom ? 1 : 0;
    bloomPass.strength.value = on * (L.bloomStr + (2 - L.bloomStr) * k) * (1 + (L.coreBloom - 1) * coreK); bloomPass.strength.value += on * (engineLook.burst || 0) * (L.flareBurst ?? 1.2) * .35; igniteK *= Math.exp(-dt / .9); bloomPass.radius.value = L.bloomRad + (1 - L.bloomRad) * k;
    bloomPass.threshold.value = Math.min(1, L.bloomThr * (1 - .45 * k) * (1 + (L.coreThr - 1) * coreK))
    PU.exp.value = L.exposure * (1 + (L.coreExposure - 1) * coreK);
  }
  {   // the core and bulge puffs, raymarched (when switched on), and the core's glow as a volume
    const pOn = !!L.puffVol, gOn = !!L.bhGlowVol && coreGlowV.k > .002, on = pOn || gOn, pv = puffVol.u; puffVol.mesh.visible = on;
    if (on) {
      const R = (GAL_R0 + GAL_LEN) * (L.bhPuffR ?? .06), sB = bulgeR * .42 * (L.bulgePuffSpread ?? 1), E = Math.max(pOn ? Math.max(sB * 3.2, R * 1.4) : 0, gOn ? coreGlowV.s * 3.5 : 0), cg = 1 + ((L.coreGlows ?? 1) - 1) * coreIn;
      puffVol.mesh.scale.setScalar(E); pv.E.value = E; pv.cam.value.copy(camera.position); puffVol.mesh.worldToLocal(pv.cam.value);
      pv.sB.value = sB; pv.R.value = R; pv.H.value = L.bhPuffH ?? 1; pv.kB.value = pOn ? .9 * L.bulge * L.bulgePuffs * L.puffVolGlow * cg : 0; pv.kC.value = pOn ? .6 * (L.bhPuffs ?? 1) * L.puffVolGlow * cg : 0; pv.kG.value = gOn ? coreGlowV.k * 1.4 : 0; pv.sG.value = coreGlowV.s;
      const gs = L.puffVolGrainSize ?? 1, cnt = k => Math.cbrt(Math.max(.5, k) / 16), gm = (base, tex) => Math.min(1, base + (tex ?? 0) * (1 - base));   // the particle puffs' sliders steer the volume too
      pv.f.value = 6 * (L.bhPuffD ?? 1) * cnt(L.bhPuffN ?? 16) / R / gs / (L.bhPuffSize ?? 1); pv.fB.value = 6 * (L.bulgePuffD ?? 1) * cnt((L.bulgePuffN ?? 6) * 2.7) / sB / gs / (L.bulgePuffSize ?? 1);
      pv.gC.value = gm(L.puffVolGrain, L.bhPuffTex); pv.gB.value = gm(L.puffVolGrain, L.bulgePuffTex); pv.shC.value = L.bhPuffSoft ?? 1; pv.shB.value = L.bulgePuffSoft ?? 1;
      pv.vC.value = L.bhPuffVar ?? 0; pv.vB.value = L.bulgePuffVar ?? 0; pv.flC.value = L.bhPuffFlick ?? 0; pv.flB.value = L.bulgePuffFlick ?? 0; pv.tC.value = L.bhPuffTint ?? .5; pv.tB.value = L.bulgePuffTint ?? .5;
      pv.tint.value = L.puffVolTint ?? .5; pv.grain.value = L.puffVolGrain; pv.dust.value = L.puffVolDust; pv.steps.value = L.puffVolSteps;
    }
  }
  {   // volumetric gas
    const on = !!L.volumetric, u = vol.u; vol.mesh.visible = on; PU.volOn.value = on ? 1 : 0;
    if (on) {
      u.cam.value.copy(camera.position); vol.mesh.worldToLocal(u.cam.value);
      u.glow.value = L.volGlow; u.dust.value = L.volDust; u.steps.value = L.volSteps; u.noise.value = L.volNoise; u.wispLo.value = L.volWispLo; u.wispHi.value = Math.max(L.volWispLo + (L.volEdge ?? .02), L.volWispHi); u.janim.value = L.volJitterMove ? 1 : 0; PU.volBlur.value = (L.volSmooth ?? 0) / LOOK.volRes;   u.warp.value = L.volWarp; u.armK.value = L.volArmK; u.thick.value = L.volThick;   // a hard wisp edge pops on and off as the clouds move: volEdge keeps it soft
      u.coreV.value = L.volCore * (1 + ((L.coreGlows ?? 1) - 1) * coreIn); u.dustT.value = L.volDustT; u.emAbs.value = L.volEmAbs; u.flow.value = L.volFlow; u.inner.value = L.volInner; u.outer.value = L.volOuter; u.opMax.value = L.volOpMax; u.coreMix.value = L.volColMix; u.wispGain.value = L.volWisp; u.base.value = L.volBase; u.detail.value = L.volDetail; u.satV.value = L.volSat; u.contrast.value = L.volContrast;
      vol.mesh.scale.y = VOL_S * VOL_H * L.volHeight; u.spin.value = L.arcSpin * L.volSpin; u.armW.value = L.armWidth;
    }
  }
  PU.beta.value = fly ? Math.min(1, beta * L.relativity) : 0; PU.ab.value += ((fly ? Math.min(1.5, player.cruise * .35 + beta * 1.2 + boostK * .8) * L.aberr : 0) - PU.ab.value) * Math.min(1, dt * 4);
  updateStats(dt); const t0 = performance.now(); perf.js = t0 - tStart; if (!NORENDER) { if (!(intro.active && veil.material.opacity > .999)) pipeline.render(); shipCam.copy(camera); shipCam.near = camera.near * SHIP_SC * .1; shipCam.far = 2e5; shipCam.updateProjectionMatrix(); shipRenderer.render(shipScene, shipCam) } perf.ms = performance.now() - t0;   // under the opening's black veil the galaxy isn't drawn at all
}
let loopErrs = 0;
function loop(now) { requestAnimationFrame(loop); if (!booted && !introActive) { last = now; return }   // nothing to draw behind the splash: leave the GPU to the loading
  try { tick(now) } catch (e) { if (loopErrs++ < 5) console.error(e) } }   // one bad frame never stops the sky
