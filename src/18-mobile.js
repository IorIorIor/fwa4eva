/* ───────────────────────── the phone as a portal ─────────────────────────
   On a phone the screen is a window into the galaxy: tilt it and the view swings round your ship (or the map's centre),
   so the stars behind slide past the ship like the world behind a pane of glass. It settles on however you hold the
   phone, so only the movement counts. With Tilt on, the phone steers instead: lean it and the ship turns that way. */
const portal = (() => {
  const st = { has: false, asked: false, b: 0, g: 0, bx: 0, by: 0, x: 0, y: 0, sx: 0, sy: 0, steer: false, cx: 0, cy: 0 }, savedP = new V3(), savedQ = new Q4(), _q1 = new Q4(), _q2 = new Q4(), _ax2 = new V3();
  let applied = false;
  const onOri = e => { if (e.beta == null) return; if (!st.has) { st.has = true; const t = tilt(e.beta, e.gamma); st.bx = st.cx = t.x; st.by = st.cy = t.y; btn.hidden = false } st.b = e.beta; st.g = e.gamma };
  function tilt(b, g) {   // the phone's lean in screen terms, whichever way round it is held
    const a = (screen.orientation && screen.orientation.angle) ?? window.orientation ?? 0;
    return a === 90 ? { x: b, y: -g } : a === -90 || a === 270 ? { x: -b, y: g } : a === 180 ? { x: -g, y: -b } : { x: g, y: b };
  }
  function ask() {   // iPhones only hand out the tilt from inside a tap
    if (st.asked || !coarse) return; st.asked = true;
    const D_ = window.DeviceOrientationEvent; if (!D_) return;
    if (typeof D_.requestPermission === 'function') D_.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onOri) }).catch(() => { });
    else addEventListener('deviceorientation', onOri);
  }
  const btn = document.createElement('button'); btn.className = 'hud'; btn.id = 'tiltBtn'; btn.type = 'button'; btn.hidden = true; btn.textContent = 'Tilt'; btn.setAttribute('aria-pressed', 'false'); document.body.appendChild(btn);
  const setSteer = on => { st.steer = on; btn.classList.toggle('on', on); btn.setAttribute('aria-pressed', on); const t = tilt(st.b, st.g); st.cx = t.x; st.cy = t.y; buzz(on ? [10, 40, 10] : 10) };
  btn.addEventListener('click', () => { ask(); setSteer(!st.steer); LOOK.tiltSteer = st.steer ? 1 : 0; saveLook() });
  ['pointerdown', 'click'].forEach(t => addEventListener(t, ask, { capture: true, passive: true }));
  return {
    get on() { return st.has },
    get steering() { return st.steer },
    ask,
    restore() { if (applied) { camera.position.copy(savedP); camera.quaternion.copy(savedQ); applied = false } },   // the frame starts from the real camera
    update(rdt) {   // after the camera has been placed: swing it, and steer
      if (!st.has || !booted || intro.active) return;
      const L = LOOK, t = tilt(st.b, st.g);
      const k = 1 - Math.exp(-rdt / Math.max(.3, L.portalSettle ?? 2.5)); st.bx += (t.x - st.bx) * k; st.by += (t.y - st.by) * k;   // where you hold it drifts back to centre
      const dx = Math.max(-1, Math.min(1, (t.x - st.bx) / 30)), dy = Math.max(-1, Math.min(1, (t.y - st.by) / 30)), s = 1 - Math.exp(-rdt * 12);
      st.x += (dx - st.x) * s; st.y += (dy - st.y) * s;
      const fly = S.mode === 'fly'; if (fly && !!(L.tiltSteer ?? 0) !== st.steer) setSteer(!!L.tiltSteer);   // (the switch in Look, too)
      if (st.steer && fly && !warp && !rmenu.open && !rmenu.panel) {   // lean to turn: past a small dead zone, faster the further you lean
        const dz = L.tiltDead ?? 3, f = v => Math.sign(v) * Math.max(0, Math.abs(v) - dz) / 25, r = (L.tiltRate ?? 1.6) * rdt;
        rotateRig(-f(t.x - st.cx) * r, -f(t.y - st.cy) * r); return;
      }
      const amt = (L.portal ?? 1) * .45; if (!amt || (st.steer && fly)) return;
      const piv = fly ? player.pos : orbit.target;
      savedP.copy(camera.position); savedQ.copy(camera.quaternion); applied = true;
      _q1.setFromAxisAngle(_ax2.set(0, 1, 0).applyQuaternion(savedQ), -st.x * amt); _q2.setFromAxisAngle(_ax2.set(1, 0, 0).applyQuaternion(savedQ), -st.y * amt * .7); _q1.multiply(_q2);
      camera.position.sub(piv).applyQuaternion(_q1).add(piv); camera.quaternion.premultiply(_q1); camera.updateMatrixWorld();
    },
  };
})();
// phones: pull a sheet down by its top edge and it goes
if (matchMedia('(max-width:760px)').matches) ['panel', 'lookPanel', 'rmPanel'].forEach(id => {
  const el = $(id); let y0 = null, dy = 0;
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.clientY - el.getBoundingClientRect().top > 46 || e.target.closest('input,button,select,textarea')) return; y0 = e.clientY; dy = 0; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId) } catch { } });
  el.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); if (id === 'rmPanel') el.style.setProperty('--dy', dy + 'px'); else el.style.transform = `translateY(${dy}px)` });
  const up = () => { if (y0 == null) return; y0 = null; el.classList.remove('drag'); el.style.transform = ''; el.style.removeProperty('--dy'); if (dy > 80) { buzz(8); if (id === 'rmPanel') rmenu.close(); else if (el.classList.contains('open')) togglePanel(id) } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
});
