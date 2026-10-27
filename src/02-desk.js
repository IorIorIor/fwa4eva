/* ───────────────────────── THE DESK: a Windows 2000 desktop on the monitor ─────────────────────────
   Only the room (branch the-desk). The wheel off the monitor zooms you in onto its glass and back out (room.zoomTo); on the
   glass your own pointer gives way to the desktop's (#desk, laid on the whole glass by room.desk, 1024 × 768 of its own).
   On it one window, every FWA by year in a big grid (a 16 px pixel thumbnail from data/thumbs.png, see room/build-thumbs.py,
   with its name and date), and the taskbar: Category, Agency and Search, each opening up from the bar like a Start menu and
   filtering the grid the way the galaxy's filters do. Double-click a winner (on a phone: tap it twice) for its own window: a
   slideshow (its screenshot, then the agency's other winners) and everything the archive knows about it.
   ?hic: Chrome's HTML-in-Canvas (157+): the desktop is drawn into a canvas (drawElementImage) and that is the glass's own
   picture in WebGL; the canvas itself sits invisibly where the glass is, so its elements still take the clicks.
   Nothing after this file loads: the galaxy never starts. ?galaxy (or ?noroom) for the galaxy as before. */
if (DESK && !TIMESCROLL && room.on) {
  const PHONE = matchMedia('(pointer: coarse)').matches, DW = PHONE ? 640 : 1024, DH = PHONE ? 480 : 768, esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtD = d => { const [y, m, dd] = d.date.split('-'); return `${+dd} ${MON[+m - 1]} ${y}` };
  const TH = window.__FWA_DATA && window.__FWA_DATA.thumbs || await (async () => { try { const r = await fetch(DATA_BASE + 'thumbs.json'); if (r.ok) return await r.json() } catch (e) { } return null })();   // the atlas index (none: plain colour squares)
  const F = { cats: new Set(), ags: new Set(), q: '' };
  const el = document.createElement('div'); el.id = 'desk'; el.style.width = DW + 'px'; el.style.height = DH + 'px';
  el.innerHTML = `
    <div class="dk-icons"><div class="dk-ic"><i class="ic-pc"></i><span>My Computer</span></div><div class="dk-ic"><i class="ic-bin"></i><span>Recycle Bin</span></div><div class="dk-ic"><i class="ic-ie"></i><span>Internet Explorer</span></div></div>
    <div class="dk-wins"></div>
    <div class="dk-pop" data-k="cat" hidden><div class="dk-pl"></div></div>
    <div class="dk-pop" data-k="ag" hidden><label class="dk-in"><input type="text" placeholder="Search agencies" spellcheck="false"></label><div class="dk-pl"></div></div>
    <div class="dk-pop" data-k="q" hidden><label class="dk-in"><input type="text" placeholder="Search anything" spellcheck="false"></label><div class="dk-pl"></div></div>
    <div class="dk-bar"><button class="dk-btn" data-k="cat"><i class="ic-cat"></i>Category</button><button class="dk-btn" data-k="ag"><i class="ic-ag"></i>Agency</button><button class="dk-btn" data-k="q"><i class="ic-q"></i>Search</button><span class="dk-sep"></span><span class="dk-tasks"></span><span class="dk-tray"><b class="dk-hic"></b><b class="dk-clock"></b></span></div>
    <svg class="dk-cur" viewBox="0 0 12 19" width="12" height="19"><path d="M.5 .5v15.5l3.6-3.5 2.6 6 2.3-1-2.6-5.8h5.1z" fill="#fff" stroke="#000" stroke-width="1" shape-rendering="crispEdges"/></svg>`;
  document.body.appendChild(el);
  const $d = s => el.querySelector(s), cur = $d('.dk-cur');

  // windows: drag one by its title, maximise, minimise (and back from its taskbar button), close; the one you touch comes to the front
  let zTop = 10, drag = null; const wins = [];
  function mkWin({ title, icon = 'ic-fold', cls = '', box, body, max = false, keep = false }) {
    const w = document.createElement('section'); w.className = 'dk-win ' + cls;
    w.innerHTML = `<header class="dk-title"><i class="${icon}"></i><b>${esc(title)}</b><span class="dk-tb"><button class="mn" title="Minimize">_</button><button class="mx" title="Maximize">□</button><button class="cl" title="Close">×</button></span></header>` + body;
    $d('.dk-wins').appendChild(w); const tb = document.createElement('button'); tb.className = 'dk-task'; tb.innerHTML = `<i class="${icon}"></i><span>${esc(title)}</span>`; $d('.dk-tasks').appendChild(tb);
    const W = { el: w, tb, box: { ...box }, maxed: max, onLay: null, onClose: null };
    W.lay = () => { const b = W.maxed ? { x: 0, y: 0, w: DW, h: DH - 30 } : W.box; Object.assign(w.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' }); w.classList.toggle('maxed', W.maxed); if (W.onLay) W.onLay() };
    W.front = () => { w.style.zIndex = ++zTop; for (const o of wins) { const on = o === W && !o.el.hidden; o.el.classList.toggle('act', on); o.tb.classList.toggle('on', on) } };
    W.mini = v => { w.hidden = v; if (v) { w.classList.remove('act'); tb.classList.remove('on') } else W.front() };
    W.close = () => { if (keep) return W.mini(true); w.remove(); tb.remove(); wins.splice(wins.indexOf(W), 1); if (W.onClose) W.onClose() };   // (keep: the winners' window only ever minimises)
    const hd = w.querySelector('.dk-title');
    hd.addEventListener('pointerdown', e => { if (e.target.closest('button') || W.maxed) return; const p = room.toDesk(e.clientX, e.clientY); if (p) drag = { W, p, b: { ...W.box } } });
    hd.addEventListener('dblclick', e => { if (!e.target.closest('button')) { W.maxed = !W.maxed; W.lay() } });
    w.querySelector('.mx').onclick = () => { W.maxed = !W.maxed; W.lay() }; w.querySelector('.mn').onclick = () => W.mini(true); w.querySelector('.cl').onclick = () => W.close();
    w.addEventListener('pointerdown', () => { if (!w.classList.contains('act')) W.front() }, true);
    tb.onclick = () => { if (w.hidden) W.mini(false); else if (w.classList.contains('act')) W.mini(true); else W.front() };
    wins.push(W); W.lay(); W.front(); return W;
  }
  addEventListener('pointerup', () => { drag = null });

  const main = mkWin({ title: 'FWA Winners', keep: true, max: PHONE, box: { x: 96, y: 24, w: 880, h: 640 }, body: `   <!-- (on a phone it starts maximised) -->
      <nav class="dk-menu"><span>File</span><span>Edit</span><span>View</span><span>Favorites</span><span>Tools</span><span>Help</span></nav>
      <div class="dk-addr"><span>Address</span><div>C:\\FWA\\Winners</div></div>
      <div class="dk-list" tabindex="0"></div>
      <footer class="dk-status"><span class="dk-n"></span><span>My Computer</span></footer>` });
  const list = main.el.querySelector('.dk-list'), nEl = main.el.querySelector('.dk-n');

  // the grid: a section per year (newest first), each winner a pixel thumbnail with its name and date
  const thumb = d => { const k = TH && d.shot != null ? TH.shots[d.shot] : undefined; if (k == null) { let h = 0; for (const c of d.title) h = (h * 31 + c.charCodeAt(0)) | 0; return `<i class="th" style="background:hsl(${(h >>> 0) % 360},45%,52%)"></i>` }
    const s = TH.size, x = (k % TH.cols) * s * 2, y = Math.floor(k / TH.cols) * s * 2; return `<i class="th" style="background-position:-${x}px -${y}px"></i>` };
  const match = d => (!F.cats.size || F.cats.has(d.category)) && (!F.ags.size || F.ags.has(d.agency)) && (!F.q || (d.title + ' ' + d.agency + ' ' + d.category + ' ' + d.date + ' ' + fmtD(d)).toLowerCase().includes(F.q));
  // only the rows in view are in the page (a long list of 9 000 winners in a perspective-transformed layer is far too heavy)
  let sel = -1, rows = [], n = 0, cols = 9, drawn = '';
  const IT = 92, RH = 84, HH = 28, inner = document.createElement('div'); inner.className = 'dk-inner';
  function render() {
    const by = new Map(); n = 0; for (let i = D.length - 1; i >= 0; i--) { const d = D[i]; if (!match(d)) continue; n++; if (!by.has(d.year)) by.set(d.year, []); by.get(d.year).push(d) }
    cols = Math.max(1, Math.floor((list.clientWidth - 8) / IT) || 9); rows = []; let y = 0;
    for (const [yr, ds] of by) { rows.push({ y, h: HH, yr, n: ds.length }); y += HH; for (let k = 0; k < ds.length; k += cols) { rows.push({ y, h: RH, ds: ds.slice(k, k + cols) }); y += RH } }
    list.innerHTML = ''; const sp = document.createElement('div'); sp.className = 'dk-sp'; sp.style.height = (y + 10) + 'px'; list.append(sp, inner); drawn = ''; list.scrollTop = 0;
    if (!n) inner.innerHTML = '<p class="dk-none">No winners match.</p>';
    nEl.textContent = `${n.toLocaleString('en')} object(s)`; slice();
    $d('.dk-btn[data-k="cat"]').classList.toggle('act', F.cats.size > 0); $d('.dk-btn[data-k="ag"]').classList.toggle('act', F.ags.size > 0); $d('.dk-btn[data-k="q"]').classList.toggle('act', !!F.q);
  }
  function slice() {
    if (!rows.length) return; const top = list.scrollTop - 200, bot = list.scrollTop + list.clientHeight + 200;
    let a = 0, b = rows.length; { let lo = 0, hi = rows.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (rows[m].y <= top) lo = m; else hi = m - 1 } a = lo }
    for (b = a; b < rows.length && rows[b].y < bot; b++);
    const key = a + ':' + b; if (key === drawn) return; drawn = key;
    inner.style.transform = `translateY(${rows[a].y}px)`;
    inner.innerHTML = rows.slice(a, b).map(r => r.yr != null ? `<h3>${r.yr}<small>${r.n.toLocaleString('en')} winner${r.n === 1 ? '' : 's'}</small></h3>`
      : `<div class="dk-grid">${r.ds.map(d => `<div class="dk-it${d.i === sel ? ' sel' : ''}" data-i="${d.i}" title="${esc(d.title)} · ${esc(d.agency)}">${thumb(d)}<b>${esc(d.title)}</b><small>${fmtD(d)}</small></div>`).join('')}</div>`).join('');
  }
  let sq = 0; list.addEventListener('scroll', () => { if (!sq) sq = requestAnimationFrame(() => { sq = 0; slice() }) }, { passive: true });
  const scrollToI = i => { const r = rows.find(r => r.ds && r.ds.some(d => d.i === i)); if (r) { list.scrollTop = Math.max(0, r.y - list.clientHeight / 2 + RH / 2); drawn = ''; slice() } };
  if (TH) { el.style.setProperty('--atlas', `url("${window.__FWA_DATA && window.__FWA_DATA.atlas || DATA_BASE + 'thumbs.png'}")`); el.style.setProperty('--asz', `${TH.cols * TH.size * 2}px`) }   // (on the whole desk: the search's results show them too)
  list.addEventListener('click', e => { const it = e.target.closest('.dk-it'), was = sel; list.querySelectorAll('.dk-it.sel').forEach(x => x.classList.remove('sel')); sel = it ? +it.dataset.i : -1; if (it) { it.classList.add('sel'); if (ptype === 'touch' && was === sel) openFWA(sel) } });   // (a phone: a second tap opens it)
  list.addEventListener('dblclick', e => { const it = e.target.closest('.dk-it'); if (it) openFWA(+it.dataset.i) });

  // a winner's own window: a slideshow (its screenshot, then the agency's other winners, each captioned) over all its details
  const SH = window.__FWA_DATA && window.__FWA_DATA.thumbs && window.__FWA_DATA.thumbs.sheet;   // (the single page: screenshots packed in sheets beside it, see build-thumbs.py)
  const picCss = d => { const k = TH && d.shot != null ? TH.shots[d.shot] : undefined;
    if (SH && k != null) { const c = k % SH.per, x = (c % SH.cols) * 100 / (SH.cols - 1), y = Math.floor(c / SH.cols) * 100 / (Math.ceil(SH.per / SH.cols) - 1); return `background-image:url("sheets/s${Math.floor(k / SH.per)}.webp");background-size:${SH.cols * 100}% auto;background-position:${x}% ${y}%` }
    const u = typeof shotURL === 'function' ? shotURL(d) : null; return u ? `background-image:url("${u}")` : '' };
  const host = u => { try { return new URL(u).hostname.replace(/^www\./, '') } catch (e) { return u } };
  const fwaWins = new Map();
  function openFWA(i) {
    const d = D[i]; if (!d) return; if (fwaWins.has(i)) { const W = fwaWins.get(i); W.mini(false); return }
    if (fwaWins.size >= 6) fwaWins.values().next().value.close();   // (six at most: the oldest goes)
    const seen = new Set([d.shot]), more = []; for (let j = D.length - 1; j >= 0 && more.length < 7; j--) { const o = D[j]; if (o.agency === d.agency && o.shot && !seen.has(o.shot)) { seen.add(o.shot); more.push(o) } }   // (each screenshot once: the days before the archive borrow real winners)
    const slides = [d, ...more], k0 = fwaWins.size;
    const rowsT = [['Agency', esc(d.agency)], ['Date', fmtD(d)], ['Award', `<b class="dk-aw" style="--c:${AWARD_COL[d.award] || '#888'}">${AWARD_NAME[d.award] || d.award}</b>`], ['Category', esc(d.category)], ['Score', `${(+d.score).toFixed(2)} / 10`],
      d.country && d.country !== '—' ? ['Country', esc(d.country)] : null, d.tech && d.tech.length && d.tech[0] !== 'Unknown' ? ['Built with', esc(d.tech.join(', '))] : null, d.url ? ['Site', esc(host(d.url))] : null,
      ['By the agency', `${AGN.find(a => a[0] === d.agency)?.[1] || 1} winner(s)`]].filter(Boolean);
    const W = mkWin({ title: d.title, icon: 'ic-ie', cls: 'dk-fw', max: PHONE, box: { x: 150 + k0 * 26, y: 36 + k0 * 22, w: 620, h: 650 }, body: `
      <div class="dk-fwa">
        <div class="dk-show"><div class="sl"></div><div class="sl"></div><b class="dk-ph"></b></div>
        <div class="dk-ctl"><button class="dk-b pv" title="Previous">◀</button><button class="dk-b pp" title="Pause">❚❚</button><button class="dk-b nx" title="Next">▶</button><span class="dk-cnt"></span><span class="dk-cap"></span></div>
        <div class="dk-info"><h2>${esc(d.title)}</h2><table>${rowsT.map(([k, v]) => `<tr><th>${k}:</th><td>${v}</td></tr>`).join('')}</table>
          <div class="dk-acts">${d.url ? '<button class="dk-b go">Visit site</button>' : ''}${d.fwa ? '<button class="dk-b fw">View on thefwa.com</button>' : ''}<button class="dk-b ok">Close</button></div></div>
      </div>
      <footer class="dk-status"><span>${AWARD_NAME[d.award] || d.award} · ${fmtD(d)}</span><span>Internet</span></footer>` });
    fwaWins.set(i, W); W.onClose = () => { clearInterval(W.iv); fwaWins.delete(i) };
    const q = s => W.el.querySelector(s), ls = W.el.querySelectorAll('.sl'); let k = -1, on = 0, play = slides.length > 1;
    const show = n => { k = (n + slides.length) % slides.length; const o = slides[k], a = ls[on ^ 1], css = picCss(o); a.setAttribute('style', css); q('.dk-ph').textContent = css ? '' : o.title; ls[on].classList.remove('on'); a.classList.add('on'); on ^= 1;
      q('.dk-cnt').textContent = `${k + 1} / ${slides.length}`; const c = q('.dk-cap'); c.innerHTML = k ? `Also by ${esc(o.agency)}: <u data-i="${o.i}">${esc(o.title)}</u>, ${fmtD(o)}` : 'Screenshot' };
    show(0); if (!play) q('.pp').disabled = true;
    W.iv = setInterval(() => { if (play && !W.el.hidden) show(k + 1) }, 3500);
    q('.pv').onclick = () => show(k - 1); q('.nx').onclick = () => show(k + 1); q('.pp').onclick = () => { play = !play; q('.pp').textContent = play ? '❚❚' : '▶▶'; q('.pp').title = play ? 'Pause' : 'Play' };
    q('.dk-show').onclick = () => show(k + 1); q('.dk-cap').onclick = e => { const u = e.target.closest('u'); if (u) openFWA(+u.dataset.i) };
    if (q('.go')) q('.go').onclick = () => open(d.url, '_blank', 'noopener'); if (q('.fw')) q('.fw').onclick = () => open(d.fwa, '_blank', 'noopener'); q('.ok').onclick = () => W.close();
  }

  // the menus up from the taskbar: categories, agencies (with their own search), search anything
  const counts = key => { const m = new Map(); for (const d of D) m.set(d[key], (m.get(d[key]) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0])) };
  const CATN = counts('category'), AGN = counts('agency');
  const row = (k, v, n, on) => `<button class="dk-mi${on ? ' on' : ''}" data-k="${k}" data-v="${esc(v)}"><i></i><span>${esc(v)}</span><small>${n.toLocaleString('en')}</small></button>`;
  function fill(k) {
    const pop = $d(`.dk-pop[data-k="${k}"]`), pl = pop.querySelector('.dk-pl');
    if (k === 'cat') pl.innerHTML = `<button class="dk-mi all${F.cats.size ? '' : ' on'}" data-k="cat" data-v=""><i></i><span>All categories</span></button><hr>` + CATN.map(([v, n]) => row('cat', v, n, F.cats.has(v))).join('');
    else if (k === 'ag') { const q = pop.querySelector('input').value.trim().toLowerCase(), ls = AGN.filter(([v]) => !q || v.toLowerCase().includes(q)); pl.innerHTML = `<button class="dk-mi all${F.ags.size ? '' : ' on'}" data-k="ag" data-v=""><i></i><span>All agencies</span></button><hr>` + ls.slice(0, 300).map(([v, n]) => row('ag', v, n, F.ags.has(v))).join('') + (ls.length > 300 ? `<p class="dk-more">${ls.length - 300} more: type to find them</p>` : '') }
    else { const q = F.q; if (!q) { pl.innerHTML = '<p class="dk-more">Titles, agencies, categories, dates</p>'; return } const hits = []; for (let i = D.length - 1; i >= 0 && hits.length < 12; i--) if (match(D[i])) hits.push(D[i]); pl.innerHTML = hits.map(d => `<button class="dk-mi hit" data-k="hit" data-v="${d.i}">${thumb(d)}<span>${esc(d.title)}<small>${esc(d.agency)} · ${fmtD(d)}</small></span></button>`).join('') + `<p class="dk-more">${nEl.textContent} in the window</p>` }
  }
  let openK = null;
  function popup(k) {
    openK = openK === k ? null : k;
    el.querySelectorAll('.dk-pop').forEach(p => { p.hidden = p.dataset.k !== openK }); el.querySelectorAll('.dk-btn').forEach(b => b.classList.toggle('dn', b.dataset.k === openK));
    if (openK) { fill(openK); const b = $d(`.dk-btn[data-k="${openK}"]`), p = $d(`.dk-pop[data-k="${openK}"]`); p.style.left = b.offsetLeft + 'px'; const inp = p.querySelector('input'); if (inp) setTimeout(() => inp.focus(), 0) }
  }
  el.querySelectorAll('.dk-btn').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); popup(b.dataset.k) }));
  el.addEventListener('pointerdown', e => { if (openK && !e.target.closest('.dk-pop,.dk-btn')) popup(openK) });
  el.querySelectorAll('.dk-pop').forEach(p => p.addEventListener('click', e => {
    const b = e.target.closest('.dk-mi'); if (!b) return; const k = b.dataset.k, v = b.dataset.v;
    if (k === 'hit') { popup(openK); sel = +v; scrollToI(sel); return }
    const set = k === 'cat' ? F.cats : F.ags; if (!v) set.clear(); else if (set.has(v)) set.delete(v); else set.add(v);   // like the galaxy's filters: pick any number, none is all
    render(); fill(k);
  }));
  $d('.dk-pop[data-k="ag"] input').addEventListener('input', () => fill('ag'));
  { const qi = $d('.dk-pop[data-k="q"] input'); let t = 0; qi.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => { F.q = qi.value.trim().toLowerCase(); render(); fill('q') }, 120) }); qi.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === 'Escape') popup('q') }) }

  main.onLay = () => { if (Math.max(1, Math.floor((list.clientWidth - 8) / IT)) !== cols && rows.length) { const st = list.scrollTop; render(); list.scrollTop = st; slice() } };   // (the grid reflows when the window changes width)

  // the desktop's own pointer: yours hides on the glass and this one takes over, wherever on the page you are (checked every frame
  // too: as the camera zooms in, the screen moves under a pointer that holds still); the room's mouse moves on its pad with it
  let ptype = 'mouse';
  const track = () => {   // (where the pointer is comes from the room: it keeps moves off the screen to itself)
    const P = room.st.ptr; ptype = P.type || ptype; const p = P.in ? room.toDesk(P.x, P.y) : null, inn = !!p && p[0] >= 0 && p[1] >= 0 && p[0] <= DW && p[1] <= DH && !document.pointerLockElement && ptype !== 'touch';
    if (ptype !== 'touch') { document.documentElement.classList.toggle('deskin', inn); room.deskIn = inn } cur.style.display = inn ? 'block' : 'none';
    if (inn) { cur.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`; room.mouseAt(p[0] / DW, p[1] / DH) }
    return p;
  };
  addEventListener('pointermove', () => { const p = track(); if (drag && p) { const B = drag.W.box; B.x = Math.max(-B.w + 80, Math.min(DW - 80, drag.b.x + p[0] - drag.p[0])); B.y = Math.max(0, Math.min(DH - 60, drag.b.y + p[1] - drag.p[1])); drag.W.lay() } });   // (after the room's own, bubbling)
  { const tick = () => { requestAnimationFrame(tick); track() }; requestAnimationFrame(tick) }

  // a phone: the first tap on the screen only brings it in close (it fills the window as much as it can); a tap on the room goes back
  { let eat = false; el.addEventListener('pointerdown', e => { ptype = e.pointerType; if (e.pointerType === 'touch' && !room.focused) { eat = true; room.deskFocus(true) } }, true);
    el.addEventListener('click', e => { if (eat) { eat = false; e.stopPropagation(); e.preventDefault() } }, true);
    el.addEventListener('pointerup', e => { if (eat && e.pointerType === 'touch') { e.stopPropagation(); setTimeout(() => { eat = false }, 400) } }, true);
    el.addEventListener('touchmove', e => { if (!room.focused && e.cancelable) e.preventDefault() }, { passive: false }) }   // (and no scrolling the list from afar)

  // the clock in the tray: your own time
  const clock = () => { $d('.dk-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }; clock(); setInterval(clock, 10000);

  // ?hic: the desktop drawn by the browser into a canvas (HTML-in-Canvas), and that canvas is the glass's picture in WebGL
  let shown = el;
  if (QS.has('hic')) {
    const ok = typeof CanvasRenderingContext2D !== 'undefined' && 'drawElementImage' in CanvasRenderingContext2D.prototype, tag = $d('.dk-hic');
    if (!ok) { tag.textContent = 'HTML-in-Canvas: not in this browser'; console.warn('HTML-in-Canvas: drawElementImage missing (Chrome 157+, or chrome://flags/#canvas-draw-element)') }
    else {
      const R = 2, cv = document.createElement('canvas'); cv.id = 'deskCv'; cv.width = DW * R; cv.height = DH * R; cv.style.width = DW + 'px'; cv.style.height = DH + 'px';
      cv.setAttribute('content', 'drawable'); cv.setAttribute('layoutsubtree', ''); el.setAttribute('drawable', ''); cv.appendChild(el); document.body.appendChild(cv);   // (both the old and the new names)
      const g = cv.getContext('2d'); let n = 0, fails = 0;
      const draw = () => { try { g.setTransform(R, 0, 0, R, 0, 0); g.clearRect(0, 0, DW, DH); g.drawElementImage(el, 0, 0); room.deskPainted(); n++; return true } catch (e) { if (++fails < 4) console.warn('HTML-in-Canvas draw', e); return false } };
      cv.addEventListener('paint', draw); if (cv.requestPaint) cv.requestPaint();
      room.deskCanvas(cv); shown = cv; tag.textContent = 'HIC';
      setTimeout(() => { if (!n) { const loop = () => { if (draw()) requestAnimationFrame(loop); else if (fails > 30) tag.textContent = 'HIC failed' }; loop() } }, 1200);   // (no paint events: draw it every frame instead)
    }
  }
  document.documentElement.classList.add('desk'); room.desk(shown, DW, DH); main.lay(); render();   // (shown first: the grid measures its window)
  await new Promise(() => { });   // and that's all: the galaxy's files never load
}
