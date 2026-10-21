/* ───────────────────────── multiplayer ─────────────────────────
   Everyone who has this page open right now flies in the same sky. Each pilot shares where they are a few times a
   second through the page's room (presence only: nothing is stored, nothing to sign up for) and sees everyone else
   as a cursor with a trail in that pilot's own colour. Without a room the sky is simply yours. */
let PILOT_HUE = (() => { let h = parseInt(store.get('sotd-hue'), 10); if (!(h >= 0 && h < 360)) { h = Math.floor(Math.random() * 360); store.set('sotd-hue', String(h)) } return h })();
Net.self.hue = PILOT_HUE;
const PEER_N = 160, _pc = new C3(), _pd = new V3(), _ps = new V3(), _pe = new V3();
function peerViz(hue) {
  const g = makeAvatar(); g.scale.setScalar(.68 * SHIP_K * SHIP_SC); g.userData.nav.forEach(b => b.visible = false); scene.add(g);
  const col = new C3().setHSL(hue / 360, 1, .6), fl = g.userData.flame; fl.material = fl.material.clone(); fl.material.color.copy(col); g.userData.hole.col.value.copy(col); g.userData.hole.on.value = .5; g.userData.emit.material.color.copy(col); g.userData.emit.material.opacity = .4;
  const pos = new Float32Array(PEER_N * 6), cl = new Float32Array(PEER_N * 6), geo = new THREE.BufferGeometry(), idx = [];
  for (let k = 0; k < PEER_N - 1; k++) { const a = k * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) } geo.setIndex(idx);
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage)); geo.setAttribute('color', new THREE.BufferAttribute(cl, 3).setUsage(THREE.DynamicDrawUsage)); geo.setDrawRange(0, 0);
  const tr = layer(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })), trailScene, 0);
  const dot = youMark.clone(); dot.material = youMark.material.clone(); dot.material.color.copy(col); scene.add(dot);
  return { g, tr, pos, cl, dot, col, hue, mk: null, pts: [], cur: null, tgt: new V3(), vel: new V3(), q: new Q4(), at: 0, th: 0, mode: 'fly', fade: 0 };
}
function peerUpdate(p) {
  const s = p.presence, ok = a => Array.isArray(a) && a.every(Number.isFinite); if (!s || !ok(s.p) || s.p.length !== 3) return;   // untrusted: take only well-formed numbers
  let v = Net.peers.get(p.peer); if (!v) { const h = Number.isFinite(+s.h) ? ((+s.h % 360) + 360) % 360 : 0; v = peerViz(h); Net.peers.set(p.peer, v) }
  if (Number.isFinite(+s.h)) { const h = ((+s.h % 360) + 360) % 360; if (Math.abs(h - v.hue) > .5) { v.hue = h; v.col.setHSL(h / 360, 1, .6); v.g.userData.flame.material.color.copy(v.col); v.g.userData.hole.col.value.copy(v.col); v.g.userData.emit.material.color.copy(v.col); v.dot.material.color.copy(v.col) } }
  if (typeof s.n === 'string') v.name = s.n.slice(0, 24);
  v.tgt.fromArray(s.p); if (ok(s.v) && s.v.length === 3) v.vel.fromArray(s.v); if (ok(s.q) && s.q.length === 4) v.q.fromArray(s.q).normalize();
  v.at = performance.now(); v.th = (s.th | 0) & 3; v.mode = s.m === 'map' ? 'map' : 'fly';
  if (!v.cur || v.cur.distanceTo(v.tgt) > 5e5) { v.cur = v.tgt.clone(); v.pts.length = 0; v.g.quaternion.copy(v.q) }   // new, or jumped home
}
function peerDrop(id) { const v = Net.peers.get(id); if (!v) return; scene.remove(v.g, v.dot); trailScene.remove(v.tr); v.tr.geometry.dispose(); if (v.mk) v.mk.remove(); Net.peers.delete(id); pilotList() }
/* two transports, same messages. On claude.ai the artifact's room (signed-in viewers); anywhere else a tiny WebSocket relay
   served beside the page at /ws (server.mjs: no accounts, it only passes positions between whoever is connected). */
