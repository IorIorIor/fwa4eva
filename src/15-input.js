/* ───────────────────────── input ───────────────────────── */
const keys = {}, mouse = { x: 0, y: 0, in: false };
let freeMouse = false, holdT = 0, touchThrust = false, touchBoost = false, touchBrake = false, lockFailed = false, down = null, dragged = false, pinch0 = 0, lastInput = performance.now();
const SENS = .0022;
const locked = () => document.pointerLockElement === canvas;
function updateLockUI() {
  const fly = S.mode === 'fly'; document.body.classList.toggle('locked', locked());
  $('cross').toggleAttribute('hidden', !fly);
}
document.addEventListener('pointerlockchange', updateLockUI);
const relock = () => { if (booted && S.mode === 'fly' && !freeMouse && !locked() && !lockFailed && !coarse && !rmenu.panel && !document.querySelector('.sheet.open') && document.visibilityState === 'visible') try { quietLock = performance.now(); const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }) } catch (e) { } };   // a try without a click: if the browser says no, that's no failure
addEventListener('focus', () => setTimeout(relock, 60)); document.addEventListener('visibilitychange', () => setTimeout(relock, 60));   // alt-tab back: the ship takes the mouse again
// a browser refuses a re-lock for about a second after Esc; that's not a failure, just click again
// a refusal right after letting go is the browser's re-lock cooldown: click again. Any other refusal (a frame without pointer-lock
// permission, say) means mouse mode for good, so nobody gets asked to click to fly over and over
let lockErrs = 0, lastUnlock = 0, quietLock = -1e9; const lockErr = () => { if (performance.now() - quietLock < 1500) return; lockErrs++; if (performance.now() - lastUnlock > 1600 || lockErrs >= 4 || !canvas.requestPointerLock) lockFailed = true; updateLockUI() };
document.addEventListener('pointerlockerror', lockErr);
document.addEventListener('pointerlockchange', () => { if (locked()) { freeMouse = false; lockErrs = 0; lockFailed = false; updateLockUI() } else { lastUnlock = performance.now(); for (const k in keys) keys[k] = false } });
function requestLock() { if (!canvas.requestPointerLock) { lockErr(); return } try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(lockErr) } catch (e) { lockErr() } }
// the menu takes the mouse, but the view still drifts a little with it
document.addEventListener('mousemove', e => { if (rmenu.open) { rmenu.move(e); if (locked() && S.mode === 'fly' && !introActive) rotateRig(-e.movementX * SENS * LOOK.sens * (LOOK.menuSteer ?? .15), -e.movementY * SENS * LOOK.sens * (LOOK.menuSteer ?? .15)); return } if (intro.active) { if (!booted) intro.mouse(e); return }   /* the opening lands facing the core: the mouse only steers once it's over */ if (!locked() || S.mode !== 'fly' || introActive) return; rotateRig(-e.movementX * SENS * LOOK.sens, -e.movementY * SENS * LOOK.sens) });
// pointer events: map orbit, touch look, click/tap to focus
const ptrs = new Map();
canvas.addEventListener('pointerdown', e => {
  if (!locked()) try { canvas.setPointerCapture(e.pointerId) } catch (err) { }   // capture throws while the pointer is locked
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch0 = Math.hypot(a.x - b.x, a.y - b.y) }
  down = { x: e.clientX, y: e.clientY, btn: e.button, shift: e.shiftKey, touch: e.pointerType !== 'mouse' }; dragged = false;
  // hold (100 ms, no star in reach, not dragging): the radial menu opens round the press
  clearTimeout(holdT); if (booted && !rmenu.open && !rmenu.panel && e.button === 0 && ptrs.size === 1) holdT = setTimeout(() => {
    if (!down || dragged) return; const cx = locked() ? innerWidth / 2 : down.x, cy = locked() ? innerHeight / 2 : down.y;
    const star = S.mode === 'fly' ? (down.touch ? pick(cx, cy) : hovPick) >= 0 || magI >= 0 : (hovPick >= 0 || !!mapHover(cx, cy).ring);
    if (!star) { rmenu.show(cx, cy); rmenu.held = true }
  }, LOOK.menuHold ?? 100);
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse') { mouse.x = e.clientX; mouse.y = e.clientY; mouse.in = true }
  const prev = ptrs.get(e.pointerId); if (!prev || !down) return; if (rmenu.open) return;   // the menu is up: the pointer is for it
  const dx = e.clientX - prev.x, dy = e.clientY - prev.y; prev.x = e.clientX; prev.y = e.clientY;
  if (Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y) > 6) dragged = true;
  if (!dragged) return;
  if (S.mode === 'fly') { if (down.touch || lockFailed) rotateRig(-dx * .005, -dy * .005); return }   // touch (and lock-less mouse) drag looks around
  if (tween) return;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pinch0) zoom((pinch0 - d) * 4); pinch0 = d; return }
  const dk = LOOK.mapDrag ?? .35;
  if (down.btn === 2 || down.shift) { orbit.theta -= dx * .005 * dk; orbit.phi = orbit.phi > Math.PI / 2 ? Math.max(Math.PI - 1.5, Math.min(Math.PI - .01, orbit.phi + dy * .005 * dk)) : Math.max(.01, Math.min(1.5, orbit.phi - dy * .005 * dk)) }   // right-drag (or Shift) turns the view
  else {   // drag pans: the spot you grabbed stays under the pointer
    const a = groundAt(e.clientX - dx, e.clientY - dy, _pa), b = a && groundAt(e.clientX, e.clientY, _pb);
    if (a && b && a.distanceTo(b) < orbit.dist * 4) orbit.target.addScaledVector(a.sub(b), dk);   // slower than the pointer, so the map glides
    else { const k = orbit.dist * .0013 * dk, o = orbitPose(), r = new V3(1, 0, 0).applyQuaternion(o.q), f = new V3(r.z, 0, -r.x); orbit.target.addScaledVector(r, -dx * k).addScaledVector(f, -dy * k) }
  }
});
const endPtr = e => {
  clearTimeout(holdT);
  ptrs.delete(e.pointerId); pinch0 = 0;
  if (down && !dragged && e.type === 'pointerup' && booted) {
    const unlock = () => { lockI = -1; if (auto && auto.i >= 0) auto = null };
    const hov = (x, y) => coarse || down.touch ? pick(x, y) : hovPick;   // with a mouse, only the star whose tooltip is showing; touch has no hover, so a tap picks
    const fly = S.mode === 'fly', cx = locked() ? innerWidth / 2 : e.clientX, cy = locked() ? innerHeight / 2 : e.clientY;
    if (rmenu.open) { rmenu.choose(); rmenu.held = false }   // let go: the segment you nudged toward, or nothing (the menu goes)
    else if (rmenu.panel) { rmenu.close(); if (fly && !down.touch && !locked() && !lockFailed) requestLock() }
    else if (fly && !down.touch && !locked() && !lockFailed) { const i = hov(e.clientX, e.clientY); requestLock(); if (i >= 0 && i !== lockI) focus(i) }   // fly: click a star to lock the ship to it (or just take the pointer back)
    else if (fly) { const i = hov(cx, cy); if (i >= 0 && i !== lockI) focus(i); else if (i >= 0) unlock() }   // a star: lock on (again: let go)
    else { const h = mapHover(e.clientX, e.clientY), i = coarse || down.touch ? h.i : hovPick; if (i >= 0) focus(i); else if (h.ring) ringZoom(h.ring); else mapZone.click() }   // map: a star once you're close, else the ring under the cursor, else the menu
  }
  if (!ptrs.size) down = null;
};
/* map: the rings are what you point at. Find the ground point under the cursor (on the galaxy plane), then the nearest
   ring that's showing at this zoom, if it's within a few pixels. Clicking one dives in close enough to see its stars. */
