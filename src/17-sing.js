/* ───────────────────────── the singularity ─────────────────────────
   The newest winners spiral in closest to the core; the black hole is where the FWA as it was ends. With the switch on you
   can fly into it: the music slows, sinks and falls silent as you near the horizon, and once you're in the black sphere there
   is no way back out. The galaxy fades to black and stays gone: you fly on through an endless black, your ship shedding
   coloured sparks, and far ahead, waiting, one button: Learn more. Fly into it. (H, or the lab, takes you home again.) */
let singQ = 0;   // 0 … 1: how near the horizon you are (the music listens to this)
const singR = () => BH.sh * (LOOK.singAt ?? 1);   // where the singularity takes you: the black sphere's edge (just outside it you can still get away)
const VOID_URL = 'https://thefwa.com/';   // where Learn more goes (to be the FWA blog post)
const sing = (() => {
  // the button: a dark glass slab with a white rim and LEARN MORE, a soft glow round it, on the ship's layer (the galaxy is gone)
  const btn = new THREE.Group(); btn.visible = false; shipScene.add(btn);
  const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, 1024, 256); g.fillStyle = 'rgba(14,10,26,.72)'; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.roundRect(8, 8, 1008, 240, 18); g.fill(); g.stroke();
    g.fillStyle = '#fff'; g.font = '500 92px "FF Good Pro Cond", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '18px'; g.fillText('LEARN MORE', 521, 134); tex.needsUpdate = true };
  draw(); document.fonts && document.fonts.ready.then(draw);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); btn.add(face);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), new THREE.MeshBasicMaterial({ map: softDot, color: new C3(.7, .55, 1), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); glow.position.z = -.01; btn.add(glow);
  face.renderOrder = glow.renderOrder = 2;
  const S_ = { t: -1, w: 0, inside: false, hit: 0 }, lp = new V3(), prevZ = { v: NaN };
  function enter() {   // in: from here on, only the black
    buzz([30, 80, 30, 80, 160]); S_.inside = true; S_.t = 0; S_.hit = 0; auto = null; lockI = -1; warp = null;
    const dir = new V3(0, 0, -1).applyQuaternion(rig.q);   // dead ahead of where you're looking
    btn.position.copy(player.pos).addScaledVector(dir, LOOK.voidBtnDist ?? 20000); btn.quaternion.copy(rig.q); btn.scale.setScalar((LOOK.voidBtnSize ?? 1) * 700); btn.visible = true; prevZ.v = NaN;   // straight ahead, facing you
  }
  function pressed() {   // flown through: it goes, and the page opens (holding W is a key press, so the browser allows it; else a link to click)
    S_.hit = 1; buzz([20, 40, 120]); engineLook.burst = 2; igniteK = 1;
    let w = null; try { w = window.open(VOID_URL, '_blank', 'noopener') } catch (e) { }
    if (!w) { const a = document.createElement('a'); a.id = 'voidLink'; a.href = VOID_URL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Learn more →'; document.body.appendChild(a); setTimeout(() => a.remove(), 12000) }
  }
  return {
    get busy() { return S_.inside }, get inside() { return S_.inside }, get far() { return false }, get w() { return S_.w }, get hit() { return S_.hit > 0 },
    reset() { S_.inside = false; S_.t = -1; S_.w = 0; btn.visible = false },   // home again (H, or the lab going round again)
    update(rdt) {
      const L = LOOK, on = !!(L.singularity ?? 1) && S.mode === 'fly' && booted, d = player.pos.distanceTo(GC);
      singQ = S_.inside ? 1 : on ? 1 - sstep(d, singR() * 1.05, BH.sh * (L.singHear ?? 14)) : Math.max(0, singQ - rdt);
      if (on && !S_.inside && d < singR()) enter();
      if (!S_.inside) { S_.w = 0; return }
      S_.t += rdt; S_.w = Math.min(1, Math.pow(S_.t / Math.max(.1, L.singIn ?? 3), 1.5));   // the galaxy fades to black, for good
      btn.scale.setScalar((L.voidBtnSize ?? 1) * 700); const a = sstep(S_.t, (L.singIn ?? 3) * .6, (L.singIn ?? 3) + 1.5) * (1 - S_.hit);   // the button comes up out of the black once it's all gone
      face.material.opacity = a; glow.material.opacity = .55 * a * (.8 + .2 * Math.sin(S_.t * 2.2)); btn.visible = a > .002 || !S_.hit;
      if (S_.hit) { S_.hit = Math.min(1, S_.hit + rdt * .5) }
      lp.copy(player.pos).sub(btn.position).applyQuaternion(_q.copy(btn.quaternion).invert()).divideScalar(btn.scale.x);   // you, in the button's own frame
      if (!S_.hit && a > .5 && Number.isFinite(prevZ.v) && prevZ.v * lp.z <= 0 && Math.abs(lp.x) < 2.3 && Math.abs(lp.y) < .65) pressed();
      prevZ.v = lp.z;
    },
  };
})();
