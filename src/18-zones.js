/* ───────────────────────── map zones: a year, then a month ─────────────────────────
   On the map, the stretch of spiral under the pointer lights up softly: a year. Click it and the camera frames it; now
   each month inside lights up as you point at it (as they do anywhere once you're zoomed in close), and a click frames it. While a zone
   is open only its winners get day labels. Esc (or a click on empty sky) closes it. */
const mapZone = (() => {
  const Z = { on: false, t0: 0, t1: 0, lvl: 1, hov: null };
  if (!SPIRAL) { Z.update = () => { }; Z.click = () => false; Z.clear = () => { }; return Z }
  // the spiral sampled every few days: where it is (galaxy frame) and when
  const tS = Date.parse(D[0].date + 'T00:00:00Z'), tE = Date.parse(D[N - 1].date + 'T00:00:00Z'), SN = 2400, sx = new Float32Array(SN), sz = new Float32Array(SN), st = new Float64Array(SN);
  const at = t => { const r = GAL_R0 + yearU(t) * GAL_LEN, th = armPhase(r); return [Math.cos(th) * r, Math.sin(th) * r] };
  for (let k = 0; k < SN; k++) { const t = tS + (tE - tS) * k / (SN - 1), p = at(t); sx[k] = p[0]; sz[k] = p[1]; st[k] = t }
  const span = (t, lvl) => { const d = new Date(t), y = d.getUTCFullYear(), m = d.getUTCMonth(); return lvl === 12 ? [Date.UTC(y, m, 1), Date.UTC(y, m + 1, 1), y] : [Date.UTC(y, 0, 1), Date.UTC(y + 1, 0, 1), y] };   // a year, or (lvl 12) a month
  // a soft glowing ribbon along the spiral between two dates
  const ribbon = () => {
    const n = 220, g = new THREE.BufferGeometry(), pos = new Float32Array((n + 1) * 2 * 3), aS = new Float32Array((n + 1) * 2), aV = new Float32Array((n + 1) * 2), idx = [];
    for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setIndex(idx);
    for (let k = 0; k <= n; k++) { aS[k * 2] = aS[k * 2 + 1] = k / n; aV[k * 2] = -1; aV[k * 2 + 1] = 1 }
    const u = { k: uniform(0) }, m = skyMat({ side: THREE.DoubleSide, depthTest: false }), vS = varying(attribute('aS', 'float')), vV = varying(attribute('aV', 'float'));
    m.fragmentNode = Fn(() => { const a = u.k.mul(exp(vV.mul(vV).mul(-3.2)).sub(.04).max(0)).mul(smoothstep(0, .08, vS)).mul(smoothstep(1, .92, vS)).mul(bhMask()); return vec4(vec3(.85, .9, 1).mul(a), a) })();   // soft across, soft at both ends
    const mesh = new THREE.Mesh(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 2); mesh.visible = false; mesh.u = u; mesh.key = '';
    mesh.set = (t0, t1, W) => {   // rebuild along [t0, t1)
      const key = t0 + ',' + t1 + ',' + W; if (mesh.key === key) return; mesh.key = key;
      for (let k = 0; k <= n; k++) { const t = t0 + (t1 - t0) * k / n, p = at(t), q = at(t + 864e5 * 3), tx = q[0] - p[0], tz = q[1] - p[1], l = Math.hypot(tx, tz) || 1, hw = Math.min(W / 2, Math.hypot(p[0], p[1]) * .35), nx = -tz / l * hw, nz = tx / l * hw, o = k * 6;
        pos[o] = p[0] - nx; pos[o + 1] = 0; pos[o + 2] = p[1] - nz; pos[o + 3] = p[0] + nx; pos[o + 4] = 0; pos[o + 5] = p[1] + nz }
      g.attributes.position.needsUpdate = true; g.computeBoundingSphere();
    };
    return mesh;
  };
  const hovR = ribbon(), actR = ribbon(), _l = new V3(), _sp = new V3(), tipEl = document.createElement('div'); tipEl.id = 'zoneTip'; tipEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(tipEl); let tipKey = ''; Z.rib = [hovR, actR];
  Z.update = dt => {
    const L = LOOK, map = S.mode === 'map' && booted, W = L.mapZoneW ?? 70000; Z.hov = null;
    if (map && !tween && mouse.in && hovPick < 0 && !rmenu.open && (L.mapZones ?? 1)) {
      const g = groundAt(mouse.x, mouse.y);
      if (g) { toLocal(g, _l); let best = -1, bd = Infinity; for (let k = 0; k < SN; k++) { const dx = sx[k] - _l.x, dz = sz[k] - _l.z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k } }
        const onScr = best >= 0 && (_sp.set(sx[best], 0, sz[best]).applyQuaternion(GQ).add(GC).project(camera), _sp.z < 1 && Math.hypot((_sp.x * .5 + .5) * innerWidth - mouse.x, (-_sp.y * .5 + .5) * innerHeight - mouse.y) < (L.mapZonePx ?? 40));   // only the stretch of timeline right under the pointer, on screen
        if (onScr && Math.sqrt(bd) < (L.mapZoneHit ?? 22000)) { const t = st[best], lvl = 12, [t0, t1, y0] = span(t, lvl);
          if (!(Z.on && t0 === Z.t0 && t1 === Z.t1)) Z.hov = { t0: Math.max(t0, tS), t1: Math.min(t1, tE + 864e5), lvl, y0 } } }
    }
    if (Z.hov) hovR.set(Z.hov.t0, Z.hov.t1, W);
    { const h = Z.hov, key = h ? h.t0 + '' : ''; if (key !== tipKey) { tipKey = key; if (h) { const d = new Date(h.t0); tipEl.textContent = h.lvl === 12 ? `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}` : String(d.getUTCFullYear()) } tipEl.classList.toggle('on', !!h) } if (h) tipEl.style.transform = `translate(${(mouse.x + 14).toFixed(0)}px,${(mouse.y + 12).toFixed(0)}px)` }   // a small tag by the pointer: which year (or month) lights up
    hovR.u.k.value += ((Z.hov ? .085 * (L.mapZoneGlow ?? 1) : 0) - hovR.u.k.value) * Math.min(1, dt * (Z.hov ? 16 : 2.2)); /* in quickly, out slowly */ hovR.visible = map && hovR.u.k.value > .002;
    actR.u.k.value += ((Z.on && map ? .045 * (L.mapZoneGlow ?? 1) : 0) - actR.u.k.value) * Math.min(1, dt * 6); actR.visible = map && actR.u.k.value > .002;
    if (!map && Z.on) Z.clear();
  };
  Z.open = h => {   // frame the zone: as large as the screen allows, from the angle you're looking at it
    Object.assign(Z, { on: true, t0: h.t0, t1: h.t1, lvl: h.lvl }); actR.set(h.t0, h.t1, LOOK.mapZoneW ?? 70000);
    const pts = []; for (let k = 0; k < SN; k++) if (st[k] >= h.t0 && st[k] < h.t1) pts.push(new V3(sx[k], 0, sz[k]).applyQuaternion(GQ).add(GC)); if (!pts.length) return;
    const q = orbitPose().q, ax = new V3(1, 0, 0).applyQuaternion(q), ay = new V3(0, 1, 0).applyQuaternion(q), c = new V3(); pts.forEach(p => c.add(p)); c.divideScalar(pts.length);
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity; pts.forEach(p => { const d = p.clone().sub(c), x = d.dot(ax), y = d.dot(ay); x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y) });
    c.addScaledVector(ax, (x0 + x1) / 2).addScaledVector(ay, (y0 + y1) / 2);   // centred on the zone as you'll see it
    const pad = (LOOK.mapZoneW ?? 70000) * .5, th = Math.tan(LOOK.fov * Math.PI / 360), hx = (x1 - x0) / 2 + pad, hy = (y1 - y0) / 2 + pad;
    orbit.target.copy(c); orbit.dist = Math.max(MAP_MIN, Math.max(hy / th, hx / (th * camera.aspect)) * 1.08); const o = orbitPose(); tweenCam(o.p, o.q, 1.3);
  };
  Z.clear = () => { Z.on = false };
  Z.click = () => { if (Z.hov) { Z.open(Z.hov); return true } if (Z.on) { Z.clear(); return true } return false };   // true: the click was the zone's
  return Z;
})();
