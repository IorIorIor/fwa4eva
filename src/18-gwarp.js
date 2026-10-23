/* ───────────────────────── warping to a galaxy ─────────────────────────
   Out between the galaxies, aim at one (the reticle on it, or the pointer when it's free) and its tag says Z to warp. Hold
   Z: the ship turns to it and goes, faster and faster (sparks pouring off it, the dust streaking, the lens opening all the
   way, the trail burning white and wide), then slower and slower, to rest just outside its rim, where it asks Enter or
   Play. The whole run takes gwTime seconds, however far it is. */
const gwarp = (() => {
  const st = { aim: -1, hold: 0, on: false, t: 0, k: 0, i: -1, from: new V3(), to: new V3(), q0: new Q4(), q1: new Q4(), fov: 0 };
  const _a = new V3(), _b = new V3(), _m = new THREE.Matrix4(), _q = new Q4();
  const R = () => GAL_R0 + GAL_LEN;
  addEventListener('keydown', e => { if (e.key.toLowerCase() === 'z' && !e.repeat && !(e.target.matches && e.target.matches('input,textarea,select'))) keys.z = true });
  addEventListener('keyup', e => { if (e.key.toLowerCase() === 'z') keys.z = false });
  function start(k) {
    const L = LOOK; st.on = true; st.t = 0; st.i = k; st.from.copy(player.pos);
    const c = uniAt(k, _a), dir = _b.copy(c).sub(player.pos).normalize(); st.to.copy(c).addScaledVector(dir, -R() * Math.max(1.05, (L.igFrom ?? 1.15) * 1.08));   // just outside its rim, on the way in
    st.q0.copy(player.quat); st.q1.setFromRotationMatrix(_m.lookAt(new V3(), dir, GAL_UP));
    auto = null; lockI = -1; warp = null; camHold = null; buzz([20, 30, 60]); if (TEST) console.log('galaxy warp to', galName(k));
  }
  return {
    get on() { return st.on }, get k() { return st.k }, get aim() { return st.aim }, get fov() { return st.fov }, start,
    // every frame: what you're aiming at (for the tag), the hold, and the run itself (true while it flies the ship)
    drive(rdt) {
      const L = LOOK;
      if (!st.on) {
        st.k += (0 - st.k) * Math.min(1, rdt * 3); st.fov = st.k * (L.gwFov ?? 75);
        // aiming: the galaxy (not the one you're in) nearest the reticle, or the free pointer, within its own size on screen (or 50 px)
        st.aim = -1; if (S.mode === 'fly' && booted && !intro.active && !gplay.on && !gplay.prompting && galLab.viewing < 0 && (L.gwOn ?? 1)) {
          const ax = locked() || !mouse.in ? innerWidth / 2 : mouse.x, ay = locked() || !mouse.in ? innerHeight / 2 : mouse.y, th = Math.tan(camera.fov * Math.PI / 360); let bd = Infinity;
          for (let k = 0; k < UNI_N; k++) {
            if (k === UNI.k && player.pos.distanceTo(GC) < R() * 1.6) continue; const c = uniAt(k, _a); _b.copy(c).applyMatrix4(camera.matrixWorldInverse); if (_b.z > -1) continue;
            _a.project(camera); const x = (_a.x * .5 + .5) * innerWidth, y = (-_a.y * .5 + .5) * innerHeight, rp = R() / (-_b.z * th) * innerHeight * .5 * .6, d = Math.hypot(x - ax, y - ay);
            if (d < Math.max(50, rp) && d < bd) { bd = d; st.aim = k }
          }
        }
        if (st.aim >= 0 && keys.z) { st.hold += rdt; if (st.hold > (L.gwHold ?? .2)) { st.hold = 0; start(st.aim) } } else st.hold = 0;
        return false;
      }
      // the run: a turn to face it, then out and in along an exponential (speeding up, then slowing down)
      const T = Math.max(.8, L.gwTime ?? 2.5), turn = Math.min(.35, T * .14); st.t += rdt; const x = Math.min(1, st.t / T), p = Math.max(0, (st.t - turn) / (T - turn)), n = Math.max(2, L.gwEase ?? 6);
      const e = p < .5 ? Math.pow(2 * p, n) / 2 : 1 - Math.pow(2 - 2 * p, n) / 2;
      _a.lerpVectors(st.from, st.to, Math.min(1, e)); if (rdt > 0) player.vel.copy(_a).sub(player.pos).divideScalar(rdt); player.pos.copy(_a);
      player.quat.copy(st.q0).slerp(st.q1, Math.min(1, st.t / turn)); player.base.copy(player.quat); rig.q.slerp(st.q1, Math.min(1, rdt * 6));
      st.k = Math.sin(Math.PI * Math.min(1, p)) ** .7; st.fov = st.k * (L.gwFov ?? 75); thrusting = gasOn = true; boosting = st.k > .3; player.cruise = 0;
      if (x >= 1) { st.on = false; player.vel.set(0, 0, 0); thrusting = gasOn = boosting = false; uni.rebase(st.i); gplay.showPrompt(st.i) }   // there: Enter or Play
      return true;
    },
  };
})();
