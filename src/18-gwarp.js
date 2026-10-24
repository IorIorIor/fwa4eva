/* ───────────────────────── warping: home, the clusters, their galaxies ─────────────────────────
   You start at home, in the middle of five clusters. Aim at one (the reticle on its tag, or the pointer when it's free)
   and its tag says Hold to warp: press and hold (mouse or finger) and the ship turns to it and goes, faster and faster
   (sparks pouring off it, the dust streaking, the lens opening all the way, the trail burning white), then slower and
   slower, to rest in the middle of the cluster. There the same takes you to one of its galaxies, to just outside its rim
   where it asks Enter or Play. Bottom left, always: Back to cluster / Back to home (or Z). Every run takes gwTime seconds. */
const gwarp = (() => {
  const st = { aim: -1, hold: 0, on: false, t: 0, k: 0, tgt: null, from: new V3(), to: new V3(), q0: new Q4(), q1: new Q4(), fov: 0 };
  const _a = new V3(), _b = new V3(), _m = new THREE.Matrix4();
  const R = () => GAL_R0 + GAL_LEN, CR = () => Math.max(1.6, LOOK.uniClusterR ?? 2.8) * R();
  // the way back, bottom left
  const back = document.createElement('button'); back.id = 'backBtn'; back.type = 'button'; back.className = 'hud'; back.hidden = true; back.innerHTML = '<i>←</i><span></span><kbd>Z</kbd>'; document.body.appendChild(back);
  back.addEventListener('pointerdown', e => e.stopPropagation()); back.onclick = () => goBack();
  addEventListener('keydown', e => { if (e.key.toLowerCase() !== 'z' || e.repeat || (e.target.matches && e.target.matches('input,textarea,select'))) return; if (!back.hidden) { e.preventDefault(); goBack() } });
  const backTo = () => { const lv = uni.level; return lv.gal >= 0 ? { cl: lv.cl, name: 'Back to cluster' } : lv.cl >= 0 ? { home: true, name: 'Back to home' } : null };   // (at a galaxy: its cluster; in a cluster: home)
  function goBack() { const b = backTo(); if (!b || st.on) return; if (gplay.on) return; gplay.hidePrompt(); start(b.home ? { home: true } : { cl: b.cl }) }
  // a run to a target: { k } a galaxy, { cl } a cluster's middle, { home }
  function start(t) {
    const L = LOOK; st.on = true; st.t = 0; st.tgt = t; st.from.copy(player.pos);
    if (t.k != null) { const c = uniAt(t.k, _a), dir = _b.copy(c).sub(player.pos).normalize(); st.to.copy(c).addScaledVector(dir, -R() * Math.max(1.05, (L.igFrom ?? 1.15) * 1.08)); st.q1.setFromRotationMatrix(_m.lookAt(new V3(), dir, GAL_UP)) }   // just outside its rim, on the way in
    else { if (t.home) uniHome(st.to); else uni.clAt(t.cl, st.to); const dir = _b.copy(st.to).sub(player.pos); if (dir.lengthSq() < 1) dir.set(0, 0, -1).applyQuaternion(player.quat); dir.normalize(); if (!t.home && st.from.distanceTo(st.to) > CR() * 2) st.to.addScaledVector(dir, -CR() * 1.5 * (L.gwClusterStop ?? .6));   // a cluster, from outside it: stopping a little short of its middle, so its galaxies fill the view (from one of its galaxies: right to the middle)
      const look = t.home ? uniFace(_a).sub(st.to).normalize() : dir; st.q1.setFromRotationMatrix(_m.lookAt(new V3(), look, GAL_UP)) }   // (home: arriving facing the clusters' arc)
    st.q0.copy(player.quat); auto = null; lockI = -1; warp = null; camHold = null; buzz([20, 30, 60]); if (TEST) console.log('warp to', t.k != null ? galName(t.k) : t.home ? 'home' : clName(t.cl));
  }
  return {
    get on() { return st.on }, get k() { return st.k }, get aim() { return st.aim }, get holdK() { return Math.min(1, st.hold / Math.max(.05, LOOK.gwHold ?? .45)) }, get fov() { return st.fov }, start, goBack,
    // every frame: what you're aiming at, the hold, the back button, and the run itself (true while it flies the ship)
    drive(rdt) {
      const L = LOOK, ok = S.mode === 'fly' && booted && !intro.active && !gplay.on && galLab.viewing < 0 && (L.gwOn ?? 1);
      { const b = ok && !st.on ? backTo() : null; back.hidden = !b; if (b && back.lastChild.previousSibling.textContent !== b.name) back.lastChild.previousSibling.textContent = b.name }
      if (!st.on) {
        st.k += (0 - st.k) * Math.min(1, rdt * 3); st.fov = st.k * (L.gwFov ?? 75);
        // aiming: of the tags showing (the clusters; in a cluster also its galaxies), the one nearest the reticle (or the free pointer), within its size on screen (or 50 px)
        st.aim = -1; if (ok && !gplay.prompting) {
          const ax = locked() || !mouse.in ? innerWidth / 2 : mouse.x, ay = locked() || !mouse.in ? innerHeight / 2 : mouse.y, th = Math.tan(camera.fov * Math.PI / 360), lv = uni.level; let bd = Infinity;
          for (let k = 0; k < UNI_N + CL_N; k++) {
            const gal = k < UNI_N; if (gal ? clOf(k) !== lv.cl || k === lv.gal : k - UNI_N === lv.cl) continue;
            const c = uni.tagAt(k, _a); _b.copy(c).applyMatrix4(camera.matrixWorldInverse); if (_b.z > -1) continue;
            _a.project(camera); const x = (_a.x * .5 + .5) * innerWidth, y = (-_a.y * .5 + .5) * innerHeight, rp = (gal ? R() : CR()) / (-_b.z * th) * innerHeight * .5 * .6, d = Math.hypot(x - ax, y - ay);
            if (d < Math.max(50, rp) && d < bd) { bd = d; st.aim = k }
          }
        }
        // the hold: a press (mouse or finger) on the sky while aiming; let go early and nothing happens
        const pressing = !!(down && !dragged && down.btn === 0 && !rmenu.open);
        if (st.aim >= 0 && pressing) { st.hold += rdt; if (st.hold > (L.gwHold ?? .45)) { st.hold = 0; const a = st.aim; start(a < UNI_N ? { k: a } : { cl: a - UNI_N }); down = null } } else st.hold = 0;
        return false;
      }
      // the run: a turn to face it, then out and in along an exponential (speeding up, then slowing down)
      const T = Math.max(.8, L.gwTime ?? 2.5), turn = Math.min(.35, T * .14); st.t += rdt; const x = Math.min(1, st.t / T), p = Math.max(0, (st.t - turn) / (T - turn)), n = Math.max(2, L.gwEase ?? 6);
      const e = p < .5 ? Math.pow(2 * p, n) / 2 : 1 - Math.pow(2 - 2 * p, n) / 2;
      _a.lerpVectors(st.from, st.to, Math.min(1, e)); if (rdt > 0) player.vel.copy(_a).sub(player.pos).divideScalar(rdt); player.pos.copy(_a);
      player.quat.copy(st.q0).slerp(st.q1, Math.min(1, st.t / turn)); player.base.copy(player.quat); rig.q.slerp(st.q1, Math.min(1, rdt * 6));
      st.k = Math.sin(Math.PI * Math.min(1, p)) ** .7; st.fov = st.k * (L.gwFov ?? 75); thrusting = gasOn = true; boosting = st.k > .3; player.cruise = 0;
      if (x >= 1) { st.on = false; player.vel.set(0, 0, 0); thrusting = gasOn = boosting = false; const t = st.tgt; if (t.k != null) { uni.rebase(t.k); gplay.showPrompt(t.k) } }   // at a galaxy: Enter or Play
      return true;
    },
  };
})();
