/* ───────────────────────── THE COLLECTION ─────────────────────────
   Only the map, on paper: every winner is a box with its picture on its face, standing on the spiral in date order (today at
   the core, 2000 at the rim), evenly spaced along the line, each one facing out of the spiral and turned a little inward.
   Click one and the camera comes round in front of its face; it pops out toward you and its neighbours part to give it
   room. Click the paper (or Esc) to go back. Everything is a Look row in the Collection section. Boxes are drawn on the
   ship's own layer (its own renderer, not colour-inverted like the paper page) as one instanced mesh; their pictures come
   from one atlas (the real screenshots when the archive is there, a small drawn stand-in for each winner otherwise). */
const coll = (() => {
  if (!COLL) return { on: false, cam() { }, render() { }, click() { return false }, key() { return false }, start() { } };
  const L0 = () => LOOK;
  // the spiral, core (today) to rim (2000), in the galaxy's own frame, measured along its length
  const K = 24000, SX = new Float64Array(K + 1), SZ = new Float64Array(K + 1), SL = new Float64Array(K + 1);
  { const tNow = Math.min(T_B, Date.now()), tau0 = 1 - tFrac(tNow); let px = 0, pz = 0;
    for (let k = 0; k <= K; k++) { const tau = tau0 + (1 - tau0) * k / K, r = GAL_R0 + spRho(tau) * GAL_LEN, th = SPIRAL ? armPhase(r) : 0, x = Math.cos(th) * r, z = Math.sin(th) * r; SX[k] = x; SZ[k] = z; SL[k] = k ? SL[k - 1] + Math.hypot(x - px, z - pz) : 0; px = x; pz = z } }
  const LEN = SL[K];
  function along(s, out) {   // point and tangent (outward) at length s along the spiral
    s = Math.max(0, Math.min(LEN, s)); let lo = 0, hi = K; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (SL[m] < s) lo = m; else hi = m }
    const f = (s - SL[lo]) / Math.max(1e-9, SL[hi] - SL[lo]); out.x = SX[lo] + (SX[hi] - SX[lo]) * f; out.z = SZ[lo] + (SZ[hi] - SZ[lo]) * f; const tx = SX[hi] - SX[lo], tz = SZ[hi] - SZ[lo], tl = Math.hypot(tx, tz) || 1; out.tx = tx / tl; out.tz = tz / tl; return out;
  }
  // the pictures: one atlas, a cell per screenshot (or per winner, for the drawn stand-ins)
  const real = !!REMOTE, keyOf = d => real && d.shot ? d.shot : 'w' + d.i, keys = new Map(); D.forEach(d => { const k = keyOf(d); if (!keys.has(k)) keys.set(k, { i: keys.size, d }) });
  const CW = real ? 128 : 48, CH = real ? 80 : 30, COLS = Math.floor(4096 / CW), ROWS = Math.ceil(keys.size / COLS);
  const atlasCv = document.createElement('canvas'); atlasCv.width = COLS * CW; atlasCv.height = ROWS * CH; const ag = atlasCv.getContext('2d'); ag.fillStyle = '#d8d8d8'; ag.fillRect(0, 0, atlasCv.width, atlasCv.height);
  const atlas = new THREE.CanvasTexture(atlasCv); atlas.colorSpace = THREE.SRGBColorSpace; atlas.anisotropy = 4; let atlasDirty = 0, atlasT = 0;
  const cellXY = c => [(c % COLS) * CW, Math.floor(c / COLS) * CH];
  function mini(d, x, y) {   // a small stand-in for a winner without a screenshot: its category's colour, a browser bar, its title
    const acc = CAT_COL[CATS.indexOf(d.category)] || '#888', r = mulberry32(d.i * 7919 + 13), gr = ag.createLinearGradient(x, y, x + CW, y + CH); gr.addColorStop(0, '#16161c'); gr.addColorStop(1, '#2a2a34');
    ag.fillStyle = gr; ag.fillRect(x, y, CW, CH); ag.fillStyle = acc; ag.globalAlpha = .55 + r() * .3; ag.fillRect(x + CW * (.08 + r() * .3), y + CH * .3, CW * (.25 + r() * .4), CH * (.25 + r() * .3)); ag.globalAlpha = 1;
    ag.fillStyle = '#3a3a46'; ag.fillRect(x, y, CW, CH * .14); ag.fillStyle = '#fff'; ag.font = `bold ${Math.round(CH * .2)}px Arial,sans-serif`; ag.textBaseline = 'bottom'; ag.fillText(d.title.toUpperCase().slice(0, 14), x + CW * .06, y + CH * .94, CW * .9);
  }
  let loaded = 0;
  if (real) {   // the real screenshots, a few at a time, cropped to the cell
    const q = [...keys.entries()]; let at = 0;
    const next = () => { if (at >= q.length) return; const [, e] = q[at++], img = new Image(); img.crossOrigin = 'anonymous'; img.decoding = 'async';
      img.onload = () => { const [x, y] = cellXY(e.i), k = Math.max(CW / img.width, CH / img.height), w = img.width * k, h = img.height * k; ag.save(); ag.beginPath(); ag.rect(x, y, CW, CH); ag.clip(); ag.drawImage(img, x + (CW - w) / 2, y + (CH - h) / 2, w, h); ag.restore(); atlasDirty = 1; loaded++; next() };
      img.onerror = () => { const [x, y] = cellXY(e.i); mini(e.d, x, y); atlasDirty = 1; next() }; img.src = shotURL(e.d) };
    for (let k = 0; k < 8; k++) next();
  } else { let at = 0; const q = [...keys.values()]; const step = () => { const t = performance.now(); while (at < q.length && performance.now() - t < 12) { const e = q[at++], [x, y] = cellXY(e.i); mini(e.d, x, y) } atlasDirty = 1; if (at < q.length) setTimeout(step, 0) }; step() }

  // the boxes: one instanced mesh in the galaxy's frame (so the numbers stay small), the picture on the front (+z) face
  const scn = new THREE.Scene(), cam = new THREE.PerspectiveCamera(), root = new THREE.Group(); root.position.copy(GC); root.quaternion.copy(GQ); scn.add(root);
  const geo = new THREE.BoxGeometry(1, 1, 1), aCell = new Float32Array(N); D.forEach((d, i) => aCell[i] = keys.get(keyOf(d)).i); geo.setAttribute('aCell', new THREE.InstancedBufferAttribute(aCell, 1));
  const uTop = uniform(.25);
  const mSide = new THREE.MeshBasicNodeMaterial(); mSide.colorNode = vec3(1).sub(uTop.mul(float(.8).sub(normalLocal.y.mul(.25)).add(normalLocal.z.abs().mul(-.15)))).clamp(0, 1);   // the sides in grey (the top a little lighter, the back lighter still)
  const mFace = new THREE.MeshBasicNodeMaterial(); mFace.colorNode = Fn(() => {
    const c = attribute('aCell', 'float'), col = mod(c, COLS), row = floor(c.div(COLS)), v = uv();
    return texture(atlas, vec2(col.add(v.x).div(COLS), float(1).sub(row.add(1).sub(v.y).mul(CH / atlasCv.height)))).rgb;
  })();
  const mats = [mSide, mSide, mSide, mSide, mFace, mSide];
  const mesh = new THREE.InstancedMesh(geo, mats, N); mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); mesh.frustumCulled = false; root.add(mesh);
  // the picked one's own picture, full size, laid over its face
  const HI = 2, his = Array.from({ length: HI * 2 + 1 }, () => { const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ toneMapped: false })); m.matrixAutoUpdate = false; m.visible = false; m.j = -1; m.renderOrder = 1; root.add(m); return m });   // (and its nearest neighbours')
  // placing them
  const st = { sel: -1, k: 0, kT: 0, prev: -1, pk: 0, key: '' }, _a = {}, _m = new THREE.Matrix4(), _X = new V3(), _Y = new V3(), _F = new V3(), _p = new V3(), _s = new V3(), _q = new Q4();
  const dims = () => { const L = L0(), step = LEN * Math.max(.05, L.colSpace ?? 1) / N, w = step * (L.colW ?? .9); return { step, w, h: w * (L.colH ?? .625), d: w * (L.colD ?? .06) } };
  function pose(i, sh, pop, outM, outF, outC) {   // box i's matrix (sh: slide along the spiral, × width; pop 0…1)
    const L = L0(), D_ = dims(), s = (N - 1 - i + .5) * D_.step + sh * D_.w; along(s, _a);
    let nx = _a.tz, nz = -_a.tx; if (nx * _a.x + nz * _a.z < 0) { nx = -nx; nz = -nz }   // out of the spiral (away from the core)
    const th = ((L.colTurn ?? 30) + (L.colFace ?? 0)) * Math.PI / 180, c = Math.cos(th), sn = Math.sin(th);   // turned toward the core end of the line
    _F.set(nx * c - _a.tx * sn, 0, nz * c - _a.tz * sn).normalize(); _Y.set(0, 1, 0); _X.crossVectors(_Y, _F).normalize();
    const t = (L.colTilt ?? 0) * Math.PI / 180, ct = Math.cos(t), stt = Math.sin(t); const F2 = _F.clone().multiplyScalar(ct).addScaledVector(_Y, stt), Y2 = _Y.clone().multiplyScalar(ct).addScaledVector(_F, -stt); _F.copy(F2); _Y.copy(Y2);
    _p.set(_a.x, 0, _a.z).addScaledVector(new V3(0, 1, 0), (L.colLift ?? .5) * D_.h).addScaledVector(_F, (L.colPop ?? .5) * D_.h * pop).addScaledVector(Y2, (L.colPopUp ?? 0) * D_.h * pop);
    outM.makeBasis(_X, _Y, _F).scale(_s.set(D_.w, D_.h, D_.d)).setPosition(_p); if (outF) outF.copy(_F); if (outC) outC.copy(_p); return outM;
  }
  const shift = (i, sel, k) => { if (sel < 0 || !k) return 0; const L = L0(), n = Math.max(1, Math.round(L.colPartN ?? 6)), d = i - sel; if (!d || Math.abs(d) > n) return 0; return Math.sign(-d) * (L.colPart ?? .6) * (1 - (Math.abs(d) - 1) / n) * k };   // (i grows toward the rim, s toward it too: older ones further out)
  function placeAll() { for (let i = 0; i < N; i++) mesh.setMatrixAt(i, pose(i, 0, 0, _m)); mesh.instanceMatrix.needsUpdate = true }
  function placeNear(sel, k) { if (sel < 0) return; const n = Math.max(1, Math.round(L0().colPartN ?? 6)) + 1; for (let i = Math.max(0, sel - n); i <= Math.min(N - 1, sel + n); i++) mesh.setMatrixAt(i, pose(i, shift(i, sel, k), i === sel ? k : 0, _m)); mesh.instanceMatrix.needsUpdate = true }
  const lookKey = () => { const L = L0(); return ['colSpace', 'colW', 'colH', 'colD', 'colLift', 'colFace', 'colTurn', 'colTilt', 'colPop', 'colPopUp', 'colPart', 'colPartN'].map(k => L[k]).join(',') };

  // the tag under the pointer, and the picked one's caption
  const tip = document.createElement('div'); tip.id = 'colTip'; tip.hidden = true; document.body.appendChild(tip);
  const cap = document.createElement('div'); cap.id = 'colCap'; cap.className = 'hud'; cap.hidden = true; document.body.appendChild(cap);
  const fmtDate = d => new Date(d.t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
  const rc = new THREE.Raycaster(), _nd = new THREE.Vector2();
  function hit(x, y) { _nd.set(x / innerWidth * 2 - 1, -(y / innerHeight) * 2 + 1); rc.setFromCamera(_nd, camera); root.updateMatrixWorld(true); const h = rc.intersectObject(mesh, false); return h.length ? h[0].instanceId : -1 }
  let hovT = 0, hov = -1;
  addEventListener('pointermove', e => { if (e.pointerType !== 'mouse' || S.mode !== 'map') return; const now = performance.now(); if (now - hovT < 60) return; hovT = now; if (down && dragged) { tip.hidden = true; return }
    hov = e.target === canvas || e.target === shipCanvas ? hit(e.clientX, e.clientY) : -1; tip.hidden = hov < 0 || hov === st.sel; if (hov >= 0) { const d = D[hov]; tip.innerHTML = `<b>${esc(d.title)}</b><span>${fmtDate(d)}</span>`; tip.style.transform = `translate(${e.clientX + 14}px,${e.clientY + 16}px)` } canvas.style.cursor = hov >= 0 ? 'pointer' : '' });
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  function pick(i) {
    if (i === st.sel) return; if (st.sel >= 0 && i >= 0) { st.prev = st.sel; st.pk = st.k } st.sel = i; tip.hidden = true;
    if (i >= 0) { const d = D[i]; cap.innerHTML = `<b>${esc(d.title)}</b><span>${esc(d.agency)} · ${fmtDate(d)}${d.award && d.award !== 'SOTD' ? ' · ' + d.award : ''}</span><i>← → the next ones · Esc back</i>`; cap.hidden = false; his.forEach((m, k) => { const j = i + k - HI; m.j = j >= 0 && j < N ? j : -1; if (m.j >= 0) { m.material.map = shot(D[m.j]); m.material.needsUpdate = true } }) }
    else cap.hidden = true;
  }
  // the focused view: straight in front of the picked box's face
  const fp = new V3(), fq = new Q4(), fc = new V3(), fF = new V3(), mp = new V3(), mq = new Q4(), _w = new V3(), _up = new V3(), _lm = new THREE.Matrix4();
  function focusPose(i, k) {
    const L = L0(), D_ = dims(); pose(i, 0, k, _m, fF, fc); _up.set(0, 1, 0).applyMatrix4(_lm.extractRotation(_m)).normalize();
    const side = (L.colCamSide ?? 0) * Math.PI / 180, upA = (L.colCamUp ?? 0) * Math.PI / 180, dir = fF.clone().applyAxisAngle(_up, side); dir.applyAxisAngle(_w.crossVectors(_up, dir).normalize(), -upA);
    const fov = L.colFov ?? 30, hf = Math.atan(Math.tan(fov * Math.PI / 360) * camera.aspect), dist = D_.w / 2 / (Math.tan(hf) * Math.max(.1, L.colFill ?? .6)) + D_.d / 2;
    fp.copy(fc).addScaledVector(dir, dist); fc.applyQuaternion(GQ).add(GC); fp.applyQuaternion(GQ).add(GC); dir.applyQuaternion(GQ); _up.applyQuaternion(GQ);
    fq.setFromRotationMatrix(_lm.lookAt(fp, fc, _up)); return dist;
  }
  return {
    on: true, scn, mesh, dims, get sel() { return st.sel }, get k() { return st.k }, LEN, get loaded() { return loaded },
    start() {   // straight onto the map, on paper; nothing else on it but the spiral line and the boxes
      LOOK_FLY.paper = LOOK_MAP.paper = LOOK.paper = 1; paperK = 1; LOOK_FLY.paperPics = LOOK_MAP.paperPics = 0; document.body.classList.add('coll');
      [stars.mesh, youMark, timeRings.mesh, ruler, youRing, monthTicks, dayTicks, mapZone.mesh].forEach(o => o && o.traverse(x => x.layers.set(31)));
      setMode('map'); if (TEST_EARLY && tween) tween.dur = .05; $('panel').classList.remove('open'); placeAll(); st.key = lookKey();
    },
    pick, hit, focusPose, his,
    click(x, y) { const i = hit(x, y); pick(i === st.sel ? -1 : i); return true },   // a box: in front of it (again: back out); the paper: back out
    key(k) { if (S.mode !== 'map') return false; if (k === 'escape' && st.sel >= 0) { pick(-1); return true } if (st.sel >= 0 && (k === 'arrowleft' || k === 'arrowright')) { pick(Math.max(0, Math.min(N - 1, st.sel + (k === 'arrowright' ? 1 : -1)))); return true } return false },
    // after the map camera has been placed: the boxes move, and the camera comes round to the picked one
    cam(dt) {
      if (S.mode !== 'map') return; const L = L0(); uTop.value = L.colTop ?? .25; if (spiralLine) spiralLine.u.a.value = L.colLine ?? .8;
      const key = lookKey(); if (key !== st.key) { st.key = key; placeAll() }
      if ((st.scan = (st.scan ?? 0) - dt) <= 0 && spiralLine) { st.scan = 1; for (const c of spiralLine.parent.children) if (c !== spiralLine && !c.isCamera && c.layers.mask !== (1 << 31)) c.traverse(x => x.layers.set(31)) }   // (on the page: the spiral line and nothing else, whatever paper keeps)
      const T = Math.max(.2, L.colTime ?? 1.2), tgt = st.sel >= 0 ? 1 : 0;
      if (st.prev >= 0) { st.pk = Math.max(0, st.pk - dt / (T * .6)); placeNear(st.prev, ease(st.pk)); if (!st.pk) { placeNear(st.prev, 0); st.prev = -1 } }   // the one picked before settles back
      if (st.sel >= 0 || st.k > 0) {
        const was = st.k; st.k = Math.max(0, Math.min(1, st.k + (tgt ? 1 : -1) * dt / T)); const e = ease(st.k), i = st.sel >= 0 ? st.sel : st.last;
        if (i >= 0) { st.last = i; placeNear(i, e); focusPose(i, e);
          mp.copy(camera.position); mq.copy(camera.quaternion); lerpLogPolar(camera.position, mp, fp, fc, e); camera.quaternion.copy(mq).slerp(fq, e); camera.fov += ((L.colFov ?? 30) - camera.fov) * e; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
          for (const m of his) { m.visible = st.sel === i && e > .02 && m.j >= 0; if (m.visible) { pose(m.j, shift(m.j, i, e), m.j === i ? e : 0, _m); m.matrix.copy(_m).multiply(_lm.makeTranslation(0, 0, .5 + .002 / Math.max(.01, L.colD ?? .06))); m.matrixWorldNeedsUpdate = true } } }
        if (!st.k && was) { his.forEach(m => m.visible = false); if (st.last >= 0) placeNear(st.last, 0) }
      }
      if (atlasDirty && performance.now() - atlasT > 500) { atlasDirty = 0; atlasT = performance.now(); atlas.needsUpdate = true }
    },
    render() {   // on the ship's layer, after the ship: the main camera's view, with a depth range fit for what's in front of it
      if (S.mode !== 'map' && !(tween && tween.mode)) return; cam.position.copy(camera.position); cam.quaternion.copy(camera.quaternion); cam.fov = camera.fov; cam.aspect = camera.aspect;
      if (camera.view && camera.view.enabled) cam.setViewOffset(camera.view.fullWidth, camera.view.fullHeight, camera.view.offsetX, camera.view.offsetY, camera.view.width, camera.view.height); else cam.clearViewOffset();
      const dRef = st.k > 0 ? camera.position.distanceTo(fc) : camera.position.distanceTo(orbit.target); cam.near = Math.max(.5, dRef * .01); cam.far = dRef * 40 + LEN; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
      const ac = shipRenderer.autoClear; shipRenderer.autoClear = false; shipRenderer.clearDepth(); shipRenderer.render(scn, cam); shipRenderer.autoClear = ac;
    },
  };
})();
