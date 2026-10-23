/* ───────────────────────── paper ─────────────────────────
   A second way to see it, mostly for the map: a white page with the winners as small dark grey dots and the timeline in
   black. The glows, gas, dust and the black hole step out of the way, and instead of rings each winner close enough is
   its own screenshot, floating straight on, like a print pinned in space. Switch: paper. */
let paperK = 0;
const paperPics = (() => {
  const K = 48, pool = [], cand = [], v = new V3();
  for (let k = 0; k < K; k++) {
    const sh = new THREE.Sprite(new THREE.SpriteMaterial({ color: 0x000000, transparent: true, opacity: 0, depthTest: false, depthWrite: false })), sp = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, opacity: 0, depthTest: false, depthWrite: false }));
    sh.visible = sp.visible = false; sh.frustumCulled = sp.frustumCulled = false; shipScene.add(sh, sp); pool.push({ sh, sp, i: -1 });
  }
  return {
    update() {
      const L = LOOK, on = paperK > .02 && (L.paperPics ?? 1) > 0; let n = 0;
      if (on) {
        _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); const e = _vp.elements, H = innerHeight, th = Math.tan(camera.fov * Math.PI / 360), minPx = L.paperPicPx ?? 14; cand.length = 0;
        for (let i = 0; i < N; i++) { if (TA[i] < 1) continue; const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2], w = e[3] * px + e[7] * py + e[11] * pz + e[15]; if (w < 1) continue;
          const x = (e[0] * px + e[4] * py + e[8] * pz + e[12]) / w, y = (e[1] * px + e[5] * py + e[9] * pz + e[13]) / w; if (Math.abs(x) > 1.25 || Math.abs(y) > 1.25) continue;
          const r = starR(i) * (L.ringSize ?? 1.6) * (L.paperPicSize ?? 1) * H / (2 * th * w); if (r >= minPx * .7) cand.push([w, i, r]) }
        cand.sort((a, b) => a[0] - b[0]); n = Math.min(K, cand.length);
        for (let k = 0; k < n; k++) {
          const [w, i, r] = cand[k], p = pool[k], R = starR(i) * (L.ringSize ?? 1.6) * (L.paperPicSize ?? 1), a = paperK * Math.min(1, (r - minPx * .7) / (minPx * .5)), tex = shot(D[i]);
          if (p.sp.material.map !== tex) { p.sp.material.map = tex; p.sp.material.needsUpdate = true }
          starPos(i, v); p.sp.position.copy(v); p.sh.position.copy(v); p.sp.scale.set(R * 2, R * 2 / 1.6, 1); p.sh.scale.set(R * 2.06, R * 2.06 / 1.6 + R * .06, 1);
          p.sp.material.opacity = a; p.sh.material.opacity = a * .14; p.sp.renderOrder = p.sh.renderOrder = 200 + (n - k) * 2; p.sp.renderOrder++; p.sp.visible = p.sh.visible = a > .01; p.i = i;
        }
      }
      for (let k = n; k < K; k++) { const p = pool[k]; if (p.sp.visible) { p.sp.visible = p.sh.visible = false; p.i = -1 } }
    },
  };
})();
// on paper only the stars and the timeline are drawn: everything else in the scene moves off the camera's layer (so nothing else is
// rendered, and per-frame code switching things on can't bring it back), and back again when paper goes
const paperKeep = () => new Set([stars.mesh, youMark, timeRings.mesh, ruler, youRing, spiralLine, monthTicks, dayTicks, mapZone.mesh].filter(Boolean));
let paperHid = new Set(), paperScan = 0;
function paperLayers(on, rdt) {
  if (!on) { if (paperHid.size) { paperHid.forEach(o => o.traverse(x => x.layers.set(0))); paperHid = new Set() } return }
  if ((paperScan -= rdt) > 0) return; paperScan = .5; const keep = paperKeep();   // (twice a second: anything added since goes too)
  for (const c of scene.children) if (!keep.has(c) && !paperHid.has(c) && !c.isCamera) { c.traverse(x => x.layers.set(31)); paperHid.add(c) }
}
function paperUpdate(rdt) {   // the look itself: white page, grey dots, the timeline in black ink; nothing else drawn at all
  const L = LOOK; paperK += ((L.paper ? 1 : 0) - paperK) * Math.min(1, rdt * 3); paperLayers(paperK > .5, rdt); if (paperK < .001 && !paperUpdate.was) return; paperUpdate.was = paperK > .001; const pk = paperK, on = pk > .5;
  PU.inv.value = Math.max(L.invert ? 1 : 0, pk); PU.vig.value = L.vignette * (1 - pk); PU.bgK.value *= 1 - pk; bloomPass.strength.value *= 1 - pk; PU.pInk.value = .55 * (1 - (L.paperDot ?? .62));
  stars.u.paper.value = on ? 1 : 0; stars.u.glow.value = L.starGlow * (1 - .9 * pk); stars.u.flare.value = on ? 0 : L.flares ? 1 : 0; stars.u.spikes.value = L.starSpikes * (1 - pk); if (on) { stars.u.ring.value = 0; stars.u.hi.value = 0 }
  if (on) {   // the whole timeline, always: every ring and every divider, whatever the zoom
    const tu = timeRings.u; tu.era.value = .5; tu.yr.value = .3; tu.mo.value = .2; tu.moR.value = 1e12; timeRings.mesh.visible = !SPIRAL;
    if (spiralLine) { spiralLine.visible = true; spiralLine.u.a.value = .8 }
    if (monthTicks) { monthTicks.visible = true; monthTicks.u.a.value = .6; monthTicks.u.ya.value = .9 }
  }
  document.body.classList.toggle('paper', on); document.body.classList.toggle('inverted', !!L.invert);   // (the interface keeps its own colours)
}
