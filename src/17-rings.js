/* ───────────────────────── the game: fly through the rings ─────────────────────────
   With "rings" on every winner is a ring the size of its star. Fly through one and it's collected: it turns warm white
   and glows, you lose a little speed, a chime rings and its record opens for a few seconds. Collected winners are kept in
   this browser; the count sits at the top. */
let ringIn = -1, gotCard = { i: -1, t: 0 }, gotN = 0;
for (let i = 0; i < N; i++) gotN += GOT[i];
function ringCheck(p) {   // called by the flight after it moves you
  if (nearI < 0) return; const d = p.pos.distanceTo(starPos(nearI, tmp)), R = starR(nearI) * (LOOK.ringSize ?? 1.6);
  if (ringIn === nearI) { if (d > R * 1.25) ringIn = -1; return }
  if (d < R * .92 && TA[nearI] === 1) { ringIn = nearI; collect(nearI) }
}
function collectSound(v = 1) {   // two quick rising notes, bright and glassy, with a soft whoosh under them
  if (!AC || AC.state !== 'running' || !master) return; const t = AC.currentTime + .005;
  [0, 7, 12].forEach((st, k) => { const f = 880 * Math.pow(2, st / 12), o = AC.createOscillator(), g = AC.createGain(); o.type = k ? 'sine' : 'triangle'; o.frequency.setValueAtTime(f * .985, t + k * .055); o.frequency.exponentialRampToValueAtTime(f, t + k * .055 + .03); g.gain.setValueAtTime(0, t + k * .055); g.gain.linearRampToValueAtTime(.18 * v / (1 + k * .5), t + k * .055 + .006); g.gain.exponentialRampToValueAtTime(.0001, t + k * .055 + .55); o.connect(g); g.connect(master); o.start(t + k * .055); o.stop(t + k * .055 + .6) });
  const n = AC.createBufferSource(), b = AC.createBuffer(1, AC.sampleRate * .4, AC.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
  const bp = AC.createBiquadFilter(), g = AC.createGain(); bp.type = 'bandpass'; bp.Q.value = 1.2; bp.frequency.setValueAtTime(600, t); bp.frequency.exponentialRampToValueAtTime(3200, t + .35); g.gain.value = .12 * v; n.buffer = b; n.connect(bp); bp.connect(g); g.connect(master); n.start(t);
}
function collect(i) {
  if (lockI === i) { lockI = -1; auto = null }   // through it: the camera's free again
  player.vel.multiplyScalar(1 + (LOOK.ringBurst ?? .2)); engineLook.burst = Math.max(engineLook.burst || 0, 1.3); igniteK = Math.max(igniteK, .6); collectSound(GOT[i] ? .6 : 1);   // a kick: speed, the engine flaring, a bright little sound
  gotCard = { i, t: LOOK.ringCard ?? 7 }; showCard(i);
  buzz(18);
  if (GOT[i]) return; GOT[i] = 1; gotN++; stars.aGot.needsUpdate = true;
  store.set('sotd-got', JSON.stringify(D.flatMap((d, k) => GOT[k] ? [d.date] : [])));
  const el = $('gotPill'); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); rings.show();
  const nk = CURSORS.findIndex((c, k) => k > 0 && SHIP_UNLOCK(k) === gotN); if (nk > 0) { el.dataset.new = `New ship: ${CURSORS[nk].name}`; el.classList.add('unlock'); setTimeout(() => el.classList.remove('unlock'), 4000) }   // a new pointer unlocked
}
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
      if (gotCard.t > 0) gotCard.t -= dt;
      const want = !L.rings || S.mode !== 'fly'; if (el.hidden !== want) show();
    },
  };
})();
