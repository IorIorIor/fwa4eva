/* ───────────────────────── look panel: settings → uniforms ───────────────────────── */
const mcol = (hex, m) => { const c = new C3(hex), l = c.r * .3 + c.g * .59 + c.b * .11; return c.lerp(new C3(.72 * l, .86 * l, 1.15 * l), m) };
function applyLook() {
  const L = LOOK;
  U.rad.value = ANDRO ? L.radCol : 0; U.farK.value = L.farDim; U.far0.value = L.farStart; U.far1.value = L.farStart * 6;
  U.rc1.value.setHSL(L.radHue1, L.radSat, .6); U.rc2.value.setHSL(L.radHue2, L.radSat * .85, .5); U.rc3.value.setHSL(L.radHue3, L.radSat, .5);
  PU.inv.value = L.invert ? 1 : 0; document.body.classList.toggle('inverted', !!L.invert); PU.film.value = L.film ? 1 : 0; PU.vig.value = L.vignette; PU.grain.value = L.grain; PU.black.value = L.blackPt; PU.con.value = L.contrast; PU.sat.value = L.sat; PU.cool.value = L.cool;
  // sprite nebulae, lanes, category nebulae
  const NU = NEB_U; NU.neb.value = L.nebGlow; NU.cloud.value = L.nebCloud; NU.fil.value = L.nebFil; NU.soft.value = L.nebSoft; NU.contrast.value = L.nebContrast; NU.hot.value = L.nebHot; NU.sat.value = L.nebSat; NU.scale.value = L.nebSize; NU.det.value = L.nebDetail ?? 0; NU.dsz.value = L.nebDetailSize ?? 4; NU.dsh.value = L.nebDetailSharp ?? 1;
  NU.hue.value = L.nebHue; NU.edge.value = L.nebEdge; NU.bright.value = L.nebBright; NU.alphaMax.value = L.nebAlphaMax; NU.sizeVar.value = L.nebSizeVar; NU.pulse.value = L.nebPulse; NU.radOn.value = L.nebRadial; NU.flatY.value = L.nebHeight; NU.nearK.value = L.nebNear; NU.drift.value = L.nebDrift; NU.mono.value = L.mono;
  const nebHome = L.nebScreen ? hazeScene : softScene; if (nebula.parent !== nebHome) nebHome.add(nebula);   // "screen" clouds join the soft-clipped haze
  nebula.visible = lanes.visible = !!L.nebula; nebula.geometry.instanceCount = Math.min(NEB_A.n + NEB_B.n, Math.round(640 * L.nebCount));
  { const U_ = LANE_U; U_.lane.value = L.lanes; U_.scale.value = L.laneSize; U_.flatY.value = L.laneHeight; U_.nearK.value = L.laneNear; U_.detail.value = L.laneDetail; U_.dscale.value = L.laneScale; U_.contrast.value = L.laneContrast; U_.thin.value = L.laneThin; U_.soft.value = L.laneSoft; U_.warm.value = L.laneWarm; U_.amax.value = L.laneMax } lanes.geometry.instanceCount = Math.min(LANE_A.n + LANE_B.n + LANE_C.n, Math.round(270 * L.laneCount));
  coreGlow.material.color.copy(new C3(1, 1, 1).lerp(new C3(.75, .85, 1), L.mono));
  vol.u.core.value.copy(mcol(NEB_PAL[0][0], L.mono)); vol.u.edge.value.copy(mcol(NEB_PAL[0][1], L.mono));
  // haze
  const H = haze.u; H.mono.value = L.mono; H.op.value = L.haze * L.hazeBright; H.keep.value = L.hazeCoreKeep; H.reach.value = L.hazeCoreReach; H.h.value = L.hazeHeight; H.g.value = L.hazeGirth * L.armWidth; H.size.value = L.hazeSize; H.soft.value = L.hazeSoft; H.near.value = L.hazeNear; H.pal.value = L.hazePal; H.ev.value = L.hazeEven ?? 0; H.cut.value = L.hazeHole ?? 0; H.csz.value = L.hazeCoreSize ?? 1;
  haze.mesh.geometry.instanceCount = Math.floor(HAZE.n * L.hazeDensity / 2); PU.hazeScreen.value = L.hazeSoftBlend ? 1 : 0;
  bgStars.u.op.value = L.bgStars;
  // winners
  // the black hole: its mass sets its size, live
  setBH(L.bhMass); U.bhClear.value = BH.sh * 1.5; vol.u.bh.value = BH.sh * 1.05 / VOL_S;
  bh.mesh.scale.setScalar(RP * BH.rs); bh.shadow.scale.setScalar(BH.sh * .985);
  { const b = bh.u; b.rin.value = 3; b.rout.value = Math.max(3.5, L.bhDiskOut); b.br.value = L.bhDisk * 8; b.hot.value = L.bhHot; b.warm.value = L.bhWarm ?? 0; b.spin.value = L.bhSpin; b.halo.value = L.bhHalo / .75; b.dop.value = L.bhDoppler; b.lens.value = L.bhLens; b.steps.value = Math.round(L.bhSteps) }
  const su = stars.u; su.shine.value = L.awardShine ?? 1; su.sharp.value = L.starSharp; su.coreW.value = L.starCore; su.haloW.value = L.starHalo; su.fall.value = L.starFall; su.spikes.value = L.starSpikes; su.white.value = L.starWhite; su.twink.value = L.starTwinkle; su.size.value = L.starSize; su.glow.value = L.starGlow; su.flare.value = L.flares ? 1 : 0;
  constellation.u.shim.value = L.conShimmer ?? .6; constellation.u.shimS.value = L.conShimmerSpeed ?? .8; stars.u.gold.value = L.gotGold ?? 1; constellation.u.glow.value = L.lineGlow; constellation.u.w.value = L.conWidth ?? 2; constellation.u.gw.value = L.conGlowW ?? 10;
  avatar.userData.nav.forEach(b => b.visible = !!L.nav); beamPivot.visible = !!L.search;
  $('cmp').style.display = L.compass ? '' : 'none'; $('hdg').style.display = L.heading ? '' : 'none'; $('gauge').style.visibility = L.gauge ? '' : 'hidden';
  if (!L.cards) $('arrive').classList.remove('show');
  rig.dist = L.camDist * SHIP_K * SHIP_SC;
  setPassScales(); if (L.maxDpr + ',' + L.shipDpr !== applyLook.dpr) { applyLook.dpr = L.maxDpr + ',' + L.shipDpr; setDpr(Math.min(L.maxDpr, devicePixelRatio || 1), true) }
  if (AC) { const t = AC.currentTime; if (musicGain) { musicGain.gain.setTargetAtTime(.6 * L.music, t, .1); musicMapOn = null } if (ambBus) ambBus.gain.setTargetAtTime(.33 * L.amb, t, .1); if (master) master.gain.setTargetAtTime(CHIME_K * L.ting, t, .1) }
}

