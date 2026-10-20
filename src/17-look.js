/* ───────────────────────── look panel: settings → uniforms ───────────────────────── */
const mcol = (hex, m) => { const c = new C3(hex), l = c.r * .3 + c.g * .59 + c.b * .11; return c.lerp(new C3(.72 * l, .86 * l, 1.15 * l), m) };
function applyLook() {
  const L = LOOK;
  U.rad.value = ANDRO ? L.radCol : 0; U.farK.value = L.farDim; U.far0.value = L.farStart; U.far1.value = L.farStart * 6;
  U.rc1.value.setHSL(L.radHue1, L.radSat, .6); U.rc2.value.setHSL(L.radHue2, L.radSat * .85, .5); U.rc3.value.setHSL(L.radHue3, L.radSat, .5);
  PU.film.value = L.film ? 1 : 0; PU.vig.value = L.vignette; PU.grain.value = L.grain; PU.black.value = L.blackPt; PU.con.value = L.contrast; PU.sat.value = L.sat; PU.cool.value = L.cool;
  // sprite nebulae, lanes, category nebulae
  const NU = NEB_U; NU.neb.value = L.nebGlow; NU.cloud.value = L.nebCloud; NU.fil.value = L.nebFil; NU.soft.value = L.nebSoft; NU.contrast.value = L.nebContrast; NU.hot.value = L.nebHot; NU.sat.value = L.nebSat; NU.scale.value = L.nebSize;
  NU.hue.value = L.nebHue; NU.edge.value = L.nebEdge; NU.bright.value = L.nebBright; NU.alphaMax.value = L.nebAlphaMax; NU.sizeVar.value = L.nebSizeVar; NU.pulse.value = L.nebPulse; NU.radOn.value = L.nebRadial; NU.flatY.value = L.nebHeight; NU.nearK.value = L.nebNear; NU.drift.value = L.nebDrift; NU.mono.value = L.mono;
  const nebHome = L.nebScreen ? hazeScene : softScene; if (nebula.parent !== nebHome) nebHome.add(nebula);   // "screen" clouds join the soft-clipped haze
  nebula.visible = lanes.visible = !!L.nebula; nebula.geometry.instanceCount = Math.min(NEB_A.n + NEB_B.n, Math.round(640 * L.nebCount));
  { const U_ = LANE_U; U_.lane.value = L.lanes; U_.scale.value = L.laneSize; U_.flatY.value = L.laneHeight; U_.nearK.value = L.laneNear; U_.detail.value = L.laneDetail; U_.dscale.value = L.laneScale; U_.contrast.value = L.laneContrast; U_.thin.value = L.laneThin; U_.soft.value = L.laneSoft; U_.warm.value = L.laneWarm; U_.amax.value = L.laneMax } lanes.geometry.instanceCount = Math.min(LANE_A.n + LANE_B.n, Math.round(270 * L.laneCount));
  coreGlow.material.color.copy(new C3(1, 1, 1).lerp(new C3(.75, .85, 1), L.mono));
  vol.u.core.value.copy(mcol(NEB_PAL[0][0], L.mono)); vol.u.edge.value.copy(mcol(NEB_PAL[0][1], L.mono));
  // haze
  const H = haze.u; H.mono.value = L.mono; H.op.value = L.haze * L.hazeBright; H.h.value = L.hazeHeight; H.g.value = L.hazeGirth * L.armWidth; H.size.value = L.hazeSize; H.soft.value = L.hazeSoft; H.near.value = L.hazeNear; H.pal.value = L.hazePal;
  haze.mesh.geometry.instanceCount = Math.floor(HAZE.n * L.hazeDensity / 2); PU.hazeScreen.value = L.hazeSoftBlend ? 1 : 0;
  bgStars.u.op.value = L.bgStars;
  // winners
  // the black hole: its mass sets its size, live
  setBH(L.bhMass); U.bhClear.value = BH.sh * 1.5; vol.u.bh.value = BH.sh * 1.05 / VOL_S;
  bh.mesh.scale.setScalar(RP * BH.rs); bh.shadow.scale.setScalar(BH.sh * .985);
  { const b = bh.u; b.rin.value = 3; b.rout.value = Math.max(3.5, L.bhDiskOut); b.br.value = L.bhDisk * 8; b.hot.value = L.bhHot; b.spin.value = L.bhSpin; b.halo.value = L.bhHalo / .75; b.dop.value = L.bhDoppler; b.lens.value = L.bhLens; b.steps.value = Math.round(L.bhSteps) }
  const su = stars.u; su.sharp.value = L.starSharp; su.coreW.value = L.starCore; su.haloW.value = L.starHalo; su.fall.value = L.starFall; su.spikes.value = L.starSpikes; su.white.value = L.starWhite; su.twink.value = L.starTwinkle; su.size.value = L.starSize; su.glow.value = L.starGlow; su.flare.value = L.flares ? 1 : 0;
  constellation.u.glow.value = L.lineGlow;
  avatar.userData.nav.forEach(b => b.visible = !!L.nav); beamPivot.visible = !!L.search;
  $('cmp').style.display = L.compass ? '' : 'none'; $('hdg').style.display = L.heading ? '' : 'none'; $('gauge').style.visibility = L.gauge ? '' : 'hidden';
  if (!L.cards) $('arrive').classList.remove('show');
  rig.dist = L.camDist * SHIP_K;
  setPassScales(); if (L.maxDpr !== applyLook.dpr) { applyLook.dpr = L.maxDpr; setDpr(Math.min(L.maxDpr, devicePixelRatio || 1), true) }
  if (AC) { const t = AC.currentTime; if (musicGain) musicGain.gain.setTargetAtTime(.6 * L.music, t, .1); if (ambBus) ambBus.gain.setTargetAtTime(.33 * L.amb, t, .1); if (master) master.gain.setTargetAtTime(.2 * L.ting, t, .1) }
}

