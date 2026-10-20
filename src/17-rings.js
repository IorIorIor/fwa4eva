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
function collect(i) {
  player.vel.multiplyScalar(1 - (LOOK.ringSlow ?? .06));
  gotCard = { i, t: LOOK.ringCard ?? 7 }; showCard(i);
  starPos(i, tmp).project(camera); tingle(galOf(D[i].year), i, Math.max(-1, Math.min(1, tmp.x))); buzz(18);
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
