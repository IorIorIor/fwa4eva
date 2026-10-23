/* ───────────────────────── the ship reflects where it is ─────────────────────────
   A small panorama of the sky as seen from the ship, redrawn every half second and used as the arrow's environment map:
   the galaxy's disk (where a ray from the ship would hit it), the warm glow of the core, and the nearest winner as a
   bright spot in its own colour. So the arrow picks up the core when you face it and a band of blue when you skim the disk. */
const shipEnv = (() => {
  const W = 128, H = 64, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d'), img = g.createImageData(W, H), px = img.data;
  const tex = new THREE.CanvasTexture(c); tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
  const mats = []; avatar.traverse(o => { const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : []; ms.forEach(m => { if (m.isMeshStandardMaterial && !mats.includes(m)) mats.push(m) }) });
  const base = mats.map(m => ({ m, r: m.roughness, mt: m.metalness }));
  const d = new V3(), lp = new V3(), lc = new V3(), sc = new C3(); let t = 1, on = '', fxNow = -1, fxK = 0;
  const Rg = GAL_R0 + GAL_LEN;
  // fake reflected stars: fixed sparks scattered over the panorama, brighter the deeper in the star clouds you are
  const SPARK = Array.from({ length: 260 }, (_, k) => { const r = mulberry32(31 + k); return [(r() * W) | 0, (r() * H) | 0, Math.pow(r(), 3) * 2.5 + .4, r()] });
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
    // how deep in the galaxy you are: in the disk, on an arm, toward the core. More stars glint, and the haze tints it blue
    const disk = Math.exp(-(h * h) / (2 * Math.pow(4000 + 14000 * Math.exp(-rr0 / 100000), 2))) * (rr0 < Rg * 1.1 ? 1 : 0), arm = Math.exp(-Math.pow(armDist(lp.x, lp.z), 2) * 5), dens = Math.min(1.5, disk * (.35 + .65 * arm) + Math.exp(-dc / (bulgeR * .5)));
    const sk = dens * (LOOK.shipStars ?? 1), hz = disk * (LOOK.shipHazeBlue ?? 1);
    for (let i = 0; i < W * H * 4; i += 4) { px[i] = Math.min(255, px[i] + hz * 8); px[i + 1] = Math.min(255, px[i + 1] + hz * 16); px[i + 2] = Math.min(255, px[i + 2] + hz * 46) }
    if (sk > .01) for (const [x, y, b, t] of SPARK) { if (t > sk) continue; const i = (y * W + x) * 4, v = b * 255 * Math.min(1, sk); px[i] = Math.min(255, px[i] + v * .85); px[i + 1] = Math.min(255, px[i + 1] + v * .92); px[i + 2] = Math.min(255, px[i + 2] + v) }
    g.putImageData(img, 0, 0); tex.needsUpdate = true;
  }
  // the ship layer's lights come from where the light really is: a key light from the galaxy's core, the disk's glow from
  // below (or above), a faint cool rim from behind; no fixed sun overhead
  const LT = { hemi: shipScene.children.find(o => o.isHemisphereLight), key: shipScene.children.find(o => o.isDirectionalLight), rim: shipScene.children.filter(o => o.isDirectionalLight)[1] }, _lp = new V3(), _ld = new V3();
  function lights() {
    const L = LOOK; if (!(L.shipLightReal ?? 1)) { LT.hemi.position.set(0, 1, 0); LT.hemi.color.set(0xb8b0ff); LT.hemi.groundColor.set(0x1a1430); LT.rim.position.copy(rimLight.position); LT.key.position.copy(sunLight.position); LT.key.intensity = sunLight.intensity; LT.rim.intensity = rimLight.intensity; LT.hemi.intensity = 1.1 * Math.PI; return }
    toLocal(player.pos, _lp); const dc = _lp.length(), toCore = _ld.copy(GC).sub(player.pos).normalize(), h = _lp.y, rr = Math.hypot(_lp.x, _lp.z), Rg = GAL_R0 + GAL_LEN;
    LT.key.position.copy(toCore); LT.key.intensity = Math.PI * (L.shipCoreLight ?? 1.2) * (.35 + .65 * Math.exp(-dc / (Rg * .6)));   // the core: brighter the nearer you are
    const disk = Math.exp(-Math.abs(h) / (Rg * .25)) * (rr < Rg * 1.2 ? 1 : .3); LT.hemi.position.set(0, h >= 0 ? 1 : -1, 0).applyQuaternion(GQ);   // the disk lights the side of the ship that faces it
    LT.hemi.color.setRGB(.05, .05, .08); LT.hemi.groundColor.setRGB(.45, .55, 1); LT.hemi.intensity = Math.PI * (.35 + 1.1 * disk) * (L.shipDiskLight ?? 1);
    LT.rim.position.copy(toCore).negate(); LT.rim.intensity = Math.PI * .35;
  }
  return {
    update(dt) {
      if (LT.hemi && LT.key && LT.rim) lights();
      // wh: the white paint glows a little of its own, so it reads white, not grey, whatever the light
      const k = LOOK.shipReflect ?? 1, gl = LOOK.shipGloss ?? .5, sc = LOOK.shipScuff ?? 1, wh = LOOK.shipWhite ?? .75, key = k + ',' + gl + ',' + sc + ',' + wh; SHIP_MAT.white.emissiveIntensity = wh; if (key !== on) { on = key; base.forEach(({ m, r, mt }) => { m.envMap = k > 0 ? tex : null; m.envMapIntensity = k * 2.5; m.roughness = r * (1 - .6 * Math.min(1, k * gl)); m.metalness = Math.max(mt, .35 * Math.min(1, k)); if (m.isMeshPhysicalMaterial) { m.clearcoat = Math.min(1, k); m.clearcoatRoughness = .02 + .3 * (1 - gl) } if (m.bumpMap) m.bumpScale = .35 * sc; m.needsUpdate = true }); fxNow = -1 }   // the lacquer (clearcoat) mirrors the panorama sharply; gloss tightens it
      { const tgt = intro.active ? (intro.ph === 1 || intro.ph === 0 ? 0 : intro.ph === 3 ? (intro.reflGo ? 1 : 0) : intro.portal ? 1 : sstep(intro.t, .8, .99)) : 1;   // in the opening: none, then they fade in over the last two seconds of the move in (and finish fading after, never a jump)
        fxK = tgt < fxK ? tgt : Math.min(tgt, fxK + dt / 2); const fx = Math.round(fxK * fxK * (3 - 2 * fxK) * 200) / 200; if (fx !== fxNow) { fxNow = fx; base.forEach(({ m, r }) => { m.envMapIntensity = k * 2.5 * fx; m.roughness = r * (1 - .6 * Math.min(1, k * gl) * fx) + .5 * (1 - fx); if (m.isMeshPhysicalMaterial) m.clearcoat = Math.max(.001, Math.min(1, k) * fx); if (m.bumpMap) m.bumpScale = .35 * sc * fx }) } }   // in the opening the arrow is tiny and its glints, lacquer and scuffs only shimmer: they come in once it's close
      if (k > 0 && (t -= dt) <= 0) { t = .5; draw() }
    },
  };
})();
