/* ───────────────────────── every frame ───────────────────────── */
let coreGlowV = { k: 0, s: 1 }, mapK = 0, coreInK = 1;
// map: tiny day labels beside the winners nearest the camera, once you're close enough (with a zone open: its own winners, nearest the middle of the view)
const dayLab = (() => {
  const box = $('dayLabels'), els = new Map(), cand = [], v = new V3();   // one label per winner, so each fades in and out on its own
  return function update() {
    const L = LOOK, agc = S.agencies.size > 0 && conOn && conK > .97 && mapCamD() < mapHomeD() * (L.agencyDateK ?? .6), on = S.mode === 'map' && !(tween && tween.mode) && (agc || !(mapZone.on && mapZone.lvl !== 12)) && (L.mapDays ?? 1) > 0 && booted, now = performance.now(); box.style.setProperty('--dls', (L.mapDaySize ?? 8) + 'px'); box.style.opacity = L.mapDays ?? 1;
    cand.length = 0; if (on) { const R = (L.mapDayDist ?? 60000) * mapDistK(), R2 = R * R, cp = camera.position, zh = mapZone.on ? mapZone : null; for (let i = 0; i < N; i++) { if (TA[i] < 1 || (!agc && zh && (D[i].t < zh.t0 || D[i].t >= zh.t1))) continue; const dx = P[i * 3] - cp.x, dy = P[i * 3 + 1] - cp.y, dz = P[i * 3 + 2] - cp.z, d2 = dx * dx + dy * dy + dz * dz; if (agc || zh || d2 < R2) cand.push([d2, i]) }   /* an open (or lit) month shows every winner in it; otherwise only those within reach */ cand.sort((a, b) => a[0] - b[0]) }
    const n = Math.min(cand.length, mapZone.on || agc ? 400 : L.mapDayN ?? 60), seen = new Set();   // inside an open zone, every winner in it gets its date
    const occ = new Set(), cw = (L.mapDaySize ?? 8) * 7, ch = (L.mapDaySize ?? 8) * 1.6;   // declutter: a date only shows where it doesn't land on one already shown
    for (let c = 0; c < n; c++) { const i = cand[c][1]; v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(camera); if (v.z > 1 || Math.abs(v.x) > 1 || Math.abs(v.y) > 1) continue;
      { const gx = Math.floor((v.x * .5 + .5) * innerWidth / cw), gy = Math.floor((-v.y * .5 + .5) * innerHeight / ch), k1 = gx + ',' + gy, k2 = (gx + 1) + ',' + gy; if (occ.has(k1) || occ.has(k2) || occ.has((gx - 1) + ',' + gy)) continue; occ.add(k1) }
      let el = els.get(i); if (!el) { el = document.createElement('span'); const t = new Date(D[i].date + 'T00:00:00Z'); el.textContent = `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()].slice(0, 3)} ${t.getUTCFullYear()}`; box.appendChild(el); els.set(i, el); void el.offsetWidth }
      el.style.left = ((v.x * .5 + .5) * innerWidth).toFixed(1) + 'px'; el.style.top = ((-v.y * .5 + .5) * innerHeight).toFixed(1) + 'px'; if (!el.on) { el.on = true; el.classList.add('on') } el.seen = now; seen.add(i) }
    els.forEach((el, i) => { if (seen.has(i)) return; if (el.on) { el.on = false; el.classList.remove('on') } else if (now - el.seen > 600) { el.remove(); els.delete(i) } else if (on) { v.set(P[i * 3], P[i * 3 + 1], P[i * 3 + 2]).project(camera); el.style.left = ((v.x * .5 + .5) * innerWidth).toFixed(1) + 'px'; el.style.top = ((-v.y * .5 + .5) * innerHeight).toFixed(1) + 'px' } });   // gone ones fade where they are, then go
  };
})();
let boostK0 = 0; const shipCam = new THREE.PerspectiveCamera();   // the ship layer's camera: the main one, with a near plane small enough for the tiny ship   // the core glow's strength and size, for its volumetric version
const _v2 = new THREE.Vector2();
function resize() { renderer.setSize(innerWidth, innerHeight, false); shipRenderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.getDrawingBufferSize(_v2); U.res.value.copy(_v2); U.dpr.value = _v2.y / Math.max(1, innerHeight) }
function setDpr(d, force) { d = Math.max(.25, Math.min(3, d)); if (Math.abs(d - DPR) > .01 || force) { DPR = d; renderer.setPixelRatio(d); shipRenderer.setPixelRatio(Math.min(LOOK.shipDpr ?? 3, Math.max(d, devicePixelRatio || 1))); resize() } }   // the ship's own layer draws at full resolution (up to its own cap)
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
  const max = Math.min(LOOK.maxDpr, devicePixelRatio || 1), min = Math.min(max, LOOK.minDpr ?? .75);
  if (perf.avg > perf.vsync * 1.3) { perf.fast = 0; if (++perf.slow > 45 && DPR > min) { setDpr(Math.max(min, DPR - .25)); perf.slow = 0; perf.cool = 90; perf.avg = perf.vsync } }
  else if (perf.avg < perf.vsync * 1.08) { perf.slow = 0; if (++perf.fast > 300 && DPR < max) { setDpr(Math.min(max, DPR + .25)); perf.fast = 0; perf.cool = 120 } }
  else perf.slow = perf.fast = 0;
}

