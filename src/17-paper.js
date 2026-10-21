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
function paperUpdate(rdt) {   // the look itself: white page, grey dots, black lines; everything soft and glowing steps back
  const L = LOOK; paperK += ((L.paper ? 1 : 0) - paperK) * Math.min(1, rdt * 3); if (paperK < .001 && !paperUpdate.was) return; paperUpdate.was = paperK > .001; const pk = paperK;
  PU.inv.value = Math.max(L.invert ? 1 : 0, pk); PU.vig.value = L.vignette * (1 - pk); PU.bgK.value *= 1 - pk; bloomPass.strength.value *= 1 - pk; coreGlow.material.opacity *= 1 - pk; coreFlare.material.opacity *= 1 - pk; bh.mesh.visible = bh.shadow.visible = pk < .5;
  stars.u.glow.value = L.starGlow * (1 - .9 * pk); stars.u.flare.value = pk > .5 ? 0 : L.flares ? 1 : 0; stars.u.spikes.value = L.starSpikes * (1 - pk); stars.u.dim.value = 1 - (1 - (L.paperDot ?? .62)) * pk; if (pk > .5) stars.u.ring.value = 0;
  document.body.classList.toggle('paper', pk > .5); document.body.classList.toggle('inverted', !!L.invert || pk > .5);
}
