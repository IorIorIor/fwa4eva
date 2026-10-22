/* ───────────────────────── scroll mode ─────────────────────────
   The archive as one long scroll: you start out at the rim (2000) and every scroll carries you along the spiral, inward
   and forward in time, to today at the core. The view looks down on the stretch of spiral you're at, turning with it so
   the way on is always up the screen, and wide enough to show every winner there: click one to zoom in, × to go back. */
scrollMode = (() => {
  const el = document.createElement('div'); el.id = 'scrollUi'; el.className = 'hud'; el.hidden = true;
  el.innerHTML = '<div class="sdate"></div><div class="shint">Scroll to travel through time</div><button type="button" class="sx" aria-label="Back to the scroll" hidden>×</button><button type="button" class="sexit">Exit scroll</button>';
  document.body.appendChild(el);
  const dateEl = el.querySelector('.sdate'), xBtn = el.querySelector('.sx'), hint = el.querySelector('.shint');
  const st = { on: false, t: T_A, tc: T_A, th: null, zoom: -1, moved: 0 }, a = new V3(), b = new V3();
  const T_END = () => Math.min(T_B, Date.now());
  const spine = (t, out) => galPoint(GAL, 0, yearU(t), 0, 0, 0, out);
  function pose() {   // the camera's orbit for the time the view is easing toward
    const L = LOOK, t = st.tc, u = yearU(t), r = GAL_R0 + u * GAL_LEN, days = Math.max(5, L.scrollDays ?? 45);
    spine(t, a); spine(Math.min(T_END(), t + 864e5 * 10), b);   // ten days on: which way the spiral goes from here, and how fast
    const lb = toLocal(b, new V3()).sub(toLocal(a, new V3())), per = lb.length() / 10;   // units of spiral per day here
    const wk = armWAt(r) / (SHAPE.widen + 1), band = (7700 + r * .045) * .7 * (SHAPE.bw ?? 1) * wk * 4;   // the winners' band across the arm (±2σ)
    const vh = 2 * Math.tan(LOOK.fov * Math.PI / 360);   // view height per unit of distance
    orbit.dist = Math.max(MAP_MIN, per * days / vh, band / (vh * Math.max(.5, camera.aspect))) * (L.scrollHeight ?? 1);
    const la = toLocal(a, new V3()), tg = lb.clone().setY(0).normalize(), out = new V3(-tg.z, 0, tg.x); if (out.dot(la) < 0) out.negate();   // along the spiral (the way on) and across it (outward)
    orbit.target.copy(la).addScaledVector(tg, (L.scrollAhead ?? 0) * orbit.dist * vh).addScaledVector(out, (L.scrollSide ?? 0) * band * .5).applyQuaternion(GQ).add(GC);
    const th = Math.atan2(-lb.x, -lb.z); if (st.th == null) st.th = th; else st.th += ((th - st.th + 3 * Math.PI) % (2 * Math.PI)) - Math.PI;   // the way on points up the screen, turning with the spiral
    orbit.theta = st.th + (L.scrollTurn ?? 0) * Math.PI / 180; orbit.phi = Math.min(Math.PI / 2, Math.max(.001, (L.scrollTilt ?? 25) * Math.PI / 180)); orbit.mir = false; orbit.flip = false;
  }
  const MONTH = 'January February March April May June July August September October November December'.split(' ');
  function step(dt) {
    if (!st.on) return;
    const L = LOOK, kv = (keys.arrowdown || keys.s ? 1 : 0) - (keys.arrowup || keys.w ? 1 : 0);
    if (kv) st.t += kv * dt * 864e5 * (L.scrollDays ?? 45);   // ↑/↓: a screenful a second
    st.t = Math.max(T_A, Math.min(T_END(), st.t));
    st.tc += (st.t - st.tc) * (1 - Math.exp(-dt * (L.scrollEase ?? 5)));
    const d = new Date(st.tc); dateEl.textContent = `${MONTH[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
    if (st.zoom >= 0) return;   // zoomed in on a winner: the camera is the map's, until ×
    pose(); if (tween && tween.mode) { const o = orbitPose(); tween.tp = o.p; tween.tq = o.q }   // easing in from wherever you were
  }
  function wheel(e) {
    if (st.zoom >= 0) return; const d = (e.deltaMode ? e.deltaY * 33 : e.deltaY); st.t += d / 100 * 864e5 * (LOOK.scrollSpeed ?? 15); st.moved += Math.abs(d);
    if (st.moved > 300) hint.classList.add('gone');
  }
  function drag(dy) { if (st.zoom >= 0) return; st.t += -dy / Math.max(200, innerHeight) * 864e5 * (LOOK.scrollDays ?? 45) * 1.2; st.moved += Math.abs(dy); if (st.moved > 300) hint.classList.add('gone') }   // drag the scroll like a page: the spiral follows your finger
  function zoomed(i) { st.zoom = i; xBtn.hidden = false; st.t = st.tc = Date.parse(D[i].date + 'T00:00:00Z') }   // the scroll moves to its date: × brings you back out right there
  function unzoom() { if (st.zoom < 0) return; st.zoom = -1; xBtn.hidden = true; showCard(-1); S.mapPick = -1; pose(); const o = orbitPose(); tweenCam(o.p, o.q, 1.4) }
  function enter() {
    if (st.on) return; st.on = true; st.zoom = -1; st.th = null; st.moved = 0; hint.classList.remove('gone'); xBtn.hidden = true;
    if (st.t <= T_A + 864e5 || st.t >= T_END()) st.t = st.tc = T_A + 864e5 * 3; st.tc = st.t;   // from the rim, the first days of the archive
    document.body.classList.add('scrolling'); el.hidden = false;
    if (S.mode !== 'map') setMode('map'); else { pose(); const o = orbitPose(); tweenCam(o.p, o.q, 1.6) }
    if (isOpen('panel')) togglePanel('');   // (closes it without remembering that as your choice)
  }
  function exit(toFly = false) { if (!st.on) return; st.on = false; st.zoom = -1; document.body.classList.remove('scrolling'); el.hidden = true; if (toFly) setMode('fly'); else goHome() }
  xBtn.onclick = unzoom; el.querySelector('.sexit').onclick = () => exit();
  el.addEventListener('pointerdown', e => e.stopPropagation());
  addEventListener('keydown', e => { if (!st.on || e.target.closest && e.target.closest('input,textarea')) return; if (e.key === 'Escape') { if (st.zoom >= 0) unzoom(); else exit() } });
  return { get on() { return st.on }, get zoom() { return st.zoom }, step, wheel, drag, zoomed, unzoom, enter, exit, st };
})();
