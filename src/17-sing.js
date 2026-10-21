/* ───────────────────────── the singularity ─────────────────────────
   The newest winners spiral in closest to the core; the black hole is where the FWA as it was ends. With the switch on you
   can fly into it: the music slows, sinks and falls silent as you near the horizon, the whole screen goes slowly white, and
   you come out on the far side in quiet, empty space, the galaxy behind you, one new star ahead and a single line. */
let singQ = 0;   // 0 … 1: how near the horizon you are (the music listens to this)
const SING_LINE = 'What comes next';   // the far side's one line (to be replaced by whatever the FWA becomes)
const sing = (() => {
  const el = document.createElement('div'); el.id = 'farText'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = `<small>FWA · 2000–2026</small><b>${SING_LINE}</b>`; document.body.appendChild(el);
  const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: new C3(1, .94, .82), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0 })); star.visible = false; star.frustumCulled = false; scene.add(star);
  const S_ = { t: -1, w: 0, dir: new V3(), far: false, ft: 0 };
  function enter() { S_.t = 0; S_.dir.copy(player.vel).lengthSq() > 1 ? S_.dir.normalize() : S_.dir.set(0, 0, -1).applyQuaternion(player.base); auto = null; lockI = -1; warp = null }
  function emerge() {   // the far side: well out beyond the galaxy along the way you were going, facing on, the galaxy behind
    const R = GAL_R0 + GAL_LEN, at = GC.clone().addScaledVector(S_.dir, R * (LOOK.singFar ?? 3));
    player.pos.copy(at); player.vel.set(0, 0, 0); aimAt(S_.dir.clone(), 1); rig.quat.copy(rig.q); player.base.copy(rig.q); player.quat.copy(rig.q); strands.length = 0; curStrand = null; camRelV.set(0, 0, 0);
    star.position.copy(at).addScaledVector(S_.dir, R * .35); star.scale.setScalar(R * .05); star.visible = true; S_.far = true; S_.ft = 0; ringBell(N - 1); document.body.classList.add('farside');
  }
  return {
    get busy() { return S_.t >= 0 },
    update(rdt) {
      const L = LOOK, on = !!(L.singularity ?? 1) && S.mode === 'fly' && booted, d = player.pos.distanceTo(GC);
      singQ = on && !S_.far ? 1 - sstep(d, BH.sh * 1.5, BH.sh * (L.singHear ?? 14)) : Math.max(0, singQ - rdt);
      if (on && S_.t < 0 && !S_.far && d < BH.sh * 1.45) enter();
      if (S_.t >= 0) {   // inside: slow white, the switch to the far side at its peak, then the white clears
        const tin = L.singIn ?? 3, tout = L.singOut ?? 4; S_.t += rdt; player.vel.multiplyScalar(Math.exp(-rdt * 4));
        if (S_.t < tin) S_.w = Math.pow(S_.t / tin, 1.5); else { if (!S_.far) emerge(); S_.w = 1 - sstep(S_.t, tin + .6, tin + .6 + tout) }
        if (S_.t > tin + .6 + tout) S_.t = -1;
      } else S_.w = 0;
      whiteout.lv = Math.max(whiteout.lv, S_.w);
      if (S_.far) { S_.ft += rdt; const k = sstep(S_.ft, (L.singIn ?? 3) * .2, (L.singIn ?? 3) * .2 + 3); star.material.opacity = k; el.style.opacity = (k * (1 - sstep(player.pos.distanceTo(star.position) < 1 ? 0 : S_.ft, 14, 18))).toFixed(3);
        if (player.pos.distanceTo(GC) < (GAL_R0 + GAL_LEN) * 1.5 || S.mode !== 'fly') { S_.far = false; star.visible = false; el.style.opacity = 0; document.body.classList.remove('farside') } }   // back in the galaxy: the far side lets go
    },
  };
})();
