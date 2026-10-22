/* ───────────────────────── the galaxy as a record ─────────────────────────
   Map: Play turns the galaxy like a record under a fixed needle. Every winner the filters let through plays a note as
   it passes the needle: newer (nearer the core) higher, older lower, louder for a higher score, a fifth for the month's
   best and a bell for the year's. Pick an agency or a filter and the record becomes its music.
   A winner's record (its full tooltip up, in flight or on the map): Space plays it. The ring and its picture spin like
   a record and a short loop plays, written from that FWA: its month the key, its category the mode, its score the
   tempo, its title the melody, its agency the bass. The usual music fades out while either plays. */
const rec = (() => {
  const st = { mode: null, i: -1, duck: 0, phi: null, budget: 0, spin: 0, next: 0, step: 0, seq: null };
  const AZ = new Float32Array(N), UU = new Float32Array(N), _v = new V3(), _r = new V3(), _ax = new V3(0, 1, 0).applyQuaternion(GQ);
  const turn = d => { orbit.theta += d; orbit.target.sub(GC).applyAxisAngle(_ax, d).add(GC) };   // the record turns round the galaxy's own centre, wherever the map has been dragged to
  for (let i = 0; i < N; i++) { _v.set(P[i * 3] - GC.x, P[i * 3 + 1] - GC.y, P[i * 3 + 2] - GC.z).applyQuaternion(GQI); AZ[i] = Math.atan2(_v.z, _v.x); UU[i] = Math.max(0, Math.min(1, (Math.hypot(_v.x, _v.z) - GAL_R0) / GAL_LEN)) }   // each winner's angle round the core and how far out (0 core … 1 rim)
  // sound: its own bus into the music's switch (past the sounds' mute), a soft lowpass and a slow echo
  let bus = null;
  const ensure = () => {
    if (!AC) audio(); if (!AC || !musicMute) return null; if (AC.state !== 'running') AC.resume().catch(() => { });
    if (!bus) { const g = AC.createGain(), lp = AC.createBiquadFilter(), dl = AC.createDelay(2), fb = AC.createGain(), wet = AC.createGain(); g.gain.value = 0; lp.type = 'lowpass'; lp.frequency.value = 5200; dl.delayTime.value = .37; fb.gain.value = .32; wet.gain.value = .28; g.connect(lp); lp.connect(musicMute); lp.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(musicMute); bus = g }
    return bus;
  };
  const note = (f, t, dur, vel, kind, pan = 0) => {   // one plucked or bowed note, shaped with plain ramps
    const o = AC.createOscillator(), g = AC.createGain(), p = AC.createStereoPanner(); o.type = kind === 2 ? 'triangle' : 'sine'; o.frequency.value = f; p.pan.value = Math.max(-.9, Math.min(.9, pan));
    let m = null; if (kind === 1) { m = AC.createOscillator(); const mg = AC.createGain(); m.frequency.value = f * 2.01; mg.gain.setValueAtTime(f * .9, t); mg.gain.exponentialRampToValueAtTime(f * .02, t + dur); m.connect(mg); mg.connect(o.frequency); m.start(t); m.stop(t + dur + .05) }   // a glassy FM bell
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vel, t + .012); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(p); p.connect(bus); o.start(t); o.stop(t + dur + .05);
  };
  const SCALES = [[0, 2, 4, 7, 9], [0, 2, 3, 7, 8], [0, 2, 4, 6, 9], [0, 3, 5, 7, 10], [0, 2, 5, 7, 9]];   // pentatonic flavours: major, in-sen, lydian-ish, minor, suspended
  const deg = (sc, root, k) => root + sc[((k % 5) + 5) % 5] + 12 * Math.floor(k / 5), hz = m => 440 * Math.pow(2, (m - 69) / 12);
  const hash = s => { let h = 2166136261; for (const c of String(s || '')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) } return h >>> 0 };
  // the galaxy record: a fixed needle along the screen's right, the galaxy turning under it
  const needle = document.createElement('i'); needle.id = 'recNeedle'; needle.hidden = true; document.body.appendChild(needle);
  const pings = Array.from({ length: 16 }, () => { const e = document.createElement('i'); e.className = 'recPing'; document.body.appendChild(e); return e }); let pk = 0;
  const ping = (i, col) => { const e = pings[pk++ % pings.length]; _v.fromArray(P, i * 3).project(camera); if (_v.z > 1) return; e.style.left = ((_v.x * .5 + .5) * innerWidth).toFixed(1) + 'px'; e.style.top = ((-_v.y * .5 + .5) * innerHeight).toFixed(1) + 'px'; e.style.setProperty('--c', col); e.classList.remove('on'); void e.offsetWidth; e.classList.add('on') };
  const btn = document.createElement('button'); btn.id = 'recPlay'; btn.className = 'hud'; btn.type = 'button'; btn.innerHTML = '<i></i><span>Play</span>'; btn.title = 'Play the galaxy like a record'; document.body.appendChild(btn);
  btn.addEventListener('pointerdown', e => e.stopPropagation()); btn.addEventListener('click', () => st.mode === 'galaxy' ? stop() : play('galaxy'));
  // under an open record: the hint (and a tap target)
  const hint = document.createElement('button'); hint.id = 'recHint'; hint.type = 'button'; hint.hidden = true; document.body.appendChild(hint);
  hint.addEventListener('pointerdown', e => e.stopPropagation()); hint.addEventListener('click', () => { const i = openI(); if (st.mode === 'fwa') stop(); else if (i >= 0) play('fwa', i) });
  const openI = () => { if (tip.hidden || !tip.classList.contains('full')) return -1; const m = /^[pqh](\d+)/.exec(tipFor || ''); return m ? +m[1] : -1 };
  function play(mode, i = -1) {
    if (!ensure()) return; stop(true); st.mode = mode; st.i = i; st.phi = null; st.budget = 0; st.spin = 0; st.next = AC.currentTime + .15; st.step = 0;
    bus.gain.cancelScheduledValues(AC.currentTime); bus.gain.setTargetAtTime(LOOK.recVol ?? .6, AC.currentTime, .4);
    if (mode === 'fwa') {   // write the loop from what this FWA is
      const d = D[i], h = hash(d.title), t = new Date(d.date + 'T00:00:00Z'), sc = SCALES[hash(d.category) % 5], root = 57 + ((t.getUTCMonth() * 7) % 12) - 12 * (t.getUTCMonth() > 6 ? 1 : 0);
      const bpm = 64 + Math.max(0, Math.min(1, (d.score - 6.5) / 3)) * 56, mel = [...String(d.title || 'FWA').toUpperCase()].filter(c => /[A-Z0-9]/.test(c)).slice(0, 16), ah = hash(d.agency);
      const steps = Array.from({ length: 16 }, (_, k) => { const c = mel[k % Math.max(1, mel.length)]; return ((h >>> (k % 24)) & 3) === 0 && k % 4 ? null : c ? (c.charCodeAt(0) * 7 + k) % 9 : null });   // the title, letter by letter, as scale steps (some left as rests)
      st.seq = { sc, root, step: 60 / bpm / 2, steps, bass: [0, (ah % 4) + 2, (ah >> 3) % 5, 3].map(k => deg(sc, root - 24, k)), award: d.award, kind: (h >> 5) % 3 };
    }
    btn.classList.toggle('on', mode === 'galaxy'); btn.lastChild.textContent = mode === 'galaxy' ? 'Stop' : 'Play'; needle.hidden = mode !== 'galaxy';
  }
  function stop(quiet) {
    if (!st.mode) return; st.mode = null; st.i = -1; st.seq = null; if (bus && AC) { bus.gain.cancelScheduledValues(AC.currentTime); bus.gain.setTargetAtTime(0, AC.currentTime, quiet ? .05 : .5) }
    btn.classList.remove('on'); btn.lastChild.textContent = 'Play'; needle.hidden = true;
  }
  addEventListener('keydown', e => {   // Space with a record open: play it (instead of boosting); again: stop
    if (e.key !== ' ' || e.repeat || !booted || (e.target.matches && e.target.matches('input,textarea,select'))) return; const i = openI(); if (i < 0 && st.mode !== 'fwa') return;
    e.preventDefault(); e.stopImmediatePropagation(); if (st.mode === 'fwa') stop(); else play('fwa', i);
  }, true);
  return {
    get playing() { return !!st.mode },
    get spin() { return st.mode === 'fwa' ? st.spin : 0 },
    get galaxy() { return st.mode === 'galaxy' },
    scratch(x, y, dx, dy) {   // turn the record by hand: the angle swept round the core's spot on screen
      _v.copy(GC).project(camera); const cx = (_v.x * .5 + .5) * innerWidth, cy = (-_v.y * .5 + .5) * innerHeight, a1 = Math.atan2(y - cy, x - cx), a0 = Math.atan2(y - dy - cy, x - dx - cx); let da = a1 - a0; da -= Math.round(da / (2 * Math.PI)) * 2 * Math.PI;
      turn(da * (camera.up.y >= 0 ? 1 : -1) * (LOOK.recScratchDir ?? 1)); st.hand = .35; st.budget = Math.max(st.budget, 2);
      if (ensure() && Math.abs(da) > .002) { const t = AC.currentTime, len = .06, b = AC.createBuffer(1, AC.sampleRate * len | 0, AC.sampleRate), ch = b.getChannelData(0); for (let k = 0; k < ch.length; k++) ch[k] = (Math.random() * 2 - 1) * (1 - k / ch.length);   // the needle's rasp: a short burst of noise, pitched by how fast you pull
        const src = AC.createBufferSource(), bp = AC.createBiquadFilter(), g = AC.createGain(); src.buffer = b; src.playbackRate.value = Math.min(4, .4 + Math.abs(da) * 40); bp.type = 'bandpass'; bp.frequency.value = 900 + Math.min(3000, Math.abs(da) * 30000); bp.Q.value = 2; g.gain.value = Math.min(.12, Math.abs(da) * 2) * (LOOK.recVol ?? .6); src.connect(bp); bp.connect(g); g.connect(bus); src.start(t) }
    },
    play, stop,
    update(rdt) {
      const L = LOOK, map = S.mode === 'map', mi = openI();
      btn.hidden = !(map && booted && (L.recPlay ?? 1)); if (st.mode === 'galaxy' && !map) stop();
      if (st.mode === 'fwa' && (mi !== st.i)) stop();   // its record closed: the music goes with it
      hint.hidden = !(mi >= 0 && (L.recPlay ?? 1)); if (!hint.hidden) { const r = tip.getBoundingClientRect(); hint.style.left = r.left.toFixed(1) + 'px'; hint.style.top = (r.bottom + 6).toFixed(1) + 'px'; const t = st.mode === 'fwa' ? (coarse ? 'Tap to stop' : 'Space to stop') : (coarse ? 'Tap to play' : 'Space to play'); if (hint.textContent !== t) hint.textContent = t }
      // the usual music steps aside
      st.duck += ((st.mode ? 1 : 0) - st.duck) * Math.min(1, rdt * 1.5); if (musicGain && AC) musicGain.gain.setTargetAtTime(.6 * L.music * (1 - st.duck), AC.currentTime, .1);
      if (!st.mode || !bus) return;
      if (st.mode === 'fwa') {   // a 16-step loop, scheduled a little ahead
        st.spin += rdt * 2 * Math.PI * (L.recRpm ?? 33.3) / 60; const q = st.seq; if (!q) return;
        while (st.next < AC.currentTime + .25) {
          const k = st.step % 16, t = st.next, s = q.steps[k], v = .09;
          if (s != null) note(hz(deg(q.sc, q.root, s)), t, q.step * 3.2, v, q.kind, Math.sin(k) * .4);
          if (k % 8 === 0) note(hz(q.bass[(st.step / 8 | 0) % 4]), t, q.step * 7, .12, 0);
          if (k === 0 && q.award !== 'SOTD') [0, 2, 4].forEach((j, n) => note(hz(deg(q.sc, q.root + 12, j)), t + n * .02, q.step * 14, q.award === 'FOTY' ? .05 : .035, 1, (n - 1) * .5));   // the month's and year's best get a shimmering chord each bar
          st.step++; st.next += q.step;
        }
        return;
      }
      // the galaxy: turn it, and play what passes the needle
      st.hand = Math.max(0, (st.hand || 0) - rdt); if (!st.hand) turn(rdt * 2 * Math.PI / Math.max(4, L.recTurn ?? 48));   /* (a hand on it holds it still) */
      _r.set(1, 0, 0).applyQuaternion(camera.quaternion).applyQuaternion(GQI); const phi = Math.atan2(_r.z, _r.x);   // the needle: the screen's right, laid in the disk
      { _v.copy(GC).project(camera); _r.copy(GC).addScaledVector(new V3(1, 0, 0).applyQuaternion(camera.quaternion), GAL_R0 + GAL_LEN).project(camera); const x0 = (_v.x * .5 + .5) * innerWidth, y0 = (-_v.y * .5 + .5) * innerHeight, x1 = (_r.x * .5 + .5) * innerWidth, y1 = (-_r.y * .5 + .5) * innerHeight;
        needle.style.left = x0.toFixed(1) + 'px'; needle.style.top = y0.toFixed(1) + 'px'; needle.style.width = Math.hypot(x1 - x0, y1 - y0).toFixed(1) + 'px'; needle.style.transform = `rotate(${Math.atan2(y1 - y0, x1 - x0)}rad)` }
      if (st.phi === null) { st.phi = phi; return }
      let dphi = phi - st.phi; dphi -= Math.round(dphi / (2 * Math.PI)) * 2 * Math.PI; const a0 = st.phi; st.phi = phi; if (!dphi) return;
      st.budget = Math.min(4, st.budget + rdt * (L.recRate ?? 9)); const hits = [];
      for (let i = 0; i < N; i++) { if (TA[i] < 1) continue; let x = AZ[i] - a0; x -= Math.round(x / (2 * Math.PI)) * 2 * Math.PI; if (dphi > 0 ? x > 0 && x <= dphi : x < 0 && x >= dphi) hits.push(i) }
      if (!hits.length) return; hits.sort((a, b) => (D[b].award !== 'SOTD') - (D[a].award !== 'SOTD') || D[b].score - D[a].score);
      const t = AC.currentTime + .03, sc = SCALES[(S.agencies.size ? hash([...S.agencies][0]) : 0) % 5];   // an agency picked: its own mode
      for (const i of hits) {
        if (st.budget < 1) break; st.budget -= 1; const d = D[i], k = Math.round((1 - UU[i]) * 14), v = .03 + .07 * Math.max(0, Math.min(1, (d.score - 6.5) / 3)), pan = Math.max(-.8, Math.min(.8, (UU[i] - .5) * 1.4));
        note(hz(deg(sc, 45, k)), t, d.award === 'FOTY' ? 4 : 1.6, v, d.award === 'FOTY' ? 1 : 0, pan);
        if (d.award === 'SOTM') note(hz(deg(sc, 45, k + 2)), t + .04, 2, v * .7, 2, -pan);
        ping(i, d.award === 'FOTY' ? AWARD_COL.FOTY : d.award === 'SOTM' ? AWARD_COL.SOTM : '#fff');
      }
    },
  };
})();
