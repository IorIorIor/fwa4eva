/* ───────────────────────── map zones: five years, then one ─────────────────────────
   On the map, the stretch of spiral under the pointer lights up softly: a five-year span from far out. Click it and the
   camera frames it; now each single year inside lights up as you point at it, and a click frames that year. While a zone
   is open only its winners get day labels. Esc (or a click on empty sky) closes it. */
const mapZone = (() => {
  const Z = { on: false, t0: 0, t1: 0, lvl: 5, hov: null };
  if (!SPIRAL) { Z.update = () => { }; Z.click = () => false; Z.clear = () => { }; return Z }
  // the spiral sampled every few days: where it is (galaxy frame) and when
  const tS = Date.parse(D[0].date + 'T00:00:00Z'), tE = Date.parse(D[N - 1].date + 'T00:00:00Z'), SN = 2400, sx = new Float32Array(SN), sz = new Float32Array(SN), st = new Float64Array(SN);
  const at = t => { const r = GAL_R0 + yearU(t) * GAL_LEN, th = armPhase(r); return [Math.cos(th) * r, Math.sin(th) * r] };
  for (let k = 0; k < SN; k++) { const t = tS + (tE - tS) * k / (SN - 1), p = at(t); sx[k] = p[0]; sz[k] = p[1]; st[k] = t }
  const span = (t, lvl) => { const y = new Date(t).getUTCFullYear(), y0 = lvl === 5 ? 2000 + Math.floor((y - 2000) / 5) * 5 : y; return [Date.UTC(y0, 0, 1), Date.UTC(y0 + lvl, 0, 1), y0] };
  // a soft glowing ribbon along the spiral between two dates
  const ribbon = () => {
    const n = 220, g = new THREE.BufferGeometry(), pos = new Float32Array((n + 1) * 2 * 3), aS = new Float32Array((n + 1) * 2), aV = new Float32Array((n + 1) * 2), idx = [];
    for (let k = 0; k < n; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); g.setAttribute('aS', new THREE.BufferAttribute(aS, 1)); g.setAttribute('aV', new THREE.BufferAttribute(aV, 1)); g.setIndex(idx);
    for (let k = 0; k <= n; k++) { aS[k * 2] = aS[k * 2 + 1] = k / n; aV[k * 2] = -1; aV[k * 2 + 1] = 1 }
    const u = { k: uniform(0) }, m = skyMat({ side: THREE.DoubleSide, depthTest: false }), vS = varying(attribute('aS', 'float')), vV = varying(attribute('aV', 'float'));
    m.fragmentNode = Fn(() => { const a = u.k.mul(float(1).sub(vV.mul(vV))).mul(smoothstep(0, .05, vS)).mul(smoothstep(1, .95, vS)); return vec4(vec3(.85, .9, 1).mul(a), a) })();
    const mesh = new THREE.Mesh(g, m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); layer(mesh, scene, 2); mesh.visible = false; mesh.u = u; mesh.key = '';
    mesh.set = (t0, t1, W) => {   // rebuild along [t0, t1)
      const key = t0 + ',' + t1 + ',' + W; if (mesh.key === key) return; mesh.key = key;
      for (let k = 0; k <= n; k++) { const t = t0 + (t1 - t0) * k / n, p = at(t), q = at(t + 864e5 * 3), tx = q[0] - p[0], tz = q[1] - p[1], l = Math.hypot(tx, tz) || 1, nx = -tz / l * W / 2, nz = tx / l * W / 2, o = k * 6;
        pos[o] = p[0] - nx; pos[o + 1] = 0; pos[o + 2] = p[1] - nz; pos[o + 3] = p[0] + nx; pos[o + 4] = 0; pos[o + 5] = p[1] + nz }
      g.attributes.position.needsUpdate = true; g.computeBoundingSphere();
    };
    return mesh;
  };
  const hovR = ribbon(), actR = ribbon(), _l = new V3();
  Z.update = dt => {
    const L = LOOK, map = S.mode === 'map' && booted, W = L.mapZoneW ?? 70000; Z.hov = null;
    if (map && !tween && mouse.in && hovPick < 0 && !rmenu.open && (L.mapZones ?? 1)) {
      const g = groundAt(mouse.x, mouse.y);
      if (g) { toLocal(g, _l); let best = -1, bd = Infinity; for (let k = 0; k < SN; k++) { const dx = sx[k] - _l.x, dz = sz[k] - _l.z, d = dx * dx + dz * dz; if (d < bd) { bd = d; best = k } }
        if (best >= 0 && Math.sqrt(bd) < W * .75) { const t = st[best], inOpen = Z.on && t >= Z.t0 && t < Z.t1, lvl = Z.on && (Z.lvl === 1 || inOpen) && span(t, 5)[0] === span(Z.t0, 5)[0] ? 1 : 5, [t0, t1, y0] = span(t, lvl);
          if (!(Z.on && t0 === Z.t0 && t1 === Z.t1)) Z.hov = { t0: Math.max(t0, tS), t1: Math.min(t1, tE + 864e5), lvl, y0 } } }
    }
    if (Z.hov) hovR.set(Z.hov.t0, Z.hov.t1, W);
    hovR.u.k.value += ((Z.hov ? .16 * (L.mapZoneGlow ?? 1) : 0) - hovR.u.k.value) * Math.min(1, dt * 8); hovR.visible = map && hovR.u.k.value > .002;
    actR.u.k.value += ((Z.on && map ? .08 * (L.mapZoneGlow ?? 1) : 0) - actR.u.k.value) * Math.min(1, dt * 6); actR.visible = map && actR.u.k.value > .002;
    if (!map && Z.on) Z.clear();
  };
  Z.open = h => {   // frame the zone: its middle as the target, far enough back to hold all of it
    Object.assign(Z, { on: true, t0: h.t0, t1: h.t1, lvl: h.lvl }); actR.set(h.t0, h.t1, LOOK.mapZoneW ?? 70000);
    let cx = 0, cz = 0, n = 0; for (let k = 0; k < SN; k++) if (st[k] >= h.t0 && st[k] < h.t1) { cx += sx[k]; cz += sz[k]; n++ } if (!n) return; cx /= n; cz /= n;
    let R = 0; for (let k = 0; k < SN; k++) if (st[k] >= h.t0 && st[k] < h.t1) R = Math.max(R, Math.hypot(sx[k] - cx, sz[k] - cz));
    orbit.target.set(cx, 0, cz).applyQuaternion(GQ).add(GC); orbit.dist = Math.max(MAP_MIN, (R + (LOOK.mapZoneW ?? 70000) * .5) * 1.15 / Math.tan(LOOK.fov * Math.PI / 360)); const o = orbitPose(); tweenCam(o.p, o.q, 1.3);
  };
  Z.clear = () => { Z.on = false };
  Z.click = () => { if (Z.hov) { Z.open(Z.hov); return true } if (Z.on) { Z.clear(); return true } return false };   // true: the click was the zone's
  return Z;
})();
