/* ───────────────────────── arriving, and Play mode ─────────────────────────
   Fly in from out between the galaxies and, at its rim, the galaxy asks: Enter (fly on in) or Play. Play is the record
   player as a place: the camera flies off to a long, low view across the whole disk while the ship flies down onto it,
   halfway between the core and the rim. The galaxy starts to turn, easing in, and once the ship has landed it plays:
   every winner that passes the needle (the line from the core out through the ship) is a note. It has its own look
   (every slider; the Look panel edits it while you're in play). Esc, W or Stop: back to flying, from where the ship is. */
const gplay = (() => {
  const st = { on: false, ph: 0, t: 0, k: 0, kv: 0, phi: 0, w: 0, az: 0, landed: false, out: false, outT: 0, p0: new V3(), q0: new Q4(), c0: new V3(), cq0: new Q4(), f0: 60, sq0: new Q4(), prompt: -1, promptT: 0, wasOut: false, scale: 1 };
  const _a = new V3(), _b = new V3(), _c = new V3(), _q = new Q4(), _q2 = new Q4(), _m = new THREE.Matrix4(), S0 = () => .68 * SHIP_K * SHIP_SC;
  // the prompt: two buttons under the reticle
  const pr = document.createElement('div'); pr.id = 'galPrompt'; pr.className = 'hud'; pr.hidden = true;
  pr.innerHTML = '<span class="gy"></span><div class="gb"><button type="button" data-a="enter">Enter galaxy<kbd>↵</kbd></button><button type="button" data-a="play"><i></i>Play galaxy<kbd>Space</kbd></button></div>';
  document.body.appendChild(pr); const prY = pr.querySelector('.gy');
  pr.addEventListener('pointerdown', e => e.stopPropagation()); pr.addEventListener('click', e => { const a = e.target.closest('button')?.dataset.a; if (a) choose(a) });
  // in play: the galaxy's year and a way out
  const pill = document.createElement('div'); pill.id = 'playPill'; pill.className = 'hud'; pill.hidden = true; pill.innerHTML = '<b></b><span>Playing</span><button type="button">Stop<kbd>Esc</kbd></button>'; document.body.appendChild(pill);
  pill.addEventListener('pointerdown', e => e.stopPropagation()); pill.querySelector('button').onclick = () => stop();
  function showPrompt(k) {
    if (!(LOOK.galPrompt ?? 1)) return; if (k !== UNI.k) uni.rebase(k); st.prompt = k; st.promptT = 0; prY.textContent = String(UNI_Y0 + k); pr.hidden = false; pr.classList.remove('on'); void pr.offsetWidth; pr.classList.add('on');
    if (document.pointerLockElement) document.exitPointerLock(); buzz(12);
  }
  function hidePrompt() { st.prompt = -1; pr.hidden = true; pr.classList.remove('on') }
  function choose(a) { const k = st.prompt; hidePrompt(); if (a === 'play') start(); else { setTimeout(relock, 30) } if (TEST) console.log('galaxy', a, UNI_Y0 + (k < 0 ? UNI.k : k)) }
  addEventListener('keydown', e => {
    if (e.target && e.target.matches && e.target.matches('input,textarea,select')) return;
    if (st.prompt >= 0) { if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); choose('enter') } else if (e.key === ' ') { e.preventDefault(); e.stopImmediatePropagation(); choose('play') } else if (e.key === 'Escape') { hidePrompt() } return }
    if (st.on && !st.out && (e.key === 'Escape' || e.key.toLowerCase() === 'w')) { e.preventDefault(); e.stopImmediatePropagation(); stop() }
  }, true);

  const R = () => GAL_R0 + GAL_LEN;
  // where the camera sits (and what it looks at) with the galaxy turned phi: a long, low view across the disk
  function camPose(phi, p, q) {
    const L = LOOK, el = Math.max(2, Math.min(89, L.playElev ?? 24)) * Math.PI / 180, a = st.az + phi, d = (L.playDist ?? 2.1) * R();
    p.set(Math.cos(a) * Math.cos(el) * d, Math.sin(el) * d, Math.sin(a) * Math.cos(el) * d).applyQuaternion(GQ).add(GC);
    _c.set(0, (L.playAim ?? .08) * R(), 0).applyQuaternion(GQ).add(GC); q.setFromRotationMatrix(_m.lookAt(p, _c, GAL_UP)); return p;
  }
  // where the ship lands: on the disk, between the core and the rim, on the camera's side
  const shipAt = (phi, out) => { const a = st.az + phi, r = GAL_R0 + (LOOK.playShipR ?? .5) * GAL_LEN; return out.set(Math.cos(a) * r, 0, Math.sin(a) * r).applyQuaternion(GQ).add(GC) };
  const shipQ = (phi, out) => { shipAt(phi, _a); _b.copy(GC).sub(_a).normalize(); return out.setFromRotationMatrix(_m.lookAt(new V3(), _b, GAL_UP)) };   // lying flat on the disk, its nose to the core (seen from the camera: a pointer pointing in)
  const pxScale = d => { const px = 70 * (LOOK.playShipSize ?? 1); return px * d * 2 * Math.tan(camera.fov * Math.PI / 360) / (Math.max(1, innerHeight) * 2 * Math.max(1e-6, shipR0 || 1)) };   // the ship's scale that makes it px across from d away
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  function start() {
    if (st.on || S.mode !== 'fly' || !booted) return; hidePrompt();
    Object.assign(st, { on: true, out: false, t: 0, phi: 0, w: 0, landed: false }); st.p0.copy(player.pos); st.q0.copy(player.quat); st.c0.copy(camera.position); st.cq0.copy(camera.quaternion); st.f0 = camera.fov;
    toLocal(player.pos, _a); st.az = Math.atan2(_a.z, _a.x) + (LOOK.playAz ?? 0) * Math.PI / 180;   // the view opens up on the side of the galaxy you're on
    auto = null; lockI = -1; warp = null; stopTour(); player.vel.set(0, 0, 0); player.cruise = 0; camHold = null; sparks.stop();
    if (document.pointerLockElement) document.exitPointerLock(); document.body.classList.add('playing'); pill.hidden = false; pill.firstChild.textContent = String(GYEAR);
  }
  function stop() {
    if (!st.on || st.out) return; st.out = true; st.outT = 0; rec.stop(); pill.hidden = true;
    // back behind the ship, from where it landed: the fly camera's own move (the ship holds still meanwhile)
    player.vel.set(0, 0, 0); player.cruise = 0; rig.q.copy(player.quat); rig.quat.copy(rig.q); player.base.copy(player.quat); camRel.set(0, .8, 3.4).multiplyScalar(SHIP_SC); camRelV.set(0, 0, 0);
    tween = { fp: camera.position.clone(), fq: camera.quaternion.clone(), t: 0, dur: Math.max(1, LOOK.playFly ?? 4.5), c: true, mode: true, f0: camera.fov };
  }
  return {
    get on() { return st.on }, get k() { return st.k }, get landed() { return st.landed }, get prompting() { return st.prompt >= 0 }, start, stop, showPrompt, hidePrompt,
    // the needle's angle round the core, in the galaxy's frame (where the ship is)
    needle() { toLocal(player.pos, _a); return Math.atan2(_a.z, _a.x) },
    // every frame, before the flight: the arrival prompt, and in play the turning galaxy and the ship on it
    drive(rdt) {
      const L = LOOK;
      // arriving: from out between the galaxies to inside one's rim
      if (!st.on && S.mode === 'fly' && booted && !intro.active) {
        if (uni.out) st.wasOut = true; else if (st.wasOut && uni.nearD < Math.max(1, L.igFrom ?? 1.15) * R()) { st.wasOut = false; showPrompt(uni.near) }   // (in through the rim)
        if (st.prompt >= 0) { st.promptT += rdt; if (keys.w && st.promptT > .6) choose('enter'); else if (uni.nearD > R() * 1.6) hidePrompt() }
      }
      if (!st.on) { st.k = 0; return false }
      if (st.out) {   // on the way back: the look blends back over the camera's move, the ship shrinks to its own size as the camera comes in
        st.outT += rdt; st.k = 1 - (tween && tween.mode ? easeIO(Math.min(1, tween.t)) : 1);
        if (!tween || st.k <= 0) { st.on = false; st.out = false; st.k = 0; document.body.classList.remove('playing'); avatar.scale.setScalar(S0()); setTimeout(relock, 30) }
        return true;
      }
      st.t += rdt;
      // the turn: one turn every playTurn seconds, easing in from standing still
      const wT = 2 * Math.PI / Math.max(5, L.playTurn ?? 90), sIn = Math.max(.01, L.playSpinIn ?? 6); st.w = wT * sstep(st.t, 0, sIn); st.phi += st.w * rdt;
      // the ship: from where it was to its spot on the disk (which turns with the view), in an arc that settles onto the disk
      const T = Math.max(.5, L.playShipFly ?? 4), x = Math.min(1, st.t / T), e = easeIO(x); shipAt(st.phi, _b);
      _a.copy(st.p0).lerp(_b, e).addScaledVector(GAL_UP, Math.sin(Math.PI * x) * st.p0.distanceTo(_b) * .12);
      if (rdt > 0) player.vel.copy(_a).sub(player.pos).divideScalar(rdt); player.pos.copy(_a);
      if (x < 1) { _c.copy(player.vel); if (_c.lengthSq() > 1) { _q.setFromRotationMatrix(_m.lookAt(new V3(), _c.normalize(), GAL_UP)); player.quat.slerp(_q, Math.min(1, rdt * 4)) } shipQ(st.phi, _q2); player.quat.slerp(_q2, sstep(x, .7, 1)) }
      else { shipQ(st.phi, player.quat); player.vel.set(0, 0, 0) }
      player.base.copy(player.quat); thrusting = gasOn = x < .92; boosting = false;
      if (x >= 1 && !st.landed) { st.landed = true; buzz(14); rec.play('orbit') }
      return true;
    },
    // the camera, in play (false: the ordinary one has it)
    cam(rdt) {
      if (!st.on || st.out) return false;
      const L = LOOK, T = Math.max(.5, L.playFly ?? 4.5), x = Math.min(1, st.t / T), e = easeMode(x); st.k = easeIO(x);
      camPose(st.phi, _a, _q);
      if (x < 1) { lerpLogPolar(camera.position, st.c0, _a, GC, e); camera.quaternion.copy(st.cq0).slerp(_q, sstep(e, 0, .85)) } else { camera.position.copy(_a); camera.quaternion.copy(_q) }
      camera.fov = st.f0 + ((L.playFov ?? 42) - st.f0) * e; camera.updateProjectionMatrix(); camera.updateMatrixWorld();
      return true;
    },
    // after the camera: the ship's size (never smaller than a pointer on screen while the camera's far off)
    after() {
      if (!st.on) return; const d = camera.position.distanceTo(player.pos); avatar.scale.setScalar(Math.max(S0(), pxScale(d)));
      avatar.position.copy(player.pos); avatar.quaternion.copy(player.quat);
    },
  };
})();
