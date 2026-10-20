/* ───────────────────────── sound ─────────────────────────
   "An Ending Ascent" on loop; an engine of filtered noise and a soft drone that rises with speed; a hum near the
   outpost; and hovering a star strikes a glass bell in a vast space, the same chord every time for the same star. */
let AC = null, out = null, master = null, ambBus = null, musicGain = null, ENG = null, hum = null, lastTing = 0;
// the soundtrack starts downloading behind the title card, so it's ready the moment you enter
const musicEl = (() => { try { const a = new Audio(); a.loop = true; a.preload = TEST_EARLY ? 'none' : 'auto'; a.src = 'an-ending-ascent.mp3'; return a } catch (e) { return null } })();
let muted = store.get('sotd-muted') === '1';
const KEYROOT = [72, 74, 76, 79, 81, 84], PENTA = [0, 2, 4, 7, 9];
function spaceIR(sec) {   // swells in, then darkens as it dies away
  const sr = AC.sampleRate, n = Math.floor(sr * sec), b = AC.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c), seedR = mulberry32(c ? 91 : 17); let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr, env = (1 - Math.exp(-t * 3.2)) * Math.exp(-t / 2.7), k = .55 + .4 * Math.min(1, t / 4); lp = lp * k + (seedR() * 2 - 1) * (1 - k); d[i] = lp * env * (1.6 + .4 * Math.sin(t * .7 + c)) } }
  return b;
}
function audio() {
  if (AC) { if (AC.state === 'suspended') AC.resume().catch(() => { }); return }
  try {
    AC = new (window.AudioContext || window.webkitAudioContext)();
    out = AC.createGain(); out.gain.value = muted ? 0 : 1; out.connect(AC.destination);
    try {   // engine: a breath of filtered noise and a two-voice drone; both rise with speed, swell while you thrust
      const nb = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate), nd = nb.getChannelData(0); let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < nd.length; i++) { const w = Math.random() * 2 - 1; b0 = .997 * b0 + w * .029; b1 = .985 * b1 + w * .032; b2 = .95 * b2 + w * .048; nd[i] = (b0 + b1 + b2) * .6 }
      const ns = AC.createBufferSource(); ns.buffer = nb; ns.loop = true; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = .9; bp.frequency.value = 260;
      const nG = AC.createGain(); nG.gain.value = 0; ns.connect(bp); bp.connect(nG);
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 320; lp.Q.value = .7; const tG = AC.createGain(); tG.gain.value = 0; lp.connect(tG);
      const oscs = [0, 7].map(dt => { const o = AC.createOscillator(); o.type = 'triangle'; o.frequency.value = 48; o.detune.value = dt; o.connect(lp); o.start(); return o });
      const eng = AC.createGain(); eng.gain.value = LOOK.engine; nG.connect(eng); tG.connect(eng); eng.connect(out); ns.start();
      ENG = { bp, nG, lp, tG, oscs, eng, buf: nb };
    } catch (e) { }
    try { musicGain = AC.createGain(); musicGain.gain.value = .6 * LOOK.music; AC.createMediaElementSource(musicEl).connect(musicGain); musicGain.connect(out); musicEl.play().catch(() => { }) } catch (e) { }
    // chimes: a quiet dry signal, a long dark reverb that swells in after the strike, slow ping-pong echoes that darken as they fade
    master = AC.createGain(); master.gain.value = .2 * LOOK.ting;
    try {
      const dry = AC.createGain(); dry.gain.value = .28; master.connect(dry); dry.connect(out);
      const pre = AC.createDelay(1); pre.delayTime.value = .07; const conv = AC.createConvolver(); conv.buffer = spaceIR(9.5);
      const rHP = AC.createBiquadFilter(); rHP.type = 'highpass'; rHP.frequency.value = 160; const rLP = AC.createBiquadFilter(); rLP.type = 'lowpass'; rLP.frequency.value = 5200; const rG = AC.createGain(); rG.gain.value = 1.25;
      master.connect(pre); pre.connect(conv); conv.connect(rHP); rHP.connect(rLP); rLP.connect(rG); rG.connect(out);
      const send = AC.createGain(); send.gain.value = .32; master.connect(send);
      const dL = AC.createDelay(3), dR = AC.createDelay(3), fL = AC.createGain(), fR = AC.createGain(), lpL = AC.createBiquadFilter(), lpR = AC.createBiquadFilter(), pL = AC.createStereoPanner(), pR = AC.createStereoPanner();
      dL.delayTime.value = .47; dR.delayTime.value = .71; fL.gain.value = fR.gain.value = .48; lpL.type = lpR.type = 'lowpass'; lpL.frequency.value = lpR.frequency.value = 2600; pL.pan.value = -.85; pR.pan.value = .85;
      send.connect(dL); dL.connect(lpL); lpL.connect(pL); pL.connect(out); lpL.connect(fL); fL.connect(dR); dR.connect(lpR); lpR.connect(pR); pR.connect(out); lpR.connect(fR); fR.connect(dL); pR.connect(pre);
    } catch (e) { master.connect(out) }
    ambBus = AC.createGain(); ambBus.gain.value = .33 * LOOK.amb; ambBus.connect(out);
    const dl2 = AC.createDelay(2), fb2 = AC.createGain(); dl2.delayTime.value = .61; fb2.gain.value = .45; ambBus.connect(dl2); dl2.connect(fb2); fb2.connect(dl2); dl2.connect(out);
    hum = AC.createGain(); hum.gain.value = 0; hum.connect(ambBus);
    [41.2, 82.4, 123.6].forEach((fq, j) => { const o = AC.createOscillator(), og = AC.createGain(); o.frequency.value = fq; og.gain.value = [.5, .25, .08][j]; o.connect(og); og.connect(hum); o.start() });
  } catch (e) { AC = null }
}
function mixAmbient(pos) { if (AC && hum) hum.gain.setTargetAtTime((1 - sstep(pos.length(), 300, 9000)) * .9, AC.currentTime, .5) }
function boostWhoosh() {
  if (!AC || !ENG) return; const t = AC.currentTime, src = AC.createBufferSource(); src.buffer = ENG.buf; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 1.2;
  f.frequency.setValueAtTime(300, t); f.frequency.exponentialRampToValueAtTime(2400, t + .5); const g = AC.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.16 * LOOK.engine, t + .06); g.gain.exponentialRampToValueAtTime(.001, t + .9);
  src.connect(f); f.connect(g); g.connect(out); src.start(t); src.stop(t + 1);
}
function updateEngine() {
  if (!ENG || !AC) return; const t = AC.currentTime, fly = S.mode === 'fly', sp = player.vel.length(), k = Math.min(1, Math.log10(1 + sp) / 6.3);   // 0 parked .. 1 near light speed
  const th = fly && thrusting ? 1 : 0, brk = fly && (keys.s || keys.arrowdown) && sp > 5 ? 1 : 0, move = fly ? sstep(sp, 2, 400) : 0;
  ENG.nG.gain.setTargetAtTime((.006 + th * .05 + move * .018 + boostK * .07) * (1 + k * .6), t, th ? .12 : .6);
  ENG.bp.frequency.setTargetAtTime(180 + k * 1500 + th * 220, t, .25);
  ENG.tG.gain.setTargetAtTime(fly ? (.012 + th * .035 + move * .012) : 0, t, th ? .15 : .8);
  ENG.lp.frequency.setTargetAtTime(240 + k * 900 + th * 300, t, .3);
  const f = (42 + k * 58) * (brk ? .88 : 1) * (1 + boostK * .25); ENG.oscs.forEach(o => o.frequency.setTargetAtTime(f, t, .35));
  ENG.eng.gain.setTargetAtTime(LOOK.engine, t, .1);
}
function setMuted(m) { muted = m; store.set('sotd-muted', m ? '1' : '0'); const b = $('sbtn'); b.textContent = m ? 'Sound off' : 'Sound on'; b.setAttribute('aria-pressed', !m); if (out) out.gain.setTargetAtTime(m ? 0 : 1, AC.currentTime, .05) }
$('sbtn').onclick = () => { audio(); setMuted(!muted) }; setMuted(muted);
// a struck glass bell: FM partials, a soft sub-octave body and a slow shimmer an octave up, two or three notes rolled like a harp,
// panned to where the star sits on screen. Same star, same chord.
function tingle(dec = 1, seed, pan = 0) {
  if (!AC || AC.state === 'closed') return; if (AC.state !== 'running') AC.resume().catch(() => { });   // a context the browser parked wakes up for the chime
  const now = AC.currentTime; if (now - lastTing < .12) return; lastTing = now;
  const rnd = seed == null ? Math.random : mulberry32(seed * 7919 + 101), n = 2 + (rnd() * 2 | 0), root = KEYROOT[dec] - 12 + (rnd() < .5 ? 0 : 12), used = [];
  for (let k = 0; k < n; k++) {
    let note; do { note = root + PENTA[rnd() * 5 | 0] + (rnd() < .4 ? 12 : 0) } while (used.includes(note) && used.length < 5); used.push(note);
    const t = now + k * (.07 + rnd() * .09), f = 440 * Math.pow(2, (note - 69) / 12), v = (.16 + rnd() * .06) / (1 + k * .35), dur = 2.6 + rnd() * 2.2, ratio = rnd() < .5 ? 3.5 : 2.76;
    const pn = AC.createStereoPanner(); pn.pan.value = Math.max(-.9, Math.min(.9, pan + (rnd() - .5) * .5)); pn.connect(master);
    const car = AC.createOscillator(), mod = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain(); car.frequency.value = f; mod.frequency.value = f * ratio;
    mg.gain.setValueAtTime(f * 2.2, t); mg.gain.exponentialRampToValueAtTime(f * .02, t + .9); mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .006); g.gain.exponentialRampToValueAtTime(v * .35, t + .35); g.gain.exponentialRampToValueAtTime(.0001, t + dur); car.connect(g); g.connect(pn);
    const sub = AC.createOscillator(), sg = AC.createGain(); sub.type = 'sine'; sub.frequency.value = f / 2; sg.gain.setValueAtTime(0, t); sg.gain.linearRampToValueAtTime(v * .22, t + .25); sg.gain.exponentialRampToValueAtTime(.0001, t + dur * .8); sub.connect(sg); sg.connect(pn);
    const sh = AC.createOscillator(), hg = AC.createGain(); sh.type = 'sine'; sh.frequency.value = f * 2.003; hg.gain.setValueAtTime(0, t); hg.gain.linearRampToValueAtTime(v * .12, t + .6); hg.gain.exponentialRampToValueAtTime(.0001, t + dur * 1.2); sh.connect(hg); hg.connect(pn);
    [car, mod, sub, sh].forEach(o => { o.start(t); o.stop(t + dur * 1.25) });
  }
}
canvas.addEventListener('pointerdown', () => { if (booted) audio() }); addEventListener('keydown', () => { if (booted) audio() });