const _rc = new THREE.Raycaster(), _gp = new THREE.Plane(), _hit = new V3(), _sx = new V3(), _pa = new V3(), _pb = new V3();
function groundAt(x, y, out = _hit) {
  _rc.setFromCamera({ x: x / innerWidth * 2 - 1, y: -(y / innerHeight) * 2 + 1 }, camera); _gp.setFromNormalAndCoplanarPoint(_sx.set(0, 1, 0).applyQuaternion(GQ), GC);
  return _rc.ray.intersectPlane(_gp, out);
}
const RING_LIST = (() => { const a = []; for (let y = 2000; y <= 2026; y++) for (let m = 0; m < 12; m++) { const uu = yearU(Date.UTC(y, m, 1)); if (uu > .001) a.push({ y: y + m / 12, yr: y, m, lvl: m ? 2 : y % 5 ? 1 : 0, r: GAL_R0 + uu * GAL_LEN }) } return a })();
let ringHov = null, mapStars = 0; const mapLvl = [1, 0, 0];   // how much each ring level shows at this zoom; whether single winners can be picked
function ringAt(x, y, lvlOn) {
  if (!groundAt(x, y)) return null; const l = toLocal(_hit, tmp), rr = Math.hypot(l.x, l.z), th = Math.atan2(l.z, l.x);
  let best = null, bd = 9;   // px
  for (const R of RING_LIST) {
    if (lvlOn[R.lvl] < .35 || Math.abs(R.r - rr) > R.r * .2) continue;
    const a = ringPoint((R.r - GAL_R0) / GAL_LEN, th, 0, tmp2).project(camera), sx = (a.x * .5 + .5) * innerWidth, sy = (-a.y * .5 + .5) * innerHeight, d = Math.hypot(sx - x, sy - y);
    if (a.z < 1 && d < bd) { bd = d; best = { ...R, th } }
  }
  return best;
}
function mapHover(x, y) { const i = mapStars > .5 ? pick(x, y) : -1; return i >= 0 ? { i, ring: null } : { i: -1, ring: ringAt(x, y, mapLvl) } }
function ringZoom(R) {   // dive to the ring at the point you clicked, close enough to pick out single winners
  timeRings.u.hi.value = R.y; timeRings.u.hiA.value = 1;
  orbit.target.copy(ringPoint((R.r - GAL_R0) / GAL_LEN, SPIRAL ? armPhase(R.r) : R.th, 0));   // on the spiral: where the date sits on it
  orbit.dist = Math.min(orbit.dist * .5, 70000); const o = orbitPose(); tweenCam(o.p, o.q, 1.6);
}
canvas.addEventListener('pointerup', endPtr); canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') mouse.in = false });
canvas.addEventListener('contextmenu', e => e.preventDefault());
// map zoom goes toward whatever is under the cursor (a winner if you're over one), so you can dive all the way into a star
function zoom(dy, x = innerWidth / 2, y = innerHeight / 2) {
  if (tween || S.mode !== 'map') return; const d0 = orbit.dist, d1 = Math.max(MAP_MIN, Math.min(4e7, d0 * Math.exp(dy * .0012))), k = d1 / d0;
  let P = null; if (hovI >= 0) P = starPos(hovI, tmp); else if (groundAt(x, y)) P = _hit;
  if (P && P.distanceTo(orbit.target) < orbit.dist * 8) orbit.target.sub(P).multiplyScalar(k).add(P);   // the point under the cursor stays put
  orbit.dist = d1;
}
canvas.addEventListener('wheel', e => { e.preventDefault(); if (S.mode === 'map') zoom(e.deltaY, e.clientX, e.clientY); else rig.dist = Math.max(1.2 * SHIP_SC, Math.min(9 * SHIP_SC, rig.dist * Math.exp(e.deltaY * .001))) }, { passive: false });
['keydown', 'mousemove', 'pointerdown', 'wheel', 'touchstart'].forEach(t => addEventListener(t, () => { lastInput = performance.now() }, { passive: true }));
addEventListener('keydown', e => {
  if (e.target.matches('input,select,textarea')) return;
  const k = e.key.toLowerCase(); keys[k] = true; if (k === ' ' && !e.target.closest('button,input,select,textarea')) e.preventDefault();
  if (!booted) return;
  if (k === 'm') setMode(S.mode === 'fly' ? 'map' : 'fly');
  if (k === 'enter' && coach.skip()) { e.preventDefault(); return }   // the first-flight steps: Enter skips one
  if (k === 'h') goHome();
  if (k === 'c') $('lbtn').click();   // C opens and closes the Look panel
  if (k === 'r' && !e.repeat) setRings(!LOOK.rings);   // R: rings game on/off
  if (k === 'escape' && tour.on) stopTour();
  if (k === 'escape' && mapZone.on) mapZone.clear();
  if (k === 'escape' && (rmenu.open || rmenu.panel)) { rmenu.close(); return }
  if (k === '/') { e.preventDefault(); keys[k] = false; rmenu.sub('search') }   // / searches
  if ((k === 'arrowup' || k === 'arrowdown') && S.mode === 'fly' && !rmenu.panel) { keys[k] = false; e.preventDefault(); if (!e.repeat) setSpeedMode(speedMode + (k === 'arrowup' ? 1 : -1)) }   // ↑ ↓: speed mode
  if ((k === 'arrowleft' || k === 'arrowright') && S.mode === 'fly' && !rmenu.panel) { keys[k] = false; e.preventDefault(); if (!e.repeat) stepByDist(k === 'arrowright' ? 1 : -1) }   // ← a nearer winner, → a farther one (of those in hover reach), locked on or not
  if (k === 'q' && S.mode === 'fly' && !e.repeat) { if (locked()) { freeMouse = true; document.exitPointerLock() } else { freeMouse = false; if (!lockFailed && !coarse) requestLock() } }   // Q: a plain mouse pointer to click things with (Q again, or a click on the sky, to fly)
});
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; mouse.in = false });
[['brake', v => touchBrake = v]].forEach(([id, to]) => { const b = $(id), set = v => { to(v); b.classList.toggle('on', v) }; b.addEventListener('pointerdown', e => { e.preventDefault(); set(true); buzz(8); try { b.setPointerCapture(e.pointerId) } catch { } }); ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, () => set(false))); b.addEventListener('contextmenu', e => e.preventDefault()) });   // captured, so a thumb sliding off keeps braking
// thrust: hold to fly; the button grows into a track above your thumb, and sliding up it to the top boosts
{ const b = $('thrust'); let y0 = 0, id = -1;
  const slide = k => { b.style.setProperty('--k', k.toFixed(3)); const on = k > .92; if (on !== touchBoost) { touchBoost = on; b.classList.toggle('boost', on); if (on) buzz(14) } };
  const end = () => { if (id < 0) return; id = -1; touchThrust = false; b.classList.remove('on'); slide(0) };
  b.addEventListener('pointerdown', e => { e.preventDefault(); id = e.pointerId; y0 = e.clientY; touchThrust = true; b.classList.add('on'); slide(0); buzz(8); try { b.setPointerCapture(id) } catch { } });
  b.addEventListener('pointermove', e => { if (e.pointerId !== id) return; const span = Math.max(40, Math.min(232, innerHeight * .46) - 76); slide(Math.min(1, Math.max(0, (y0 - e.clientY) / span))) });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(t => b.addEventListener(t, e => { if (e.pointerId === id) end() })); b.addEventListener('contextmenu', e => e.preventDefault()) }

