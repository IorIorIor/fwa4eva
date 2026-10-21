/* ───────────────────────── sound ─────────────────────────
   The Ascent instrument (18-ascent); an engine of filtered noise and a soft drone that rises with speed; a hum near the
   outpost; and hovering a star strikes a glass bell in a vast space, the same chord every time for the same star. */
let musicFx = null, musicMapOn = null, AC = null, out = null, master = null, ambBus = null, musicGain = null, ENG = null, hum = null, lastTing = 0;
let muted = store.get('sotd-muted') === '1';
const KEYROOT = [72, 74, 76, 79, 81, 84], PENTA = [0, 2, 4, 7, 9];
const CHIME_K = .9;   // the chime bus level (× the Hover tingles slider)
function spaceIR(sec) {   // a room: quick onset, then a tail that darkens as it dies away
  const sr = AC.sampleRate, n = Math.floor(sr * sec), b = AC.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c), seedR = mulberry32(c ? 91 : 17); let lp = 0; for (let i = 0; i < n; i++) { const t = i / sr, env = (1 - Math.exp(-t * 60)) * Math.exp(-t / (sec * .28)), k = .2 + .7 * Math.min(1, t / sec); lp = lp * k + (seedR() * 2 - 1) * (1 - k); d[i] = lp * env * .5 } }
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
    try {
      musicGain = AC.createGain(); musicGain.gain.value = .6 * LOOK.music; const src = AC.createGain();   // the instrument plays into here
      // the map's filter: everything through a lowpass that closes (with a little resonance), plus a soft echo that only the map hears
      const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 20000; lp.Q.value = .7; const dl = AC.createDelay(1), fb = AC.createGain(), wet = AC.createGain(); dl.delayTime.value = .34; fb.gain.value = .38; wet.gain.value = 0;
      src.connect(lp); lp.connect(musicGain); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(musicGain); musicFx = { lp, wet };
      musicGain.connect(out); ascent.boot(AC, src);
    } catch (e) { }
    // chimes: their own bus, loud enough to sit clearly over the music: the dry bell up front, a short bright room behind it,
    // and two soft echoes panned left and right
    master = AC.createGain(); master.gain.value = CHIME_K * LOOK.ting; master.connect(out);
    try {
      const conv = AC.createConvolver(); conv.buffer = spaceIR(3.6); const rG = AC.createGain(); rG.gain.value = .55; master.connect(conv); conv.connect(rG); rG.connect(out);
      const dL = AC.createDelay(2), dR = AC.createDelay(2), gL = AC.createGain(), gR = AC.createGain(), pL = AC.createStereoPanner(), pR = AC.createStereoPanner();
      dL.delayTime.value = .32; dR.delayTime.value = .55; gL.gain.value = .22; gR.gain.value = .14; pL.pan.value = -.7; pR.pan.value = .7;
      master.connect(dL); dL.connect(gL); gL.connect(pL); pL.connect(out); master.connect(dR); dR.connect(gR); gR.connect(pR); pR.connect(out);
    } catch (e) { }
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
  const th = fly && thrusting ? 1 : 0, brk = fly && (keys.s || keys.arrowdown || touchBrake) && sp > 5 ? 1 : 0, move = fly ? sstep(sp, 2, 400) : 0;
  ENG.nG.gain.setTargetAtTime((.006 + th * .05 + move * .018 + boostK * .07) * (1 + k * .6), t, th ? .12 : .6);
  ENG.bp.frequency.setTargetAtTime(180 + k * 1500 + th * 220, t, .25);
  ENG.tG.gain.setTargetAtTime(fly ? (.012 + th * .035 + move * .012) : 0, t, th ? .15 : .8);
  ENG.lp.frequency.setTargetAtTime(240 + k * 900 + th * 300, t, .3);
  const f = (42 + k * 58) * (brk ? .88 : 1) * (1 + boostK * .25); ENG.oscs.forEach(o => o.frequency.setTargetAtTime(f, t, .35));
  ENG.eng.gain.setTargetAtTime(LOOK.engine * (fly ? 1 : LOOK.mapSfx ?? 1), t, .1);
}
const ICON_SOUND = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 8a5 5 0 0 1 0 8"/><path d="M17.7 5a9 9 0 0 1 0 14"/><path d="M6 15h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l3.5 -4.5a.8 .8 0 0 1 1.5 .5v14a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5"/></svg>', ICON_MUTED = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464"/><path d="M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615"/><path d="M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664"/><path d="M3 3l18 18"/></svg>';   // Tabler icons (outline)
function setMuted(m) { muted = m; store.set('sotd-muted', m ? '1' : '0'); const b = $('sbtn'); b.innerHTML = '' + (m ? ICON_MUTED : ICON_SOUND); b.title = m ? 'Sound off' : 'Sound on'; b.setAttribute('aria-pressed', !m); if (out) out.gain.setTargetAtTime(m ? 0 : 1, AC.currentTime, .05) }
$('sbtn').onclick = () => { audio(); setMuted(!muted) }; setMuted(muted);
// hovering a star strikes a small glass bell: two or three notes of a pentatonic chord rolled like a harp, panned to where
// the star sits on screen. Same star, same chord. Each note: a sine with a bright FM strike that fades into a pure tone.
function tingle(dec = 1, seed, pan = 0) {
  if (!AC || AC.state === 'closed' || !master) return; if (AC.state !== 'running') AC.resume().catch(() => { });   // a context the browser parked wakes up for the chime
  const now = AC.currentTime + .01; if (now - lastTing < .1) return; lastTing = now;
  const rnd = seed == null ? Math.random : mulberry32(seed * 7919 + 101), n = 2 + (rnd() * 2 | 0), root = KEYROOT[Math.max(0, Math.min(5, dec | 0))] - 12 + (rnd() < .5 ? 0 : 12), used = [];
  for (let k = 0; k < n; k++) {
    let note; do { note = root + PENTA[rnd() * 5 | 0] + (rnd() < .3 ? 12 : 0) } while (used.includes(note) && used.length < 5); used.push(note);
    const t = now + k * (.06 + rnd() * .07), f = 440 * Math.pow(2, (note - 69) / 12), v = .32 / (1 + k * .4), dur = 1.6 + rnd() * 1.2;
    const pn = AC.createStereoPanner(); pn.pan.value = Math.max(-.85, Math.min(.85, pan * .8 + (rnd() - .5) * .3)); pn.connect(master);
    const car = AC.createOscillator(), mod = AC.createOscillator(), mg = AC.createGain(), g = AC.createGain(); car.type = 'sine'; car.frequency.value = f; mod.frequency.value = f * 3.5;
    mg.gain.setValueAtTime(f * 1.6, t); mg.gain.exponentialRampToValueAtTime(f * .01, t + .5); mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .004); g.gain.exponentialRampToValueAtTime(v * .3, t + .25); g.gain.exponentialRampToValueAtTime(.0001, t + dur); car.connect(g); g.connect(pn);
    const oc = AC.createOscillator(), og = AC.createGain(); oc.type = 'sine'; oc.frequency.value = f * 2.01; og.gain.setValueAtTime(0, t); og.gain.linearRampToValueAtTime(v * .18, t + .01); og.gain.exponentialRampToValueAtTime(.0001, t + dur * .6); oc.connect(og); og.connect(pn);
    [car, mod, oc].forEach(o => { o.start(t); o.stop(t + dur + .1) });
  }
}
canvas.addEventListener('pointerdown', () => { if (booted) audio() }); addEventListener('keydown', () => { if (booted) audio() });

function musicMap(on) {   // map on: the music sinks underwater, slowly; back to flying, it surfaces
  if (!musicFx || !AC || on === musicMapOn) return; musicMapOn = on; const m = on ? (LOOK.mapMuffle ?? .8) : 0, t = AC.currentTime, T = on ? .9 : .5;
  musicFx.lp.frequency.setTargetAtTime(20000 * Math.pow(480 / 20000, m), t, T); musicFx.lp.Q.setTargetAtTime(.7 + 5 * m, t, T); musicFx.wet.gain.setTargetAtTime(.32 * m, t, T);
  musicGain.gain.setTargetAtTime(.6 * LOOK.music * (1 - .3 * m) * (on ? LOOK.mapMusic ?? 1 : 1), t, T); if (master) master.gain.setTargetAtTime(CHIME_K * LOOK.ting * (on ? LOOK.mapSfx ?? 1 : 1), t, T);   // the map has its own music and sound levels
}
