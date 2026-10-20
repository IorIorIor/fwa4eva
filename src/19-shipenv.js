/* ───────────────────────── the ship reflects where it is ─────────────────────────
   A small panorama of the sky as seen from the ship, redrawn every half second and used as the arrow's environment map:
   the galaxy's disk (where a ray from the ship would hit it), the warm glow of the core, and the nearest winner as a
   bright spot in its own colour. So the arrow picks up the core when you face it and a band of blue when you skim the disk. */
const shipEnv = (() => {
  const W = 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), px = img.data;
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const mats = []; avatar.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach(m => { if (m.isMeshStandardMaterial && !mats.includes(m)) mats.push(m) }) });
  const base = mats.map(m => ({ m, r: m.roughness, mt: m.metalness }));
  const d = new V3(), lp = new V3(), lc = new V3(), sc = new C3(); let t = 1, on = -1;
  const Rg = GAL_R0 + GAL_LEN;
  function draw() {
    toLocal(player.pos, lp); const h = lp.y, rr0 = Math.hypot(lp.x, lp.z), dc = lp.length(), coreW = Math.atan2(bulgeR * .5, Math.max(dc, 1));
    lc.copy(lp).negate().normalize();   // toward the core, in the galaxy frame
    let sw = null; if (nearI >= 0) { const sp = starPos(nearI, new V3()), dd = sp.distanceTo(player.pos); sw = { dir: toLocal(sp, new V3()).sub(lp).normalize(), w: Math.max(.03, Math.atan2(starR(nearI) * 6, dd)), c: sc.setRGB(COL[nearI * 3], COL[nearI * 3 + 1], COL[nearI * 3 + 2]) } }
    for (let y = 0; y < H; y++) {
      const v = (y + .5) / H, phi = (v - .5) * Math.PI, cy = Math.sin(phi), cr = Math.cos(phi);
      for (let x = 0; x < W; x++) {
        const u = (x + .5) / W, th = (u - .5) * 2 * Math.PI;
        d.set(Math.cos(th) * cr, -cy, Math.sin(th) * cr).applyQuaternion(GQI);   // the texel's direction (three's equirect layout: top row is up), into the galaxy frame
        let r = .015, gC = .02, b = .05;   // a faint deep-blue sky
        if (d.y * h < 0) {   // heading toward the disk: where does it land, and how bright is the disk there
          const k = -h / d.y, hx = lp.x + d.x * k, hz = lp.z + d.z * k, rh = Math.hypot(hx, hz), prof = Math.exp(-rh / (Rg * .32)) * (rh < Rg * 1.15 ? 1 : 0) * Math.exp(-k / (Rg * 3));
          r += prof * .38; gC += prof * .42; b += prof * .85;
        } else if (Math.abs(h) < 4000 && rr0 < Rg * 1.1) { const s = Math.exp(-(d.y * d.y) / .004); r += s * .3; gC += s * .34; b += s * .7 }   // in the plane: the band all round
        const a = Math.acos(Math.max(-1, Math.min(1, d.dot(lc)))), core = Math.exp(-(a * a) / (coreW * coreW)) * 1.6 + Math.exp(-a / (coreW * 3 + .05)) * .35;
        r += core; gC += core * .88; b += core * .7;
        if (sw) { const as = Math.acos(Math.max(-1, Math.min(1, d.dot(sw.dir)))), s = Math.exp(-(as * as) / (sw.w * sw.w)) * 2.2; r += s * sw.c.r; gC += s * sw.c.g; b += s * sw.c.b }
        const i = (y * W + x) * 4; px[i] = Math.min(255, r * 255); px[i + 1] = Math.min(255, gC * 255); px[i + 2] = Math.min(255, b * 255); px[i + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0); tex.needsUpdate = true;
  }
  return {
    update(dt) {
      const k = LOOK.shipReflect ?? 1; if (k !== on) { on = k; base.forEach(({ m, r, mt }) => { m.envMap = k > 0 ? tex : null; m.envMapIntensity = k; m.roughness = r * (1 - .6 * Math.min(1, k * (LOOK.shipGloss ?? .5))); m.metalness = Math.max(mt, .35 * Math.min(1, k)); m.needsUpdate = true }) }
      if (k > 0 && (t -= dt) <= 0) { t = .5; draw() }
    },
  };
})();
