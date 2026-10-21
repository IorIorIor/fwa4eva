/* ───────────────────────── the music: Ascent ─────────────────────────
   A generative instrument after Eno and Lanois's "An Ending (Ascent)" (ported from the Ascent toy, its engine as is):
   it writes new lines with the record's habits, never the record. Every dial is a Look setting (a_…), and the toy's
   settings can be pasted in (Sound → Import). The game plays it: speed brightens it and quickens it, bullet time bends
   it down like slowing tape and opens the room, it's fullest in the galaxy and thins out in the void, a ring throws a
   shower of bell notes, and on the map it goes underwater (the map filter in 18-audio). */
let dustHissK = 0;   // how much speed dust you're in (0..1), for the hiss
const ascent = (() => {
  const FLATS = ['C','D♭','D','E♭','E','F','G♭','G','A♭','A','B♭','B'];
  const SHARPS = ['C','C♯','D','D♯','E','F','F♯','G','G♯','A','A♯','B'];
  const SHARP_KEYS = new Set([7, 2, 9, 4, 11, 6]);
  function pcName(pc, key) { return (SHARP_KEYS.has(key) ? SHARPS : FLATS)[((pc % 12) + 12) % 12]; }
  const MODES = [
    { name: 'major',      steps: [0, 2, 4, 5, 7, 9, 11], w: [6, 1.6, 1.2, 4, 3.4, 2.6, 0.12] },
    { name: 'Lydian',     steps: [0, 2, 4, 6, 7, 9, 11], w: [4, 3.2, 1.4, 0.4, 3, 3, 0.8] },
    { name: 'Mixolydian', steps: [0, 2, 4, 5, 7, 9, 10], w: [4, 1.5, 1, 3.5, 2.2, 2, 3] },
    { name: 'Dorian',     steps: [0, 2, 3, 5, 7, 9, 10], w: [4, 1.5, 2.5, 3.5, 2.2, 1, 2.5] },
    { name: 'minor',      steps: [0, 2, 3, 5, 7, 8, 10], w: [4, 0.5, 3, 3, 2.2, 3.5, 3] },
    { name: 'pentatonic', steps: [0, 2, 4, 7, 9],        w: [4, 2, 2.4, 3, 3] },
  ];
  const FM_RATIOS = [0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 7];
  function createEngine(ctx, P, dest, hooks = {}) {
    const n = {};
    const rnd = Math.random;
    const now = () => ctx.currentTime;
    const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const glide = (param, v, tc = 0.08) => param.setTargetAtTime(v, now(), tc);

    // --- main chain: voices -> drive -> low cut -> tone -> dry ---
    n.voiceBus = ctx.createGain();
    n.drive = ctx.createWaveShaper(); n.drive.oversample = '2x';
    n.driveComp = ctx.createGain();
    n.lowcut = ctx.createBiquadFilter(); n.lowcut.type = 'highpass'; n.lowcut.Q.value = 0.5;
    n.tone = ctx.createBiquadFilter(); n.tone.type = 'lowpass'; n.tone.Q.value = 0.35;
    n.dry = ctx.createGain();
    n.preWidth = ctx.createGain();
    n.voiceBus.connect(n.drive); n.drive.connect(n.driveComp); n.driveComp.connect(n.lowcut);
    n.lowcut.connect(n.tone); n.tone.connect(n.dry); n.dry.connect(n.preWidth);

    // --- reverb: send + halo -> pre-delay -> convolver (crossfaded on change) ---
    n.revSend = ctx.createGain(); n.tone.connect(n.revSend);
    n.haloBus = ctx.createGain();
    n.preDelay = ctx.createDelay(1);
    n.revSend.connect(n.preDelay); n.haloBus.connect(n.preDelay);
    n.revReturn = ctx.createGain(); n.revReturn.connect(n.preWidth);
    let conv = null, convGain = null;

    // --- ping-pong echo, dark repeats, also fed into the reverb ---
    n.delSend = ctx.createGain(); n.delSend.channelCount = 1; n.delSend.channelCountMode = 'explicit';
    n.tone.connect(n.delSend);
    n.delL = ctx.createDelay(3); n.delR = ctx.createDelay(3);
    n.delLP = ctx.createBiquadFilter(); n.delLP.type = 'lowpass'; n.delLP.frequency.value = 2200;
    n.delFb = ctx.createGain();
    n.delSend.connect(n.delL); n.delL.connect(n.delR); n.delR.connect(n.delLP); n.delLP.connect(n.delFb); n.delFb.connect(n.delL);
    n.delMerge = ctx.createChannelMerger(2);
    n.delL.connect(n.delMerge, 0, 0); n.delR.connect(n.delMerge, 0, 1);
    n.delReturn = ctx.createGain(); n.delMerge.connect(n.delReturn); n.delReturn.connect(n.preWidth);
    n.delToRev = ctx.createGain(); n.delToRev.gain.value = 0.45; n.delReturn.connect(n.delToRev); n.delToRev.connect(n.preDelay);

    // --- mid/side width ---
    n.split = ctx.createChannelSplitter(2);
    n.preWidth.connect(n.split);
    n.mid = ctx.createGain(); n.mid.gain.value = 0.5;
    n.sL = ctx.createGain(); n.sL.gain.value = 0.5;
    n.sR = ctx.createGain(); n.sR.gain.value = -0.5;
    n.side = ctx.createGain();
    n.sideInv = ctx.createGain(); n.sideInv.gain.value = -1;
    n.split.connect(n.mid, 0); n.split.connect(n.mid, 1);
    n.split.connect(n.sL, 0); n.split.connect(n.sR, 1);
    n.sL.connect(n.side); n.sR.connect(n.side);
    n.widthMerge = ctx.createChannelMerger(2);
    n.mid.connect(n.widthMerge, 0, 0); n.mid.connect(n.widthMerge, 0, 1);
    n.side.connect(n.widthMerge, 0, 0); n.side.connect(n.sideInv); n.sideInv.connect(n.widthMerge, 0, 1);

    // --- master: fade -> limiter -> volume -> analyser -> out ---
    n.master = ctx.createGain(); n.widthMerge.connect(n.master);
    n.fade = ctx.createGain(); n.fade.gain.value = 0;
    // soft clipper as a safety limiter (no makeup gain, unlike DynamicsCompressor)
    n.limIn = ctx.createGain(); n.limIn.gain.value = 1 / 1.6;
    n.limiter = ctx.createWaveShaper();
    {
      const N = 4096, c = new Float32Array(N), k = 0.75;
      for (let i = 0; i < N; i++) { const u = ((i / (N - 1)) * 2 - 1) * 1.6, a = Math.abs(u); c[i] = Math.sign(u) * (a < k ? a : k + (1 - k) * Math.tanh((a - k) / (1 - k))); }
      n.limiter.curve = c; n.limiter.oversample = '2x';
    }
    n.out = ctx.createGain();
      n.master.connect(n.fade); n.fade.connect(n.out); n.out.connect(n.limIn); n.limIn.connect(n.limiter); n.limiter.connect(dest);

    // --- tape hiss ---
    {
      const len = ctx.sampleRate * 3, b = ctx.createBuffer(2, len, ctx.sampleRate);
      for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1; }
      n.hissSrc = ctx.createBufferSource(); n.hissSrc.buffer = b; n.hissSrc.loop = true;
      n.hissHP = ctx.createBiquadFilter(); n.hissHP.type = 'highpass'; n.hissHP.frequency.value = 900;
      n.hissLP = ctx.createBiquadFilter(); n.hissLP.type = 'lowpass'; n.hissLP.frequency.value = 5500;
      n.hissGain = ctx.createGain(); n.hissGain.gain.value = 0;
      n.hissSrc.connect(n.hissHP); n.hissHP.connect(n.hissLP); n.hissLP.connect(n.hissGain); n.hissGain.connect(n.master);
      n.hissSrc.start();
    }

    // --- shared pitch modulators (wow, slow drift, vibrato) ---
    const lfo = (type, f) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const g = ctx.createGain(); g.gain.value = 0; o.connect(g); o.start(); return [o, g]; };
    [n.wowOsc, n.wowGain] = lfo('sine', 0.32);
    [n.driftOsc, n.driftGain] = lfo('triangle', 0.067);
    [n.vibOsc, n.vibGain] = lfo('sine', 4.6);
    n.bend = ctx.createConstantSource(); n.bend.offset.value = 0; n.bend.start();
    const MODS = [n.wowGain, n.driftGain, n.vibGain, n.bend];
    const connectMods = p => MODS.forEach(m => m.connect(p));
    const disconnectMods = p => MODS.forEach(m => { try { m.disconnect(p); } catch (e) {} });

    // --- waveform: a near-sine with a soft 2nd harmonic ---
    let wave = null;
    const liveOscs = new Set();
    function rebuildWave() {
      const imag = new Float32Array([0, 1, P.h2, P.h3, P.h4, P.h4 * 0.6, P.h4 * 0.36, P.h4 * 0.2]);
      wave = ctx.createPeriodicWave(new Float32Array(imag.length), imag);
      liveOscs.forEach(o => { try { o.setPeriodicWave(wave); } catch (e) {} });
    }

    // --- pedal drone ---
    n.droneBus = ctx.createGain(); n.droneBus.gain.value = 0; n.droneBus.connect(n.voiceBus);
    n.droneLfo = ctx.createOscillator(); n.droneLfo.frequency.value = 0.045;
    n.droneLfoG = ctx.createGain(); n.droneLfoG.gain.value = 0.3;
    n.droneAmp = ctx.createGain(); n.droneAmp.gain.value = 0.7;
    n.droneLfo.connect(n.droneLfoG); n.droneLfoG.connect(n.droneAmp.gain); n.droneLfo.start();
    n.droneAmp.connect(n.droneBus);
    const drones = [0, 7].map((iv, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain(); g.gain.value = i ? 0.5 : 0.8;
      o.connect(g); g.connect(n.droneAmp); connectMods(o.detune); o.detune.value = i ? 3 : -2; o.start();
      liveOscs.add(o); return { o, iv };
    });

    // ---------- music state ----------
    const M = { pace: 1 };   // the game's hold on time: >1 spaces the notes out
    const S = { chord: null, melDeg: null, nextMel: 0, nextBass: 0, nextChord: 0, running: false, endAt: Infinity, t0: 0 };
    const active = [];
    const mode = () => MODES[P.mode | 0];
    const L = () => mode().steps.length;
    const keyPc = () => P.key | 0;
    const wrap = (d, m) => ((d % m) + m) % m;
    function degToMidi(d) { const st = mode().steps, l = st.length, o = Math.floor(d / l); return 12 + keyPc() + 12 * o + st[d - o * l]; }
    function nearestDeg(midi) {
      const l = L(), o = Math.floor((midi - 12 - keyPc()) / 12); let best = 0, bd = 1e9;
      for (let d = (o - 1) * l; d <= (o + 2) * l; d++) { const dd = Math.abs(degToMidi(d) - midi); if (dd < bd) { bd = dd; best = d; } }
      return best;
    }
    const isChordTone = d => S.chord && S.chord.set.has(wrap(d, L()));
    function pickW(items) { let s = 0; for (const [, w] of items) s += w; let r = rnd() * s; for (const [v, w] of items) { if ((r -= w) <= 0) return v; } return items[items.length - 1][0]; }
    function nearestPitch(pc, center) { const up = center + wrap(pc - center, 12); return (up - center <= center - (up - 12)) ? up : up - 12; }

    function chordLabel(c) {
      const st = mode().steps, l = st.length, k = keyPc();
      const semi = d => st[wrap(d, l)] + 12 * Math.floor(d / l);
      const r = semi(c.deg), third = semi(c.deg + 2) - r, fifth = semi(c.deg + 4) - r;
      let q = '';
      if (third === 4 && fifth === 7) q = ''; else if (third === 3 && fifth === 7) q = 'm';
      else if (third === 3 && fifth === 6) q = '°'; else if (third === 4 && fifth === 8) q = '+';
      else if (third === 2 || third === 5) q = 'sus'; else q = '6';
      let ext = '';
      if (c.ext === 7) { const sv = semi(c.deg + 6) - r; ext = sv === 11 ? 'maj7' : sv === 10 ? '7' : sv === 9 ? '6' : ''; if (q === '°' && sv === 10) { q = 'm7♭5'; ext = ''; } }
      else if (c.ext === 9) ext = 'add9';
      if (ext === 'add9' && q === '6') { q = '6/9'; ext = ''; }
      if (ext === 'add9' && q === 'sus') { q = '9sus'; ext = ''; }
      if (q === '6' && ext) ext = '';
      return pcName(k + st[wrap(c.deg, l)], k) + q + ext;
    }

    function advanceChord(t) {
      const md = mode(), l = md.steps.length, r = P.restless;
      let d = 0;
      if (S.chord) {
        const cur = S.chord.deg, avg = md.w.reduce((a, b) => a + b, 0) / l;
        const tri = x => new Set([x, x + 2, x + 4].map(v => wrap(v, l)));
        const curSet = tri(cur);
        const items = md.w.map((w, i) => {
          if (i === cur) return [i, 0];
          let common = 0; tri(i).forEach(v => curSet.has(v) && common++);
          return [i, ((1 - r) * w + r * avg) * (1 + (1 - r) * 0.6 * common)];
        });
        d = pickW(items);
      }
      const tones = [d, d + 2, d + 4]; let ext = 0;
      if (rnd() < P.ext) { if (rnd() < 0.55) { tones.push(d + 6); ext = 7; } else { tones.push(d + l + 1); ext = 9; } }
      S.chord = { deg: d, tones, ext, set: new Set(tones.map(v => wrap(v, l))) };
      S.chord.label = chordLabel(S.chord);
      if (hooks.onChord) hooks.onChord(S.chord.label, t);
    }

    function voice(midi, t, vel, kind) {
      const bass = kind === 'bass';
      const atk = Math.max(0.03, P.attack * (bass ? 1.25 : 1));
      const hold = Math.max(0.02, P.hold * (bass ? 1.3 : 1));
      const rel = Math.max(0.08, P.release * (bass ? 1.2 : 1));
      const U = Math.round(P.unison);
      const f = mtof(midi);
      const peak = (bass ? 0.24 * P.bassLevel : 0.14) * vel / Math.sqrt(U);
      if (peak <= 0) return;
      const N = 64, shape = new Float32Array(N);
      const curveAt = scale => { const c = new Float32Array(N); for (let i = 0; i < N; i++) c[i] = shape[i] * scale; return c; };
      for (let i = 0; i < N; i++) shape[i] = Math.pow(0.5 - 0.5 * Math.cos(Math.PI * i / (N - 1)), P.curve);
      const tRel = Math.max(t + atk + hold, t + atk + 1e-3), tEnd = tRel + rel * 1.25 + 0.05;
      const envelope = (param, scale) => {
        param.setValueCurveAtTime(curveAt(scale), t, atk);   // (the release starts once the attack's curve is over: a value can't be set inside it)
        param.setValueAtTime(scale, tRel);
        param.setTargetAtTime(0, tRel, rel / 5);
      };

      // steal the oldest voice if too many overlap at t
      const overlapping = active.filter(v => v.tEnd > t && !v.killed);
      if (overlapping.length >= 30) { const old = overlapping[0]; old.killed = true; old.kill.gain.setTargetAtTime(0, Math.max(t - 0.4, now()), 0.15); }

      const env = ctx.createGain(); env.gain.value = 0; envelope(env.gain, peak);
      const kill = ctx.createGain(); env.connect(kill); kill.connect(n.voiceBus);
      const nodes = [env, kill]; const oscs = [];
      const pan = (rnd() * 2 - 1) * 0.7 * P.spread;
      const glideIn = (param, base) => { if (P.glide > 0.5) { param.setValueAtTime(base - P.glide, t); param.setTargetAtTime(base, t, Math.max(0.05, atk * 0.35)); } };

      let mg = null;
      if (P.fm > 0.001) {
        const mod = ctx.createOscillator(); mod.frequency.value = f * FM_RATIOS[P.fmRatio | 0];
        mg = ctx.createGain(); mg.gain.value = 0; envelope(mg.gain, f * P.fm);
        mod.connect(mg); mod.start(t); mod.stop(tEnd); nodes.push(mod, mg);
      }
      for (let u = 0; u < U; u++) {
        const s = U === 1 ? 0 : (u / (U - 1)) * 2 - 1;
        const o = ctx.createOscillator(); o.setPeriodicWave(wave); o.frequency.value = f;
        const d0 = s * P.detune * 0.5 + (rnd() - 0.5) * P.detune * 0.3;
        o.detune.value = d0; glideIn(o.detune, d0);
        if (mg) mg.connect(o.frequency);
        connectMods(o.detune);
        const p = ctx.createStereoPanner(); p.pan.value = clamp(pan + s * P.spread, -1, 1);
        o.connect(p); p.connect(env); o.start(t); o.stop(tEnd);
        oscs.push(o); nodes.push(p); liveOscs.add(o);
      }
      if (!bass && P.halo > 0.001) {
        const h = ctx.createOscillator(); h.frequency.value = f * 2; const hd = (rnd() - 0.5) * 9; h.detune.value = hd; glideIn(h.detune, hd);
        const hg = ctx.createGain(); hg.gain.value = 0; envelope(hg.gain, peak * P.halo * 1.3 * Math.sqrt(U));
        connectMods(h.detune); h.connect(hg); hg.connect(n.haloBus); h.start(t); h.stop(tEnd);
        oscs.push(h); nodes.push(hg);
      }
      const v = { kill, t0: t, tEnd, oscs };
      active.push(v);
      oscs[0].onended = () => {
        oscs.forEach(o => { disconnectMods(o.detune); liveOscs.delete(o); try { o.disconnect(); } catch (e) {} });
        nodes.forEach(x => { try { x.disconnect(); } catch (e) {} });
        const i = active.indexOf(v); if (i >= 0) active.splice(i, 1);
      };
      if (hooks.onNote) hooks.onNote({ midi, t, atk, hold, rel, vel, kind });
    }

    function melodyStep(t) {
      const center = nearestDeg(P.register), R = Math.round(P.range);
      if (S.melDeg === null) S.melDeg = center;
      if (rnd() < P.rests) return;
      const kmax = Math.round(P.step), opts = [];
      for (let k = -kmax; k <= kmax; k++) opts.push([k, k === 0 ? 0.35 : 1 / Math.pow(Math.abs(k), 0.9)]);
      const k = pickW(opts);
      let d = S.melDeg + k;
      if (d > center + R) d = center + R - (d - (center + R));
      if (d < center - R) d = center - R + ((center - R) - d);
      d = clamp(d, center - R, center + R);
      if (rnd() < P.gravity && !isChordTone(d)) {
        const dir = k >= 0 ? 1 : -1;
        for (const off of [dir, -dir, 2 * dir, -2 * dir]) if (isChordTone(d + off)) { d += off; break; }
      }
      S.melDeg = d;
      const vel = 1 - P.dyn * rnd() * 0.75;
      voice(degToMidi(d), t, vel, 'mel');
      if (rnd() < P.double) {
        let d2 = d - 2;
        for (let j = 2; j <= 5; j++) if (isChordTone(d - j)) { d2 = d - j; break; }
        voice(degToMidi(d2), t + rnd() * P.drift * 0.6, vel * 0.72, 'mel');
      }
    }

    function bassStep(t) {
      if (P.bassLevel < 0.001 || !S.chord) return;
      const d = rnd() < 0.82 ? S.chord.deg : S.chord.deg + 4;
      const pc = keyPc() + mode().steps[wrap(d, L())];
      const center = 12 * (Math.round(P.bassOct) + 1) + 10;
      voice(nearestPitch(pc, center), t, 0.85 + rnd() * 0.15, 'bass');
    }

    function retuneDrone(tc = 1.5) {
      const root = nearestPitch(keyPc(), 12 * (Math.round(P.bassOct) + 1) + 10);
      drones.forEach(d => d.o.frequency.setTargetAtTime(mtof(root + d.iv), now(), tc));
    }

    function scheduleUntil(h) {
      if (!S.running) return;
      const lim = Math.min(h, S.endAt - 6);
      for (let guard = 0; guard < 500; guard++) {
        const tn = Math.min(S.nextChord, S.nextBass, S.nextMel);
        if (tn > lim) break;
        if (tn === S.nextChord) { advanceChord(tn); S.nextChord += Math.max(1, M.pace * P.chordEvery * (1 + (rnd() - 0.5) * P.drift * 0.5)); }
        else if (tn === S.nextBass) { bassStep(tn); S.nextBass += Math.max(0.8, M.pace * P.bassEvery * (1 + (rnd() - 0.5) * P.drift * 0.6)); }
        else { melodyStep(tn); S.nextMel += Math.max(0.4, M.pace * P.noteEvery * (1 + (rnd() - 0.5) * P.drift)); }
      }
    }

    // ---------- reverb impulse ----------
    function makeIR(decay, damp) {
      const sr = ctx.sampleRate, len = Math.max(1, Math.floor(sr * Math.min(decay * 1.1 + 0.2, 26)));
      const buf = ctx.createBuffer(2, len, sr), k = Math.exp(-6.907755 / (decay * sr)), ramp = sr * 0.015;
      for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c); let y1 = 0, y2 = 0, env = 1, a = 0;
        for (let i = 0; i < len; i++) {
          if ((i & 63) === 0) a = Math.exp(-2 * Math.PI * (140 + damp * Math.pow(0.18, i / sr / decay)) / sr);
          const x = rnd() * 2 - 1; y1 = x + a * (y1 - x); y2 = y1 + a * (y2 - y1);
          d[i] = y2 * env * (i < ramp ? i / ramp : 1); env *= k;
        }
      }
      return buf;
    }
    function regenIR() {
      const c = ctx.createConvolver(); c.normalize = true; c.buffer = makeIR(P.decay, P.damp);
      const g = ctx.createGain(); g.gain.value = conv ? 0 : 1;
      n.preDelay.connect(c); c.connect(g); g.connect(n.revReturn);
      if (conv) {
        const oc = conv, og = convGain;
        g.gain.setTargetAtTime(1, now(), 0.25); og.gain.setTargetAtTime(0, now(), 0.25);
        setTimeout(() => { try { n.preDelay.disconnect(oc); oc.disconnect(); og.disconnect(); } catch (e) {} }, 2500);
      }
      conv = c; convGain = g;
    }
    let irTimer = null;
    const queueIR = () => { clearTimeout(irTimer); irTimer = setTimeout(regenIR, 350); };

    function setDrive() {
      const amt = P.drive;
      if (amt < 0.005) { n.drive.curve = null; glide(n.driveComp.gain, 1); return; }
      const g = 1 + amt * 7, N = 2048, c = new Float32Array(N), tg = Math.tanh(g);
      for (let i = 0; i < N; i++) { const x = (i / (N - 1)) * 2 - 1; c[i] = Math.tanh(g * x) / tg; }
      n.drive.curve = c; glide(n.driveComp.gain, 1 / Math.pow(g / tg, 0.85));
    }

    function apply(id) {
      switch (id) {
        case 'tone': glide(n.tone.frequency, P.tone); break;
        case 'lowcut': glide(n.lowcut.frequency, P.lowcut); break;
        case 'drive': setDrive(); break;
        case 'revMix': glide(n.dry.gain, 1 - 0.55 * P.revMix); glide(n.revSend.gain, 1.6 * P.revMix); break;
        case 'decay': case 'damp': queueIR(); break;
        case 'preDelay': glide(n.preDelay.delayTime, P.preDelay, 0.1); break;
        case 'delTime': glide(n.delL.delayTime, P.delTime, 0.25); glide(n.delR.delayTime, P.delTime, 0.25); break;
        case 'delFb': glide(n.delFb.gain, P.delFb); break;
        case 'delMix': glide(n.delSend.gain, P.delMix * 0.9); break;
        case 'width': glide(n.side.gain, P.width); break;
        case 'hiss': glide(n.hissGain.gain, P.hiss * 0.035); break;
        case 'volume': glide(n.out.gain, P.volume); break;
        case 'wow': glide(n.wowGain.gain, P.wow); glide(n.driftGain.gain, P.wow * 0.7); break;
        case 'wowRate': glide(n.wowOsc.frequency, P.wowRate); glide(n.driftOsc.frequency, P.wowRate * 0.21); break;
        case 'vib': glide(n.vibGain.gain, P.vib); break;
        case 'vibRate': glide(n.vibOsc.frequency, P.vibRate); break;
        case 'h2': case 'h3': case 'h4': rebuildWave(); break;
        case 'drone': if (S.running) glide(n.droneBus.gain, P.drone * 0.16, 0.4); break;
        case 'key': case 'bassOct': retuneDrone(); if (id === 'key') S.melDeg = null; break;
        case 'mode': S.melDeg = null; break;
      }
    }
    function applyAll() { rebuildWave(); ASC_KEYS.forEach(id => { if (id !== 'decay' && id !== 'damp') apply(id); }); retuneDrone(0.01); }

    function start(t0, takeLength = 0) {
      S.running = true; S.t0 = t0; S.chord = null; S.melDeg = null;
      S.nextChord = t0; S.nextBass = t0 + 0.05; S.nextMel = t0 + 0.5;
      S.endAt = takeLength ? t0 + takeLength : Infinity;
      const fg = n.fade.gain, fi = Math.max(0.05, P.fadeIn);
      fg.cancelScheduledValues(t0); fg.setValueAtTime(0.0001, t0); fg.linearRampToValueAtTime(1, t0 + fi);
      if (takeLength) { fg.setValueAtTime(1, Math.max(t0 + fi, S.endAt - 20)); fg.linearRampToValueAtTime(0, S.endAt); }
      n.droneBus.gain.setTargetAtTime(P.drone * 0.16, t0, 1.5);
    }
    function stop(fadeTime = 2) {
      S.running = false;
      const t = now(), fg = n.fade.gain;
      fg.cancelScheduledValues(t); fg.setValueAtTime(fg.value, t); fg.linearRampToValueAtTime(0, t + fadeTime);
      n.droneBus.gain.setTargetAtTime(0, t, 0.4);
      active.forEach(v => v.kill.gain.setTargetAtTime(0, t + fadeTime, 0.1));
    }

    // a ring: a quick shower of bright bell notes, up the scale from the melody's register, into the room
    function sparkle(amt = 1, n0 = 7) {
      if (!wave) return; const t0 = now() + 0.02, base = nearestDeg(P.register) + 3;
      for (let k = 0; k < n0; k++) {
        const d = base + k + (rnd() < 0.3 ? 2 : 0), f = mtof(degToMidi(d)), t = t0 + k * (0.055 + rnd() * 0.04), v = 0.09 * amt * (1 - k / (n0 + 2)), dur = 1.4 + rnd();
        const o = ctx.createOscillator(), m = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain(), p = ctx.createStereoPanner();
        o.frequency.value = f * 2; m.frequency.value = f * 7; mg.gain.setValueAtTime(f * 3, t); mg.gain.exponentialRampToValueAtTime(f * 0.02, t + 0.35); m.connect(mg); mg.connect(o.frequency);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        p.pan.value = (rnd() * 2 - 1) * 0.8; o.connect(g); g.connect(p); p.connect(n.tone); p.connect(n.haloBus);
        o.start(t); m.start(t); o.stop(t + dur + 0.05); m.stop(t + dur + 0.05); o.onended = () => { [o, m, mg, g, p].forEach(x => { try { x.disconnect() } catch (e) { } }) };
      }
    }
    return { n, S, P, M, active, start, stop, scheduleUntil, apply, applyAll, regenIR, sparkle };
  }
  const P = {}, live = () => { for (const k of ASC_KEYS) { const v = LOOK['a_' + k]; P[k] = typeof v === 'number' && isFinite(v) ? v : ASC_DEF[k] } };
  let e = null, ctx = null, timer = 0, last = {}, sk = -1;
  const sync = () => { live(); for (const k of ASC_KEYS) if (last[k] !== P[k]) { const was = last[k]; last[k] = P[k]; if (was !== undefined) { if (k === 'decay' || k === 'damp') e.regenIR(); else e.apply(k) } } };
  return {
    boot(ac, dest) {   // once there's an audio context: build it into the music chain and start, fading in
      if (e) return; ctx = ac; live(); e = createEngine(ctx, P, dest); e.applyAll(); e.regenIR(); for (const k of ASC_KEYS) last[k] = P[k];
      e.start(ctx.currentTime + .1); timer = setInterval(() => { if (e) e.scheduleUntil(ctx.currentTime + (document.visibilityState === 'hidden' ? 3 : .8)) }, 150);
    },
    import(txt) {   // the toy's settings (any of its dial names, flat or under P / values), into the Look
      let o = null; try { o = JSON.parse(String(txt).slice(String(txt).indexOf('{'))) } catch (err) { return 0 } if (o && typeof o === 'object') o = o.P || o.values || o; let n = 0;
      for (const k in o) { const id = k.replace(/^a_/, ''), v = +o[k], row = ASC_KEYS.includes(id) && LOOK_DEF.flatMap(g => g[1]).find(r => r[0] === 'a_' + id); if (row && isFinite(v)) { LOOK['a_' + id] = Math.max(row[4], Math.min(row[5], v)); n++ } }
      return n;
    },
    state() { return e ? { voices: e.active.length, chord: e.S.chord && e.S.chord.label, t: ctx.currentTime, run: ctx.state, pace: e.M.pace, bend: e.n.bend.offset.value } : null },
    sparkle(v = 1) { if (e && (LOOK.mSparkle ?? 1) > 0) e.sparkle(v * (LOOK.mSparkle ?? 1)) },
    update(dt) {   // the game's hold on it, a few times a second
      if (!e || (sk -= dt) > 0) return; sk = .1; sync();
      const L = LOOK, n = e.n, t = ctx.currentTime, fly = S.mode === 'fly', s = fly ? Math.min(1, Math.log10(1 + player.vel.length()) / Math.log10(1 + LIGHT)) : 0, dl = 1 - slowmo.k;
      const Rg = GAL_R0 + GAL_LEN, gal = 1 - sstep(camera.position.distanceTo(GC), Rg * .8, Rg * 2.6), sb = (L.mSpeed ?? 1) * s, dk = (L.mDilate ?? 1) * dl;
      n.tone.frequency.setTargetAtTime(Math.min(16000, P.tone * (1 + 2.2 * sb) * (1 - .55 * Math.min(1, dk))), t, .3);   // faster: brighter; time slowing: darker
      n.haloBus.gain.setTargetAtTime(1 + 1.5 * sb, t, .4);
      e.M.pace = (1 - .4 * sb) * (1 + 2.5 * dk);   // faster: the notes come quicker; in bullet time they stretch out
      n.bend.offset.setTargetAtTime(-650 * dk, t, .12);   // the tape slows: everything sinks in pitch
      n.revSend.gain.setTargetAtTime(1.6 * P.revMix * (1 + 1.2 * dk), t, .2); n.delFb.gain.setTargetAtTime(Math.min(.85, P.delFb + .4 * dk), t, .2);
      { const rn = fly && LOOK.rings ? 1 - sstep(HALO.ts, .1, 2) : 0, ek = (L.mEcho ?? 1) * Math.max(rn, Math.min(1, dl * 1.3)), et = Math.min(2.9, P.delTime * (1 + 2.2 * ek)); n.delL.delayTime.setTargetAtTime(et, t, .35); n.delR.delayTime.setTargetAtTime(et, t, .35); n.delSend.gain.setTargetAtTime(Math.min(1, P.delMix * .9 * (1 + 1.5 * ek)), t, .3) }   // near and through a ring the echoes stretch out (the repeats slide in pitch as they do) and come forward
      { const dk = fly ? sstep(player.vel.length(), 150, 4000) * Math.min(1, streakDens * 1.5) : 0; dustHissK = dk; n.hissGain.gain.setTargetAtTime(.035 * P.hiss + .05 * (L.mDustHiss ?? .6) * dk, t, .25) }   // the tape hiss rises with the speed dust you're flying through, like a faint Geiger counter
      n.out.gain.setTargetAtTime(P.volume * (1 - (L.mVoid ?? .45) * (1 - gal)) * (1 + .25 * sb), t, .8);   // fullest in the galaxy, thinner out in the void
    },
  };
})();
