/* ───────────────────────── parking and messages (test) ─────────────────────────
   Parking: everyone may park their vehicle in one spot of the galaxy. It stays there for everyone: as a ghost while its
   pilot is flying somewhere else, as the real ship once they've gone. A small dot marks it from a little way off; fly
   right up to it and its pilot's name and agency come up. (A test: you type your name and agency; later an FWA account vouches.)
   On claude.ai flags live in the artifact's database (one per person); elsewhere the relay keeps them.
   Messages: a line you send rides along with your position, and only pilots near you show it, over your marker. */
const ME = (() => { const m = store.json('sotd-me', {}); return { n: typeof m.n === 'string' ? m.n.slice(0, 32) : '', a: typeof m.a === 'string' ? m.a.slice(0, 40) : '' } })();
const saveMe = () => store.set('sotd-me', JSON.stringify(ME));
const sayOut = { text: '', sid: 0, at: 0 }; let wsKey = null; const _vf = new V3();   // the last line you sent (rides along in your presence for a few seconds)
const flags = (() => {
  const list = new Map(); let mine = null, db = null, uid = null, token = store.get('sotd-flagtok');
  if (!token) { token = Array.from(crypto.getRandomValues(new Uint8Array(12)), b => b.toString(16).padStart(2, '0')).join(''); store.set('sotd-flagtok', token) }
  const tags = document.createElement('div'); tags.id = 'flagTags'; tags.className = 'hud'; document.body.appendChild(tags);
  const clean = f => { const ok = (a, n) => Array.isArray(a) && a.length === n && a.every(Number.isFinite); if (!f || !ok(f.p, 3) || !ok(f.q, 4)) return null; return { p: f.p, q: f.q, s: Number.isInteger(f.s) ? f.s : 0, n: String(f.n || '').slice(0, 32), a: String(f.a || '').slice(0, 40), h: Number.isFinite(+f.h) ? +f.h : 0, at: Number.isFinite(+f.at) ? +f.at : 0 } };   // untrusted: numbers and short text only
  const ghostOf = g => { g.traverse(o => { if (o.isMesh || o.isSprite) { const m = Array.isArray(o.material) ? o.material.map(x => x.clone()) : o.material.clone(); (Array.isArray(m) ? m : [m]).forEach(x => { x.transparent = true; x.opacity = .28; x.depthWrite = false; x.blending = THREE.AdditiveBlending }); o.material = m } }); return g };   // see-through, light added rather than painted
  const ship = (f, ghost) => { const g = makeAvatar(CURSORS[f.s] ? cursorGeo(CURSORS[f.s]) : ARROW); g.scale.setScalar(.68 * SHIP_K * SHIP_SC); g.userData.nav.forEach(b => b.visible = false); g.userData.flame.material = g.userData.flame.material.clone(); g.userData.flame.material.opacity = 0;
    const col = new C3().setHSL(f.h / 360, 1, .6); g.userData.hole.col.value.copy(col); g.userData.hole.on.value = .15; g.userData.emit.material.opacity = .15;   // parked: engine all but off
    if (ghost) ghostOf(g); g.position.fromArray(f.p); g.quaternion.fromArray(f.q).normalize(); g.visible = false; scene.add(g); return g };
  function put(k, raw) {
    const f = clean(raw), old = list.get(k); if (old) { scene.remove(old.g, old.gh); old.tag.remove(); old.dot.remove(); list.delete(k) } if (!f) return;
    f.p = [f.p[0] - UNI.O.x, f.p[1] - UNI.O.y, f.p[2] - UNI.O.z];   // (kept in universe coordinates; here, where it is in the world you see)
    const g = ship(f, false), gh = ship(f, true);
    const tag = document.createElement('div'); tag.className = 'ftag'; tag.hidden = true; tag.innerHTML = `<span class="td"></span><span class="tt"></span>`; tag.querySelector('.td').textContent = (f.a || 'Independent') + (f.at ? ' · parked ' + fmtDate(new Date(f.at).toISOString().slice(0, 10)) : ''); tag.querySelector('.tt').textContent = f.n || 'A pilot'; tags.appendChild(tag);
    const dot = document.createElement('i'); dot.className = 'fdot'; dot.hidden = true; dot.style.setProperty('--c', `hsl(${f.h} 100% 70%)`); tags.appendChild(dot);
    list.set(k, { ...f, g, gh, tag, dot, pos: new V3().fromArray(f.p) });
  }
  async function init() {
    try { if (window.claude && claude.use) { const [d, u] = await Promise.all([claude.use('db'), claude.use('user')]); if (d && u) { uid = await u.id(); if (uid) { db = d; mine = uid; db.collection('flags').onSnapshot(s => s.docChanges().forEach(c => put(c.doc.id, c.type === 'removed' ? null : c.doc.data())), () => { }); return } } } } catch (e) { }
  }
  init();
  const wsSend = m => { if (Net.ws && Net.ws.readyState === 1) Net.ws.send(JSON.stringify(m)) };
  return {
    list,
    get mineAt() { const k = db ? mine : wsKey; return list.get(k) || null },
    onWs(m) {   // from the relay: the whole set on joining, then one at a time
      if (m.t === 'flags' && Array.isArray(m.list)) m.list.forEach(x => x && typeof x.k === 'string' && put('w:' + x.k, x.f));
      else if (m.t === 'flag' && typeof m.k === 'string') put('w:' + m.k, m.f);
      else if (m.t === 'flagme' && typeof m.k === 'string') wsKey = 'w:' + m.k;
    },
    plant() {
      const f = { p: player.pos.clone().add(UNI.O).toArray().map(x => Math.round(x * 100) / 100), q: player.quat.toArray().map(x => Math.round(x * 1e4) / 1e4), n: ME.n, a: ME.a, h: PILOT_HUE, s: shipK, at: Date.now() };
      if (db) db.doc('flags/' + uid).set(f).catch(() => { }); else { wsSend({ t: 'flag', tok: token, f }); if (!Net.ws) put('local', f) }
      buzz([10, 40, 20]);
    },
    shift(d) { for (const [, f] of list) { f.pos.sub(d); f.g.position.sub(d); f.gh.position.sub(d) } },   // the world moved over (another galaxy)
    remove() { if (db) db.doc('flags/' + uid).delete().catch(() => { }); else { wsSend({ t: 'flag', tok: token, f: null }); put('local', null) } },
    hello() { wsSend({ t: 'flagme', tok: token }) },   // the relay tells us which flag is ours (by our secret token)
    get key() { return db ? uid : wsKey ? wsKey.slice(2) : null },   // the key of my own parking spot (others match it to me while I fly)
    update() {   // a ghost while its pilot is out flying, the real ship once they've gone; a dot from a way off, the name up close
      const fly = S.mode === 'fly', near = LOOK.flagNear ?? 500, far = LOOK.flagDot ?? 1500, on = !!(LOOK.flags ?? 1), me = this.key, live = new Set(); for (const v of Net.peers.values()) if (v.fk) live.add(v.fk);
      for (const [k, f] of list) {
        const kk = k.startsWith('w:') ? k.slice(2) : k, flying = kk === me || live.has(kk), d = f.pos.distanceTo(player.pos), vis = fly && on;
        f.g.visible = vis && !flying; f.gh.visible = vis && flying;
        _vf.copy(f.pos).project(camera); const front = _vf.z < 1, x = ((_vf.x * .5 + .5) * innerWidth).toFixed(1) + 'px', y = ((-_vf.y * .5 + .5) * innerHeight).toFixed(1) + 'px';
        const tag = vis && front && d < near, dot = vis && front && !tag && d < far;
        if (tag) { f.tag.style.transform = `translate(${x},${y})`; f.tag.style.opacity = (1 - sstep(d, near * .7, near)).toFixed(3) } f.tag.hidden = !tag;
        if (dot) { f.dot.style.transform = `translate(${x},${y})`; f.dot.style.opacity = (1 - sstep(d, far * .8, far)).toFixed(3) } f.dot.hidden = !dot;
      }
    },
  };
})();
/* the Park panel: your name and agency, park (or move your spot) where you are, take it away, or fly back to it */
const flagDlg = (() => {
  const el = document.createElement('div'); el.id = 'flagDlg'; el.className = 'hud'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Park'); document.body.appendChild(el);
  const close = () => { el.hidden = true };
  function open() {
    if (locked()) document.exitPointerLock(); const m = flags.mineAt;
    el.innerHTML = `<header><b>Park</b><button type="button" class="x" aria-label="Close">×</button></header><p>Park your ship right here for good. While you're flying it waits as a ghost; once you leave, your ship stays. Anyone who flies up close sees who you are. (Test: one spot each; FWA accounts come later.)</p>
      <label>Name<input id="fdN" maxlength="32" autocomplete="name" spellcheck="false"></label><label>Agency<input id="fdA" maxlength="40" autocomplete="organization" spellcheck="false"></label>
      <div class="fr"><button type="button" class="go">${m ? 'Park here instead' : 'Park here'}</button>${m ? '<button type="button" class="to">Fly to it</button><button type="button" class="rm">Remove</button>' : ''}</div>`;
    el.querySelector('#fdN').value = ME.n; el.querySelector('#fdA').value = ME.a; el.hidden = false; setTimeout(() => el.querySelector('#fdN').focus(), 30);
  }
  el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close() });
  el.addEventListener('input', () => { ME.n = el.querySelector('#fdN').value.trim().slice(0, 32); ME.a = el.querySelector('#fdA').value.trim().slice(0, 40); saveMe() });
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.classList.contains('x')) close();
    else if (b.classList.contains('go')) { if (S.mode !== 'fly') setMode('fly'); flags.plant(); close() }
    else if (b.classList.contains('rm')) { flags.remove(); close() }
    else if (b.classList.contains('to')) { const m = flags.mineAt; if (m) { if (S.mode !== 'fly') setMode('fly'); const back = _vf.copy(player.pos).sub(m.pos), d = back.length() || 1; auto = { i: -1, dest: m.pos.clone().addScaledVector(back, Math.min(80, d * .5) / d) }; lockI = -1 } close() }
  });
  return { open, close };
})();
/* messages: Enter (or T) opens a line at the bottom; what you send shows over your marker for pilots within range */
const say = (() => {
  const box = document.createElement('form'); box.id = 'sayBox'; box.className = 'hud'; box.hidden = true; box.innerHTML = '<input maxlength="140" autocomplete="off" spellcheck="true" aria-label="Message to pilots nearby"><button type="submit">Send</button>'; document.body.appendChild(box);
  const log = document.createElement('div'); log.id = 'sayLog'; log.className = 'hud'; log.setAttribute('aria-live', 'polite'); document.body.appendChild(log);
  const inp = box.querySelector('input'), range = () => LOOK.msgRange ?? 20000;
  const near = () => [...Net.peers.values()].filter(v => v.cur && v.cur.distanceTo(player.pos) < range()).length;
  const addLog = (who, text, col) => { const r = document.createElement('div'); r.className = 'sl'; r.innerHTML = '<b></b><span></span>'; r.firstChild.textContent = who; r.firstChild.style.color = col; r.lastChild.textContent = text; log.appendChild(r); while (log.children.length > 4) log.firstChild.remove(); setTimeout(() => r.classList.add('gone'), 9000); setTimeout(() => r.remove(), 10000) };
  function open() { if (!booted) return; if (locked()) document.exitPointerLock(); const n = near(); inp.placeholder = n ? `To ${n} pilot${n > 1 ? 's' : ''} nearby` : 'Nobody close enough to hear you yet'; box.hidden = false; setTimeout(() => inp.focus(), 20) }
  const close = () => { box.hidden = true; inp.value = ''; inp.blur() };
  box.addEventListener('pointerdown', e => e.stopPropagation()); inp.addEventListener('keydown', e => { e.stopPropagation(); if (e.key === 'Escape') close() });
  box.addEventListener('submit', e => { e.preventDefault(); const t = inp.value.trim().slice(0, 140); if (t) { sayOut.text = t; sayOut.sid = Date.now(); sayOut.at = performance.now(); addLog('You', t, '#fff') } close() });
  addEventListener('keydown', e => { if (!booted || e.target.matches('input,select,textarea') || !box.hidden || S.mode !== 'fly') return; if (e.key === 'Enter' || e.key.toLowerCase() === 't') { e.preventDefault(); open() } });
  return {
    open, close,
    heard(v, text) { if (!v.cur || v.cur.distanceTo(player.pos) > range() || !(LOOK.messages ?? 1)) return false; addLog(v.name || 'Pilot', text, `hsl(${v.hue} 100% 70%)`); buzz(10); return true },   // only from pilots close by
    get out() { return (LOOK.messages ?? 1) && sayOut.text && performance.now() - sayOut.at < 8000 ? { say: sayOut.text, sid: sayOut.sid } : null },
  };
})();