/* settings also live in the viewer's claude.ai account, so they survive reloads, new versions and other devices */
let lookDoc = null, lookT = 0;
const lookData = () => { const d = {}; Object.keys(LOOK).forEach(k => { if (k[0] !== '_') d[k] = LOOK[k] }); return d };
function saveLookNow() { store.set(LOOK_KEY, JSON.stringify(LOOK)); if (lookDoc) lookDoc.set({ look: lookData(), at: Date.now() }).catch(() => { }) }
function saveLook() { store.set(LOOK_KEY, JSON.stringify(LOOK)); if (lookDoc) { clearTimeout(lookT); lookT = setTimeout(() => lookDoc.set({ look: lookData(), at: Date.now() }).catch(() => { }), 900) } }
(async () => {
  try {
    if (!window.claude || !claude.use) return; const [db, user] = await Promise.all([claude.use('db'), claude.use('user')]); if (!db || !user) return;
    const id = await user.id(); if (!id) return; lookDoc = db.doc('data/users/' + id + '/look');
    const snap = await lookDoc.get(), d = snap.exists && snap.data();
    if (d && d.look && typeof d.look === 'object') {
      Object.keys(d.look).forEach(k => { if (k in LOOK_DEFAULTS && typeof d.look[k] === 'number') LOOK[k] = d.look[k] }); migrateLook(LOOK);
      if (hudFix || STYLE_FIRST || speedFix || relFix || camFix) saveLook(); store.set(LOOK_KEY, JSON.stringify(LOOK)); renderLook(); applyLook()
    } else saveLook();
  } catch (e) { }
})();