/* settings also live in the viewer's claude.ai account, so they survive reloads, new versions and other devices */
let lookDoc = null, lookT = 0;
const lookData = () => { const d = {}; Object.keys(LOOK).forEach(k => { if (k[0] !== '_') d[k] = LOOK[k] }); return d };
// the map can have a look of its own: with the switch on, the Look panel edits a separate set of settings while you're on the map
const MAP_KEY = 'sotd-look-map';
let LOOK_FLY = LOOK, LOOK_MAP = { ...LOOK, ...MY_MAP_LOOK, ...store.json(MAP_KEY, {}) };
const INV_KEY = 'sotd-look-inv';   // the inverted look: with the inverted switch on, every slider edits this set instead (fly and map alike)
phoneTier(LOOK_MAP); let LOOK_INV = phoneTier({ ...LOOK, ...store.json(INV_KEY, {}), invert: 1 }), invOn = store.get('sotd-inv-on') === '1';
/* the galaxy's shape is one and the same in every look: these are built into the galaxy itself (on Rebuild), so flying,
   the map and the inverted look always share them, whichever one you change them in */
const GAL_KEYS = ['galaxyStyle', 'armStart', 'armWindA', 'armWindG', 'armCount', 'armLock', 'armBeat', 'spiral', 'armWiden', 'armWidenCurve', 'spiralTurns', 'spiralGap', 'spiralHole', 'spiralSize', 'starBandW', 'starBandH', 'starCoreH', 'starAlong', 'starSep', 'nebOut', 'hazeCore'];
GAL_KEYS.forEach(k => { if (k in LOOK_FLY) LOOK_MAP[k] = LOOK_INV[k] = LOOK_FLY[k] });
function syncGal() {
  if (LOOK === LOOK_MIX) return; let ch = false;
  for (const L of [LOOK_FLY, LOOK_MAP, LOOK_INV]) if (L !== LOOK) GAL_KEYS.forEach(k => { if (k in LOOK && L[k] !== LOOK[k]) { L[k] = LOOK[k]; ch = true } });
  if (!ch) return; if (LOOK !== LOOK_FLY) store.set(LOOK_KEY, JSON.stringify(LOOK_FLY)); if (LOOK !== LOOK_MAP) store.set(MAP_KEY, JSON.stringify(LOOK_MAP)); if (LOOK !== LOOK_INV && store.get(INV_KEY)) store.set(INV_KEY, JSON.stringify(LOOK_INV));
}
const LOOK_MIX = {};   // in between: every slider part way from the flying look to the map's, following the camera's move
function swapLook() {
  if (LOOK === LOOK_INV) { if (LOOK_INV.invert) return; invOn = false; store.set('sotd-inv-on', '0'); LOOK_INV.invert = 1; saveLookNow(); LOOK = LOOK_FLY; LOOK.invert = 0; saveLookNow(); renderLook(); applyLook(); return }   // inverted switched off: back to your normal look
  if (LOOK !== LOOK_MIX && (LOOK.invert || invOn)) {   // switched on (or it was on last time): the inverted look takes over
    if (LOOK.invert && !store.get(INV_KEY)) Object.assign(LOOK_INV, LOOK);   // the first time, it starts as a copy of the look you have
    if (LOOK === LOOK_MAP) LOOK_MAP.invert = 0; else LOOK_FLY = LOOK; LOOK_FLY.invert = 0; LOOK_INV.invert = 1; invOn = true; store.set('sotd-inv-on', '1'); store.set(LOOK_KEY, JSON.stringify(LOOK_FLY)); store.set(MAP_KEY, JSON.stringify(LOOK_MAP));   // the normal looks are kept as they were, inverted off
    LOOK = LOOK_INV; saveLookNow(); renderLook(); applyLook(); return;
  }
  if (LOOK === LOOK_MAP) LOOK_FLY.mapOwnLook = LOOK_MAP.mapOwnLook; else if (LOOK !== LOOK_MIX) { LOOK_FLY = LOOK; LOOK_MAP.mapOwnLook = LOOK.mapOwnLook }
  if (S.mode !== swapLook.mode) { swapLook.mode = S.mode; swapLook.tw = tween }   // a mode switch: blend over the move that goes with it (and only that one)
  const toMap = S.mode === 'map' && LOOK_FLY.mapOwnLook, e = tween && tween === swapLook.tw ? ease(Math.min(1, tween.t)) : 1, k = LOOK_FLY.mapOwnLook ? (toMap ? e : 1 - e) : 0;
  if (k <= 0 || k >= 1) { const want = k >= 1 ? LOOK_MAP : LOOK_FLY; if (LOOK !== want) { LOOK = want; renderLook(); applyLook() } return }
  for (const key in LOOK_FLY) { const a = LOOK_FLY[key], b = LOOK_MAP[key]; LOOK_MIX[key] = typeof a === 'number' && typeof b === 'number' ? a + (b - a) * k : k < .5 ? a : b ?? a }
  LOOK = LOOK_MIX; applyLook();
}
/* a whole new galaxy at random: every galaxy, dark-lane and nebula setting somewhere inside its slider's range, then rebuilt */
function randomGalaxy() {
  const groups = ['Galaxy', 'Dark lanes', 'Sprite nebulae'], skip = new Set(['farStart', 'farDim']);
  LOOK_DEF.forEach(([g, rows]) => { if (!groups.includes(g)) return; rows.forEach(([k, , t, d, lo, hi, st]) => {
    if (skip.has(k)) return; if (t === 's' && Number.isFinite(lo) && Number.isFinite(hi)) { const v = lo + (hi - lo) * (.08 + .84 * Math.random()), q = st ? Math.round(v / st) * st : v; LOOK[k] = +q.toFixed(6) } }) });
  saveLookNow(); setTimeout(() => location.reload(), 300);
}
function saveLookNow() { if (LOOK === LOOK_MIX) return; syncGal(); if (LOOK === LOOK_INV) { store.set(INV_KEY, JSON.stringify(LOOK)); return } if (LOOK === LOOK_MAP) { store.set(MAP_KEY, JSON.stringify(LOOK)); return } store.set(LOOK_KEY, JSON.stringify(LOOK)); if (lookDoc) lookDoc.set({ look: lookData(), at: Date.now() }).catch(() => { }) }
function saveLook() { if (LOOK === LOOK_MIX) return; syncGal(); if (LOOK === LOOK_INV) { store.set(INV_KEY, JSON.stringify(LOOK)); return } if (LOOK === LOOK_MAP) { store.set(MAP_KEY, JSON.stringify(LOOK)); return } store.set(LOOK_KEY, JSON.stringify(LOOK)); if (lookDoc) { clearTimeout(lookT); lookT = setTimeout(() => lookDoc.set({ look: lookData(), at: Date.now() }).catch(() => { }), 900) } }
(async () => {
  try {
    if (!window.claude || !claude.use) return; const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); if (!db || !user) return;
    const id = await user.id(); if (!id) return; lookDoc = db.doc('data/users/' + id + '/look');
    const snap = await lookDoc.get(), d = snap.exists && snap.data();
    if (d && d.look && typeof d.look === 'object') {
      Object.keys(d.look).forEach(k => { if (k in LOOK_DEFAULTS && typeof d.look[k] === 'number') LOOK[k] = d.look[k] }); migrateLook(LOOK);
      if (hudFix || STYLE_FIRST || speedFix || relFix || camFix || ringFix || moteFix || streakFix || menuFix || retFix || bandFix || streak3 || band3 || slow2 || slow3 || fix4 || fix5 || fix6 || fix7 || fix8 || fix9 || fix10 || fix11 || fix12 || fix13 || fix14) saveLook(); store.set(LOOK_KEY, JSON.stringify(LOOK)); renderLook(); applyLook()
    } else saveLook();
  } catch (e) { }
})();

