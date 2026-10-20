/* ───────────────────────── the game: fly through the rings ─────────────────────────
   With "rings" on every winner is a ring the size of its star. Fly through one and it's collected: it turns warm white
   and glows, you lose a little speed, a chime rings and its record opens for a few seconds. Collected winners are kept in
   this browser; the count sits at the top. */
let ringPop = 0, ringIn = -1, gotCard = { i: -1, t: 0 }, gotN = 0;
for (let i = 0; i < N; i++) gotN += GOT[i];
function ringCheck(p) {   // called by the flight after it moves you: through the halo (or as it closes on you), it's yours
  for (const h of HALO.live) { if (h.i === ringIn || h.done) continue; if (p.pos.distanceTo(h.c) < h.r * 1.05 || (h.c0 > .97)) { h.done = true; ringIn = h.i; collect(h.i) } }
  if (nearI < 0) return; const d = p.pos.distanceTo(starPos(nearI, tmp)), R = starR(nearI) * (LOOK.ringSize ?? 1.6);
  if (ringIn === nearI) { if (d > R * 1.25) ringIn = -1; return }
  if (d < R * .92 && TA[nearI] === 1) { ringIn = nearI; collect(nearI) }
}
/* the halos: up close each ring is a real 3D crystal halo, holographic and glinting, turned to face you. It reads your
   course: when you're about to pass through, it starts to shrink and slides onto your path, and collapses on you */