function renderLook() {
  const body = $('lookBody'); body.innerHTML = '';
  let openSecs = store.json('sotd-look-open', []); if (!Array.isArray(openSecs)) openSecs = [];
  LOOK_DEF.forEach(([title, rows]) => {
    const sec = document.createElement('div'); sec.className = 'lsec' + (openSecs.includes(title) ? ' open' : '');
    const hd = document.createElement('button'); hd.className = 'lhd'; hd.type = 'button'; hd.innerHTML = `<span>${title}</span><svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2 3.5 5 6.5 8 3.5"/></svg>`; hd.setAttribute('aria-expanded', sec.classList.contains('open'));
    const bodyEl = document.createElement('div'); bodyEl.className = 'lbody'; sec.append(hd, bodyEl);
    hd.onclick = () => { const o = sec.classList.toggle('open'); hd.setAttribute('aria-expanded', o); const i = openSecs.indexOf(title); if (o && i < 0) openSecs.push(title); if (!o && i >= 0) openSecs.splice(i, 1); store.set('sotd-look-open', JSON.stringify(openSecs)) };
    rows.forEach(([k, label, type, def, min, max, step]) => {
      if (type === 'b') { const w = document.createElement('div'); w.className = 'gsw'; w.innerHTML = `<span>${label}</span><button class="btn" type="button">Rebuild</button>`; w.querySelector('button').onclick = () => { saveLookNow(); setTimeout(() => location.reload(), 350) }; bodyEl.appendChild(w); return }
      if (type === 'c') {
        const w = document.createElement('div'); w.className = 'gsw'; w.innerHTML = `<span>${label}</span><div class="seg"><button data-s="generic" aria-pressed="${!ANDRO}">Generic</button><button data-s="andromeda" aria-pressed="${ANDRO}">Andromeda</button></div>`;
        w.onclick = e => { const st = e.target.dataset && e.target.dataset.s; if (!st || st === STYLE) return; store.set('sotd-galaxy', st); saveLookNow(); setTimeout(() => location.reload(), 350) }; bodyEl.appendChild(w); return
      }
      if (type === 'x') { const w = document.createElement('div'); w.className = 'gsw'; w.innerHTML = `<span>${label}</span><button class="btn" type="button">Run</button>`; w.querySelector('button').onclick = () => runBench(); bodyEl.appendChild(w); return }
      if (type === 'tr') { const l = document.createElement('label'); l.className = 'tg'; l.innerHTML = `<span>${label}</span><input type="checkbox" id="lk-${k}" ${LOOK[k] ? 'checked' : ''}>`; l.querySelector('input').onchange = e => { LOOK[k] = e.target.checked ? 1 : 0; saveLookNow(); setTimeout(() => location.reload(), 350) }; bodyEl.appendChild(l); return }   // switches that rebuild the galaxy
      if (type === 't') { const l = document.createElement('label'); l.className = 'tg'; l.innerHTML = `<span>${label}</span><input type="checkbox" id="lk-${k}" ${LOOK[k] ? 'checked' : ''}>`; l.querySelector('input').onchange = e => { LOOK[k] = e.target.checked ? 1 : 0; saveLook(); applyLook() }; bodyEl.appendChild(l); return }
      const w = document.createElement('div'); w.className = 'lk'; const dec = step < .01 ? 3 : step < 1 ? 2 : 0;
      w.innerHTML = `<label for="lk-${k}">${label}</label><output id="lko-${k}">${(+LOOK[k]).toFixed(dec)}</output><input type="range" id="lk-${k}" min="${min}" max="${max}" step="${step}" value="${LOOK[k]}">`;
      w.querySelector('input').oninput = e => { LOOK[k] = +e.target.value; w.querySelector('output').textContent = LOOK[k].toFixed(dec); saveLook(); applyLook() }; bodyEl.appendChild(w)
    });
    body.appendChild(sec)
  });
}
$('presets').innerHTML = Object.keys(PRESETS).map(n => `<button data-p="${n}">${n}</button>`).join('') + '<button data-p="reset">Reset</button>';
$('presets').onclick = e => { const p = e.target.dataset && e.target.dataset.p; if (!p) return; LOOK = { ...LOOK_DEFAULTS, ...(p === 'reset' ? {} : PRESETS[p]) }; saveLook(); renderLook(); applyLook() };
$('lookCopy').onclick = () => {
  const diff = {}; Object.keys(LOOK).forEach(k => { if (k[0] !== '_' && LOOK[k] !== LOOK_DEFAULTS[k]) diff[k] = LOOK[k] });
  const txt = 'FWA FOREVER look settings: ' + JSON.stringify(diff), ta = $('lookOut'); ta.value = txt; ta.hidden = false;
  const done = m => { $('lookMsg').textContent = m; clearTimeout(done.t); done.t = setTimeout(() => $('lookMsg').textContent = '', 2600) };
  const fallback = () => { ta.focus(); ta.select(); done('Selected. Press Cmd/Ctrl+C') };
  try { navigator.clipboard.writeText(txt).then(() => done('Copied. Paste it in the chat'), fallback) } catch (e) { fallback() }
};