const NET_URL = (() => { if (QS.get('relay')) return QS.get('relay'); if (!/^https?:$/.test(location.protocol) || /claude(usercontent)?\.(ai|com)$/.test(location.hostname)) return null; return (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws' })();
const netLive = () => { Net.enabled = true; $('net').textContent = 'live, everyone with this page open flies here' };
Net.connect = async () => {
  try {
    if (window.claude && claude.use) {
      const room = await claude.use('room');
      if (room) {
        Net.room = room; netLive();
        room.onPeers(ch => { ch.left.forEach(p => peerDrop(p.peer)); ch.joined.concat(ch.updated).forEach(p => { if (!p.sameTab && p.kind === 'viewer') peerUpdate(p) }) },
          () => { Net.enabled = false; Net.room = null; [...Net.peers.keys()].forEach(peerDrop) });
        return;
      }
    }
  } catch (e) { }
  if (NET_URL && !TEST) wsConnect(0);
};
function wsConnect(tries) {
  let ws; try { ws = new WebSocket(NET_URL) } catch (e) { return }
  ws.onopen = () => { Net.ws = ws; tries = 0; netLive() };
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data) } catch (_) { return }
    if (m && m.t === 'hi' && Number.isFinite(m.h)) { PILOT_HUE = ((m.h % 360) + 360) % 360; Net.self.hue = PILOT_HUE; return }   // the relay deals out colours spread round the wheel, so no two pilots match
    if (!m || typeof m.id !== 'string') return;
    if (m.t === 'p' && m.s && typeof m.s === 'object') peerUpdate({ peer: 'w:' + m.id, presence: m.s }); else if (m.t === 'x') peerDrop('w:' + m.id);
  };
  ws.onclose = () => { if (Net.ws === ws) Net.ws = null; Net.enabled = false; [...Net.peers.keys()].filter(k => k.startsWith('w:')).forEach(peerDrop); setTimeout(() => wsConnect(tries + 1), Math.min(30000, 1500 * 2 ** Math.min(tries, 5))) };   // back off and try again
  ws.onerror = () => { try { ws.close() } catch (_) { } };
}
Net.send = s => {
  const f = x => Math.round(x * 100) / 100, msg = { p: s.pos.map(f), q: s.quat.map(x => Math.round(x * 1e4) / 1e4), v: s.vel.map(Math.round), h: PILOT_HUE, m: s.mode, th: s.th };
  if (Net.room) Net.room.presence(msg).catch(() => { });
  else if (Net.ws && Net.ws.readyState === 1) Net.ws.send(JSON.stringify({ t: 'p', s: msg }));
};
// a pilot that's gone quiet for a while has left (a closed laptop doesn't say goodbye)
setInterval(() => { const now = performance.now(); for (const [id, v] of Net.peers) if (now - v.at > 12000) peerDrop(id) }, 3000);
// every frame: glide each pilot toward where they said they are (plus how far they've flown since), lay their trail
/* finding each other: every other pilot gets a marker in their colour (pinned to the screen edge when they're behind
   you or off to the side) with how far away they are; P lists everyone, a click on a name (or G for the nearest) flies
   you to them. ?bots=3 adds pretend pilots circling near you, to try it all on your own. */
