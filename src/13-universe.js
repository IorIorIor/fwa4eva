/* ───────────────────────── the universe: a galaxy for every year ─────────────────────────
   The galaxy you're in is the one built in full (haze, clouds, arcs, gas, its black hole, its timeline) and always sits at
   GC. The other 26 are its picture, taken from straight above once the sky is ready (only the background layers, graded
   like the frame) and laid on a disk where each one lies, with a soft glow at its core; their winners are the real stars.
   Fly out past a galaxy's rim and its detail fades into its picture; reach the next one and the world moves over so that
   one is at GC (the move is invisible: everything you can see moves with it). Out between them you fly much faster, and
   you slow down again as you arrive. */
const uni = (() => {
  const Rg = GAL_R0 + GAL_LEN, HALF = Rg * 1.12, UP = new V3(0, 1, 0).applyQuaternion(GQ);
  // the pictures: one shared (every galaxy as the shared look has it), 1024² with mips so far off it stays smooth and a lower
  // level gives it a soft glow up close; a galaxy with its own look gets its own (512²), taken while you're in it
  const mkRT = n => new THREE.RenderTarget(n, n, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
  const rt = mkRT(1024), rts = [], u = { soft: uniform(.5), br: uniform(1), has: uniform(0) };
  const mkMat = (r, f) => { const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });
    m.colorNode = Fn(() => {
      const c0 = texture(r.texture, uv()).rgb, c1 = texture(r.texture, uv()).level(3).rgb, c2 = texture(r.texture, uv()).level(5).rgb;
      const rr = length(uv().sub(.5)).mul(2), edge = smoothstep(1, .86, rr);   // (nothing past the picture's own edge)
      return c0.add(c1.mul(u.soft.mul(.6))).add(c2.mul(u.soft.mul(.5))).mul(u.br).mul(edge).mul(u.has).mul(f);
    })(); return m };
  const geo = new THREE.PlaneGeometry(HALF * 2, HALF * 2).rotateX(-Math.PI / 2);   // in the disk's plane: u along the disk's x, v toward its -z (as the picture is taken)
  const disks = Array.from({ length: UNI_N }, () => { const f = uniform(0), m = new THREE.Mesh(geo, mkMat(rt, f)); m.f = f; m.frustumCulled = false; farScene.add(m); return m });
  const glows = Array.from({ length: UNI_N }, () => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: new C3(1, .9, .78), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0, toneMapped: false })); s.frustumCulled = false; farScene.add(s); return s });
  const _qk = new Q4(), _p = new V3(), _c = new C3(), _v = new V3(), _w = new V3();
  let relayoutKey = null, galK = 1, igK = 1, cap = Infinity, took = 0, want = 1, wantT = 0, wantOwn = 0, wantOwnT = 0, outT = 0, nearK = UNI_N - 1, nearD = 0;
  const hasOwn = k => { const o = own[galKey(k)]; return !!o && Object.keys(o).length > 0 };

  // a picture, taken with the main camera turned to look straight down on the galaxy you're in from above (only the
  // background passes run; nothing of it reaches the screen). k < 0: the shared one; else galaxy k's own
  function take(k = -1) {
    let target = rt; if (k >= 0) { if (!rts[k]) rts[k] = mkRT(512); target = rts[k] }
    const L = LOOK, c = camera, keep = { p: c.position.clone(), q: c.quaternion.clone(), fov: c.fov, asp: c.aspect, near: c.near, far: c.far, gk: PU.galK.value, bg: PU.bgK.value, fk: U.farK.value, ed: PU.edge.value, vc: vol.u.cam.value.clone(), pc: puffVol.u.cam.value.clone(), vw: c.view && c.view.enabled ? { ...c.view } : null };
    c.clearViewOffset();
    const D = Rg * 2;   /* (a lens like the usual one: the screen-sized effects come out as they do in flight; the disk is flat, so seen square on it isn't distorted) */ c.position.copy(GC).addScaledVector(UP, D); c.up.set(0, 0, -1).applyQuaternion(GQ); c.lookAt(GC); c.up.set(0, 1, 0);
    c.fov = 2 * Math.atan(HALF / D) * 180 / Math.PI; c.aspect = 1; c.near = D * .2; c.far = D * 3; c.updateProjectionMatrix(); c.updateMatrixWorld();
    PU.galK.value = 1; PU.bgK.value = 1; PU.edge.value = 0;   /* (the far dimming stays: it's how the galaxy looks from out there) */ vol.u.cam.value.copy(c.position); vol.mesh.worldToLocal(vol.u.cam.value); puffVol.u.cam.value.copy(c.position); puffVol.mesh.worldToLocal(puffVol.u.cam.value);
    try { renderer.setRenderTarget(target); snapPipeline.render() } catch (e) { console.warn('far picture', e) } renderer.setRenderTarget(null);
    c.position.copy(keep.p); c.quaternion.copy(keep.q); c.fov = keep.fov; c.aspect = keep.asp; c.near = keep.near; c.far = keep.far; if (keep.vw) c.setViewOffset(keep.vw.fullWidth, keep.vw.fullHeight, keep.vw.offsetX, keep.vw.offsetY, keep.vw.width, keep.vw.height); c.updateProjectionMatrix(); c.updateMatrixWorld();
    PU.galK.value = keep.gk; PU.bgK.value = keep.bg; U.farK.value = keep.fk; PU.edge.value = keep.ed; vol.u.cam.value.copy(keep.vc); puffVol.u.cam.value.copy(keep.pc);
    if (k < 0) { u.has.value = 1; took++; want = 0 } else { if (!disks[k].own) { disks[k].own = true; disks[k].material = mkMat(target, disks[k].f) } wantOwn = 0 }
    if (TEST) console.log('far picture taken', k < 0 ? 'shared' : galName(k));
  }
  function withShared(fn) {   // the shared picture is taken with the galaxy you're in on the shared look (its own values lifted off a moment)
    if (!ownOn || !Object.keys(base).length) return fn(); const keep = {}; for (const k in base) { keep[k] = ownOn[k]; ownOn[k] = base[k] } applyLook();
    try { fn() } finally { for (const k in keep) ownOn[k] = keep[k]; applyLook() }
  }

  // everything that holds a place (or a heading) in the world moves and turns with it (the galaxy you've reached becomes the one at GC, turned to GQ)
  const _u = new V3(), _D = new Q4();
  function remap(oldK, oldRI) {
    const cO = UNI.c[oldK].clone(), D = _D.copy(UNI.R).multiply(oldRI);   // old world → universe → new world; directions and turns by D
    const mv = v => { if (v && v.isVector3) uniToWorld(_u.copy(v).sub(GC).applyQuaternion(oldRI).add(cO), v) }, md = v => { if (v && v.isVector3) v.applyQuaternion(D) }, mq = q => { if (q && q.isQuaternion) q.premultiply(D) };
    mv(player.pos); md(player.vel); mq(player.quat); mq(player.base); mq(rig.q); mq(rig.quat); mv(camera.position); mq(camera.quaternion); camera.updateMatrixWorld(); mv(avatar.position); mq(avatar.quaternion); mv(orbit.target);
    if (tween) { mv(tween.fp); mv(tween.tp); mq(tween.fq); mq(tween.tq); if (tween.c && tween.c.isVector3) mv(tween.c) }
    if (auto && auto.dest) mv(auto.dest); if (warp) { mv(warp.from); mv(warp.to); mv(warp.dest); mv(warp.prev) } if (camHold && camHold.from) mv(camHold.from); md(holdDir);
    for (const st of strands) for (const p of st.pts) mv(p.p);
    for (const [, v] of Net.peers) { mv(v.cur); mv(v.tgt); md(v.vel); mq(v.q); v.pts.forEach(p => mv(p.p)); if (v.g) { mv(v.g.position); mq(v.g.quaternion) } }
    flags.remap(mv, mq); nkAt.set(NaN, NaN, NaN); mv(HALO.pInfo.c);
  }
  function rebase(k) {
    if (k === UNI.k || k < 0 || k >= UNI_N) return;
    if (hasOwn(UNI.k) && (wantOwn || !disks[UNI.k].own) && u.has.value) take(UNI.k);   // (leaving a galaxy with its own look: its picture as you leave it)
    const oldK = UNI.k, oldRI = UNI.RI.clone(); UNI.k = k; uniFrame(); setGal(k); if (monthTicks) monthTicks.rebuild();
    remap(oldK, oldRI); uniPlaceStars(); stars.mesh.geometry.attributes.aP.needsUpdate = true;
    galK = 0; PU.galK.value = 0; outT = 0;   // the new galaxy's detail comes in from nothing
    refreshLabels(); applyFilter(); galLook(); if (TEST) console.log('rebase', galName(k));
  }

  // per-galaxy looks: a galaxy can keep its own values for the galaxy sections; the rest of the look is shared
  const OWN_SECS = ['Galaxy', 'Long exposure', 'Black hole', 'Dark lanes', 'Edge-on', 'Sprite nebulae', 'Volumetric nebulae', 'Space'];
  const OWN_KEYS = new Set(); LOOK_DEF.forEach(([t, rows]) => { if (OWN_SECS.includes(t)) rows.forEach(r => { if (r[2] === 's' || r[2] === 't') OWN_KEYS.add(r[0]) }) });
  const isOwn = k => OWN_KEYS.has(k) && !GAL_KEYS.includes(k);   // (the shape is built once, the same in every galaxy)
  const own = store.json('sotd-gal-looks', {}), base = {}; let ownOn = null;   // ownOn: the look this galaxy's own values sit in (base: the shared values they cover)
  function galLook() {   // the galaxy you're in: its own values on top (the shared ones put back first)
    if (ownOn) { for (const k in base) { ownOn[k] = base[k]; delete base[k] } ownOn = null }
    const mine = own[GYEAR]; if (mine && Object.keys(mine).length) { ownOn = LOOK_FLY; for (const k in mine) if (isOwn(k) && k in ownOn) { base[k] = ownOn[k]; ownOn[k] = mine[k] } }
    applyLook(); if ($('lookPanel').classList.contains('open')) renderLook();
  }
  function galSave(k, v, was) {   // a slider moved (before saving): with "this galaxy only" on, the value is this galaxy's own; otherwise it's everyone's
    if (!isOwn(k) || LOOK !== LOOK_FLY) { if (isOwn(k) && !ownOn) { want = 1; wantT = performance.now() + 1200 } return }
    if (LOOK.galOwn) { (own[GYEAR] = own[GYEAR] || {})[k] = v; if (!ownOn) ownOn = LOOK_FLY; if (!(k in base)) base[k] = was; wantOwn = 1; wantOwnT = performance.now() + 1200 }
    else { if (k in base) { base[k] = v; if (own[GYEAR]) delete own[GYEAR][k] } if (!ownOn || !Object.keys(base).length) { want = 1; wantT = performance.now() + 1200 } }   // (a shared change: the far pictures are taken again)
    store.set('sotd-gal-looks', JSON.stringify(own));
  }
  const shared = L => L === ownOn && Object.keys(base).length ? { ...L, ...base } : L;   // what gets saved as the shared look

  // year tags over the galaxies (when you're out between them) and their marks round the screen's edge
  const tags = document.createElement('div'); tags.id = 'galTags'; tags.className = 'hud'; tags.setAttribute('aria-hidden', 'true'); document.body.appendChild(tags);
  // one tag per galaxy (0…26) and per cluster (27…31): at home the clusters; in a cluster its galaxies (and the other clusters)
  const TAG = Array.from({ length: UNI_N + CL_N }, (_, k) => { const e = document.createElement('div'); e.className = 'g' + (k >= UNI_N ? ' cl' : '');
    e.innerHTML = `<i></i><span><em>${k < UNI_N ? galName(k) : clName(k - UNI_N)}</em><b></b><u>Hold to warp</u></span>`; e.hidden = true; tags.appendChild(e); return { e, d: e.querySelector('b'), on: false, dt: '' } });   // like a winner's tag: the year, and how far
  const fmtU = d => Math.round(d).toLocaleString('en'), clAt = (c, out = new V3()) => uniToWorld(UNI.cl[c], out), tagAt = (k, out) => k < UNI_N ? uniAt(k, out) : clAt(k - UNI_N, out);
  // where you are: in a cluster (near its middle, or at one of its galaxies), at a galaxy, or out at home
  const level = { cl: -1, gal: -1 };
  function findLevel(p) {
    let g = -1, gd = Infinity; for (let k = 0; k < UNI_N; k++) { const d = uniAt(k, _w).distanceTo(p); if (d < gd) { gd = d; g = k } } level.gal = gd < Rg * 1.6 ? g : -1;
    const cr = Math.max(2.5, LOOK.uniClusterR ?? 5) * Rg; let c = -1, cd = Infinity; for (let j = 0; j < CL_N; j++) { const d = clAt(j, _w).distanceTo(p); if (d < cd) { cd = d; c = j } }
    level.cl = level.gal >= 0 ? clOf(level.gal) : cd < cr * 1.9 ? c : -1;
  }
  function updateTags() {
    const L = LOOK, W = innerWidth, H = innerHeight;
    tags.hidden = !booted || intro.active || gplay.on || !(L.galTips ?? 1); if (tags.hidden) return; const cmp = !!(L.galCompass ?? 1), cx = W / 2, cy = H / 2;   // always there (not over the opening, nor in Play)
    const show = k => k < UNI_N ? clOf(k) === level.cl : k - UNI_N !== level.cl; TAG.forEach((t, k) => { if (!show(k) && !t.e.hidden) t.e.hidden = true });
    const ord = TAG.map((t, k) => [tagAt(k, _v).distanceToSquared(camera.position), k]).filter(o => show(o[1])).sort((a, b) => a[0] - b[0]), boxes = [];   // nearest first: where tags would land on each other, the nearer one keeps its place
    for (const [, k] of ord) {
      const t = TAG[k], c = tagAt(k, _v), d = c.distanceTo(camera.position); _w.copy(c).applyMatrix4(camera.matrixWorldInverse); let x, y, edge = false, a = 0;
      if (_w.z < 0) { _p.copy(c).project(camera); x = (_p.x * .5 + .5) * W; y = (-_p.y * .5 + .5) * H }
      if (_w.z >= 0 || x < 20 || x > W - 20 || y < 70 || y > H - 20) { if (!cmp) { t.e.hidden = true; continue } edge = true; a = _w.z < 0 ? Math.atan2(y - cy, x - cx) : Math.atan2(-_w.y, _w.x);
        const cs = Math.cos(a), sn = Math.sin(a), tx = cs > 0 ? (W - 22 - cx) / cs : cs < 0 ? (22 - cx) / cs : Infinity, ty = sn > 0 ? (H - 22 - cy) / sn : sn < 0 ? (100 - cy) / sn : Infinity, tt = Math.min(tx, ty); x = cx + cs * tt; y = cy + sn * tt }
      { const bw = 80, bh = 28, bx = x - bw / 2, by = y - bh / 2; if (boxes.some(b => Math.abs(b[0] - bx) < (b[2] + bw) / 2 && Math.abs(b[1] - by) < (b[3] + bh) / 2)) { t.e.hidden = true; continue } boxes.push([bx, by, bw, bh]) }
      const ds = fmtU(d); if (ds !== t.dt) { t.dt = ds; t.d.textContent = ds }
      t.e.hidden = false; t.e.classList.toggle('aim', gwarp.aim === k); t.e.style.setProperty('--hold', gwarp.aim === k ? gwarp.holdK.toFixed(3) : 0); t.e.classList.toggle('edge', edge); t.e.classList.toggle('back', edge && _w.z >= 0); t.e.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`;
      if (edge) { t.e.firstChild.style.transform = `rotate(${(a * 180 / Math.PI + 90).toFixed(1)}deg)`; const cs = Math.cos(a); t.e.lastChild.style.transform = `translate(${cs < -.3 ? -100 : cs > .3 ? 0 : -50}%,${Math.sin(a) > 0 ? -130 : 30}%)` } else t.e.lastChild.style.transform = 'translate(10px,-50%)';   // on screen: beside the galaxy's core, as a winner's tag sits beside its star
      t.e.style.zIndex = String(1000 - Math.round(Math.log10(1 + d) * 50));
    }
  }

  return {
    relayout() {   // a layout slider moved: the galaxies move (the one you're in stays where it is, round you)
      const L = LOOK, key = ['uniGap', 'uniTurn', 'uniRise', 'uniTilt', 'uniAz', 'uniLayout', 'uniSpread', 'uniJitter', 'uniWander', 'uniGroups', 'uniSeed', 'uniArcR', 'uniClusterR', 'uniTiltVar', 'uniSpinVar'].map(k => L[k]).join(); if (key === relayoutKey) return; const first = relayoutKey == null; relayoutKey = key; if (first) return;
      uniLayout(L); uniPlaceStars();   /* (the world is the galaxy you're in: it stays round you, the others move and turn) */ stars.mesh.geometry.attributes.aP.needsUpdate = true; nkAt.set(NaN, NaN, NaN);
    },
    get k() { return UNI.k }, level, clAt, tagAt, get galK() { return galK }, get ig() { return igK }, get cap() { return cap }, get out() { return outT > .35 }, get near() { return nearK }, get nearD() { return nearD },
    rebase, galLook, galSave, shared, take, R: Rg, own, OWN_KEYS, rt, markOwn() { wantOwn = 1; wantOwnT = performance.now() + 1200 },
    async dump(w = 256) {   // (tests: the far picture as an image)
      const px = await renderer.readRenderTargetPixelsAsync(rt, 0, 0, 1024, 1024), cv = document.createElement('canvas'); cv.width = cv.height = w; const g = cv.getContext('2d'), im = g.createImageData(w, w), f = 1024 / w, max = [0, 0, 0];
      for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) { const o = ((y * f | 0) * 1024 + (x * f | 0)) * 4, q = (y * w + x) * 4; for (let c = 0; c < 4; c++) { const v = px[o + c] > 1.5 ? px[o + c] : px[o + c] * 255; im.data[q + c] = c === 3 ? 255 : v; if (c < 3) max[c] = Math.max(max[c], px[o + c]) } }
      g.putImageData(im, 0, 0); return { url: cv.toDataURL(), max, type: px.constructor.name };
    },
    // before the flight: which galaxy you're nearest, intergalactic speed, the arrival brake, and moving the world over
    step(rdt) {
      const L = LOOK, p = S.mode === 'fly' ? player.pos : camera.position; let best = -1, bd = Infinity;
      for (let k = 0; k < UNI_N; k++) { const d = uniAt(k, _v).distanceTo(p); if (d < bd) { bd = d; best = k } } nearK = best; nearD = bd; findLevel(p);
      const from = Math.max(1, L.igFrom ?? 1.15) * Rg, igT = 1 + (Math.max(1, L.igSpeed ?? 12) - 1) * sstep(bd, from, from + Rg * .35);
      igK += (igT - igK) * Math.min(1, rdt * (igT > igK ? 1.5 : 6));
      // heading into a galaxy: at most the speed that reaches its edge in igBrake seconds (an easy exponential arrival)
      cap = Infinity; const v = player.vel, sp = v.length(), tau = Math.max(.05, L.igBrake ?? .5);
      if (sp > 1) for (let k = 0; k < UNI_N; k++) { uniAt(k, _v).sub(player.pos); const dc = _v.length(), a = _v.dot(v) / (dc * sp); if (a <= .05 || dc < from) continue; const c = (dc - from) / (tau * a); if (c < cap) cap = c }
      outT = bd > from * 1.02 ? Math.min(1, outT + rdt) : 0;
      // the world moves over once you're nearer another galaxy and well out of the one you were in
      const ok = S.mode === 'fly' && booted && !intro.active && !warp && !sing.busy && !(tween && tween.mode) && !gplay.on && galLab.viewing < 0 && !gwarp.on;
      if (ok && best !== UNI.k && GC.distanceTo(p) > Rg * Math.max(1.1, L.galDetailOut ?? 1.8)) rebase(best);
    },
    // after everything else, before the frame is drawn: the detail fades with distance, the far pictures take over
    frame(rdt) {
      const L = LOOK, dG = camera.position.distanceTo(GC), kIn = Math.max(1, L.galDetailIn ?? 1.3) * Rg, kOut = Math.max(kIn * 1.05, (L.galDetailOut ?? 1.8) * Rg);
      const tgt = gplay.on ? 1 : 1 - sstep(dG, kIn, kOut); galK += (tgt - galK) * Math.min(1, rdt * 2.5); if (Math.abs(tgt - galK) < .002) galK = tgt; PU.galK.value = galK;   // (in play the galaxy stays in full, however far out the view is)
      if (galK < .999) {   // the galaxy's own pieces in the main scene fade with it
        coreFlare.material.opacity *= galK; coreFlare.visible = coreFlare.visible && galK > .01; bh.shadow.visible = bh.shadow.visible && galK > .01;
        if (spiralLine) spiralLine.u.a.value *= galK; if (monthTicks) { monthTicks.u.a.value *= galK; monthTicks.u.ya.value *= galK } ['era', 'yr', 'mo'].forEach(k => { timeRings.u[k].value *= galK; ruler.u[k].value *= galK });
        youRing.material.opacity *= galK; SATS.forEach(s => { s.stars.u.op.value *= galK });
      }
      bh.mesh.visible = galK > .01;
      // the far pictures, and their glows
      u.soft.value = L.galFarSoft ?? .2; u.br.value = L.galFar ?? 1; const gg = L.galFarGlow ?? .5, vis = S.mode === 'fly' || S.mode === 'map'; PU.farOn.value = vis && u.has.value > 0 ? 1 : 0;
      for (let k = 0; k < UNI_N; k++) {
        const c = uniAt(k, _p), f = k === UNI.k ? 1 - galK : 1 - gplay.k, d = c.distanceTo(camera.position);
        const dk = disks[k]; dk.position.copy(c); uniQ(k, dk.quaternion); dk.f.value = f; dk.visible = f > .002;
        const g = glows[k]; g.position.copy(c); g.scale.setScalar(Math.max(Rg * .04, d * .05)); g.material.opacity = Math.min(1, gg) * f * (1 - sstep(d, Rg * 60, Rg * 140)) * (paperK > .5 ? 0 : 1); g.visible = g.material.opacity > .003; g.material.color.setRGB(1, .9, .78).multiplyScalar(Math.max(1, gg));
      }
      farCam.position.copy(camera.position); farCam.quaternion.copy(camera.quaternion); farCam.fov = camera.fov; farCam.aspect = camera.aspect; if (camera.view && camera.view.enabled) farCam.setViewOffset(camera.view.fullWidth, camera.view.fullHeight, camera.view.offsetX, camera.view.offsetY, camera.view.width, camera.view.height); else farCam.clearViewOffset(); farCam.updateProjectionMatrix(); farCam.updateMatrixWorld();
      // the picture: once the sky has been drawn a few times (everything compiled and loaded), and again when a galaxy's own look changes
      if (!NORENDER && (want && (took ? performance.now() > wantT : (intro.active ? intro.pf > 3 : booted)) )) withShared(() => take());
      else if (!NORENDER && took && wantOwn && performance.now() > wantOwnT && hasOwn(UNI.k) && galK > .99) take(UNI.k);   // (this galaxy's own look changed: its own picture again)
      updateTags();
    },
  };
})();