/* ───────────────────────── picking ───────────────────────── */
// ← and →: every winner by distance from you. With nothing locked either key goes to the nearest one, wherever it is;
// from the one you're locked on, ← steps to the next nearer and → to the next farther
let passedI = -1;   // the ring you just went through: the arrows skip it until you lock onto another
function stepByDist(dir) {
  coach.arrow = true;
  const cand = [], pp = player.pos; for (let i = 0; i < N; i++) { if (TA[i] < 1 || i === passedI) continue; const dx = P[i * 3] - pp.x, dy = P[i * 3 + 1] - pp.y, dz = P[i * 3 + 2] - pp.z; cand.push([dx * dx + dy * dy + dz * dz, i]) }
  if (!cand.length) return; cand.sort((a, b) => a[0] - b[0]);
  const k = lockI >= 0 ? cand.findIndex(c => c[1] === lockI) : -1, j = k < 0 ? cand[0] : cand[Math.max(0, Math.min(cand.length - 1, k + dir))];
  if (!j || j[1] === lockI) return; focus(j[1]); auto = null; aimFast = .7;
}
const _vp = new THREE.Matrix4();
const pxJS = () => innerHeight * .55 * DPR;                        // CPU twin of the shaders' point-size scale
const starPx = (i, w) => SIZE[i] * LOOK.starSize * pxJS() / w / DPR;   // a winner's sprite size in CSS pixels at view depth w
// aim assist: the visible winner (3 px or larger) nearest the screen centre, measured against its own capture radius:
// the base radius plus the star's size on screen, so close-by winners are much easier to catch
function pickNear(x, y, Rr) {
  _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); const e = _vp.elements, W = innerWidth, H = innerHeight; let best = -1, bs = 1, bd = 0, bR = Rr;
  for (let i = 0; i < N; i++) {
    if (TA[i] < 1 || i === lockI) continue; const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2], w = e[3] * px + e[7] * py + e[11] * pz + e[15]; if (w < .5 || w > (LOOK.hoverDist ?? 4e5)) continue; const spx = starPx(i, w); if (spx < (LOOK.hoverPx ?? 2.5)) continue;   // aim assist reaches exactly as far as hovering does
    const X = ((e[0] * px + e[4] * py + e[8] * pz + e[12]) / w * .5 + .5) * W, Y = (-(e[1] * px + e[5] * py + e[9] * pz + e[13]) / w * .5 + .5) * H, d = Math.hypot(X - x, Y - y), R_ = Rr + Math.min(Rr * 4, spx * .6), s = d / R_;
    if (s < bs) { bs = s; best = i; bd = d; bR = R_ }
  }
  return best < 0 ? null : { i: best, d: bd, R: bR };
}
function pick(x, y) {
  _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse); const e = _vp.elements, W = innerWidth, H = innerHeight; let best = -1, bd = Infinity;
  for (let i = 0; i < N; i++) {
    if (TA[i] < 1) continue; const px = P[i * 3], py = P[i * 3 + 1], pz = P[i * 3 + 2], w = e[3] * px + e[7] * py + e[11] * pz + e[15]; if (w < .5) continue;
    const X = ((e[0] * px + e[4] * py + e[8] * pz + e[12]) / w * .5 + .5) * W, Y = (-(e[1] * px + e[5] * py + e[9] * pz + e[13]) / w * .5 + .5) * H;
    const d = Math.hypot(X - x, Y - y), rad = Math.max(14, starPx(i, w) * .5);
    if (d < rad) { const score = d / rad + w * .000003; if (score < bd) { bd = score; best = i } }
  }
  return best;
}
let magI = -1, magS = 1;
function aimAssist(dt) {
  let s = 1; magI = -1; if (!booted || introActive) return;
  if (aimFast > 0 && lockI >= 0 && S.mode === 'fly') { aimFast -= dt; aimAt(starPos(lockI, tmp).sub(camera.position), 1 - Math.exp(-12 * dt)) }   // a quick swing onto a star you stepped to
  if (S.mode === 'fly' && LOOK.magnet > 0 && (locked() || coarse) && openA < .3 && !auto) { const Rr = LOOK.magnetR, h = pickNear(innerWidth / 2, innerHeight / 2, Rr); if (h) { magI = h.i; aimAt(starPos(h.i, tmp).sub(camera.position), 1 - Math.exp(-LOOK.magnet * 7 * dt)); s = .35 + .65 * Math.min(1, h.d / h.R) } }
  if (lockI >= 0) { s = 1; magI = -1 }   // locked on: the reticle holds still
  magS += (s - magS) * Math.min(1, dt * 10); crossEl.classList.toggle('mag', magI >= 0);
}
