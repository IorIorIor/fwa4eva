/* ───────────────────────── AI pilots ─────────────────────────
   A few pilots with personalities share the sky. Their routes come from the clock: every page works out the same
   plan for today from the same seed, so everyone online sees each AI pilot in the same place, with no server. They fly
   in as ordinary peers (cursor, trail, pilot list). The Tourist is the one exception: it's yours alone, it comes to see you. */
const aiPilots = (() => {
  const DAY = Math.floor(Date.now() / 864e5), T0 = DAY * 86400, now = () => Date.now() / 1000;
  const dateOf = i => D[i].date, byAward = a => { const r = []; for (let i = 0; i < N; i++) if (D[i].award === a) r.push(i); return r };
  const FOTY = byAward('FOTY');
  const AG = (() => { const m = new Map(); for (let i = 0; i < N; i++) { const a = D[i].agency; if (a) { if (!m.has(a)) m.set(a, []); m.get(a).push(i) } } return [...m.values()].filter(v => v.length >= 8) })();
  const TODAY = (() => { const t = new Date(), md = d => d.slice(5); const want = new Set(); for (let k = -3; k <= 3; k++) { const x = new Date(Date.UTC(2000, t.getUTCMonth(), t.getUTCDate() + k)); want.add(x.toISOString().slice(5, 10)) } const r = []; for (let i = 0; i < N; i++) if (want.has(md(dateOf(i)))) r.push(i); return r.length ? r : FOTY })();
  const _a = new V3(), _b = new V3(), _p = new V3(), _q = new V3();
  const nearestOf = (from, cands, skip) => { starPos(from, _a); let best = cands[0], bd = Infinity; for (const j of cands) { if (j === from || (skip && skip.has(j))) continue; const d = starPos(j, _b).distanceToSquared(_a); if (d < bd) { bd = d; best = j } } return best };
  const rnd = (rng, n) => Math.floor(rng() * n);
  // who they are: how fast, how long they linger, how much their paths bow, and how they choose the next winner
  const CAST = [
    { id: 'ai-archivist', name: 'The Archivist', hue: 34, speed: 9e4, dwell: 5, arc: .1, start: () => (DAY * 137) % N, next: s => (s.i + 1) % N },   // every winner, in date order
    { id: 'ai-soty', name: 'SOTY Hunter', hue: 48, speed: 6e5, dwell: 2.5, arc: .08, start: r => FOTY[rnd(r, FOTY.length)], next: (s, r) => FOTY[rnd(r, FOTY.length)] },   // only the FWAs of the Year
    { id: 'ai-fan', name: 'The Agency Fan', hue: 305, speed: 1.6e5, dwell: 3, arc: .2, start: r => { const g = AG[rnd(r, AG.length)]; return g[0] }, next: (s, r) => { if (!s.ag || s.ak >= s.ag.length) { s.ag = AG[rnd(r, AG.length)]; s.ak = 0 } return s.ag[s.ak++] } },   // one agency's winners in order, then another agency
    { id: 'ai-drifter', name: 'The Drifter', hue: 190, speed: 3.5e4, dwell: 7, arc: .45, start: r => rnd(r, N), next: (s, r) => nearestOf(s.i, Array.from({ length: 24 }, () => rnd(r, N))) },   // no plan: whatever's close
    { id: 'ai-speed', name: 'Speedrunner', hue: 0, speed: 8e5, dwell: .4, arc: .04, start: r => rnd(r, N), next: (s, r) => { s.seen = s.seen || new Set(); s.seen.add(s.i); if (s.seen.size > 200) s.seen = new Set([s.i]); return nearestOf(s.i, Array.from({ length: 60 }, () => rnd(r, N)), s.seen) } },   // as many as possible, nearest first
    { id: 'ai-historian', name: 'The Historian', hue: 215, speed: 3e5, dwell: 6, arc: .15, start: () => TODAY[DAY % TODAY.length], next: s => TODAY[(TODAY.indexOf(s.i) + 1) % TODAY.length] },   // this week's date, through the years
    { id: 'ai-tourist', name: 'Tourist', hue: 140, speed: 6e4, dwell: 6, arc: .3, local: true },   // wanders, and drops by to see you
  ];
  const legDur = (c, a, b) => { const d = a.distanceTo(b); return { travel: Math.max(3, Math.min(70, d / c.speed)), dist: d } };
  // a pilot's plan: legs from star to star, worked out from today's start up to now (and on as time goes)
  const st = CAST.map((c, k) => ({ c, k, i: 0, j: 0, t0: 0, travel: 1, dwell: c.dwell, dist: 1, n: 0, rng: mulberry32(DAY * 31 + k * 977) }));
  const plan = s => { const c = s.c; s.i = s.j; s.j = c.next(s, s.rng); if (s.j === s.i) s.j = (s.i + 1) % N; starPos(s.i, _a); starPos(s.j, _b); const L = legDur(c, _a, _b); s.travel = L.travel; s.dist = L.dist; s.side = s.rng() * 6.283; s.n++ };
  const tourist = s => { const c = s.c, near = []; for (let t = 0; t < 400 && near.length < 12; t++) { const j = rnd(s.rng, N); if (starPos(j, _a).distanceTo(player.pos) < 4e5) near.push(j) } s.i = s.j; s.visit = s.n % 3 === 2; s.j = near.length ? near[rnd(s.rng, near.length)] : rnd(s.rng, N); starPos(s.i, _a); const B = s.visit ? _b.copy(player.pos) : starPos(s.j, _b), L = legDur(c, _a, B); s.travel = L.travel; s.dist = L.dist; s.side = s.rng() * 6.283; s.n++ };
  function init() {
    const T = now();
    for (const s of st) {
      if (s.c.local) { s.j = rnd(s.rng, N); s.t0 = T; tourist(s); continue }
      s.j = s.c.start(s.rng); s.t0 = T0; plan(s); let guard = 0;
      while (s.t0 + s.travel + s.dwell < T && guard++ < 20000) { s.t0 += s.travel + s.dwell; plan(s) }   // catch up to now: everyone gets the same answer
    }
  }
  // where a pilot is at time T: along a gently bowed path between the two stars, then a slow circle round the one it reached
  function at(s, T, out) {
    const c = s.c, u = T - s.t0; starPos(s.i, _a); const B = s.c.local && s.visit ? _b.copy(player.pos) : starPos(s.j, _b);
    if (u < s.travel) {
      const x = Math.max(0, u / s.travel), e = x * x * x * (x * (x * 6 - 15) + 10); out.lerpVectors(_a, B, e);
      _q.copy(B).sub(_a).normalize(); _p.set(Math.cos(s.side), Math.sin(s.side), .3).cross(_q).normalize(); return out.addScaledVector(_p, Math.sin(Math.PI * e) * s.dist * c.arc);
    }
    const w = u - s.travel, r = (s.c.local && s.visit ? 3000 : starR(s.j) * (LOOK.ringSize ?? 1.6) * 2.2) * Math.min(1, w / 1.2), a = s.side + w * .6;
    _q.set(Math.cos(a), Math.sin(a * .7) * .3, Math.sin(a)); return out.copy(B).addScaledVector(_q, r);
  }
  const P0 = new V3(), P1 = new V3(), _m = new THREE.Matrix4(), _qq = new Q4(), _up = new V3(0, 1, 0);
  let ready = false, on = false;
  setTimeout(() => { if (!ready) { const t0 = performance.now(); init(); ready = true; if (TEST) console.log('ai init ms', Math.round(performance.now() - t0)) } }, 1200);   // worked out on the title card, where a moment's work can't show
  setInterval(() => {
    if (!booted) return; const want = (LOOK.aiPilots ?? 1) > 0;
    if (!want) { if (on) { st.forEach(s => peerDrop(s.c.id)); on = false } return }
    if (!ready) { const t0 = performance.now(); init(); ready = true; if (TEST) console.log("ai init ms", Math.round(performance.now() - t0)) } on = true; const T = now();
    for (const s of st) {
      let guard = 0; while (T > s.t0 + s.travel + s.dwell && guard++ < 50) { s.t0 += s.travel + s.dwell; s.c.local ? tourist(s) : plan(s) }
      at(s, T, P1); at(s, T - .1, P0); const v = P1.clone().sub(P0).multiplyScalar(10), sp = v.length();
      if (sp > 1) _qq.setFromRotationMatrix(_m.lookAt(P0, P1, _up)); peerUpdate({ peer: s.c.id, presence: { p: P1.toArray(), q: _qq.toArray(), v: v.toArray(), h: s.c.hue, m: 'fly', th: T - s.t0 < s.travel ? 1 : 0, n: s.c.name } });
    }
  }, 100);
  return { cast: CAST.map(c => c.name) };
})();
