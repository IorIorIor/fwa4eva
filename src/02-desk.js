/* ───────────────────────── THE DESK: a Windows 2000 desktop on the monitor ─────────────────────────
   Only the room (branch the-desk). The wheel off the monitor zooms you in onto its glass and back out (room.zoomTo); on the
   glass your own pointer gives way to the desktop's (#desk, laid on the whole glass by room.desk, 1024 × 768 of its own).
   On it one window, every FWA by year in a big grid (a 16 px pixel thumbnail from data/thumbs.png, see room/build-thumbs.py,
   with its name and date), and the taskbar: Category, Agency and Search, each opening up from the bar like a Start menu and
   filtering the grid the way the galaxy's filters do. Double-click a winner to open its site.
   Nothing after this file loads: the galaxy never starts. ?galaxy (or ?noroom) for the galaxy as before. */
if (DESK && room.on) {
  const DW = 1024, DH = 768, esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const fmtD = d => { const [y, m, dd] = d.date.split('-'); return `${+dd} ${MON[+m - 1]} ${y}` };
  const TH = window.__FWA_DATA && window.__FWA_DATA.thumbs || await (async () => { try { const r = await fetch(DATA_BASE + 'thumbs.json'); if (r.ok) return await r.json() } catch (e) { } return null })();   // the atlas index (none: plain colour squares)
  const F = { cats: new Set(), ags: new Set(), q: '' };
  const el = document.createElement('div'); el.id = 'desk'; el.style.width = DW + 'px'; el.style.height = DH + 'px';
  el.innerHTML = `
    <div class="dk-icons"><div class="dk-ic"><i class="ic-pc"></i><span>My Computer</span></div><div class="dk-ic"><i class="ic-bin"></i><span>Recycle Bin</span></div><div class="dk-ic"><i class="ic-ie"></i><span>Internet Explorer</span></div></div>
    <section class="dk-win" style="left:96px;top:24px;width:880px;height:640px">
      <header class="dk-title"><i class="ic-fold"></i><b>FWA Winners</b><span class="dk-tb"><button class="mn" title="Minimize">_</button><button class="mx" title="Maximize">□</button><button class="cl" title="Close">×</button></span></header>
      <nav class="dk-menu"><span>File</span><span>Edit</span><span>View</span><span>Favorites</span><span>Tools</span><span>Help</span></nav>
      <div class="dk-addr"><span>Address</span><div>C:\\FWA\\Winners</div></div>
      <div class="dk-list" tabindex="0"></div>
      <footer class="dk-status"><span class="dk-n"></span><span>My Computer</span></footer>
    </section>
    <div class="dk-pop" data-k="cat" hidden><div class="dk-pl"></div></div>
    <div class="dk-pop" data-k="ag" hidden><label class="dk-in"><input type="text" placeholder="Search agencies" spellcheck="false"></label><div class="dk-pl"></div></div>
    <div class="dk-pop" data-k="q" hidden><label class="dk-in"><input type="text" placeholder="Search anything" spellcheck="false"></label><div class="dk-pl"></div></div>
    <div class="dk-bar"><button class="dk-btn" data-k="cat"><i class="ic-cat"></i>Category</button><button class="dk-btn" data-k="ag"><i class="ic-ag"></i>Agency</button><button class="dk-btn" data-k="q"><i class="ic-q"></i>Search</button><span class="dk-sep"></span><button class="dk-task on"><i class="ic-fold"></i>FWA Winners</button><span class="dk-tray"><b class="dk-clock"></b></span></div>
    <svg class="dk-cur" viewBox="0 0 12 19" width="12" height="19"><path d="M.5 .5v15.5l3.6-3.5 2.6 6 2.3-1-2.6-5.8h5.1z" fill="#fff" stroke="#000" stroke-width="1" shape-rendering="crispEdges"/></svg>`;
  document.body.appendChild(el);
  const $d = s => el.querySelector(s), list = $d('.dk-list'), win = $d('.dk-win'), cur = $d('.dk-cur'), nEl = $d('.dk-n');

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
  list.addEventListener('click', e => { const it = e.target.closest('.dk-it'); list.querySelectorAll('.dk-it.sel').forEach(x => x.classList.remove('sel')); sel = it ? +it.dataset.i : -1; if (it) it.classList.add('sel') });
  list.addEventListener('dblclick', e => { const it = e.target.closest('.dk-it'); if (!it) return; const d = D[+it.dataset.i]; if (d && d.url) open(d.url, '_blank', 'noopener') });

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

  // the window: drag it by its title, maximise, minimise (and back from the taskbar)
  let box = { x: 96, y: 24, w: 880, h: 640 }, maxed = false, drag = null;
  const lay = () => { const b = maxed ? { x: 0, y: 0, w: DW, h: DH - 30 } : box, c0 = cols; Object.assign(win.style, { left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px' }); win.classList.toggle('maxed', maxed); if (Math.max(1, Math.floor((list.clientWidth - 8) / IT)) !== c0) { const st = list.scrollTop; render(); list.scrollTop = st; slice() } };
  const mini = v => { win.hidden = v; $d('.dk-task').classList.toggle('on', !v) };
  $d('.dk-title').addEventListener('pointerdown', e => { if (e.target.closest('button') || maxed) return; const p = room.toDesk(e.clientX, e.clientY); if (p) drag = { p, b: { ...box } } });
  $d('.dk-title').addEventListener('dblclick', e => { if (!e.target.closest('button')) { maxed = !maxed; lay() } });
  $d('.mx').onclick = () => { maxed = !maxed; lay() }; $d('.mn').onclick = $d('.cl').onclick = () => mini(true); $d('.dk-task').onclick = () => mini(!win.hidden);
  addEventListener('pointerup', () => { drag = null });

  // the desktop's own pointer: yours hides on the glass and this one takes over, wherever on the page you are
  addEventListener('pointermove', e => {
    const p = room.toDesk(e.clientX, e.clientY), inn = !!p && p[0] >= 0 && p[1] >= 0 && p[0] <= DW && p[1] <= DH && !document.pointerLockElement && e.pointerType !== 'touch';
    document.documentElement.classList.toggle('deskin', inn); room.deskIn = inn; cur.style.display = inn ? 'block' : 'none';
    if (inn) cur.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`;
    if (drag && p) { box.x = Math.max(-box.w + 80, Math.min(DW - 80, drag.b.x + p[0] - drag.p[0])); box.y = Math.max(0, Math.min(DH - 60, drag.b.y + p[1] - drag.p[1])); lay() }
  }, true);
  document.addEventListener('pointerleave', () => { document.documentElement.classList.remove('deskin'); room.deskIn = false; cur.style.display = 'none' });

  // the clock in the tray: your own time
  const clock = () => { $d('.dk-clock').textContent = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) }; clock(); setInterval(clock, 10000);

  document.documentElement.classList.add('desk'); room.desk(el, DW, DH); render();   // (shown first: the grid measures its window)
  await new Promise(() => { });   // and that's all: the galaxy's files never load
}
