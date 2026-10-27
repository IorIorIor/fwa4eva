/* ───────────────────────── THE YEARS: scroll through time on the desk ─────────────────────────
   Only the room (branch the-years). The wheel (or a swipe) is time: on the monitor one super simple window shows the year (twelve
   month folders), a month (a tile per day) or a day (its winner large, the days either side peeking in), and scrolling moves through
   years, months or days at the level you're on. As the date moves the room moves with it (room.setYear): computers every 5 years,
   monitors every 5 in between, phones, mice, music, the software box, the guests, the clutter thinning out, the desk's wood. The
   screen's skin changes every 5 years and its bar's apps with it. The wheel over the room (off the screen) zooms; taps on the screen only press its buttons.
   Nothing after this file loads: the galaxy never starts. ?desk for the plain desk, ?galaxy for the galaxy. */
if (TIMESCROLL && room.on) {
  const PHONE = matchMedia('(pointer: coarse)').matches, DW = PHONE ? 640 : 1024; let DH = Math.round(DW / room.screenAspect);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], MONL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const DAY = 864e5, T0 = Date.UTC(2000, 4, 1), TEND = Date.parse(D[D.length - 1].date + 'T00:00:00Z');
  const byDate = new Map(D.map(d => [d.date, d])), iso = t => new Date(t).toISOString().slice(0, 10), Y = t => new Date(t).getUTCFullYear(), M = t => new Date(t).getUTCMonth(), Dd = t => new Date(t).getUTCDate();
  const clampT = t => Math.max(T0, Math.min(TEND, t)), monthStart = (y, m) => Date.UTC(y, m, 1), daysIn = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const addMonths = (t, n) => { const y = Y(t), m = M(t) + n, yy = y + Math.floor(m / 12), mm = ((m % 12) + 12) % 12; return clampT(Date.UTC(yy, mm, Math.min(Dd(t), daysIn(yy, mm)))) };
  const yf = t => Y(t) + (t - Date.UTC(Y(t), 0, 1)) / (365.25 * DAY);   // the year as a number (2015.97): what the room follows
  const TH = window.__FWA_DATA && window.__FWA_DATA.thumbs || await (async () => { try { const r = await fetch(DATA_BASE + 'thumbs.json'); if (r.ok) return await r.json() } catch (e) { } return null })();
  const SHEET = window.__FWA_DATA && TH && TH.sheet;   // (the single page: screenshots packed in sheets beside it)
  const picCss = d => { if (!d) return ''; const k = TH && d.shot != null ? TH.shots[d.shot] : undefined;
    if (SHEET && k != null) { const c = k % SHEET.per, x = (c % SHEET.cols) * 100 / (SHEET.cols - 1), y = Math.floor(c / SHEET.cols) * 100 / (Math.ceil(SHEET.per / SHEET.cols) - 1); return `background-image:url('sheets/s${Math.floor(k / SHEET.per)}.webp');background-size:${SHEET.cols * 100}% auto;background-position:${x}% ${y}%` }
    const u = typeof shotURL === 'function' ? shotURL(d) : null; if (u) return `background-image:url('${u}')`;
    let h = 0; for (const c of d.title) h = (h * 31 + c.charCodeAt(0)) | 0; return `background:hsl(${(h >>> 0) % 360},45%,52%)` };
  const AW = { SOTM: 'Site of the Month', FOTY: 'FWA of the Year' };

  // the skins, one per 5 years, and the apps in the bar (drawn here: a colour and a sign each, no real logos)
  const SKINS = [[2000, 'classic'], [2005, 'glossy'], [2010, 'glass'], [2015, 'flat'], [2020, 'soft'], [2025, 'liquid']];
  const APPS = { classic: [['#2a62c9', 'e'], ['#f08a24', '♪'], ['#3fae3f', '✿'], ['#c4161c', 'f']], glossy: [['#e8661c', 'F'], ['#5aa3e8', '♫'], ['#3d8fd8', '☺'], ['#2a4a8a', 'Ps']],
    glass: [['#2f9a4a', '◉'], ['#1db954', '♫'], ['#00aff0', 'S'], ['#55acee', '✦']], flat: [['#4a154b', '#'], ['#f7b500', '◆'], ['#1db954', '♫'], ['#d62976', '◎']],
    soft: [['#2d8cff', '▶'], ['#a259ff', 'F'], ['#4a154b', '#'], ['#f5c400', '✎']], liquid: [['#d97757', '✳'], ['#a259ff', 'F'], ['#f5c400', '✎'], ['#5e5ce6', '◐']] };
  const skinOf = t => { let k = SKINS[0][1]; for (const [y, s] of SKINS) if (Y(t) >= y) k = s; return k };

  const F = { cats: new Set(), ags: new Set(), q: '' }, filtered = () => F.cats.size || F.ags.size || F.q;
  const match = d => !!d && (!F.cats.size || F.cats.has(d.category)) && (!F.ags.size || F.ags.has(d.agency)) && (!F.q || (d.title + ' ' + d.agency + ' ' + d.category + ' ' + d.date).toLowerCase().includes(F.q));
  const el = document.createElement('div'); el.id = 'desk'; el.className = 'yr';
  el.innerHTML = `<section class="y-win"><header class="y-title"><button class="y-up" title="Back up a level">‹</button><b class="y-h"></b><small class="y-sub"></small></header><div class="y-body"></div><nav class="y-arrows"><button class="pv" title="Earlier">‹</button><button class="nx" title="Later">›</button></nav></section>
    <div class="y-pop" data-k="cat" hidden><div class="y-pl"></div></div><div class="y-pop" data-k="ag" hidden><input type="text" placeholder="Search agencies" spellcheck="false"><div class="y-pl"></div></div><div class="y-pop" data-k="q" hidden><input type="text" placeholder="Search anything" spellcheck="false"><div class="y-pl"></div></div>
    <div class="y-bar"><span class="y-btns"><button class="y-b" data-k="cat">Category</button><button class="y-b" data-k="ag">Agency</button><button class="y-b" data-k="q">Search</button></span><span class="y-dock"></span><span class="y-clock"></span></div>
    <svg class="dk-cur" viewBox="0 0 12 19" width="12" height="19"><path d="M.5 .5v15.5l3.6-3.5 2.6 6 2.3-1-2.6-5.8h5.1z" fill="#fff" stroke="#000" stroke-width="1" shape-rendering="crispEdges"/></svg>`;
  document.body.appendChild(el);
  const $y = s => el.querySelector(s), body = $y('.y-body'), cur = $y('.dk-cur');

  // ── the views ──
  let t = T0, level = 'year', skin = '';
  const winnersIn = (y, m) => { let n = 0; for (let d = 1; d <= daysIn(y, m); d++) if (match(byDate.get(iso(Date.UTC(y, m, d))))) n++; return n };
  function render(dir = 0) {
    const s = skinOf(t); if (s !== skin) { skin = s; el.className = 'yr sk-' + s; $y('.y-dock').innerHTML = APPS[s].map(([c, g]) => `<i style="--c:${c}">${g}</i>`).join('') }
    const y = Y(t), m = M(t), d = byDate.get(iso(t));
    $y('.y-up').disabled = level === 'year'; $y('.y-clock').textContent = `${Dd(t)} ${MON[m]} ${y}`;
    const old = body.querySelector('.y-view'), view = document.createElement('div'); view.className = 'y-view';
    if (level === 'year') {
      $y('.y-h').textContent = y; $y('.y-sub').textContent = '';
      view.innerHTML = `<div class="y-folders">${MON.map((n, i) => { const on = monthStart(y, i) <= TEND && Date.UTC(y, i + 1, 0) >= T0, k = on ? winnersIn(y, i) : 0; return `<button class="y-fold${on ? '' : ' off'}${i === m ? ' cur' : ''}" data-m="${i}"${on ? '' : ' disabled'}><i></i><span>${n}</span><small>${on ? k : ''}</small></button>` }).join('')}</div>`;
    } else if (level === 'month') {
      $y('.y-h').textContent = `${MONL[m]} ${y}`; $y('.y-sub').textContent = '';
      let h = ''; for (let k = 1; k <= daysIn(y, m); k++) { const tt = Date.UTC(y, m, k), w = byDate.get(iso(tt)); if (!w) { h += '<span class="y-tile none"></span>'; continue } h += `<button class="y-tile${match(w) ? '' : ' dim'}${AW[w.award] ? ' aw' : ''}${k === Dd(t) ? ' cur' : ''}" data-t="${tt}"><i style="${picCss(w)}">${AW[w.award] ? `<em>${w.award}</em>` : ''}</i><b>${esc(w.title)}</b><small>${k}</small></button>` }
      view.innerHTML = `<div class="y-tiles">${h}</div>`;
    } else {
      $y('.y-h').textContent = `${MONL[m]} ${Dd(t)}, ${y}`; $y('.y-sub').textContent = d && AW[d.award] ? AW[d.award] : '';
      const sl = k => { const tt = t + k * DAY, w = tt >= T0 && tt <= TEND ? byDate.get(iso(tt)) : null; return `<div class="y-sl${k ? '' : ' on'}${w && !match(w) ? ' dim' : ''}" data-k="${k}" style="--k:${k};${picCss(w)}"></div>` };
      view.innerHTML = `<div class="y-car"><div class="y-track">${[-2, -1, 0, 1, 2].map(sl).join('')}</div></div>` + (d ? `<div class="y-card"><b>${esc(d.title)}</b><span>${esc(d.agency)}</span><span>${esc(d.category)} · ${(+d.score).toFixed(1)}</span>${AW[d.award] ? `<em>${AW[d.award]}</em>` : ''}<span class="y-links">${d.url ? '<button class="go">Visit site</button>' : ''}${d.fwa ? '<button class="fwa">On FWA</button>' : ''}</span></div>` : '');
    }
    if (old && dir) { old.style.transform = `translateX(${-dir * 100}%)`; old.classList.add('gone'); setTimeout(() => old.remove(), 450); view.style.transition = 'none'; view.style.transform = `translateX(${dir * 100}%)`; body.appendChild(view); void view.offsetWidth; view.style.transition = ''; view.style.transform = '' }   // a step swipes: the old view out to one side, the new one in from the other
    else { body.innerHTML = ''; body.appendChild(view) }
    room.setYear(yf(t));
  }
  // one step at the level you're on (with a filter on, a day step goes to the next day that matches)
  function step(n) {
    const t0 = t;
    if (level === 'year') t = clampT(Date.UTC(Y(t) + n, M(t), Math.min(Dd(t), daysIn(Y(t) + n, M(t)))));
    else if (level === 'month') t = addMonths(t, n);
    else { let tt = t; for (let i = 0; i < 4000; i++) { tt += Math.sign(n) * DAY; if (tt < T0 || tt > TEND) { tt = t; break } if (!filtered() || match(byDate.get(iso(tt)))) break } t = tt }
    if (t !== t0) render(Math.sign(n));
  }
  const into = () => { if (level === 'year') level = 'month'; else if (level === 'month') level = 'day'; render() };
  const up = () => { if (level === 'day') level = 'month'; else if (level === 'month') level = 'year'; render() };
  body.addEventListener('click', e => {
    const f = e.target.closest('.y-fold'), tl = e.target.closest('.y-tile'), sl = e.target.closest('.y-sl');
    if (f && !f.disabled) { t = clampT(Date.UTC(Y(t), +f.dataset.m, Math.min(Dd(t), daysIn(Y(t), +f.dataset.m)))); if (t < T0) t = T0; level = 'month'; render() }
    else if (tl && tl.dataset.t) { t = +tl.dataset.t; level = 'day'; render() }
    else if (sl && +sl.dataset.k) step(+sl.dataset.k);
    else if (e.target.closest('.go')) { const d = byDate.get(iso(t)); if (d && d.url) open(d.url, '_blank', 'noopener') }
    else if (e.target.closest('.fwa')) { const d = byDate.get(iso(t)); if (d && d.fwa) open(d.fwa, '_blank', 'noopener') }
  });
  $y('.y-up').onclick = up; $y('.pv').onclick = () => step(-1); $y('.nx').onclick = () => step(1);

  // the wheel (anywhere: on the screen or off it) and a swipe on the screen: time
  let acc = 0, accT = 0;
  let lastStep = 0;
  const wheel = e => { const now = performance.now(); if (now - accT > 300) acc = 0; accT = now; acc += (e.deltaMode ? e.deltaY * 33 : e.deltaY) + (e.deltaMode ? 0 : e.deltaX * .5);   // slow on purpose: one step a swipe, and never faster than one every 0.42 s
    const per = level === 'day' ? 110 : level === 'month' ? 140 : 160; if (Math.abs(acc) >= per && now - lastStep > 420) { lastStep = now; const n = Math.sign(acc); acc = 0; step(n) } };
  el.addEventListener('wheel', e => { if (e.target.closest('.y-pop')) return; e.preventDefault(); wheel(e) }, { passive: false });
  { let sy = null; el.addEventListener('touchstart', e => { if (e.touches.length === 1) sy = e.touches[0].clientY }, { passive: true });
    el.addEventListener('touchmove', e => { if (sy == null || e.target.closest('.y-pop')) return; e.preventDefault(); const dy = sy - e.touches[0].clientY; if (Math.abs(dy) > 70) { step(Math.sign(dy)); sy = e.touches[0].clientY } }, { passive: false });
    el.addEventListener('touchend', () => { sy = null }) }
  addEventListener('keydown', e => { if (e.target.matches && e.target.matches('input,textarea')) return; const k = e.key;
    if (k === 'ArrowLeft') step(-1); else if (k === 'ArrowRight') step(1); else if (k === 'ArrowUp' || k === 'Escape' || k === 'Backspace') up(); else if (k === 'Enter' || k === 'ArrowDown') into(); else return; e.preventDefault() });

  // ── Category, Agency, Search: up from the bar, the same filters as the galaxy's ──
  const counts = key => { const m = new Map(); for (const d of D) m.set(d[key], (m.get(d[key]) || 0) + 1); return [...m].sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(b[0])) };
  const CATN = counts('category'), AGN = counts('agency');
  const row = (k, v, n, on) => `<button class="y-mi${on ? ' on' : ''}" data-k="${k}" data-v="${esc(v)}"><i></i><span>${esc(v)}</span><small>${n.toLocaleString('en')}</small></button>`;
  function fill(k) {
    const pop = $y(`.y-pop[data-k="${k}"]`), pl = pop.querySelector('.y-pl');
    if (k === 'cat') pl.innerHTML = `<button class="y-mi${F.cats.size ? '' : ' on'}" data-k="cat" data-v=""><i></i><span>All categories</span></button>` + CATN.map(([v, n]) => row('cat', v, n, F.cats.has(v))).join('');
    else if (k === 'ag') { const q = pop.querySelector('input').value.trim().toLowerCase(), ls = AGN.filter(([v]) => !q || v.toLowerCase().includes(q)); pl.innerHTML = `<button class="y-mi${F.ags.size ? '' : ' on'}" data-k="ag" data-v=""><i></i><span>All agencies</span></button>` + ls.slice(0, 200).map(([v, n]) => row('ag', v, n, F.ags.has(v))).join('') }
    else { if (!F.q) { pl.innerHTML = '<p class="y-more">Titles, agencies, categories, dates</p>'; return } const hits = []; for (let i = D.length - 1; i >= 0 && hits.length < 10; i--) if (match(D[i])) hits.push(D[i]); pl.innerHTML = hits.map(d => `<button class="y-mi hit" data-k="hit" data-v="${d.date}"><i style="${picCss(d)}"></i><span>${esc(d.title)}<small>${esc(d.agency)} · ${d.date}</small></span></button>`).join('') || '<p class="y-more">Nothing found</p>' }
  }
  let openK = null;
  function popup(k) { openK = openK === k ? null : k; el.querySelectorAll('.y-pop').forEach(p => { p.hidden = p.dataset.k !== openK }); el.querySelectorAll('.y-b').forEach(b => b.classList.toggle('dn', b.dataset.k === openK));
    if (openK) { fill(openK); const b = $y(`.y-b[data-k="${openK}"]`), p = $y(`.y-pop[data-k="${openK}"]`); p.style.left = b.offsetLeft + 'px'; const inp = p.querySelector('input'); if (inp) setTimeout(() => inp.focus(), 0) } }
  el.querySelectorAll('.y-b').forEach(b => b.addEventListener('click', e => { e.stopPropagation(); popup(b.dataset.k) }));
  el.addEventListener('pointerdown', e => { if (openK && !e.target.closest('.y-pop,.y-b')) popup(openK) });
  el.querySelectorAll('.y-pop').forEach(p => p.addEventListener('click', e => { const b = e.target.closest('.y-mi'); if (!b) return; const k = b.dataset.k, v = b.dataset.v;
    if (k === 'hit') { popup(openK); t = Date.parse(v + 'T00:00:00Z'); level = 'day'; render(); return }
    const set = k === 'cat' ? F.cats : F.ags; if (!v) set.clear(); else if (set.has(v)) set.delete(v); else set.add(v); fill(k); render();
    $y('.y-b[data-k="cat"]').classList.toggle('act', F.cats.size > 0); $y('.y-b[data-k="ag"]').classList.toggle('act', F.ags.size > 0) }));
  $y('.y-pop[data-k="ag"] input').addEventListener('input', () => fill('ag'));
  { const qi = $y('.y-pop[data-k="q"] input'); let tm = 0; qi.addEventListener('input', () => { clearTimeout(tm); tm = setTimeout(() => { F.q = qi.value.trim().toLowerCase(); fill('q'); render(); $y('.y-b[data-k="q"]').classList.toggle('act', !!F.q) }, 150) }) }

  // ── the pointer: yours hides on the screen and the screen's own takes over; the room's mouse moves with it ──
  let ptype = 'mouse';
  const track = () => { const P = room.st.ptr; ptype = P.type || ptype; const p = P.in ? room.toDesk(P.x, P.y) : null, inn = !!p && p[0] >= 0 && p[1] >= 0 && p[0] <= DW && p[1] <= DH && !document.pointerLockElement && ptype !== 'touch';
    if (ptype !== 'touch') { document.documentElement.classList.toggle('deskin', inn); room.deskIn = inn } cur.style.display = inn ? 'block' : 'none';
    if (inn) { cur.style.transform = `translate(${p[0].toFixed(1)}px,${p[1].toFixed(1)}px)`; room.mouseAt(p[0] / DW, p[1] / DH) } };
  { const tick = () => { requestAnimationFrame(tick); track() }; requestAnimationFrame(tick) }
  // the monitor changes shape over the years: the screen's page follows it
  window.__years = { go(day, lv = 'year') { t = clampT(Date.parse(day + 'T00:00:00Z')); level = lv; render() } };   // (for scripted looks)
  room.onScreen = a => { const h = Math.round(DW / a); if (h === DH) return; DH = h; el.style.height = DH + 'px'; room.desk(el, DW, DH) };
  el.style.width = DW + 'px'; el.style.height = DH + 'px';
  document.documentElement.classList.add('desk'); room.desk(el, DW, DH); render(); room.prebuildYears();
  await new Promise(() => { });   // and that's all: the galaxy's files never load
}