/* a quick top-down sketch of the galaxy's shape from the sliders as they stand now, so you can see a change before
   rebuilding: the winners (up to 5000 of them, by their real dates) on the arms or the single spiral, coloured by era */
let prevCv = null, prevQ = 0;
function galPreview() {
  if (!prevCv || !prevCv.isConnected) return; const L = LOOK, cv = prevCv, g = cv.getContext('2d'), W = cv.width, H = cv.height; if (!g) return;
  const num = (k, d, lo, hi) => { const v = +L[k]; return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d };
  const sp = !!L.spiral, arms = sp ? 1 : Math.round(num('armCount', 4, 2, 8)), wind = num(ANDRO ? 'armWindA' : 'armWindG', 3.1, .6, 6), lock = sp ? 0 : num('armLock', 1, 0, 1), beat = num('armBeat', 1, .25, 2);
  const r0 = num('armStart', 70000, 15000, 300000) * (sp ? num('spiralHole', 1.5, .3, 4) : 1), out = 850000 * (sp ? num('spiralSize', .85, .4, 1.2) : 1), len = out - r0;
  const G = num('spiralGap', 2.4, .3, 6), lg = Math.log(G), flat = Math.abs(lg) < 1e-3, tw = 2 * Math.PI * 5.4 * num('spiralTurns', 1, .5, 2);
  const rho = t => flat ? t : G * (1 - Math.pow(G, -t)) / (G - 1), tauOf = u => { const c = Math.max(0, Math.min(1, u)); return flat ? c : -Math.log(1 - c * (G - 1) / G) / lg };
  const yU = t => sp ? rho(1 - tFrac(t)) : Math.pow(1 - tFrac(t), .62);
  const r25 = r0 + yU(Date.UTC(2025, 0, 1)) * len, x25 = Math.log(r25), x00 = Math.log(out), ph25 = wind * Math.log(r25 / r0), d = beat * 2 * Math.PI / arms, h = .12;
  const phase = r => {
    if (sp) return tw * tauOf((r - r0) / len);
    const x = Math.log(Math.max(r, r0 * .5)), base = wind * (x - Math.log(r0)); if (!lock) return base;
    const u = Math.max(0, Math.min(1, (r - r0) / len)), E = 5.4 * (1 - Math.pow(u, 1 / .62)), mid = ph25 + (5 - E) * d, o = ph25 + 5 * d + wind * (x - x00);
    const w1 = sstep(x, x25 - h, x25 + h), w2 = sstep(x, x00 - h, x00 + h); return base + (((base + (mid - base) * w1) * (1 - w2) + o * w2) - base) * lock;
  };
  const bw = num('starBandW', 1, .1, 4), ba = num('starAlong', 1, .1, 4), rnd = mulberry32(7), gs = () => { let a = 0; for (let k = 0; k < 4; k++) a += rnd(); return (a - 2) * 1.73 };
  const K = (Math.min(W, H) / 2 - 6) / 900000, cx = W / 2, cy = H / 2, cols = ['#7fb2ff', '#62d6dc', '#b06bff', '#ff4fa3', '#ffb36b', '#fff1d6'];
  g.fillStyle = '#05050a'; g.fillRect(0, 0, W, H);
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1; [r0, out].forEach(r => { g.beginPath(); g.arc(cx, cy, r * K, 0, 7); g.stroke() });
  if (sp) { g.strokeStyle = 'rgba(255,255,255,.28)'; g.beginPath(); for (let k = 0; k <= 600; k++) { const r = r0 + rho(k / 600) * len, a = phase(r); k ? g.lineTo(cx + Math.cos(a) * r * K, cy + Math.sin(a) * r * K) : g.moveTo(cx + Math.cos(a) * r * K, cy + Math.sin(a) * r * K) } g.stroke() }
  const n = Math.min(5000, N), step = N / n;
  for (let j = 0; j < n; j++) {
    const i = Math.floor(j * step), dd = D[i], u = yU(dd.t), r = r0 + u * len, s = 7700 + r * .045, arm = (rnd() * arms) | 0;
    const dr = sp ? gs() * s * .7 * bw : gs() * s * .2 * bw, dth = sp ? gs() * .1 * ba * s / r : gs() * 1.1 * ba * s / r, rr = Math.max(r0 * .3, r + dr), a = arm * 2 * Math.PI / arms + phase(rr) + dth;
    g.fillStyle = cols[Math.max(0, Math.min(5, Math.floor((dd.year - 2000) / 5)))]; g.fillRect(cx + Math.cos(a) * rr * K - .6, cy + Math.sin(a) * rr * K - .6, 1.3, 1.3);
  }
  g.fillStyle = '#000'; g.beginPath(); g.arc(cx, cy, 2.5, 0, 7); g.fill();
}
const prevSoon = () => { if (prevQ) return; prevQ = requestAnimationFrame(() => { prevQ = 0; galPreview() }) };
function renderLook() {
  const body = $('lookBody'); body.innerHTML = '';
  if (LOOK === LOOK_MAP) { const n = document.createElement('div'); n.className = 'mapnote'; n.innerHTML = '<b>Map look</b><span>You are tuning the map\'s own look. Flying keeps its own.</span><button class="btn" type="button">Start from the flying look</button>'; n.querySelector('button').onclick = () => { LOOK_MAP = LOOK = { ...LOOK_FLY, mapFade: 0 }; saveLook(); renderLook(); applyLook() }; body.appendChild(n) }
  let openSecs = store.json('sotd-look-open', []); if (!Array.isArray(openSecs)) openSecs = [];
  LOOK_DEF.forEach(([title, rows]) => {
    const sec = document.createElement('div'); sec.className = 'lsec' + (openSecs.includes(title) ? ' open' : '');
    const hd = document.createElement('button'); hd.className = 'lhd'; hd.type = 'button'; hd.innerHTML = `<span>${title}</span><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5"/></svg>`; hd.setAttribute('aria-expanded', sec.classList.contains('open'));
    const bodyEl = document.createElement('div'); bodyEl.className = 'lbody'; sec.append(hd, bodyEl);
    if (title === 'Galaxy') { const pv = document.createElement('div'); pv.className = 'gprev'; pv.innerHTML = '<canvas width="520" height="520" aria-label="Preview of the galaxy shape from these settings"></canvas><span>Preview: shape changes take effect when you rebuild</span>'; bodyEl.appendChild(pv); prevCv = pv.querySelector('canvas'); prevSoon() }
    hd.onclick = () => { const o = sec.classList.toggle('open'); hd.setAttribute('aria-expanded', o); const i = openSecs.indexOf(title); if (o && i < 0) openSecs.push(title); if (!o && i >= 0) openSecs.splice(i, 1); store.set('sotd-look-open', JSON.stringify(openSecs)) };
    rows.forEach(([k, label, type, def, min, max, step]) => {
      if (ANDRO ? label.includes('(Generic)') : label.includes('(Andromeda)') || /^dust/.test(k)) return;   // only the settings for the galaxy you're in
      if (type === 'b') { const w = document.createElement('div'); w.className = 'gsw'; w.innerHTML = `<span>${label}</span><button class="btn" type="button">Rebuild</button><button class="btn" type="button" data-rnd>Randomize</button>`; w.querySelector('button').onclick = () => { saveLookNow(); setTimeout(() => location.reload(), 350) }; w.querySelector('[data-rnd]').onclick = randomGalaxy; bodyEl.appendChild(w); return }
      if (type === 'c') {
        const w = document.createElement('div'); w.className = 'gsw'; w.innerHTML = `<span>${label}</span><div class="seg"><button data-s="generic" aria-pressed="${!ANDRO}">Generic</button><button data-s="andromeda" aria-pressed="${ANDRO}">Andromeda</button></div>`;
        w.onclick = e => { const st = e.target.dataset && e.target.dataset.s; if (!st || st === STYLE) return; store.set('sotd-galaxy', st); saveLookNow(); setTimeout(() => location.reload(), 350) }; bodyEl.appendChild(w); return
      }
      if (type === 'ta') { const w = document.createElement('div'); w.className = 'gta'; w.innerHTML = `<span>${label}</span><textarea rows="3" spellcheck="false" placeholder='{"noteEvery": 3.2, "tone": 2600, …}'></textarea><button class="btn" type="button">Import</button><small></small>`; const ta = w.querySelector('textarea'), msg = w.querySelector('small'); w.querySelector('button').onclick = () => { const n = ascent.import(ta.value); msg.textContent = n ? `${n} settings in` : 'Nothing I could read: paste the toy\'s settings (JSON)'; if (n) { saveLook(); applyLook(); setTimeout(renderLook, 600) } }; bodyEl.appendChild(w); return }
      if (type === 'x') { const w = document.createElement('div'); w.className = 'gsw'; w.innerHTML = `<span>${label}</span><button class="btn" type="button">${k === 'coachRun' ? 'Start' : 'Run'}</button>`; w.querySelector('button').onclick = () => { if (k === 'coachRun') { if (S.mode !== 'fly') setMode('fly'); togglePanel('lookPanel'); coach.start(true) } else runBench() }; bodyEl.appendChild(w); return }
      if (type === 'tr') { const l = document.createElement('label'); l.className = 'tg'; l.innerHTML = `<span>${label}</span><input type="checkbox" id="lk-${k}" ${LOOK[k] ? 'checked' : ''}>`; l.querySelector('input').onchange = e => { LOOK[k] = e.target.checked ? 1 : 0; saveLook(); prevSoon() }; bodyEl.appendChild(l); return }   // shape switches: previewed now, applied on rebuild
      if (type === 't') { const l = document.createElement('label'); l.className = 'tg'; l.innerHTML = `<span>${label}</span><input type="checkbox" id="lk-${k}" ${LOOK[k] ? 'checked' : ''}>`; l.querySelector('input').onchange = e => { LOOK[k] = e.target.checked ? 1 : 0; saveLook(); applyLook() }; bodyEl.appendChild(l); return }
      const w = document.createElement('div'); w.className = 'lk'; const dec = step < .01 ? 3 : step < 1 ? 2 : 0;
      w.innerHTML = `<label for="lk-${k}">${label}</label><output id="lko-${k}">${(+LOOK[k]).toFixed(dec)}</output><input type="range" id="lk-${k}" min="${min}" max="${max}" step="${step}" value="${LOOK[k]}">`;
      w.querySelector('input').oninput = e => { LOOK[k] = +e.target.value; w.querySelector('output').textContent = LOOK[k].toFixed(dec); saveLook(); applyLook(); if (title === 'Galaxy') prevSoon() }; bodyEl.appendChild(w)
    });
    body.appendChild(sec)
  });
  if ($('lookFind').value) findLook();
}
// search: show only the rows whose label (or section name) holds every word typed, with their sections open
function findLook() {
  const words = $('lookFind').value.toLowerCase().split(/\s+/).filter(Boolean), body = $('lookBody'); body.classList.toggle('finding', words.length > 0);
  body.querySelectorAll('.lsec').forEach(sec => {
    const title = sec.querySelector('.lhd').textContent.toLowerCase(); let any = false;
    sec.querySelectorAll('.lbody>*').forEach(r => { const t = title + ' ' + r.textContent.toLowerCase(), hit = words.every(w => t.includes(w)); r.classList.toggle('miss', !hit); any = any || hit });
    sec.classList.toggle('found', any);
  });
}
$('lookFind').oninput = findLook; $('lookFind').onkeydown = e => { e.stopPropagation(); if (e.key === 'Escape') { e.target.value = ''; findLook() } };   // typing here never flies the ship
$('presets').innerHTML = Object.keys(PRESETS).map(n => `<button data-p="${n}">${n}</button>`).join('') + '<button data-p="spawn" title="The ship back to where it starts">Spawn</button><button data-p="splash" title="Back to the splash screen, to record the opening">Splash</button>';
$('presets').onclick = e => { const p = e.target.dataset && e.target.dataset.p; if (!p) return; if (p === 'splash') { toSplash(); return } if (p === 'spawn') { toSpawn(); return } const onMap = LOOK === LOOK_MAP, own = LOOK.mapOwnLook; const pr = PRESETS[p], rows = {}; if (pr === null) LOOK_DEF.forEach(([, rs]) => rs.forEach(r => rows[r[0]] = r[3])); LOOK = pr === null ? { ...rows, mapOwnLook: own } : { ...LOOK_DEFAULTS, ...Object.fromEntries(Object.entries(pr || {}).filter(([k]) => k in LOOK_DEFAULTS)), mapOwnLook: own }; if (onMap) LOOK_MAP = LOOK; else LOOK_FLY = LOOK; saveLook(); renderLook(); applyLook() };
// import: paste what Copy settings gave (from here, another browser or the chat) and it becomes the look, exactly
{ const ta = $('lookIn'), msg = m => { $('lookMsg').textContent = m; clearTimeout(msg.t); msg.t = setTimeout(() => $('lookMsg').textContent = '', 4000) };
  const apply = () => {
    const txt = ta.value, i = txt.indexOf('{'), j = txt.lastIndexOf('}'); if (i < 0 || j < i) { msg('No settings found in that text'); return }
    let o; try { o = JSON.parse(txt.slice(i, j + 1)) } catch (e) { msg('That text could not be read'); return }
    const keep = Object.entries(o).filter(([k, v]) => k in LOOK_DEFAULTS && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean')); if (!keep.length) { msg('No settings found in that text'); return }
    const onMap = LOOK === LOOK_MAP, own = LOOK.mapOwnLook, shapeWas = JSON.stringify(SHAPE); LOOK = { ...LOOK_DEFAULTS, ...Object.fromEntries(keep), mapOwnLook: own }; if (onMap) LOOK_MAP = LOOK; else LOOK_FLY = LOOK;
    saveLook(); renderLook(); applyLook(); ta.value = ''; ta.hidden = true;
    const shape = Object.keys(o).some(k => /^(arm|spiral|bulge|starBand|starAlong)/.test(k)); msg(`Imported ${keep.length} settings` + (shape && shapeWas ? '. Galaxy shape: press Rebuild' : ''));
  };
  $('lookImp').onclick = () => { ta.hidden = !ta.hidden; if (!ta.hidden) { ta.focus(); if (navigator.clipboard && navigator.clipboard.readText) navigator.clipboard.readText().then(t => { if (t && t.includes('{') && !ta.value) { ta.value = t; apply() } }).catch(() => { }) } };   // straight from the clipboard when the browser allows; otherwise paste into the box
  ta.addEventListener('paste', () => setTimeout(apply, 0)); ta.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) apply() });
}
$('lookCopy').onclick = () => {
  const diff = {}; Object.keys(LOOK).forEach(k => { if (k[0] !== '_' && LOOK[k] !== LOOK_DEFAULTS[k]) diff[k] = LOOK[k] });
  const txt = 'FWA FOREVER look settings: ' + JSON.stringify(diff), ta = $('lookOut'); ta.value = txt; ta.hidden = true;   // straight to the clipboard; the text box only shows if the browser refuses
  const done = m => { $('lookMsg').textContent = m; clearTimeout(done.t); done.t = setTimeout(() => $('lookMsg').textContent = '', 2600) };
  const fallback = () => { ta.hidden = false; ta.focus(); ta.select(); done('Selected. Press Cmd/Ctrl+C') };
  try { navigator.clipboard.writeText(txt).then(() => done('Copied. Paste it in the chat'), fallback) } catch (e) { fallback() }
};
