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
    { id: 'ai-archivist', name: 'The Archivist', hue: 34, speed: 9e4, dwell: 5, arc: .1, pass: .2, start: () => (DAY * 137) % N, next: s => (s.i + 1) % N },   // every winner, in date order
    { id: 'ai-soty', name: 'SOTY Hunter', hue: 48, speed: 6e5, dwell: 2.5, arc: .08, pass: .6, start: r => FOTY[rnd(r, FOTY.length)], next: (s, r) => FOTY[rnd(r, FOTY.length)] },   // only the FWAs of the Year
    { id: 'ai-fan', name: 'The Agency Fan', hue: 305, speed: 1.6e5, dwell: 3, arc: .2, pass: .4, start: r => { const g = AG[rnd(r, AG.length)]; return g[0] }, next: (s, r) => { if (!s.ag || s.ak >= s.ag.length) { s.ag = AG[rnd(r, AG.length)]; s.ak = 0 } return s.ag[s.ak++] } },   // one agency's winners in order, then another agency
    { id: 'ai-drifter', name: 'The Drifter', hue: 190, speed: 3.5e4, dwell: 7, arc: .45, pass: .1, start: r => rnd(r, N), next: (s, r) => nearestOf(s.i, Array.from({ length: 24 }, () => rnd(r, N))) },   // no plan: whatever's close
    { id: 'ai-speed', name: 'Speedrunner', hue: 0, speed: 8e5, dwell: .4, arc: .04, pass: .9, start: r => rnd(r, N), next: (s, r) => { s.seen = s.seen || new Set(); s.seen.add(s.i); if (s.seen.size > 200) s.seen = new Set([s.i]); return nearestOf(s.i, Array.from({ length: 60 }, () => rnd(r, N)), s.seen) } },   // as many as possible, nearest first
    { id: 'ai-historian', name: 'The Historian', hue: 215, speed: 3e5, dwell: 6, arc: .15, pass: .3, start: () => TODAY[DAY % TODAY.length], next: s => TODAY[(TODAY.indexOf(s.i) + 1) % TODAY.length] },   // this week's date, through the years
    { id: 'ai-tourist', name: 'Tourist', hue: 140, speed: 6e4, dwell: 6, arc: .3, pass: .3, local: true },   // wanders, and drops by to see you
  ];
  const CRUISE = 55000;   // they all fly in cruise mode, never faster (a constant, not a Look setting: every page must plan the same routes)
  const legDur = (c, a, b) => { const d = a.distanceTo(b); return { travel: Math.max(3, Math.min(70, d / Math.min(c.speed, CRUISE))), dist: d } };
  // a pilot's plan: legs from star to star, worked out from today's start up to now (and on as time goes)
  const st = CAST.map((c, k) => ({ c, k, i: 0, j: 0, t0: 0, travel: 1, dwell: c.dwell, dist: 1, n: 0, rng: mulberry32(DAY * 31 + k * 977), v1: new V3(), m0: new V3(), m1: new V3(), thru: false }));
  const shape = s => {   // the leg's curve: it leaves with the speed it arrived with (after a linger: from rest), and either sweeps on through the next ring or eases in to linger there
    const was = s.thru; s.thru = s.rng() < (s.c.pass ?? .3); s.dwell = s.thru ? 0 : s.c.dwell * (.6 + .8 * s.rng());
    const B = s.c.local && s.visit ? player.pos : starPos(s.j, _b), A = starPos(s.i, _a);
    s.m0.copy(was ? s.v1 : _q.set(0, 0, 0)).multiplyScalar(s.travel); if (s.m0.length() > s.dist * 1.2) s.m0.setLength(s.dist * 1.2);
    s.m1.copy(B).sub(A).normalize().multiplyScalar(s.dist * (s.thru ? 1.1 : .25)); s.v1.copy(s.m1).divideScalar(Math.max(.1, s.travel));
  };
  const plan = s => { const c = s.c; s.i = s.j; s.j = c.next(s, s.rng); if (s.j === s.i) s.j = (s.i + 1) % N; starPos(s.i, _a); starPos(s.j, _b); const L = legDur(c, _a, _b); s.travel = L.travel; s.dist = L.dist; s.side = s.rng() * 6.283; s.n++; shape(s) };
  const tourist = s => { const c = s.c, near = []; for (let t = 0; t < 400 && near.length < 12; t++) { const j = rnd(s.rng, N); if (starPos(j, _a).distanceTo(player.pos) < 4e5) near.push(j) } s.i = s.j; s.visit = s.n % 3 === 2; s.j = near.length ? near[rnd(s.rng, near.length)] : rnd(s.rng, N); starPos(s.i, _a); const B = s.visit ? _b.copy(player.pos) : starPos(s.j, _b), L = legDur(c, _a, B); s.travel = L.travel; s.dist = L.dist; s.side = s.rng() * 6.283; s.n++; shape(s) };
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
    if (u < s.travel) {   // the leg: a smooth curve from one ring to the next (Hermite), bowed a little to one side
      const x = Math.max(0, u / s.travel), x2 = x * x, x3 = x2 * x, h00 = 2 * x3 - 3 * x2 + 1, h10 = x3 - 2 * x2 + x, h01 = -2 * x3 + 3 * x2, h11 = x3 - x2;
      out.copy(_a).multiplyScalar(h00).addScaledVector(s.m0, h10).addScaledVector(B, h01).addScaledVector(s.m1, h11);
      _q.copy(B).sub(_a).normalize(); _p.set(Math.cos(s.side), Math.sin(s.side), .3).cross(_q).normalize(); return out.addScaledVector(_p, Math.sin(Math.PI * x) * s.dist * c.arc * .6);
    }
    // lingering: a lazy loop round the ring that opens out and closes back to it, so the next leg starts where this ends
    const w = u - s.travel, env = s.dwell > 0 ? Math.sin(Math.PI * Math.min(1, w / s.dwell)) : 0, r = (s.c.local && s.visit ? 3000 : starR(s.j) * (LOOK.ringSize ?? 1.6) * 2.2) * env, a = s.side + w * .6;
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
