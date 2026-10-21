/* ───────────────────────── the navigator: search, next/previous, a timeline to scrub to a day ─────────────────────────
   Always on screen. Type to find a winner by title or agency; ‹ › (or ← → while locked on a star) step through the
   archive by date; the timeline under it scrolls or drags day by day: push harder and it runs faster, go gently and it's
   precise, with a faint tick for every day you pass. Wherever it rests, the ship locks onto that day's winner. */
const DAY0 = Date.UTC(2000, 0, 1), dayIdx = s => Math.round((Date.parse(s + 'T00:00:00Z') - DAY0) / 864e5);
const W_DAY = new Int32Array(N); for (let i = 0; i < N; i++) W_DAY[i] = dayIdx(D[i].date);
const NAV_DAYS = Math.max(W_DAY[N - 1] + 30, dayIdx(new Date().toISOString().slice(0, 10)));
function flyTo(i) {   // lock on and let the autopilot take you there (on the map: the camera goes); with warp on, jump
  if (i < 0) return; focus(i); if (S.mode !== 'fly') return;
  if (LOOK.warp && player.pos.distanceTo(starPos(i, tmp)) > stopR(i) * 40) startWarp(i); else auto = { i, dest: null };
}
// warp: a few seconds at (nearly) light speed straight to the star, the streaks and the Doppler swelling and fading on the way
let warp = null;
function startWarp(i) {
  const to = starPos(i, new V3()), from = player.pos.clone(), back = from.clone().sub(to), bl = back.length() || 1;
  warp = { i, from, to, dest: to.clone().addScaledVector(back, dockDist(i) * 1.5 / bl), t: 0, turn: Math.max(0, LOOK.warpTurn ?? 1.1), dur: Math.max(.6, LOOK.warpTime ?? 2.4), prev: from.clone(), eT: 0 }; auto = null; curStrand = null;
}
function stepWarp(dt) {
  // first the ship turns to face it (eased, standing still), then it goes: a slow start, very fast in the middle, a long soft arrival
  const w = warp; w.t += dt; thrusting = false; w.prev.copy(player.pos);
  if (w.t < w.turn) { const q = w.t / w.turn, e = q * q * (3 - 2 * q), k = w.eT >= 1 ? 1 : (e - w.eT) / (1 - w.eT); w.eT = e; aimAt(tmp.copy(w.to).sub(player.pos), Math.max(0, Math.min(1, k))); player.quat.copy(rig.q); player.base.copy(player.quat); player.vel.set(0, 0, 0); return }
  const p = Math.min(1, (w.t - w.turn) / w.dur), n = Math.max(1, LOOK.warpEase ?? 4), e = p < .5 ? Math.pow(2 * p, n) / 2 : 1 - Math.pow(2 - 2 * p, n) / 2;
  player.pos.lerpVectors(w.from, w.dest, e);
  player.vel.copy(w.dest).sub(w.from).setLength(LIGHT * .97 * Math.pow(Math.sin(Math.PI * p), 1.5) + 1);   // what the speed effects read: up to light speed and back
  aimAt(tmp.copy(w.to).sub(player.pos), 1 - Math.exp(-10 * dt)); player.quat.copy(rig.q); player.base.copy(player.quat);
  if (p >= 1) { player.vel.set(0, 0, 0); warp = null }
}
// tours: a list of winners, flown one after another, pausing at each so its record can open. Any thrust or brake ends it
const tour = { ids: [], k: -1, wait: 0, on: false, name: '' };
function startTour(ids, name) { if (!ids.length) return; Object.assign(tour, { ids, k: -1, on: true, name }); nextStop() }
function stopTour() { tour.on = false; $('tourPill').hidden = true }
function nextStop() {
  if (++tour.k >= tour.ids.length) return stopTour(); flyTo(tour.ids[tour.k]); tour.wait = LOOK.tourDwell ?? 6;
  const p = $('tourPill'); p.hidden = false; p.innerHTML = `<b>${esc(tour.name)}</b> ${tour.k + 1} / ${tour.ids.length}<button type="button" aria-label="Stop the tour">×</button>`;
}
function tourUpdate(dt) {
  if (!tour.on) return; if (keys.w || keys.s || keys.shift || touchThrust || touchBrake || S.mode !== 'fly') return stopTour();
  const i = tour.ids[tour.k]; if (warp || auto || nearI !== i) return; if ((tour.wait -= dt) <= 0) nextStop();
}
const TOURS = {
  'Every FWA of the Year': () => D.flatMap((d, i) => d.award === 'FOTY' && TA[i] === 1 ? [i] : []),
  'Sites of the Month, one year': () => { const y = lockI >= 0 ? D[lockI].year : 2000 + Math.floor(Math.random() * 26); return D.flatMap((d, i) => d.award === 'SOTM' && d.year === y && TA[i] === 1 ? [i] : []) },
  'This agency': () => { const a = lockI >= 0 ? D[lockI].agency : ''; return a ? D.flatMap((d, i) => d.agency === a ? [i] : []) : [] },
  'Surprise me': () => { const m = D.flatMap((d, i) => TA[i] === 1 ? [i] : []); for (let k = m.length - 1; k > 0; k--) { const j = Math.random() * (k + 1) | 0; [m[k], m[j]] = [m[j], m[k]] } return m.slice(0, 12).sort((a, b) => a - b) },
};
let aimFast = 0;   // seconds left of a quick turn onto the locked star
function navStep(dir, from = lockI >= 0 ? lockI : cardI >= 0 ? cardI : nav.pick, how = 'fly') {   // the next matching winner by date: fly there, or ('turn') just swing round and lock on
  let j = from < 0 ? (dir > 0 ? -1 : N) : from;
  do j += dir; while (j >= 0 && j < N && TA[j] < 1);
  if (j < 0 || j >= N) return; nav.show(W_DAY[j], j);
  if (how === 'turn' && S.mode === 'fly') { focus(j); auto = null; aimFast = .7 } else flyTo(j);
}
const nav = (() => {
  const q = $('navQ'), res = $('navRes'), tl = $('navTl'), cv = tl.querySelector('canvas'), g = cv.getContext('2d'), dayEl = $('navDay');
  q.placeholder = `Search ${N.toLocaleString('en')} FWAs   /`;
  let cur = W_DAY[N - 1], pick = -1, idle = 0, hits = [], sel = 0, lastTick = 0;
  // the winner nearest a day (matching the filter)
  const nearestOn = day => {
    let lo = 0, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (W_DAY[m] < day) lo = m + 1; else hi = m }
    let a = lo - 1, b = lo; while (a >= 0 && TA[a] < 1) a--; while (b < N && TA[b] < 1) b++;
    if (a < 0) return b < N ? b : -1; if (b >= N) return a; return day - W_DAY[a] <= W_DAY[b] - day ? a : b;
  };
  const fmtDay = d => { const t = new Date(DAY0 + d * 864e5); return `${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}` };
  // per month, how many winners: the timeline's faint histogram
  const months = new Float32Array(Math.ceil(NAV_DAYS / 30.44) + 1);
  const hist = () => { months.fill(0); for (let i = 0; i < N; i++) if (TA[i] >= 1) months[Math.floor(W_DAY[i] / 30.44)]++ };
  function draw() {
    const w = cv.clientWidth, h = cv.clientHeight, k = devicePixelRatio || 1; if (!w) return;
    if (cv.width !== Math.round(w * k)) { cv.width = Math.round(w * k); cv.height = Math.round(h * k) } g.setTransform(k, 0, 0, k, 0, 0); g.clearRect(0, 0, w, h);
    const x = d => d / NAV_DAYS * w, mx = Math.max(1, ...months);
    g.fillStyle = 'rgba(255,255,255,.22)'; for (let m = 0; m < months.length; m++) if (months[m]) { const hh = 2 + months[m] / mx * (h - 12); g.fillRect(x(m * 30.44), h - hh, Math.max(1, x(30.44) - .6), hh) }
    g.fillStyle = 'rgba(255,255,255,.55)'; g.font = '9px "Paper Mono", monospace'; g.textBaseline = 'top';
    for (let y = 2000; y <= 2026; y++) { const d = (Date.UTC(y, 0, 1) - DAY0) / 864e5, X = x(d); g.fillRect(X, 0, 1, y % 5 ? 3 : 6); if (y % 5 === 0 && X < w - 24) g.fillText(String(y), X + 3, 1) }
    const X = x(cur); g.fillStyle = '#fff'; g.fillRect(Math.round(X) - .5, 0, 1.5, h);
    if (pick >= 0) { g.fillStyle = 'rgba(255,214,140,.95)'; g.fillRect(x(W_DAY[pick]) - 1.5, h - 5, 3, 5) }
    dayEl.style.left = Math.max(60, Math.min(w - 60, X)) + 'px';
  }
  function show(day, i) {
    cur = Math.max(0, Math.min(NAV_DAYS, day)); pick = i ?? nearestOn(Math.round(cur));
    dayEl.innerHTML = `<b>${fmtDay(Math.round(cur))}</b>` + (pick >= 0 ? esc(D[pick].title) + (W_DAY[pick] !== Math.round(cur) ? ` <b>· ${fmtDay(W_DAY[pick])}</b>` : '') : '');
    draw();
  }
  function tickSound() {   // a very soft click per day: a few milliseconds of a high sine
    if (!AC || muted || AC.state !== 'running' || !out) return; const t = AC.currentTime; if (t - lastTick < .022) return; lastTick = t;
    const o = AC.createOscillator(), gn = AC.createGain(); o.type = 'sine'; o.frequency.value = 2600 + Math.random() * 300;
    gn.gain.setValueAtTime(0, t); gn.gain.linearRampToValueAtTime(.018, t + .001); gn.gain.exponentialRampToValueAtTime(.0001, t + .03); o.connect(gn); gn.connect(out); o.start(t); o.stop(t + .04);
  }
  function scrub(dd) {   // move by dd days (fractional): a tick for each whole day crossed, then point at that day's winner
    const a = Math.floor(cur); show(cur + dd); if (Math.floor(cur) !== a) tickSound();
    tl.classList.add('live'); idle = .45;
  }
  // wheel: the harder the flick, the further each notch goes (gently: a day at a time)
  tl.addEventListener('wheel', e => { e.preventDefault(); e.stopPropagation(); const d = (Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY) * (e.deltaMode ? 33 : 1); scrub(Math.sign(d) * Math.pow(Math.abs(d) / 9, 1.8)) }, { passive: false });
  // drag: the same, by how fast you move; a tap without dragging jumps straight to that day
  let dn = null;
  tl.addEventListener('pointerdown', e => { if (e.target === dayEl) return; e.preventDefault(); dn = { x: e.clientX, moved: false }; try { tl.setPointerCapture(e.pointerId) } catch (er) { } });
  tl.addEventListener('pointermove', e => { if (!dn) return; const dx = e.clientX - dn.x; if (Math.abs(dx) < 1) return; dn.x = e.clientX; dn.moved = true; scrub(dx * .35 * Math.pow(1 + Math.abs(dx) / 3, 1.9)) });
  tl.addEventListener('pointerup', e => { if (dn && !dn.moved) { const r = cv.getBoundingClientRect(); show((e.clientX - r.left) / r.width * NAV_DAYS); tl.classList.add('live'); idle = .01 } dn = null });
  dayEl.onclick = () => flyTo(pick);
  // search: title or agency, every word must match; best first (title starts with it, then jury score)
  function find() {
    const words = q.value.toLowerCase().split(/\s+/).filter(Boolean); hits = []; sel = 0;
    if (words.length) for (let i = 0; i < N && hits.length < 400; i++) { const t = (D[i].title + ' ' + D[i].agency).toLowerCase(); if (words.every(w => t.includes(w))) hits.push(i) }
    hits.sort((a, b) => (D[b].title.toLowerCase().startsWith(words[0]) - D[a].title.toLowerCase().startsWith(words[0])) || D[b].score - D[a].score); hits.length = Math.min(hits.length, 8);
    res.hidden = !hits.length; res.innerHTML = hits.map((i, k) => `<button type="button" data-i="${i}" class="${k ? '' : 'on'}"><span>${esc(D[i].title)}</span><small>${esc(D[i].agency || '')} · ${fmtDay(W_DAY[i])}</small></button>`).join('');
  }
  const choose = i => { if (i == null || i < 0) return; show(W_DAY[i], i); flyTo(i); q.value = ''; res.hidden = true; q.blur(); window.__navPicked?.() };
  q.oninput = find;
  q.onkeydown = e => {
    e.stopPropagation();
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (!hits.length) return; sel = (sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length; res.querySelectorAll('button').forEach((b, k) => b.classList.toggle('on', k === sel)) }
    else if (e.key === 'Enter') choose(hits[sel]);
    else if (e.key === 'Escape') { q.value = ''; res.hidden = true; q.blur() }
  };
  q.onkeyup = e => e.stopPropagation();
  q.onblur = () => setTimeout(() => { if (document.activeElement !== q) res.hidden = true }, 150);
  q.onfocus = () => { if (document.pointerLockElement) document.exitPointerLock(); if (q.value) find() };
  res.onpointerdown = e => { const b = e.target.closest('button'); if (b) { e.preventDefault(); choose(+b.dataset.i) } };
  $('tourPill').onclick = e => { if (e.target.closest('button')) stopTour() };
  $('navPrev').onclick = () => navStep(-1); $('navNext').onclick = () => navStep(1);
  $('navFilter').onclick = () => { togglePanel('panel'); $('navFilter').setAttribute('aria-expanded', $('panel').classList.contains('open')) };
  // the tooltip's ‹ › step on from the star it's showing
  tip.addEventListener('click', e => { const n = e.target.dataset && e.target.dataset.n; if (!n) return; const m = /^[hp](\d+)/.exec(tipFor); navStep(+n, m ? +m[1] : -1, 'turn') });   // the star swings to the middle, so the tooltip (and these arrows) land where they were
  addEventListener('resize', draw);
  hist(); show(cur); window.__navHist = () => { hist(); draw() };
  return {
    get pick() { return pick }, show, hist, tick: tickSound, find,
    update(dt) {   // once the scrubbing rests, the ship locks onto that day's winner
      if (idle > 0 && (idle -= dt) <= 0) { tl.classList.remove('live'); if (pick >= 0 && pick !== lockI && booted) focus(pick) }
      if (!dn && !tl.matches(':hover') && idle <= 0 && lockI >= 0 && lockI !== pick) show(W_DAY[lockI], lockI);   // and it follows your lock
    },
  };
})();
