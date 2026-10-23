/* ───────────────────────── the singularity ─────────────────────────
   The newest winners spiral in closest to the core; the black hole is where the FWA as it was ends. With the switch on you
   can fly into it: the music slows, sinks and falls silent as you near the horizon, and the moment you touch the black
   sphere everything is gone: in a fifth of a second only black, your ship shedding coloured sparks, and ahead one button,
   Learn more, always turned so you can read it. Time slows as you close in on it; touch it and you stop dead, it shrinks to
   a white point with a click, and a second later the post opens and you're back, well outside the galaxy. (H, or the lab,
   takes you home too.) */
let singQ = 0;   // 0 … 1: how near the horizon you are (the music listens to this)
const singR = () => BH.sh * (LOOK.singAt ?? 1);   // where the black hole takes you: the black sphere's edge (just outside it you can still get away)
const VOID_URL = 'https://thefwa.com/news/who-will-win-the-last-ever-fwa-site-of-the-day';   // where Learn more goes
const sing = (() => {
  // the button: a dark glass slab with a white rim and LEARN MORE, a soft glow round it, on the ship's layer (the galaxy is gone)
  const btn = new THREE.Group(); btn.visible = false; shipScene.add(btn);
  const mk = white => { const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 256; const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
    const draw = () => { const g = cv.getContext('2d'); g.clearRect(0, 0, 1024, 256); g.fillStyle = white ? '#fff' : 'rgba(14,10,26,.72)'; g.strokeStyle = '#fff'; g.lineWidth = 8; g.beginPath(); g.roundRect(8, 8, 1008, 240, 18); g.fill(); g.stroke();
      if (!white) { g.fillStyle = '#fff'; g.font = '500 92px "FF Good Pro Cond", "Arial Narrow", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.letterSpacing = '18px'; g.fillText('LEARN MORE', 521, 134) } tex.needsUpdate = true };
    draw(); document.fonts && document.fonts.ready.then(draw); return tex };
  const texOn = mk(false), texHit = mk(true);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: texOn, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })); btn.add(face);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 3.4), new THREE.MeshBasicMaterial({ map: softDot, color: new C3(.7, .55, 1), transparent: true, opacity: .55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false })); glow.position.z = -.01; btn.add(glow);
  face.renderOrder = glow.renderOrder = 2;
  // st: 'off' | 'in' (in the black, the button ahead) | 'hit' (touched: still, the button shrinking to a white point, then the page and out)
  const S_ = { st: 'off', t: 0, w: 0, slow: 1, fp: new V3(), fq: new Q4() }, lp = new V3(), _bq = new Q4();
  const size = () => (LOOK.voidBtnSize ?? 1) * 700;
  function enter() {   // in: from here on, only the black
    buzz([30, 80, 30, 80, 160]); S_.st = 'in'; S_.t = 0; auto = null; lockI = -1; warp = null;
    btn.position.copy(player.pos).addScaledVector(new V3(0, 0, -1).applyQuaternion(rig.q), LOOK.voidBtnDist ?? 20000);   // dead ahead of where you're looking
    face.material.map = texOn; face.material.needsUpdate = true; glow.visible = true; btn.scale.setScalar(size()); btn.visible = true;
  }
  function hit() {   // touched: you stop dead (the mouse lets go of you too), a click, and the button shrinks to a small white point
    S_.st = 'hit'; S_.t = 0; S_.fp.copy(player.pos); S_.fq.copy(rig.q); player.vel.set(0, 0, 0); buzz([20, 40, 120]); clickSnd();
    face.material.map = texHit; face.material.opacity = 1; face.material.needsUpdate = true; glow.visible = false;
  }
  function open() {   // the page (holding W is a key press, so the browser allows it; else a link to click)
    let w = null; try { w = window.open(VOID_URL, '_blank', 'noopener') } catch (e) { }
    if (!w) { const a = document.createElement('a'); a.id = 'voidLink'; a.href = VOID_URL; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Learn more →'; document.body.appendChild(a); setTimeout(() => a.remove(), 12000) }
  }
  function out() {   // back, well outside the galaxy, facing its heart
    S_.st = 'off'; S_.w = 0; S_.slow = 1; btn.visible = false;
    const R = GAL_R0 + GAL_LEN, d = HOME_P.clone().sub(GC).projectOnPlane(GAL_UP).normalize();
    player.pos.copy(GC).addScaledVector(d, R + (LOOK.voidOutD ?? 100000)); player.vel.set(0, 0, 0); aimAt(GC.clone().sub(player.pos), 1); rig.quat.copy(rig.q); player.base.copy(rig.q); player.quat.copy(rig.q); strands.length = 0; curStrand = null; camRelV.set(0, 0, 0);
  }
  return {
    get busy() { return S_.st !== 'off' }, get inside() { return S_.st !== 'off' }, get far() { return false }, get w() { return S_.w }, get hit() { return S_.st === 'hit' },
    get frozen() { return S_.st === 'hit' }, get slowK() { return S_.slow },   // (the flight holds still while you're on the button; time runs slower as you close in)
    reset() { S_.st = 'off'; S_.w = 0; S_.slow = 1; btn.visible = false },   // home again (H, or the lab going round again)
    update(rdt) {
      const L = LOOK, on = !!(L.singularity ?? 1) && S.mode === 'fly' && booted, d = player.pos.distanceTo(GC);
      singQ = S_.st !== 'off' ? 1 : on ? 1 - sstep(d, singR() * 1.05, BH.sh * (L.singHear ?? 14)) : Math.max(0, singQ - rdt);
      if (S_.st === 'off') { btn.visible = false; S_.w = 0; S_.slow = 1; if (on && d < singR()) enter(); else return }
      S_.t += rdt; btn.quaternion.copy(camera.quaternion);   // always square to you and upright: it reads left to right
      if (S_.st === 'in') {
        S_.w = Math.min(1, S_.t / Math.max(.02, L.voidFade ?? .2)); face.material.opacity = S_.w; glow.material.opacity = .55 * S_.w * (.8 + .2 * Math.sin(S_.t * 2.2)); btn.scale.setScalar(size());
        // how much of the screen's width it fills: that's how close you are (the ship touches it when it fills voidTouch of the view: then shrunk to a tenth it's a small white chip in the middle)
        const W = size() * 4, dB = Math.max(1e-3, camera.position.distanceTo(btn.position)), frac = W / (2 * dB * Math.tan(camera.fov * Math.PI / 360) * camera.aspect), touch = L.voidTouch ?? .6;
        S_.slow = 1 - (1 - Math.max(.02, L.voidSlow ?? .15)) * sstep(frac, touch * .12, touch);   // time slows as you close in
        lp.copy(player.pos).sub(btn.position).applyQuaternion(_bq.copy(btn.quaternion).invert()).divideScalar(btn.scale.x);   // you, in the button's own frame
        if (S_.w >= 1 && (frac >= touch && Math.abs(lp.x) < 2.2 && Math.abs(lp.y) < .65 || Math.abs(lp.z) < .1)) hit();
      } else {   // touched
        player.pos.copy(S_.fp); player.vel.set(0, 0, 0); rig.q.copy(S_.fq); S_.slow = 1;
        btn.scale.setScalar(size() * (1 - .9 * sstep(S_.t, 0, .25)));
        if (S_.t >= 1) { open(); out() }
      }
    },
  };
})();