const HALO_N = 6;
const HALO = (() => {
  let geo = null, tw = -1; const iCol = new Float32Array(HALO_N * 3), iA = new Float32Array(HALO_N);
  const u = { spark: uniform(1), holo: uniform(1), br: uniform(.55) };
  const m = new THREE.MeshBasicNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
  m.colorNode = Fn(() => {
    const n = normalize(normalView), v = normalize(positionView.negate()), fr = float(1).sub(abs(dot(n, v))), pl = positionLocal;   // view space: precise this far from the origin
    const hue = fract(atan(pl.y, pl.x).div(6.2832).add(fr.mul(.9)).add(U.now.mul(.06))), rgb = clamp(abs(fract(vec3(hue).add(vec3(0, .667, .333))).mul(6).sub(3)).sub(1), 0, 1);
    const tint = mix(attribute('hCol', 'vec3'), mix(vec3(1), rgb, .85), u.holo), body = tint.mul(fr.mul(1.5).add(.18)).add(vec3(1).mul(pow(fr, 5)).mul(.9)).mul(u.br);
    const glint = pow(noise3(pl.mul(70).add(vec3(U.now.mul(1.7), U.now.mul(-1.3), 0))), 14).mul(40).mul(u.spark), facet = pow(abs(sin(atan(pl.y, pl.x).mul(48).add(U.now))), 30).mul(.5);
    return vec4(body.add(vec3(1).mul(glint.add(facet.mul(fr)))).mul(attribute('hA', 'float')), 1);
  })();
  let mesh = null;
  const build = w => {   // a fresh mesh whenever the thickness changes
    tw = w; geo = new THREE.TorusGeometry(1, Math.max(.01, w * .45), 24, 160); geo.setAttribute('hCol', new THREE.InstancedBufferAttribute(iCol, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('hA', new THREE.InstancedBufferAttribute(iA, 1).setUsage(THREE.DynamicDrawUsage));
    if (mesh) { scene.remove(mesh); mesh.geometry.dispose() } mesh = new THREE.InstancedMesh(geo, m, HALO_N); mesh.count = 0; mesh.frustumCulled = false; mesh.renderOrder = 3; mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(mesh);
  };
  build(LOOK.ringWidth ?? .1);
  const _m = new THREE.Matrix4(), _q = new Q4(), _s = new V3(), _z = new V3(0, 0, 1), _d = new V3(), live = [], pool = Array.from({ length: HALO_N }, () => ({ i: -1, c: new V3(), r: 1, c0: 0, done: false }));
  const best = []; let fade = new Map();
  function update(dt) {
    const L = LOOK; if (!L.rings || S.mode !== 'fly') { mesh.count = 0; live.length = 0; return } if (tw !== (L.ringWidth ?? .1)) build(L.ringWidth ?? .1);
    u.spark.value = L.ringSparkle ?? 1; u.holo.value = L.ringHolo ?? 1; u.br.value = L.ringBright ?? .55;
    best.length = 0; const px = player.pos.x, py = player.pos.y, pz = player.pos.z;   // the nearest few, by straight distance
    for (let i = 0; i < N; i++) { if (TA[i] < 1) continue; const dx = P[i * 3] - px, dy = P[i * 3 + 1] - py, dz = P[i * 3 + 2] - pz, d2 = dx * dx + dy * dy + dz * dz; if (best.length < HALO_N) { best.push([d2, i]); best.sort((a, b) => a[0] - b[0]) } else if (d2 < best[HALO_N - 1][0]) { best[HALO_N - 1] = [d2, i]; best.sort((a, b) => a[0] - b[0]) } }
    const v = player.vel, vv = v.lengthSq(), pred = L.ringPredict ?? .7, col = L.ringCollapse ?? .85, pxK = innerHeight / (2 * Math.tan(camera.fov * Math.PI / 360));
    live.length = 0; let n = 0;
    for (const [, i] of best) {
      const h = pool[n], R = starR(i) * (L.ringSize ?? 1.6), c = starPos(i, h.c), dist = Math.sqrt(Math.max(1, camera.position.distanceToSquared(c))), rpx = R * pxK / dist;
      if (h.i !== i) { h.i = i; h.done = false; h.c0 = 0 }
      let k = 0; if (vv > 1) { _d.copy(c).sub(player.pos); const ts = _d.dot(v) / vv, miss = _d.addScaledVector(v, -ts).length(); if (ts > 0 && ts < pred && miss < R * 1.15) k = 1 - ts / pred }   // about to pass through: how close (0..1)
      h.c0 = Math.max(h.c0 * Math.exp(-3 * dt), k); const e = h.c0 * h.c0 * (3 - 2 * h.c0);
      if (e > 0) { _d.copy(v).normalize(); const along = _d.dot(_s.copy(c).sub(player.pos)); c.lerp(_s.copy(player.pos).addScaledVector(_d, along), e) }   // slides onto your course
      h.r = R * (1 - col * e); const gone = h.done ? (fade.get(i) ?? 1) : 1; if (h.done) fade.set(i, Math.max(0, gone - dt * 4));
      const a = sstep(rpx, 14, 34) * gone; if (a <= .005 || h.r < 1e-3) { n++; continue }
      _q.setFromUnitVectors(_z, _s.copy(player.pos).sub(c).normalize()); mesh.setMatrixAt(live.length, _m.compose(c, _q, _s.setScalar(h.r)));
      const got = GOT[i], j = live.length * 3; iCol[j] = got ? 1 : COL[i * 3]; iCol[j + 1] = got ? .86 : COL[i * 3 + 1]; iCol[j + 2] = got ? .58 : COL[i * 3 + 2]; iA[live.length] = a * (got ? 1.3 : 1);
      live.push(h); n++;
    }
    if (fade.size > 40) fade = new Map([...fade].slice(-20));
    mesh.count = live.length; if (live.length) { mesh.instanceMatrix.needsUpdate = true; geo.attributes.hCol.needsUpdate = geo.attributes.hA.needsUpdate = true }
  }
  return { update, live, u };
})();
function collectSound(v = 1) {   // two quick rising notes, bright and glassy, with a soft whoosh under them
  if (!AC || AC.state !== 'running' || !master) return; const t = AC.currentTime + .005;
  [0, 7, 12].forEach((st, k) => { const f = 880 * Math.pow(2, st / 12), o = AC.createOscillator(), g = AC.createGain(); o.type = k ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f * .985, t + k * .055); o.frequency.exponentialRampToValueAtTime(f, t + k * .055 + .03); g.gain.setValueAtTime(0, t + k * .055); g.gain.linearRampToValueAtTime(.18 * v / (1 + k * .5), t + k * .055 + .006); g.gain.exponentialRampToValueAtTime(.0001, t + k * .055 + .55); o.connect(g); g.connect(master); o.start(t + k * .055); o.stop(t + k * .055 + .6) });
  const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const bp = AC.createBiquadFilter(), g = AC.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(3200, t + .35); g.gain.value = .12 * v; n.buffer = b; n.connect(bp); bp.connect(g); g.connect(master); n.start(t);
}
function collect(i) {
  if (lockI === i) { lockI = -1; auto = null }   // through it: the camera's free again
  player.vel.multiplyScalar(1 + Math.max(0, LOOK.ringBurst ?? .25)); engineLook.burst = Math.max(engineLook.burst || 0, 1.3); ringPop = 1; boostK = Math.max(boostK, LOOK.ringBoost ?? .8); collectSound(GOT[i] ? .6 : 1);   // a festive kick: speed, a burst of light from the engine, the boost look   // a kick: speed, the engine flaring, a bright little sound
  gotCard = { i, t: LOOK.ringCard ?? 7 }; showCard(i);
  buzz(18);
  if (GOT[i]) return; GOT[i] = 1; gotN++; stars.aGot.needsUpdate = true;
  store.set('sotd-got', JSON.stringify(D.flatMap((d, k) => GOT[k] ? [d.date] : [])));
  const el = $('gotPill'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); rings.show();
  const nk = CURSORS.findIndex((c, k) => k > 0 && SHIP_UNLOCK(k) === gotN), nt = TRAILS.findIndex((c, k) => k > 0 && TRAIL_UNLOCK(k) === gotN);
  if (nt > 0) { el.dataset.new = `New trail: ${TRAILS[nt].name}`; el.classList.add('unlock'); setTimeout(() => el.classList.remove('unlock'), 4000) }
  if (nk > 0) { el.dataset.new = `New ship: ${CURSORS[nk].name}`; el.classList.add('unlock'); setTimeout(() => el.classList.remove('unlock'), 4000) }   // a new pointer unlocked
}
// unlockable trail colours (the Upgrades panel): slow end and fast end of the trail
const TRAILS = [
  { name: 'Your colour', c: null },
  { name: 'Gold', c: (a, b) => { a.setHSL(.11, 1, .5); b.setHSL(.13, .9, .72) } },
  { name: 'Ice', c: (a, b) => { a.setHSL(.53, .9, .62); b.setHSL(.55, .5, .88) } },
  { name: 'Ember', c: (a, b) => { a.setHSL(.01, 1, .5); b.setHSL(.07, 1, .6) } },
  { name: 'Neon pink', c: (a, b) => { a.setHSL(.91, 1, .58); b.setHSL(.86, 1, .72) } },
  { name: 'Aurora', c: (a, b) => { a.setHSL(.38, .95, .52); b.setHSL(.47, .9, .62) } },
  { name: 'Plasma', c: (a, b) => { a.setHSL(.74, 1, .6); b.setHSL(.62, 1, .66) } },
  { name: 'Ghost', c: (a, b) => { a.setHSL(.62, .15, .82); b.setHSL(.6, .05, .97) } },
  { name: 'Chrome', c: (a, b, s) => { const g = .55 + .35 * Math.sin(performance.now() * .004 + s * 9); a.setHSL(.6, .25, g); b.setHSL(.58, .35, .9) } },
  { name: 'Rainbow', c: (a, b, s) => { const h = (performance.now() * .00012 + s * .4) % 1; a.setHSL(h, 1, .58); b.setHSL((h + .08) % 1, 1, .68) } },
];
const TRAIL_UNLOCK = k => 0;   // all unlocked for now (was k * 7)
let trailK = 0; { const k = +store.get('sotd-trail-k') || 0; if (k > 0 && k < TRAILS.length && gotN >= TRAIL_UNLOCK(k)) trailK = k }
function setTrail(k) { trailK = k; store.set('sotd-trail-k', String(k)) }
// the mode switch: the ring button by the sound button (or R) turns the game on and off
function setRings(on) { LOOK.rings = on ? 1 : 0; saveLook(); $('gbtn').setAttribute('aria-pressed', !!on); $('gbtn').title = on ? 'Rings game on (R)' : 'Rings game off (R)'; rings.show(); const c = document.querySelector('#lk-rings'); if (c) c.checked = !!on }
$('gbtn').onclick = () => setRings(!LOOK.rings);
{ const k = +store.get('sotd-ship-k') || 0; if (k > 0 && gotN >= SHIP_UNLOCK(k)) setShip(k) }   // the pointer you flew last time
const rings = (() => {
  const el = $('gotPill');
  const show = () => { el.hidden = !LOOK.rings || S.mode !== 'fly'; el.innerHTML = `<b>${gotN.toLocaleString('en')}</b> / ${N.toLocaleString('en')} collected` };
  show(); $('gbtn').setAttribute('aria-pressed', !!LOOK.rings);
  return {
    show,
    update(dt) {
      const L = LOOK, u = stars.u; u.ring.value = L.rings ? 1 : 0; u.rsz.value = (L.ringSize ?? 1.6) * L.bodySize; u.rw.value = L.ringWidth ?? .1; u.gotGlow.value = L.ringGlow ?? 1.8;
      if (gotCard.t > 0) gotCard.t -= dt; ringPop *= Math.exp(-dt / Math.max(.05, L.ringPopTime ?? .7)); HALO.update(dt);
      const want = !L.rings || S.mode !== 'fly'; if (el.hidden !== want) show();
    },
  };
})();