const peerMarks = (() => { const d = document.createElement('div'); d.id = 'peerMarks'; d.className = 'hud'; document.body.appendChild(d); return d })();
const pilotsEl = (() => { const d = document.createElement('div'); d.id = 'pilots'; d.className = 'hud'; d.hidden = true; document.body.appendChild(d); return d })();
function goToPeer(id) {
  const v = Net.peers.get(id); if (!v || !v.cur) return; if (S.mode !== 'fly') setMode('fly');
  const back = _pd.copy(player.pos).sub(v.cur); const d = back.length() || 1; auto = { i: -1, dest: v.cur.clone().addScaledVector(back, Math.min(60, d * .5) / d) }; lockI = -1;   // stop just short of them
}
function nearestPeer() { let best = null, bd = Infinity; for (const [id, v] of Net.peers) { if (!v.cur) continue; const d = v.cur.distanceTo(player.pos); if (d < bd) { bd = d; best = id } } return best }
function pilotList() {
  if (pilotsEl.hidden) return; const rows = [...Net.peers].filter(([, v]) => v.cur).map(([id, v]) => ({ id, v, d: v.cur.distanceTo(player.pos) })).sort((a, b) => a.d - b.d);
  pilotsEl.innerHTML = `<div class="ph">Pilots <span>${rows.length + 1} here · G flies to the nearest</span></div>` + `<div class="pr me"><i style="--c:hsl(${PILOT_HUE} 100% 60%)"></i><b>You</b><span>${Net.enabled ? 'online' : 'solo'}</span></div>` +
    (rows.length ? rows.map(r => `<button class="pr" data-id="${r.id}"><i style="--c:hsl(${r.v.hue} 100% 60%)"></i><b>${esc(r.v.name || 'Pilot ' + r.id.slice(-4))}</b><span>${fmtD(r.d)} u · ${r.v.mode === 'map' ? 'on the map' : r.v.th ? 'thrusting' : 'flying'}</span></button>`).join('') : '<div class="pr none">Nobody else yet. Open this page in another window or on your phone.</div>');
}
pilotsEl.addEventListener('click', e => { const b = e.target.closest('[data-id]'); if (b) goToPeer(b.dataset.id) });
addEventListener('keydown', e => {
  if (!booted || e.target.matches('input,select,textarea')) return; const k = e.key.toLowerCase();
  if (k === 'p') { pilotsEl.hidden = !pilotsEl.hidden; pilotList() }
  if (k === 'g') { const id = nearestPeer(); if (id) goToPeer(id) }
});
setInterval(pilotList, 500);
// pretend pilots (?bots=N): they circle you at a few hundred to a few thousand units, thrusting now and then
if (QS.has('bots')) {
  const nb = Math.max(1, Math.min(12, +QS.get('bots') || 3)), bots = Array.from({ length: nb }, (_, k) => ({ id: 'bot' + k, h: Math.random() * 360, r: 300 + Math.random() * 4000, w: .1 + Math.random() * .3, a: Math.random() * 6.28, y: (Math.random() - .5) * 600, c: null }));
  setInterval(() => {
    if (!booted) return; const t = performance.now() / 1000;
    for (const b of bots) {
      if (!b.c) b.c = player.pos.clone(); const a = b.a + t * b.w, p = new V3(Math.cos(a) * b.r, b.y + Math.sin(t * .3 + b.a) * 200, Math.sin(a) * b.r).add(b.c), v = new V3(-Math.sin(a), 0, Math.cos(a)).multiplyScalar(b.r * b.w);
      const q = new Q4().setFromRotationMatrix(new THREE.Matrix4().lookAt(new V3(), v.clone().negate(), new V3(0, 1, 0)));
      peerUpdate({ peer: b.id, presence: { p: p.toArray(), q: q.toArray(), v: v.toArray(), h: b.h, m: 'fly', th: Math.sin(t * .7 + b.a) > -.2 ? 1 : 0 } });
    }
  }, 100);
}
function updatePeers(dt) {
  if (!Net.peers.size) { peerMarks.innerHTML = ''; return }
  const fly = S.mode === 'fly', now = performance.now(), pxW = Math.tan(camera.fov * Math.PI / 360) / Math.max(1, innerHeight);
  for (const v of Net.peers.values()) {
    _pd.copy(v.tgt).addScaledVector(v.vel, Math.min(1, (now - v.at) / 1000)); v.cur.lerp(_pd, 1 - Math.exp(-9 * dt));
    v.g.position.copy(v.cur); v.g.quaternion.slerp(v.q, 1 - Math.exp(-10 * dt)); v.g.visible = fly;
    if (!v.mk) { v.mk = document.createElement('div'); v.mk.className = 'pm'; v.mk.style.setProperty('--c', `hsl(${v.hue} 100% 60%)`); v.mk.innerHTML = '<i></i><span></span>'; peerMarks.appendChild(v.mk) }
    { _ps.copy(v.cur).project(camera); let x = _ps.x, y = _ps.y; const behind = _ps.z > 1; if (behind) { x = -x; y = -y } const on = !behind && Math.abs(x) < .95 && Math.abs(y) < .92;
      if (!on) { const m = Math.max(Math.abs(x) / .93, Math.abs(y) / .88, 1e-6); x /= m; y /= m }
      v.mk.style.transform = `translate(${((x * .5 + .5) * innerWidth).toFixed(1)}px,${((-y * .5 + .5) * innerHeight).toFixed(1)}px)`; v.mk.classList.toggle('edge', !on); v.mk.hidden = !fly;
      const dd = v.cur.distanceTo(player.pos); v.mk.lastChild.textContent = fmtD(dd) }
    const fl = v.g.userData.flame; fl.material.opacity += ((v.th ? .85 : 0) - fl.material.opacity) * Math.min(1, dt * 10); const ho = v.g.userData.hole; ho.on.value += ((v.th ? 1.1 : .45) - ho.on.value) * Math.min(1, dt * 6); { const fz = .8 + .4 * Math.sin(now * .04); fl.scale.set(1.1 + fz * .45, 1.1 + fz * .45, 1) }   // a breathing ball, bigger while thrusting
    ;
    v.dot.visible = !fly; if (!fly) { v.dot.position.copy(v.cur); v.dot.scale.setScalar(.022) }
    // trail: a point every little stretch while they thrust; it drains away when they let go
    const sp = v.vel.length(), step = Math.max(.4, sp * .025);
    if (v.th) { if (!v.pts.length || v.pts[0].p.distanceTo(v.cur) > step) { v.pts.unshift({ p: v.cur.clone(), th: v.th }); if (v.pts.length > PEER_N) v.pts.length = PEER_N } else v.pts[0].p.copy(v.cur) }
    else if (v.pts.length) { v.fade += dt * 40; while (v.fade > 1 && v.pts.length) { v.pts.pop(); v.fade-- } }
    const n = v.pts.length; v.tr.visible = fly && n > 1; if (n < 2) continue;
    v.tr.position.copy(v.cur); const w = 2 + 5 * Math.min(1, Math.log10(1 + sp) / 6);
    for (let k = 0; k < n; k++) {
      const P_ = v.pts[k].p; _pe.copy(v.pts[Math.min(k + 1, n - 1)].p).sub(v.pts[Math.max(k - 1, 0)].p); _ps.copy(camera.position).sub(P_); const cd = _ps.length(); _ps.crossVectors(_pe, _ps); const l = _ps.length();
      if (l > 1e-6) _ps.multiplyScalar(w * pxW * cd / l); else _ps.set(0, 0, 0);
      const x = P_.x - v.cur.x, y = P_.y - v.cur.y, z = P_.z - v.cur.z, o = k * 6, th = v.pts[k].th, a = (1 - k / n) * (1 - k / n);
      if (th === 2) _pc.setHSL(.6, 1, .6); else if (th === 3) _pc.setHSL(.84, 1, .74); else _pc.copy(v.col);   // boost blue, both magenta, else their own colour
      _pc.multiplyScalar(a * 1.4);
      v.pos[o] = x + _ps.x; v.pos[o + 1] = y + _ps.y; v.pos[o + 2] = z + _ps.z; v.pos[o + 3] = x - _ps.x; v.pos[o + 4] = y - _ps.y; v.pos[o + 5] = z - _ps.z;
      v.cl[o] = v.cl[o + 3] = _pc.r; v.cl[o + 1] = v.cl[o + 4] = _pc.g; v.cl[o + 2] = v.cl[o + 5] = _pc.b;
    }
    const geo = v.tr.geometry; geo.setDrawRange(0, (n - 1) * 6); geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;
  }
}