const _dustBlack = new C3(.018, .014, .02);
const farDimJS = d => 1 - LOOK.farDim * sstep(d, LOOK.farStart, LOOK.farStart * 6);
function updateAndro() {
  const L = LOOK, dGC = camera.position.distanceTo(GC), f = farDimJS(dGC);
  const inK = s => sstep(dGC, s * .12, s * .55);   // big glows fade once you're inside them, instead of whiting out the view
  { const Rc = (GAL_R0 + GAL_LEN) * (L.coreInR ?? .12); coreInK = 1 - (L.coreInFade ?? .6) * (1 - sstep(dGC, Rc * .2, Rc)) }   /* inside the core: its haze and volume thin out so you can see */
  const cg = (1 + ((L.coreGlows ?? 1) - 1) * coreIn) * coreInK;   // every big glow (core, bulge, haze, gas) scaled by "Glows in the core" while you're in it
  coreGlow.material.opacity = L.core * .22 * f * inK(coreGlow.scale.x) * cg; haze.u.op.value = L.haze * L.hazeBright * cg * (1 + ((L.mapHaze ?? 1) - 1) * mapK);   // on the map the arm haze (the glowing band along the timeline) has its own strength
  wallSky.mesh.position.copy(camera.position); wallSky.u.op.value = L.wallpaper ? L.wallBlue : 0; wallSky.mesh.visible = !!L.wallpaper;
  sparkle.mesh.position.copy(camera.position); sparkle.u.op.value = L.wallpaper ? L.sparkle : 0; sparkle.mesh.visible = !!L.wallpaper && L.sparkle > 0;
  andro.visible = ANDRO; dustFil.visible = ANDRO && L.dustLanes > 0; dustFil2.visible = ANDRO && L.dust2 > 0; if (!ANDRO) return;
  bulgeSpr.forEach(s => { s.scale.setScalar(bulgeR * 2 * s.userData.k * L.bulgeSize); s.material.opacity = s.userData.o * L.bulge * f * inK(s.scale.x) * cg });
  { const n = Math.round(Math.min(48, L.bulgePuffN ?? 6) * 1000), d = L.bulgePuffD ?? 1, sp = L.bulgePuffSpread ?? 1;   // finer grain: smaller puffs, each a little brighter so the bulge doesn't fade
    bulgePts.geometry.instanceCount = n; bulgePts.u.sz.value = 9000 / d / sp * (L.bulgePuffSize ?? 1); puffFx(bulgePts.u, L, 'bulgePuff'); bulgePts.u.op.value = .05 * L.bulge * L.bulgePuffs * Math.sqrt(d) * cg;
    bulgePts.scale.setScalar(sp); bulgePts.position.copy(GC).multiplyScalar(1 - sp); bulgePts.visible = L.bulgePuffs > 0 && n > 0 && !L.puffVol }
  const lp = toLocal(camera.position, tmp), rr = Math.hypot(lp.x, lp.z), inG = (1 - sstep(Math.abs(lp.y), L.dustInH * .4, L.dustInH)) * (1 - sstep(rr, GAL_R0 + GAL_LEN, (GAL_R0 + GAL_LEN) * 1.15));
  [[dustFil, 'dust', L.dustLanes], [dustFil2, 'dust2', L.dust2]].forEach(([m, p, amt]) => {   // both filament layers; the second has its own amount, count, width, blur and placement
    const du = m.u, o = k => L[p + k] ?? (p === 'dust' ? 0 : L['dust' + k]); du.dust.value = amt * (1 - L.dustInFade * inG); du.nearD.value = L.dustNear; du.wid.value = o('Width'); du.blur.value = o('Blur'); du.armW.value = L.armWidth; du.len.value = o('Len'); du.wig.value = L.dustWiggle; du.rag.value = L.dustRag; du.fib.value = L.dustFibre; du.brk.value = L.dustBreak;
    du.rot.value = (L[p + 'Rot'] ?? 0) * Math.PI / 180; du.rs.value = L[p + 'Scale'] ?? 1; du.ro.value = L[p + 'Shift'] ?? 0; du.tw.value = L[p + 'Twist'] ?? 0; du.yo.value = L[p + 'Y'] ?? 0;
    du.c.value.setRGB(.1, .055, .035).lerp(_dustBlack, L.dustDark); m.geometry.instanceCount = Math.round(m.geometry.userData.n * Math.min(1, o('Count')));
  });
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
let L_ix = 1, ringFarK = 0, conK = 0, volK = 0, shipR0 = 0, shipOnMap = false;   // conK: a filter's constellation is up, the rest of the sky dims
function updateTimeRings(dt) {
  const L = LOOK, u = timeRings.u, map = S.mode === 'map' || mapK > .005, fr = (L.flyYearLines ?? 1) > 0, lp = toLocal(map ? orbit.target : camera.position, tmp), rr = Math.hypot(lp.x, lp.z), Rr = GAL_R0 + GAL_LEN;
  if (map) {   // how many years fit across the view where you're looking decides which rings show
    const uu = Math.max(.03, Math.min(1, (Math.max(GAL_R0, rr) - GAL_R0) / GAL_LEN)), span = 2 * mapCamD() * Math.tan(LOOK.fov * Math.PI / 360) * Math.min(1, camera.aspect);
    mapYrs = span * yrsPerU(uu) / GAL_LEN;
    mapLvl[0] = mapK; mapLvl[1] = mapK * (1 - sstep(mapYrs, L.mapYears, L.mapYears * 1.6)); mapLvl[2] = mapK * (1 - sstep(mapYrs, 1.3, 2.6));   /* the whole ruler fades in and out with the map transition */ mapStars = orbit.dist < (L.mapDayDist ?? 60000) * 2.5 ? 1 : 0;
    ringFarK = 0;
  } else {
    // far enough out (above the disk or past its rim) the timeline comes into view: the five-year marks, and the spiral itself
    const out = Math.max(Math.abs(lp.y), rr - Rr), F = Rr * (L.flyYearFar ?? .4), far = fr && booted && !intro.active; ringFarK += ((F > 0 ? sstep(out, F, F * 1.6) : 1) * (far ? 1 : 0) - ringFarK) * Math.min(1, dt * 1.5);   /* far out above (or beyond) the galaxy the timeline is there: year lines, dividers, the five-year marks */
    const inside = (1 - sstep(Math.abs(lp.y), 60000, 200000)) * (1 - sstep(rr, Rr * 1.02, Rr * 1.2)); mapLvl[0] = ringFarK; mapLvl[1] = ringFarK * inside; mapLvl[2] = 0; mapStars = 0;
  }
  const show = map || ringFarK > .005; timeRings.mesh.visible = show && !SPIRAL && L.ruler + L.eraRings + L.ringYear > 0; ruler.visible = timeRings.mesh.visible && !SPIRAL;   // with the single spiral, the spiral itself is the timeline (it carries its own dates)
  if (monthTicks) { const fk = S.mode === 'fly' ? ringFarK * (L.flyYearLines ?? 1) : 0; monthTicks.visible = (map || fk > .005) && (L.mapMonths ?? 1) + (L.mapYearLines ?? 1) > 0; monthTicks.u.a.value = map ? mapK * .55 * (L.mapMonths ?? 1) * (1 - sstep(mapYrs, L.mapMonthYrs ?? 8, (L.mapMonthYrs ?? 8) * 1.7)) : 0; monthTicks.u.ya.value = Math.max(map ? mapK : 0, fk) * .6 * (L.mapYearLines ?? 1); monthTicks.setLen(L.mapTickLen ?? 1500, L.mapYearLen ?? 24000, L.mapEraLen ?? L.mapYearLen ?? 24000); monthTicks.u.fade.value = L.mapTickFade ?? .6 }   // month dividers once a few years fill the view
  BHM.c.value.copy(GC).applyMatrix4(camera.matrixWorldInverse); BHM.r.value = RP * BH.rs * (L.bhLens ? 1 : 0);   // the lines fade where the hole would bend them
  if (spiralLine) { spiralLine.visible = show; spiralLine.u.a.value = (map ? .55 * mapK : .5 * ringFarK) * Math.max(.3, Math.min(2, L.eraRings || 1)) }
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
  { const ag = 1 - (L.agencyDim ?? .85) * conK; if (ag < .999) { if (spiralLine) spiralLine.u.a.value *= ag; if (monthTicks) { monthTicks.u.a.value *= ag; monthTicks.u.ya.value *= ag } ['era', 'yr', 'mo'].forEach(k => { ruler.u[k].value *= ag; u[k].value *= ag }) } }   // an agency's constellation up: the timeline steps back
  // you-are-here ring + date
  const pl = toLocal(player.pos, tmp2), pr = Math.hypot(pl.x, pl.z), inMe = S.mode === 'fly' ? (1 - sstep(Math.abs(pl.y), 40000, 140000)) * (1 - sstep(pr, Rr * 1.01, Rr * 1.08)) * sstep(pr, GAL_R0 * .9, GAL_R0 * 1.2) : 0;
  youRing.scale.setScalar(Math.max(1, pr)); youRing.material.opacity = .4 * L.youRing * inMe; youRing.visible = ringFarK > .01 && inMe > .01 && L.youRing > 0;   // the date still rides along; the ring only with time rings on
  const yt = $('youTime');
  if (inMe > .01 && L.youRing > 0) {
    const t = new Date(uToT((pr - GAL_R0) / GAL_LEN)); _yt(MON3[t.getUTCMonth()] + ' ' + t.getUTCFullYear());
    const a = Math.atan2(pl.z, pl.x) + .0009 * Math.max(1, 600000 / Math.max(pr, 1)); tmp2.set(Math.cos(a) * pr, 0, Math.sin(a) * pr).applyQuaternion(GQ).add(GC).project(camera);
    if (tmp2.z < 1 && Math.abs(tmp2.x) < 1.1 && Math.abs(tmp2.y) < 1.1) { yt.hidden = false; yt.style.left = ((tmp2.x * .5 + .5) * innerWidth) + 'px'; yt.style.top = ((-tmp2.y * .5 + .5) * innerHeight) + 'px'; yt.style.opacity = Math.min(1, inMe) } else yt.hidden = true
  } else yt.hidden = true;
  // day ticks beside the nearest winners
  let v = 0;
  if (S.mode === 'fly' && L.dayTicks && ringFarK > .01) for (const [d2, i] of bodyCand.slice(0, DAY_N)) {
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
  const g = L.streakRamp ?? .8, da = armDist(lp.x, lp.z) / (armWAt(rr) / (SHAPE.widen + 1)), sw = Math.max(.02, L.streakSpine ?? .45), arm = Math.exp(-((da / sw) ** 2)), hy = Math.exp(-((lp.y / Math.max(1000, L.streakInH)) ** 2)), disk = hy * (1 - sstep(rr, Rr * 1.02, Rr * 1.3));   // thickest along the spiral's spine, thinning the further you are from it (across, above or below)
  const cR = L.streakCoreR ?? 1.4, core = Math.exp(-Math.pow(rr / (Rr * .22 * cR), 2)) * (1 - sstep(Math.abs(lp.y), Rr * .08 * cR, Rr * .25 * cR));   // round the core: a thick swarm (its own sliders)
  streakDens = Math.max(disk * (arm * (1 - .15 * g) + .15 * (1 - g) + .04), core * (L.streakCore ?? 2.5));
  streaks.geometry.setDrawRange(0, Math.floor(Math.min(SL_N, SL_N / 3 * L.streakAmt * streakDens)) * 2);
  su.op.value += (sstep(sp, 150, 4000) * .32 * L.streakBright * Math.min(1, streakDens * (3 - 2.4 * g)) * (1 + (L.streakCoreBright ?? 1.5) * core) - su.op.value) * Math.min(1, dt * 6);
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
const _tq = new V3(), _tq2 = new V3();
function updateTrail(dt, on) {
  const L = LOOK, sp = player.vel.length(), lin = Math.max(0, Math.min(1, Math.log10(Math.max(sp, 20) / 20) / Math.max(.1, L.trRef - Math.log10(20)))), speedT = Math.pow(lin, L.trColorCurve);
  trClock += dt; const life = trLife(sp);
  const emit = (st, mul) => {
    const eng = _te.copy(avatar.userData.tail).multiplyScalar(avatar.scale.x).applyQuaternion(player.quat).add(player.pos), bright = L.trBright * (.75 + speedT * 1.4 * L.trSpeedBoost + .25) * mul, step = Math.max(.4, st.len / ((L.trQuality ?? TR_STRAND) * .9));
    const pt = () => ({ p: eng.clone(), s: speedT, b: bright, w: trW, k: trB, t: trClock, life });
    if (st.pts.length < 2) st.pts = [pt(), pt()];   // pts[0] rides the engine; the rest are laid down in space
    else if (st.pts[1].p.distanceTo(eng) > step || (st.pts.length > 2 && st.pts[1].p.distanceTo(eng) > step * .05 && _tq.copy(eng).sub(st.pts[1].p).normalize().dot(_tq2.copy(st.pts[1].p).sub(st.pts[2].p).normalize()) < Math.cos((L.trBend ?? 4) * Math.PI / 180))) st.pts.unshift(pt());   // a new point every step, and sooner wherever the path bends, so curves stay round
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
    if (v >= TR_MAX) return; _c.copy(camera.position).sub(p); _sdv.crossVectors(dir, _c); const l = _sdv.length(), cl = _c.length(), hmin = (L.trMinPx ?? 1.5) * pxW * cl; /* pxW·cl is half a CSS pixel here (hw is a half-width), so this holds the ribbon at trMinPx px across */ let hw = (w * pxW * cl + (holeW * .5 - w * pxW * cl) * (1 - sstep(run, 0, blend)));
    if (hw < hmin) { a *= Math.pow(hw / hmin, .8); hw = hmin }   // never thinner than that: below it the ribbon gets fainter instead (a sub-pixel strip just drops out of the raster), so it fades away smoothly
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
  const u = trail.u, cd = camera.position.distanceTo(player.pos); u.nearA.value = cd * .12 * L.trNearFade; u.nearB.value = cd * .5 * L.trNearFade; u.core.value = L.trCore; u.hot.value = L.trHot ?? 1; u.hotW.value = (L.trHotW ?? 2) * shipRenderer.getPixelRatio(); u.hotT.value = L.trHotTaper ?? 1; u.glow.value = L.trGlow; u.taper.value = L.trTaper; u.shim.value = L.trShimmer;
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
  const thrNow = thrusting && booted && S.mode === 'fly', spNow = player.vel.length(); if (thrNow && !engineLook.was) engineLook.peak = Math.max(engineLook.peak || 0, 1 - .85 * sstep(Math.log10(Math.max(1, spNow)), 2, 5.3)); engineLook.was = thrNow;   // a push from standstill kicks hard; at speed only a little
  if (boosting && !engineLook.wasB) engineLook.peak = Math.max(engineLook.peak || 0, 1.1); engineLook.wasB = boosting;   // boost always booms
  { const E = engineLook, pk = E.peak || 0; E.burst = E.burst || 0; if (pk > E.burst) { E.burst = Math.min(pk, E.burst + pk * dt / .12); if (E.burst >= pk) E.peak = 0 } else { E.peak = 0; E.burst *= Math.exp(-dt / Math.max(.05, L.flareBurstTime ?? .5)) } }   // each burst swells in over 120 ms, then dies away
  const spK = sstep(Math.log(Math.max(150, player.vel.length())), Math.log(150), Math.log(Math.max(300, L.cruiseSpeed))), sp = 1 + (L.flareSpeed ?? 1) * (spK - .3), bu = engineLook.burst * (L.flareBurst ?? 1.2);
  const vis = sstep(back.dot(toCam), -.05, .3), fu = flare.u, px = L.flareLen * 2 * Math.max(.3, sp) * (1 + bu * .5) * (1 + ringPop * 2 * (L.ringPopSize ?? 1));
  fu.spk.value = L.flareSparkle ?? 1; fu.rate.value = L.flareRate ?? 2; fu.glow.value = (L.flareGlow ?? 1) * (1 + bu * .6);
  fu.col.value.copy(_fc); fu.k.value = L.flare * vis * Math.max(on * Math.max(.3, sp) * (1 + bu), igniteK * .6, ringPop * (L.ringPop ?? 1)); fu.ig.value = igniteK * (L.igniteBloom ?? 1.5); fu.pop.value = ringPop * (L.ringPop ?? 1); fu.n.value = L.flareSpikes; fu.half.value = L.flareHalf ? 1 : 0; fu.turn.value = L.flareTurn * Math.PI / 180; fu.px.value = px; fu.q.value = px * 3;   // ignition flares the point and spikes only
  flare.position.copy(mouth).addScaledVector(back, avatar.scale.x * .06); flare.scale.setScalar(px * 3 * 2 * Math.tan(camera.fov * Math.PI / 360) / Math.max(1, innerHeight) * d); flare.visible = S.mode === 'fly' && fu.k.value > .002;
}

/* lock-on marker, reticle and tooltip */
const fmtDist = v => v < 1000 ? v.toFixed(0) + ' u' : v < 1e6 ? (v / 1000).toFixed(v < 1e4 ? 1 : 0) + 'k u' : (v / 1e6).toFixed(2) + 'M u';
const tnav = () => S.mode === 'fly' ? '<span class="tnav"><i class="tdist"></i></span>' : '';   // the distance, live: in flight only   /* (no ‹ › arrows: the arrow keys do that) */   // step through the archive from the star you're on
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
    if (map) { if (mouse.in && !down && booted && !tween) { const r = mapHover(hx, hy); h = r.i }   /* (no tooltips or chimes for the old time rings: the zones do that) */ }   // the map points at rings, and at winners once you're close
    else { if ((aim || mouse.in) && !down && booted) h = pick(hx, hy); if (h >= 0) { const dd = Math.max(1, camera.position.distanceTo(starPos(h, tmp))); if (dd > (LOOK.hoverDist ?? 4e5) || starPx(h, dd) < (LOOK.hoverPx ?? 2.5)) h = -1 } }   // close enough, and a few px across
    if (!down) hovPick = h; if (h === openI) h = -1;   // a click can only take a star you've just hovered
    lastHov = h;
    if (R && (!lastRing || lastRing.y !== R.y)) tingle(galOf(R.yr), 5000 + Math.round(R.y * 12), Math.max(-1, Math.min(1, hx / innerWidth * 2 - 1)));
    ringHov = R; lastRing = R; if (R) timeRings.u.hi.value = R.y;
    canvas.classList.toggle('hovering', (h >= 0 || !!R) && !aim); crossEl.classList.toggle('on', h >= 0 && aim); hovI = h; tipAt.x = hx; tipAt.y = hy;
  }
  // what the tooltip shows: a winner you point at; else the one you're beside (opened up into its full record); else your lock
  const map = S.mode === 'map', pin = cardI >= 0 ? cardI : !map && lockI >= 0 ? lockI : -1;
  const put = (key, html, full, side) => {
    if (tipFor !== key) { tip.innerHTML = html; tipFor = key; if (full) { if (!side) drawCardImg(cardI); if (!phone) cardFlicker() }   /* the ring's record too comes in piece by piece */ }
    tip.classList.toggle('full', !!full); tip.classList.toggle('side', !!side); tip.classList.remove('dock', 'at'); tip.hidden = false };
  const PI = HALO.pInfo;
  const pRpx = PI.on ? PI.r * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(1, camera.position.distanceTo(PI.c))) : 0;
  if (PI.on && (S.mode === 'fly' || (map && !tween)) && pRpx * 2 >= Math.min(map ? innerHeight * .4 : 1e9, LOOK.ringInfoPx ?? 500) && tmp.copy(PI.c).project(camera).z < 1) {   // while it's up, it's all you see: hovering other stars doesn't swap it for their tooltip   // a ring up close: once its portal is big on screen, the full record (text only) floats beside it, never over it
    const cx = (tmp.x * .5 + .5) * innerWidth, cy = (-tmp.y * .5 + .5) * innerHeight;
    {
      put('q' + PI.i, tipHTML(PI.i) + tipMore(PI.i), true, true); const w = tip.offsetWidth, h = tip.offsetHeight, gap = 24, right = cx + pRpx * (L_ix = LOOK.ringInfoX ?? 1) + gap * L_ix, left = cx - pRpx * L_ix - gap * L_ix - w;
      const x = Math.min(right, innerWidth - w - 12);   // always on the right of the ring; with no room, it holds at the right edge   // beside it; once the ring outgrows the screen, held at the edge with the most room
      tip.style.left = x + 'px'; tip.style.top = Math.max(64, Math.min(innerHeight - h - 12, cy - h / 2)) + 'px';
    }
  } else if (hovI >= 0 && hovI !== pin) { if (tipFor !== 'h' + hovI) { starPos(hovI, tmp).project(camera); tingle(galOf(D[hovI].year), hovI, Math.max(-1, Math.min(1, tmp.x))) } /* the chime only with its tooltip */ put('h' + hovI, tipHTML(hovI) + tnav(), false); { starPos(hovI, tmp).project(camera); const on = tmp.z < 1 && Math.abs(tmp.x) < 1 && Math.abs(tmp.y) < 1; tip.style.left = (on ? (tmp.x * .5 + .5) * innerWidth : tipAt.x) + 'px'; tip.style.top = (on ? (-tmp.y * .5 + .5) * innerHeight : tipAt.y) + 'px'; tip.classList.toggle('at', on) } }   // at the star itself, so its date lands right where the compass had it
  else if (ringHov && pin < 0) { put('r' + ringHov.y, ringTip(ringHov), false); tip.style.left = tipAt.x + 'px'; tip.style.top = tipAt.y + 'px' }
  else if (pin >= 0) {
    const d = Math.max(1, camera.position.distanceTo(starPos(pin, tmp))); tmp.project(camera);
    const edge = pin === lockI && pin !== cardI && !coarse && !(tmp.z < 1 && Math.abs(tmp.x) < 1 && Math.abs(tmp.y) < 1);
    if (edge) {   // the star you're locked on is off screen: its card waits at the edge, beside the arrow pointing to it
      put('p' + pin, tipHTML(pin) + tnav() + (LOOK.rings ? '' : tipMore(pin)), false);
      let x = tmp.x, y = tmp.y; if (tmp.z >= 1) { x = -x; y = -y } const m = Math.max(Math.abs(x) / .92, Math.abs(y) / .88, 1e-6); x /= m; y /= m;
      const w = tip.offsetWidth, h = tip.offsetHeight, px = (x * .5 + .5) * innerWidth, py = (-y * .5 + .5) * innerHeight;
      tip.style.left = Math.max(12, Math.min(innerWidth - w - 12, px - (x > 0 ? w + 22 : -22))) + 'px'; tip.style.top = Math.max(64, Math.min(innerHeight - h - 12, py - h / 2)) + 'px';
    } else if (tmp.z < 1 && Math.abs(tmp.x) < 1.3 && Math.abs(tmp.y) < 1.3) {
      put('p' + pin, tipHTML(pin) + tnav() + (LOOK.rings && !map ? '' : tipMore(pin)), pin === cardI && (!LOOK.rings || map));   // in the rings game the full record only comes with a big portal
      const rpx = starR(pin) * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360) * d), full = pin === cardI;   // the star's own radius on screen
      let x = (tmp.x * .5 + .5) * innerWidth + (full ? rpx * .72 : 0), y = (-tmp.y * .5 + .5) * innerHeight - (full ? rpx * .5 : 0);
      if (full) {   // the full record sits beside the star (no more docking it top left)
        const w = tip.offsetWidth + 24, h = tip.offsetHeight + 24; if (x + w > innerWidth) x = Math.max(8, (tmp.x * .5 + .5) * innerWidth - rpx * .72 - w); x = Math.max(8, Math.min(innerWidth - w, x)); y = Math.max(60, Math.min(innerHeight - h - 8, y)) }
      tip.style.left = x + 'px'; tip.style.top = y + 'px'; tip.classList.toggle('at', !full);
    } else tip.hidden = true;
  } else if (!tip.hidden) { tip.hidden = true; tipFor = '' }
  { const m = !tip.hidden && /^[hp](\d+)/.exec(tipFor), el = m && tip.querySelector('.tdist'); if (el) el.textContent = Math.round(camera.position.distanceTo(starPos(+m[1], tmp))).toLocaleString('en') }
  if (phone) { const top = !tip.hidden && tip.classList.contains('full'); tip.classList.toggle('mtop', top); if (top) { tip.style.left = ''; tip.style.top = '' } }   // phones: the record is one still card at the top, it just comes and goes   // how far it is, live, to the unit
}
const RET = { ring: $('aimRing'), p: -1 };
function updateBoostUI(dt = 0) {   // the reticle is a ring and a dot; it no longer changes with the boost (the console shows the power)
  const p = 0; if (Math.abs(p - RET.p) < 1e-3) { crossEl.style.setProperty('--rs', LOOK.reticleSize ?? 1); return } RET.p = p;
  const r = RET.ring; r.setAttribute('r', (34.25 + (4.25 - 34.25) * p).toFixed(2)); r.style.setProperty('--rfa', (.88 * Math.pow(p, 1.3)).toFixed(3)); r.style.setProperty('--ra', (.4 + .48 * p).toFixed(3));
  crossEl.style.setProperty('--rs', LOOK.reticleSize ?? 1);
}

