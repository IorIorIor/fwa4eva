const portal = { on: false, steering: false, ask() { }, restore() { }, update() { } };   // (the phone's tilt and gyroscope are no longer used)
// phones: pull a sheet down by its top edge and it goes
if (matchMedia('(max-width:760px)').matches) ['panel', 'lookPanel', 'rmPanel'].forEach(id => {
  const el = $(id); let y0 = null, dy = 0;
  el.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse' || e.clientY - el.getBoundingClientRect().top > 46 || e.target.closest('input,button,select,textarea')) return; y0 = e.clientY; dy = 0; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId) } catch { } });
  el.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); if (id === 'rmPanel') el.style.setProperty('--dy', dy + 'px'); else el.style.transform = `translateY(${dy}px)` });
  const up = () => { if (y0 == null) return; y0 = null; el.classList.remove('drag'); el.style.transform = ''; el.style.removeProperty('--dy'); if (dy > 80) { buzz(8); if (id === 'rmPanel') rmenu.close(); else if (el.classList.contains('open')) togglePanel(id) } };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
});
// phones: the FWA logo opens the whole menu, full screen; it drops in from the top and a swipe up sends it back
const mMenu = (() => {
  const el = document.createElement('div'); el.id = 'mMenu'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Menu'); document.body.appendChild(el);
  const nav = $('topnav'), small = () => coarse || matchMedia('(max-width:760px)').matches;
  if (coarse) { const lg = $('logo'); lg.removeAttribute('href'); lg.removeAttribute('target'); lg.setAttribute('role', 'button') }   // on a phone the logo is the menu, never a link away
  let y0 = null, dy = 0, moved = false;
  const close = () => { el.classList.remove('in'); el.style.transform = ''; document.body.classList.remove('mm-open'); setTimeout(() => { if (!el.classList.contains('in')) el.hidden = true }, 420) };
  const open = () => {
    const items = [...nav.querySelectorAll('button')].map(b => [b.dataset.k, b.textContent, b.classList.contains('on') ? 'on' : b.classList.contains('off') ? 'off' : '']).concat([['settings', 'Settings', '']]);
    el.innerHTML = `<button type="button" class="mx" aria-label="Close">×</button><nav>${items.map(([k, t, c], n) => `<button type="button" data-k="${k}" class="${c}" style="--i:${n}">${t}</button>`).join('')}</nav><a href="https://thefwa.com" target="_blank" rel="noopener" style="--i:${items.length}">thefwa.com</a><i class="mgrab"></i>`;
    el.hidden = false; void el.offsetWidth; el.classList.add('in'); document.body.classList.add('mm-open'); buzz(8);
  };
  el.addEventListener('pointerdown', e => { e.stopPropagation(); y0 = e.clientY; dy = 0; moved = false; el.classList.add('drag') });
  el.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.min(0, e.clientY - y0); if (dy < -8) moved = true; if (moved) el.style.transform = `translateY(${dy}px)` });
  const up = () => { if (y0 == null) return; y0 = null; el.classList.remove('drag'); if (moved && dy < -70) { buzz(8); close() } else el.style.transform = '' };
  el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up);
  el.addEventListener('click', e => {
    if (moved) { e.preventDefault(); return }   // that was a swipe, not a tap
    if (e.target.closest('.mx')) { close(); return }
    const b = e.target.closest('nav button'); if (!b) return; close(); const k = b.dataset.k;
    if (k === 'settings') rmenu.choose('settings'); else { const t = nav.querySelector(`[data-k="${k}"]`); if (t) t.click() }
  });
  $('logo').addEventListener('click', e => { if (!small()) return; e.preventDefault(); if (!booted) return; el.hidden || !el.classList.contains('in') ? open() : close() });
  return { open, close };
})();
// phones, on the map: Filters and Search as two tabs along the bottom. Either opens the drawer, the tabs ride up on top
// of it, and the other tab swaps what's in it; the open one's tab closes it
const mTabs = (() => {
  const el = document.createElement('div'); el.id = 'mTabs'; el.className = 'hud'; el.innerHTML = '<button type="button" data-k="filters">Filters</button><button type="button" data-k="search">Search</button>'; document.body.appendChild(el);
  let cur = null; const B = document.body;
  const sync = () => { el.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === cur)); B.classList.toggle('mtab-open', !!cur) };
  el.addEventListener('pointerdown', e => e.stopPropagation());
  el.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return; const k = b.dataset.k; buzz(8);
    if (cur === k) { cur = null; sync(); rmenu.close(); return }
    if (cur) { B.classList.add('mtab-swap'); setTimeout(() => B.classList.remove('mtab-swap'), 60) }   // swapping: the drawer stays put, only its content changes
    cur = k; sync(); rmenu.sub(k);
  });
  setInterval(() => { if (cur && (!rmenu.panel || S.mode !== 'map')) { if (rmenu.panel) rmenu.close(); cur = null; sync() } }, 150);   // closed some other way (swiped down, ×, back to flying)
  return { get cur() { return cur } };
})();