// a tiny readout of the renderer (press the backtick key, or open with ?stats)
const stats = { el: null, t: 0, n: 0, show(on) { if (on && !this.el) { this.el = document.createElement('div'); this.el.id = 'stats'; document.body.appendChild(this.el) } if (this.el) this.el.hidden = !on; this.on = on } };
addEventListener('keydown', e => { if (e.key === '`' && !e.target.matches('input,select,textarea')) stats.show(!stats.on) });
if (QS.has('stats')) stats.show(true);
function updateStats(dt) { if (!stats.on) return; stats.t += dt; stats.n++; if (stats.t < .5) return; stats.el.textContent = `${GPU ? 'WebGPU' : 'WebGL 2'} · ${Math.round(stats.n / stats.t)} fps · ${perf.avg.toFixed(1)} ms · js ${perf.js.toFixed(1)} ms · dpr ${DPR}`; stats.t = stats.n = 0 }
let last = performance.now(), netT = 0, cardTick = 0, conT = 0;
function tick(now) {
  const tStart = performance.now(), rawMs = now - last, rdt = Math.max(0, Math.min(.05, rawMs / 1000)), dt = rdt * slowmo.k; slowmo.step(rdt); last = Math.max(last, now); adapt(rawMs); if (bench.on && rawMs > 0 && rawMs < 500) bench.ms.push(rawMs);   // dt: game time (slows through a ring)
  portal.restore(); const L = LOOK, fly = S.mode === 'fly';
  ring2.rotation.y += dt * .05; beacons.forEach((b, k) => { b.material.emissiveIntensity = (Math.sin(now * .003 + k * 1.7) > .6) ? 2 : .2 });
  if (fly && booted) {
    if (warp) stepWarp(rdt); else if (!(tween && tween.mode)) updatePlayer(dt);   /* while the view swings between map and flight the ship holds still */ tourUpdate(dt); avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat);
    const fl = avatar.userData.flame; fl.material.opacity += ((thrusting ? .85 : holdSp >= 0 ? .5 : 0) - fl.material.opacity) * Math.min(1, dt * 10); { const fz = .6 + .4 * Math.sin(now * .04) + (thrusting ? .6 + player.cruise * 1.5 : 0); fl.scale.set(1.1 + fz * .45, 1.1 + fz * .45, 1) }   // a breathing ball, bigger while thrusting
    ;
    fl.material.color.copy(trailColour(1, 1, _flc, gasOn || !boosting ? 1 : 0, boosting ? 1 : 0).lerp(_amber, gasOn && !boosting ? 1 : 0));   // the flame takes the trail's colour
  } else if (booted) { nearest(camera.position) }   // on the map, the winners right around you become suns as you zoom in
  if (!intro.active) updateCamera(dt); else intro.update(dt);
  portal.update(rdt);   /* the phone tilts the view round the ship (or steers) */
  engineLook(dt);
  { if (!shipR0) { const sc = avatar.scale.x || 1; shipR0 = new THREE.Box3().setFromObject(avatar).getSize(tmp).length() / 2 / sc }   // the ship's own radius at scale 1, measured once
    const d = Math.max(1e-3, camera.position.distanceTo(player.pos)), px = 2 * shipR0 * avatar.scale.x / d * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360)); tmp.copy(player.pos).project(camera);
    shipOnMap = !fly && px > 5 && tmp.z < 1 && Math.abs(tmp.x) < 1.1 && Math.abs(tmp.y) < 1.1 }   // on the map (and on the way there) the ship stays, full quality, while it's in view and over 5 px across
  avatar.visible = (fly || shipOnMap) && !(intro.active && intro.ph === 1);   /* (through the logo only the flat pointer shows) */ youMark.visible = !fly && !shipOnMap; if (!fly) { youMark.position.copy(player.pos); youMark.scale.setScalar(.028 * (1 + .18 * Math.sin(now * .005))) }
  updateBodies();
  // relativity: real aberration of where things appear, and a Doppler shift (exaggerated to taste) in the final pass
  beta = fly ? Math.min(.995, player.vel.length() / LIGHT) : 0;
  if (player.vel.lengthSq() > 1) U.vdir.value.copy(player.vel).normalize(); else U.vdir.value.set(0, 0, -1).applyQuaternion(rig.q);
  U.beta.value = Math.min(.995, beta * L.relativity); PU.betaC.value = Math.min(.8, beta * L.shift); PU.beam.value = L.beaming;
  PU.vV.value.copy(U.vdir.value).transformDirection(camera.matrixWorldInverse); PU.ty.value = Math.tan(camera.fov * Math.PI / 360); PU.tx.value = PU.ty.value * camera.aspect;
  { const v = PU.vV.value, z = Math.abs(v.z) > 1e-3 ? v.z : -1e-3, sg = z < 0 ? 1 : -1, x = sg * v.x / Math.abs(z) / PU.tx.value, y = sg * v.y / Math.abs(z) / PU.ty.value; PU.apex.value.set(Math.max(-2, Math.min(3, x * .5 + .5)), Math.max(-2, Math.min(3, (1 - y) * .5))) }   // the apex of your motion on screen (or the point you're leaving, if it's behind you)
  PU.nV.value.set(0, 1, 0).applyQuaternion(GQ).transformDirection(camera.matrixWorldInverse); PU.edge.value = L.edgeDim; { const a = Math.sin(L.edgeAngle * Math.PI / 180); PU.edgeA.value = a; PU.edgeB.value = Math.min(1, Math.max(a * 1.05 + .002, a * L.edgeSoft)) }
  stars.u.far.value = fly ? 1 : 0; stars.u.thin.value = fly ? 0 : L.mapDots ?? 1; stars.u.faint.value = fly ? 0 : (L.mapFaint ?? 0) * mapK; stars.u.white.value = L.starWhite * (fPicks() > 1 ? 1 - .9 * mapK : 1);   /* several filters on the map: the stars show their filter's colour, not white-hot */
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
  boostK += ((fly && boosting ? 1 : 0) - boostK) * Math.min(1, dt * (boosting ? 6 : 2)); if (boosting) boostK = Math.min(boostK, (boostK0 += dt / .12)); else boostK0 = boostK;   // the boost glow swells in over 120 ms
  updateTrail(dt, fly && !!L.trail); trail.visible = fly && !!L.trail && trail.userData.used > 1; updateEngine(); updateBoostUI(dt);
  if (fly && booted) { if (player.vel.length() < 1 && !auto) { shipStill += dt; if (shipStill > 3 && !shipSaved) { shipSaved = true; store.set('sotd-ship', JSON.stringify({ p: player.pos.toArray(), q: player.base.toArray(), r: rig.q.toArray() })) } } else { shipStill = 0; shipSaved = false } }
  winCompass(); if (fly) { updateCompass(); const r = regionOf(player.pos); if (r !== region) { region = r; if (L.cards && booted) arrive(r) } } else if (region !== null) { region = null; $('arrive').classList.remove('show') }
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
    else if (!fly) { const c = hovI >= 0 ? hovI : cardI; if (c >= 0 && TA[c] === 1) { const rpx = starR(c) * innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360) * Math.max(1, camera.position.distanceTo(starPos(c, tmp)))); if (rpx * 2 >= (L.mapTipPx ?? 6) * (cardI === c ? .75 : 1)) open = c } if (open < 0 && S.sel >= 0 && camera.position.distanceTo(starPos(S.sel, tmp)) < CR[S.sel] * 20) open = S.sel }   // on the map: zoomed in close, the winner you point at opens into its full record
    if (gotCard.t > 0 && S.mode === 'fly') open = gotCard.i;   // a ring you just flew through keeps its record open a while
    showCard(open);
  }
  { let ch = false; const nowMs = performance.now(); for (let i = 0; i < N; i++) { const t = ringHide.size && ringHide.get(i) > nowMs ? 0 : i === openI && L.shot3d ? TA[i] * (1 - Math.min(1, openA * 2)) : TA[i], d = t - ALPHA[i]; if (Math.abs(d) > .002) { ALPHA[i] += d * Math.min(1, i === openI ? dt * 20 : rdt * 3 / Math.max(.05, L.filterFade ?? .6)); ch = true } } if (ch) stars.aAlpha.needsUpdate = true }   /* a filter fades stars in and out */
  if (recolor.ease) { const k = Math.min(1, rdt * 3 / Math.max(.05, L.filterFade ?? .6)); let mx = 0; for (let j = 0; j < N * 3; j++) { const d = COLT[j] - COL[j]; COL[j] += d * k; mx = Math.max(mx, Math.abs(d)) } if (mx < .003) { COL.set(COLT); recolor.ease = false } stars.aColor.needsUpdate = true }
  const ringI = auto && auto.i >= 0 && auto.i !== openI ? auto.i : -1;
  updateLockMark();
  targetRing.visible = ringI >= 0; if (ringI >= 0) { starPos(ringI, targetRing.position); targetRing.quaternion.copy(camera.quaternion); targetRing.scale.setScalar(Math.max(CR[ringI] * 1.6, camera.position.distanceTo(targetRing.position) * .03) * (1 + .05 * Math.sin(now * .005))) }
  updateHover(dt); updateLabels();
  if (fly) gauge.fly(); else gauge.map(); consoleUI(rdt); whiteout.update(rdt); sing.update(rdt); rec.update(rdt); ascent.update(rdt);
  netT += dt; if (netT > .1) { netT = 0; mixAmbient(player.pos); const s = Net.self; s.pos = player.pos.toArray(); s.quat = player.quat.toArray(); s.vel = player.vel.toArray(); s.mode = S.mode; s.th = thrusting ? (gasOn ? 1 : 0) | (boosting ? 2 : 0) : 0; Net.send(s) }
  updatePeers(dt); flags.update(); coach.update(dt); nav.update(dt); shipEnv.update(dt); rings.update(dt); musicMap(S.mode === 'map'); mapZone.update(dt); dayLab(); swapLook();
  if (tween && tween.mode) { const e = ease(Math.min(1, tween.t)); mapK = S.mode === 'map' ? sstep(e, 0, .55) : 1 - sstep(e, .45, 1) } else mapK += ((S.mode === 'map' ? 1 : 0) - mapK) * Math.min(1, dt * 1.6); conK += ((conOn ? 1 : 0) - conK) * Math.min(1, dt * 3); { const dim = Math.max((L.mapFade ?? .85) * mapK, (L.conDim ?? .8) * conK); PU.bgK.value = 1 - dim; bgStars.u.op.value = L.bgStars * (1 - dim) }   // between map and flight the map's dimming follows the camera's move, so the galaxy never flares up while you're still far out; on the map it clears down to the winners
  { const toC = tmp.copy(GC).sub(camera.position), d = toC.length(), fw = tmp2.set(0, 0, -1).applyQuaternion(camera.quaternion), Rr = (GAL_R0 + GAL_LEN) * .3,
      look = sstep(fw.dot(toC.divideScalar(Math.max(d, 1))), .9, .995) * (1 - sstep(d, Rr * 2, Rr * 8)), inside = 1 - sstep(d, Rr * .6, Rr * 1.6); coreK += (Math.max(look, inside) - coreK) * Math.min(1, dt * 3); coreIn += (inside - coreIn) * Math.min(1, dt * 3) }   // looking into the core, or sitting in it
  {   // bloom swells near light speed and follows the core settings; exposure too
    const k = fly ? sstep(beta, .05, .92) * L.bloomBoost : 0, on = L.bloom ? 1 : 0;
    bloomPass.strength.value = on * (L.bloomStr + (2 - L.bloomStr) * k) * (1 + (L.coreBloom - 1) * coreK); bloomPass.strength.value += on * (engineLook.burst || 0) * (L.flareBurst ?? 1.2) * .35; igniteK *= Math.exp(-dt / .9); bloomPass.radius.value = L.bloomRad + (1 - L.bloomRad) * k;
    bloomPass.threshold.value = Math.min(1, L.bloomThr * (1 - .45 * k) * (1 + (L.coreThr - 1) * coreK))
    PU.exp.value = L.exposure * (1 + (L.coreExposure - 1) * coreK) * (1 + (L.ringFlashExpo ?? 1.5) * whiteout.k); bloomPass.strength.value += (L.ringFlashGlow ?? 1.2) * whiteout.k; PU.lv.value = whiteout.lv; { const so = (1 - whiteout.lv * whiteout.lv).toFixed(2); if (shipCanvas.style.opacity !== so) shipCanvas.style.opacity = so } PU.lvMid.value = L.ringVeilMid ?? 2;   // closing in on a ring the picture's exposure and glow swell with the whiteout
  }
  paperUpdate(rdt); paperPics.update();
  {   // the core and bulge puffs, raymarched (when switched on), and the core's glow as a volume
    const pOn = !!L.puffVol, gOn = !!L.bhGlowVol && coreGlowV.k > .002, on = pOn || gOn, pv = puffVol.u; puffVol.mesh.visible = on;
    if (on) {
      const R = (GAL_R0 + GAL_LEN) * (L.bhPuffR ?? .06), sB = bulgeR * .42 * (L.bulgePuffSpread ?? 1), E = Math.max(pOn ? Math.max(sB * 3.2, R * 1.4) : 0, gOn ? coreGlowV.s * 3.5 : 0), cg = 1 + ((L.coreGlows ?? 1) - 1) * coreIn;
      puffVol.mesh.scale.setScalar(E); pv.E.value = E; pv.cam.value.copy(camera.position); puffVol.mesh.worldToLocal(pv.cam.value);
      pv.sB.value = sB; pv.R.value = R; pv.H.value = L.bhPuffH ?? 1; pv.kB.value = pOn ? .9 * L.bulge * L.bulgePuffs * L.puffVolGlow * cg * coreInK : 0; pv.kC.value = pOn ? .6 * (L.bhPuffs ?? 1) * L.puffVolGlow * cg * coreInK : 0; pv.kG.value = gOn ? coreGlowV.k * 1.4 * coreInK : 0; pv.sG.value = coreGlowV.s;
      const gs = L.puffVolGrainSize ?? 1, cnt = k => Math.cbrt(Math.max(.5, k) / 16), gm = (base, tex) => Math.min(1, base + (tex ?? 0) * (1 - base));   // the particle puffs' sliders steer the volume too
      pv.f.value = 6 * (L.bhPuffD ?? 1) * cnt(L.bhPuffN ?? 16) / R / gs / (L.bhPuffSize ?? 1); pv.fB.value = 6 * (L.bulgePuffD ?? 1) * cnt((L.bulgePuffN ?? 6) * 2.7) / sB / gs / (L.bulgePuffSize ?? 1);
      pv.gC.value = gm(L.puffVolGrain, L.bhPuffTex); pv.gB.value = gm(L.puffVolGrain, L.bulgePuffTex); pv.shC.value = L.bhPuffSoft ?? 1; pv.shB.value = L.bulgePuffSoft ?? 1;
      pv.vC.value = L.bhPuffVar ?? 0; pv.vB.value = L.bulgePuffVar ?? 0; pv.flC.value = L.bhPuffFlick ?? 0; pv.flB.value = L.bulgePuffFlick ?? 0; pv.tC.value = L.bhPuffTint ?? .5; pv.tB.value = L.bulgePuffTint ?? .5;
      pv.tint.value = L.puffVolTint ?? .5; pv.grain.value = L.puffVolGrain; pv.dust.value = L.puffVolDust; pv.steps.value = L.puffVolSteps; pv.occ.value = L.puffVolHide ?? .15;
    }
  }
  {   // volumetric gas
    volK += (Math.max(0, Math.min(1, +L.volumetric || 0)) - volK) * Math.min(1, dt * 2.5); const on = volK > .003, u = vol.u; vol.mesh.visible = on; PU.volOn.value = on ? volK : 0;   // it fades in and out instead of popping
    if (on) {
      u.cam.value.copy(camera.position); vol.mesh.worldToLocal(u.cam.value);
      u.glow.value = L.volGlow; u.dust.value = L.volDust; u.steps.value = L.volSteps; u.noise.value = L.volNoise; u.wispLo.value = L.volWispLo; u.wispHi.value = Math.max(L.volWispLo + (L.volEdge ?? .02), L.volWispHi); u.janim.value = L.volJitterMove ? 1 : 0; PU.volBlur.value = (L.volSmooth ?? 0) / LOOK.volRes;   u.warp.value = L.volWarp; u.armK.value = L.volArmK; u.thick.value = L.volThick;   // a hard wisp edge pops on and off as the clouds move: volEdge keeps it soft
      u.coreV.value = L.volCore * (1 + ((L.coreGlows ?? 1) - 1) * coreIn); u.dustT.value = L.volDustT; u.emAbs.value = L.volEmAbs; u.flow.value = L.volFlow; u.inner.value = L.volInner; u.outer.value = L.volOuter; u.opMax.value = L.volOpMax; u.coreMix.value = L.volColMix; u.wispGain.value = L.volWisp; u.base.value = L.volBase; u.detail.value = L.volDetail; u.satV.value = L.volSat; u.contrast.value = L.volContrast;
      vol.mesh.scale.y = VOL_S * VOL_H * L.volHeight; u.spin.value = L.arcSpin * L.volSpin; u.armW.value = L.armWidth; u.fil.value = L.volFil ?? 0; u.filOff.value = L.volFilOff ?? .35; u.filW.value = L.volFilW ?? .06; u.filWig.value = L.volFilWig ?? .3; u.filBreak.value = L.volFilBreak ?? .45; u.filH.value = L.volFilH ?? 3;
    }
  }
  PU.beta.value = fly ? Math.min(1, beta * L.relativity) : 0; PU.ab.value += ((fly ? Math.min(1.5, player.cruise * .35 + beta * 1.2 + boostK * .8) * L.aberr : 0) - PU.ab.value) * Math.min(1, dt * 4);
  updateStats(dt); const t0 = performance.now(); perf.js = t0 - tStart; if (!NORENDER) { if (!(intro.active && veil.material.opacity > .999) || intro.wipe) { intro.wipe = false; pipeline.render() } shipCam.copy(camera); const lg = intro.active && logo3d && logo3d.visible, sd = camera.position.distanceTo(avatar.position); shipCam.near = camera.near * SHIP_SC * (lg ? .01 : .1); shipCam.far = intro.active ? Math.max(sd * 4, shipCam.near * 1e4, lg ? logo3d.position.distanceTo(camera.position) + logo3d.scale.x * 600 : 0, sStars.far()) : Math.max(2e5, camera.position.distanceTo(player.pos) * 2); shipCam.updateProjectionMatrix(); shipRenderer.render(shipScene, shipCam) } perf.ms = performance.now() - t0;   // under the opening's black veil the galaxy isn't drawn at all
}
let loopErrs = 0;
function loop(now) { requestAnimationFrame(loop); if (!booted && !introActive) { last = now; return } { const cap = LOOK.fpsCap ?? 0; if (cap > 0 && now - last < 1000 / cap - 2) return }   /* the frame-rate cap: skip display frames until it's time */   // nothing to draw behind the splash: leave the GPU to the loading
  try { tick(now) } catch (e) { if (loopErrs++ < 5) console.error(e) } }   // one bad frame never stops the sky
