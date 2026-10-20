/* ───────────────────────── interface ───────────────────────── */
const tip = $('tip'), crossEl = $('cross');
let matchCount = N, cardI = -1, tipFor = -1, hovI = -1, lastHov = -1;
const aimRingR = (() => { const el = $('aimRing'); let v = -1; return r => { const s = r.toFixed(2); if (s !== v) { v = s; el.setAttribute('r', s) } } })();

/* colour + filter */
const _tc = new C3();
function recolor() {
  D.forEach((d, i) => {
    if (S.agencies.has(d.agency)) _tc.set(agColor(d.agency));
    else if (S.colorBy === 'type') _tc.set(KINDS[KIND[i]][1]);
    else if (S.colorBy === 'category') _tc.set(CAT_COL[CATS.indexOf(d.category)]);
    else if (S.colorBy === 'award') _tc.set(AWARD_COL[d.award]);
    else if (S.colorBy === 'tech') _tc.set(TECH_COL[d.tech[0]]);
    else _tc.setHSL(.72 - (d.year - 2000) / 26 * .66, .85, .64);
    COL[i * 3] = _tc.r; COL[i * 3 + 1] = _tc.g; COL[i * 3 + 2] = _tc.b;
  }); stars.aColor.needsUpdate = true; renderLegend();
}
function matches(d) {
  if (d.year < S.y0 || d.year > S.y1) return false;
  if (S.awards.size && !S.awards.has(d.award)) return false;
  if (S.cats.size && !S.cats.has(d.category)) return false;
  if (S.techs.size && !d.tech.some(t => S.techs.has(t))) return false;
  if (S.agencies.size && !S.agencies.has(d.agency)) return false;
  if (S.country && d.country !== S.country) return false;
  if (d.score < S.minScore) return false;
  if (S.q) { const q = S.q.toLowerCase(); if (!d.title.toLowerCase().includes(q) && !d.agency.toLowerCase().includes(q)) return false }
  return true;
}
const perYear = new Array(27).fill(0), galCount = new Array(NERA).fill(0), galTotal = new Array(NERA).fill(0); D.forEach(d => galTotal[galOf(d.year)]++);
let histBtns = [];
function applyFilter() {
  let c = 0; perYear.fill(0); galCount.fill(0);
  D.forEach((d, i) => { const m = matches(d); TA[i] = m ? 1 : .035; if (m) { c++; if (d.year >= 2000 && d.year <= 2026) perYear[d.year - 2000]++; galCount[galOf(d.year)]++ } });
  $('count').innerHTML = c.toLocaleString('en') + '<small>of ' + N.toLocaleString('en') + ' sites</small>';
  const mx = Math.max(1, ...perYear);
  histBtns.forEach((b, k) => { b.style.height = Math.max(2, perYear[k] / mx * 46) + 'px'; b.classList.toggle('on', YEARS[k] >= S.y0 && YEARS[k] <= S.y1 && perYear[k] > 0) });
  $('yrTxt').textContent = S.y0 === S.y1 ? S.y0 : S.y0 + '–' + S.y1;
  matchCount = c;
  if (S.mode === 'map') refreshLabels();
  buildConstellation(); if (cardI >= 0) showCard(cardI, true);
}
let chain = [], chainPos = new Map(), conOn = false;
function buildConstellation() {
  chain = []; chainPos = new Map(); const chains = [];
  if (S.agencies.size) { S.agencies.forEach(a => { const ids = []; for (let i = 0; i < N; i++) if (TA[i] === 1 && D[i].agency === a) ids.push(i); if (ids.length >= 2) chains.push({ ids, name: a, col: agColor(a) }) }) }
  else if (matchCount < N && matchCount >= 2 && matchCount <= CON_MAX + 1) { const ids = []; for (let i = 0; i < N; i++) if (TA[i] === 1) ids.push(i); chains.push({ ids, name: '', col: '#ffb547' }) }
  let seg = 0, v = 0; const cc = new C3();
  for (const c of chains) {
    c.ids.sort((a, b) => D[a].t - D[b].t); cc.set(c.col); const len = c.ids.length;
    c.ids.forEach((id, j) => chainPos.set(id, { n: j, len, seg: seg + j, name: c.name }));
    for (let j = 0; j < len - 1 && v < CON_MAX; j++, v++) {
      const a = c.ids[j] * 3, b = c.ids[j + 1] * 3, o = v * 6;
      conPos[o] = P[a]; conPos[o + 1] = P[a + 1]; conPos[o + 2] = P[a + 2]; conPos[o + 3] = P[b]; conPos[o + 4] = P[b + 1]; conPos[o + 5] = P[b + 2];
      conSeq[v * 2] = seg + j; conSeq[v * 2 + 1] = seg + j + .9999; conCol.set([cc.r, cc.g, cc.b, cc.r, cc.g, cc.b], o)
    }
    seg += len + 1
  }
  chain = chains; const g = constellation.geometry; ['position', 'aSeq', 'aCol'].forEach(k => g.attributes[k].needsUpdate = true); g.setDrawRange(0, v * 2); conOn = v > 0;
}

/* labels: the dates ride the ruler (it turns to keep them in view), plus a few named places. On the map the dates come in
   by zoom level with their rings and are clickable; in flight they're off unless the time rings are on. */
const galaxyLabels = [];
YEARS.forEach(y => {
  const u = yearU(Date.UTC(y, 0, 1)); if (u > .001) galaxyLabels.push({ text: y, cls: 'yr ax' + (y % 5 ? '' : ' maj'), ruler: u, lvl: y % 5 ? 1 : 0, ry: y, near: y % 5 ? 450000 : 900000, pos: ringPoint(u, THR, 0), f: 1e9 });
  for (let m = 1; m < 12; m++) { const um = yearU(Date.UTC(y, m, 1)); if (um > .002) galaxyLabels.push({ text: 'JFMAMJJASOND'[m], cls: 'yr ax mo', ruler: um, lvl: 2, ry: y + m / 12, near: 60000, pos: ringPoint(um, THR, 0), f: 1e9 }) }
});
let labelEls = [];
function refreshLabels() {
  const Lw = $('labels'); Lw.innerHTML = '';
  const src = S.mode === 'map' ? [...galaxyLabels, { text: 'You', cls: 'you', pos: player.pos, f: 1e9 }] : galaxyLabels;
  labelEls = src.map(g => {
    const e = document.createElement('div'); e.className = 'glab ' + g.cls; e.style.display = 'none';
    if (g.col) e.innerHTML = `<i style="background:${g.col}"></i>${esc(g.text)}`; else e.textContent = g.text;
    if (S.mode === 'map' && (g.go || g.ruler != null)) {
      e.classList.add('click'); e.setAttribute('role', 'button'); e.tabIndex = 0; e.title = 'Go to ' + (g.lvl === 2 ? 'this month' : g.text);
      const go = () => { if (g.ruler != null) { ringZoom({ y: g.ry, r: GAL_R0 + g.ruler * GAL_LEN, th: ruler.th }); return } orbit.target.copy(g.go.at || g.pos); orbit.dist = typeof g.go.d === 'function' ? g.go.d() : g.go.d; const o = orbitPose(); tweenCam(o.p, o.q, 1.6) };
      e.onclick = go; e.onkeydown = ev => { if (ev.key === 'Enter') go() };
      if (g.ruler != null) { e.onmouseenter = () => { timeRings.u.hi.value = g.ry; ringLab = 1 }; e.onmouseleave = () => { ringLab = 0 } }
    }
    Lw.appendChild(e);
    const c = g.cls, pri = c === 'you' ? 9 : c === 'dec bh' ? 8 : c.startsWith('dec') ? 7 : c === 'neb' ? 6 : c === 'ag' ? 5 : c === 'yr' ? 5 : c.includes('maj') ? 4 : c.includes('mo') ? 1 : 2;
    return { e, pos: g.pos, ruler: g.ruler, lvl: g.lvl, f: g.f, near: g.near, mapFar: g.mapFar, shown: false, x: -1, y: -1, op: -1, pri, mid: /dec|neb|ag|ax/.test(c), w: 0, h: 0 };
  });
  labelEls.sort((a, b) => b.pri - a.pri);   // important names claim their space first
  requestAnimationFrame(() => labelEls.forEach(l => { const d = l.e.style.display; l.e.style.display = ''; l.w = l.e.offsetWidth + 6; l.h = l.e.offsetHeight + 4; l.e.style.display = d }));   // one layout read per refresh
}
let ringLab = 0;
function updateLabels() {
  const W = innerWidth, H = innerHeight, map = S.mode === 'map', boxes = [], fr = !!LOOK.ringFly; _vp.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  for (const l of labelEls) {
    let fade = 1;
    if (l.ruler != null) { ringPoint(l.ruler, SPIRAL ? armPhase(GAL_R0 + l.ruler * GAL_LEN) : ruler.th, 0, l.pos); fade = map ? mapLvl[l.lvl] : fr ? 1 : l.lvl === 0 ? ringFarK : 0 }   // dates ride the turning ruler (from far out in flight, the five-year marks)
    let show = fade > .04 && !(map ? (l.mapFar && orbit.dist > l.mapFar) : (l.near && !(l.ruler != null && ringFarK > .05) && camera.position.distanceTo(l.pos) > l.near));   // local names only once you're close
    let x = 0, y = 0;
    if (show) { tmp.copy(l.pos).applyMatrix4(_vp); show = tmp.z <= 1 && tmp.z >= -1 && Math.abs(tmp.x) <= 1.1 && Math.abs(tmp.y) <= 1.1; x = Math.round((tmp.x * .5 + .5) * W); y = Math.round((-tmp.y * .5 + .5) * H) }
    if (show && l.w) {   // declutter: a label only shows if it doesn't land on a more important one
      const cx = x, cy = l.mid ? y : y - l.h / 2, hw = l.w / 2, hh = l.h / 2;
      for (const b of boxes) if (Math.abs(b[0] - cx) < b[2] + hw && Math.abs(b[1] - cy) < b[3] + hh) { show = false; break }
      if (show) boxes.push([cx, cy, hw, hh]);
    }
    if (show !== l.shown) { l.shown = show; l.e.style.display = show ? '' : 'none' }
    if (!show) continue;
    const op = Math.round((map ? fade : Math.max(.12, Math.min(1, l.f / camera.position.distanceTo(l.pos)))) * 50) / 50;
    if (x !== l.x) { l.x = x; l.e.style.left = x + 'px' } if (y !== l.y) { l.y = y; l.e.style.top = y + 'px' } if (op !== l.op) { l.op = op; l.e.style.opacity = op }
  }
}

/* filter panel */
function chips(el, items, set, col, label = x => x) {
  el.innerHTML = ''; items.forEach(it => {
    const b = document.createElement('button'); b.className = 'chip'; b.style.setProperty('--c', col(it)); b.setAttribute('aria-pressed', 'false'); b.innerHTML = `<i></i>${esc(label(it))}`;
    b.onclick = () => { set.has(it) ? set.delete(it) : set.add(it); b.setAttribute('aria-pressed', set.has(it)); applyFilter() }; el.appendChild(b)
  });
}
chips($('cAward'), AWARDS, S.awards, a => AWARD_COL[a], a => AWARD_NAME[a]);
chips($('cCat'), CATS, S.cats, c => CAT_COL[CATS.indexOf(c)]);
chips($('cTech'), TECHS, S.techs, t => TECH_COL[t]);
{
  const cnt = k => { const m = new Map(); D.forEach(d => m.set(d[k], (m.get(d[k]) || 0) + 1)); return [...m].sort((a, b) => b[1] - a[1]) };
  $('agency').innerHTML = '<option value="">Add an agency…</option>' + cnt('agency').map(([a, n]) => `<option value="${esc(a)}">${esc(a)} (${n})</option>`).join('');
  $('country').innerHTML = '<option value="">All countries</option>' + cnt('country').map(([a, n]) => `<option value="${esc(a)}">${esc(a)} (${n})</option>`).join('');
}
histBtns = YEARS.map(y => { const b = document.createElement('button'); b.title = y; b.setAttribute('aria-label', 'Only ' + y); b.onclick = () => { S.y0 = S.y1 = y; $('y0').value = $('y1').value = y; applyFilter() }; $('hist').appendChild(b); return b });
$('y0').oninput = e => { S.y0 = +e.target.value; if (S.y0 > S.y1) { S.y1 = S.y0; $('y1').value = S.y1 } applyFilter() };
$('y1').oninput = e => { S.y1 = +e.target.value; if (S.y1 < S.y0) { S.y0 = S.y1; $('y0').value = S.y0 } applyFilter() };
$('yrAll').onclick = () => { S.y0 = 2000; S.y1 = 2026; $('y0').value = 2000; $('y1').value = 2026; applyFilter() };
$('q').oninput = e => { S.q = e.target.value.trim(); applyFilter() };
$('agency').onchange = e => { const a = e.target.value; e.target.value = ''; if (!a || S.agencies.has(a) || S.agencies.size >= AG_PAL.length) return; const used = new Set(agCol.values()); agCol.set(a, AG_PAL.find(c => !used.has(c))); S.agencies.add(a); renderAgChips(); recolor(); applyFilter() };
function renderAgChips() {
  const el = $('cAg'); el.innerHTML = ''; S.agencies.forEach(a => {
    const b = document.createElement('button'); b.className = 'chip'; b.setAttribute('aria-pressed', 'true'); b.style.setProperty('--c', agColor(a));
    b.innerHTML = `<i></i>${esc(a)} <span aria-hidden="true">×</span>`; b.setAttribute('aria-label', 'Remove ' + a); b.onclick = () => { S.agencies.delete(a); agCol.delete(a); renderAgChips(); recolor(); applyFilter() }; el.appendChild(b)
  })
}
$('country').onchange = e => { S.country = e.target.value; applyFilter() };
$('score').oninput = e => { S.minScore = +e.target.value; $('scTxt').textContent = S.minScore.toFixed(1); applyFilter() };
$('colorBy').onchange = e => { S.colorBy = e.target.value; recolor() };
$('reset').onclick = () => {
  Object.assign(S, { y0: 2000, y1: 2026, country: '', q: '', minScore: 7 }); S.awards.clear(); S.cats.clear(); S.techs.clear(); S.agencies.clear(); agCol.clear(); renderAgChips(); recolor();
  $('y0').value = 2000; $('y1').value = 2026; $('q').value = ''; $('country').value = ''; $('score').value = 7; $('scTxt').textContent = '7.0';
  document.querySelectorAll('.chip').forEach(c => c.setAttribute('aria-pressed', 'false')); applyFilter()
};
$('vFly').onclick = () => setMode('fly'); $('vMap').onclick = () => setMode('map');
$('fbtn').onclick = () => togglePanel('panel');
$('net').textContent = 'solo for now (others show up when signed-in viewers have it open)';
function renderLegend() {
  let items;
  if (S.colorBy === 'type') items = [['Blue', KINDS[0][1]], ['White', KINDS[2][1]], ['Yellow', KINDS[4][1]], ['Orange', KINDS[5][1]], ['Red', KINDS[6][1]], ['Giants', KINDS[7][1]], ['Supergiants', KINDS[10][1]]];
  else if (S.colorBy === 'category') items = CATS.map((c, k) => [c, CAT_COL[k]]);
  else if (S.colorBy === 'award') items = AWARDS.map(a => [AWARD_NAME[a], AWARD_COL[a]]);
  else if (S.colorBy === 'tech') items = TECHS.map(t => [t, TECH_COL[t]]);
  else items = [2000, 2006, 2013, 2019, 2026].map(y => { _tc.setHSL(.72 - (y - 2000) / 26 * .66, .85, .64); return [y, '#' + _tc.getHexString()] });
  $('legend').innerHTML = items.map(([n, c]) => `<span><i style="background:${c}"></i>${n}</span>`).join('');
}
const isOpen = id => $(id).classList.contains('open');
function togglePanel(which) {
  [['panel', 'fbtn'], ['lookPanel', 'lbtn']].forEach(([pid, bid]) => { const el = $(pid), open = pid === which && !el.classList.contains('open'); el.classList.toggle('open', open); el.inert = !open; $(bid).setAttribute('aria-expanded', open) });
  const any = isOpen('panel') || isOpen('lookPanel'); document.body.classList.toggle('panel-open', any); if (any && locked()) document.exitPointerLock();
}
$('lbtn').onclick = () => togglePanel('lookPanel');

/* screenshots: placeholders drawn per winner until the viewer drops in the real ones */
const texCache = new Map();
try { document.fonts && document.fonts.load('16px "Paper Mono"').then(() => { texCache.forEach(t => t.dispose()); texCache.clear(); SHOT.userData.i = -1 }) } catch (e) { }
function avgColor(c) { const col = new C3(0xffb547); try { const s = document.createElement('canvas'); s.width = 8; s.height = 5; const g = s.getContext('2d'); g.drawImage(c, 0, 0, 8, 5); const p = g.getImageData(0, 0, 8, 5).data; let r = 0, gg = 0, b = 0; for (let i = 0; i < p.length; i += 4) { r += p[i]; gg += p[i + 1]; b += p[i + 2] } const n = p.length / 4; col.setRGB(r / n / 255, gg / n / 255, b / n / 255); const h = {}; col.getHSL(h); col.setHSL(h.h, Math.min(1, h.s * 1.4), Math.max(.5, h.l)) } catch (e) { } return col }
function shot(d) {
  if (texCache.has(d.i)) return texCache.get(d.i);
  const tex = placeholderShot(d);
  if (d.shotKey) IDB.get('shots', d.shotKey).then(blob => {
    if (!blob) return; const u = URL.createObjectURL(blob), img = new Image();
    img.onload = () => { const c = tex.image, g = c.getContext('2d'), W = c.width, H = c.height, k = Math.max(W / img.width, H / img.height), w = img.width * k, h = img.height * k; g.fillStyle = '#000'; g.fillRect(0, 0, W, H); g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h); g.strokeStyle = CAT_COL[CATS.indexOf(d.category)]; g.lineWidth = 5; g.strokeRect(2.5, 2.5, W - 5, H - 5); tex.needsUpdate = true; tex.avgCol = avgColor(c); URL.revokeObjectURL(u) };
    img.onerror = () => URL.revokeObjectURL(u); img.src = u
  });
  texCache.set(d.i, tex);
  if (texCache.size > 32) { const k = texCache.keys().next().value; texCache.get(k).dispose(); texCache.delete(k) }
  return tex;
}
function placeholderShot(d) {
  const W = 800, H = 500, tex = canvasTex(W, H, g => {
    const r = mulberry32(d.i * 7919 + 13), acc = CAT_COL[CATS.indexOf(d.category)], flash = d.tech.includes('Flash'), sl = d.title.toLowerCase().replace(/^the /, '').replace(/\s+/g, '') + '.com', words = d.title.toUpperCase().split(' ');
    g.save(); g.scale(W / 640, H / 400);
    if (flash) {
      const bg = g.createRadialGradient(320, 160, 20, 320, 200, 450); bg.addColorStop(0, '#2a2a34'); bg.addColorStop(1, '#050508'); g.fillStyle = bg; g.fillRect(0, 0, 640, 400);
      const sx = 80, sy = 58, sw = 480, sh = 300; g.fillStyle = '#121216'; g.fillRect(sx, sy, sw, sh); g.strokeStyle = acc; g.lineWidth = 2; g.strokeRect(sx, sy, sw, sh);
      const hb = g.createLinearGradient(0, sy, 0, sy + 40); hb.addColorStop(0, '#3a3a46'); hb.addColorStop(1, '#1a1a22'); g.fillStyle = hb; g.fillRect(sx, sy, sw, 40);
      g.fillStyle = acc; g.font = 'bold 18px Arial Black,Arial,sans-serif'; g.fillText(d.title.toUpperCase(), sx + 14, sy + 27);
      for (let k = 0; k < 5; k++) { g.fillStyle = k === 0 ? acc : '#555560'; g.fillRect(sx + sw - 260 + k * 50, sy + 16, 40, 10) }
      for (let k = 0; k < 6; k++) { const x = sx + 60 + r() * 360, y = sy + 80 + r() * 170, rad = 14 + r() * 50; const o = g.createRadialGradient(x - rad * .3, y - rad * .3, 2, x, y, rad); o.addColorStop(0, '#ffffff'); o.addColorStop(.35, acc); o.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = o; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill() }
      g.fillStyle = '#e8e8ee'; g.font = 'bold 30px Arial Black,Arial,sans-serif'; g.fillText(words.slice(-1)[0], sx + 24, sy + sh - 56);
      g.fillStyle = '#2a2a32'; g.fillRect(sx + 24, sy + sh - 36, 200, 8); g.fillStyle = acc; g.fillRect(sx + 24, sy + sh - 36, 60 + r() * 140, 8);
      g.fillStyle = '#777'; g.font = '10px Verdana,sans-serif'; g.fillText('LOADING… · SKIP INTRO · © ' + d.year + ' ' + d.agency.toUpperCase(), sx + 24, sy + sh - 14);
    } else {
      const light = r() < .4, bgc = light ? '#f2efe8' : '#0d0c14', fg = light ? '#111' : '#f2f0ff'; g.fillStyle = bgc; g.fillRect(0, 0, 640, 400);
      const kind = r() * 3 | 0;
      if (kind === 0) { const x = 420, y = 220, rad = 120; const o = g.createRadialGradient(x - 40, y - 50, 10, x, y, rad); o.addColorStop(0, '#fff'); o.addColorStop(.3, acc); o.addColorStop(1, light ? '#2a2440' : '#000'); g.fillStyle = o; g.beginPath(); g.arc(x, y, rad, 0, 7); g.fill() }
      else if (kind === 1) { g.fillStyle = acc; for (let k = 0; k < 7; k++) { g.globalAlpha = .25 + .1 * k; g.beginPath(); g.ellipse(435, 220, 150 - k * 16, 60 + k * 9, k * .35, 0, 7); g.fill() } g.globalAlpha = 1 }
      else { for (let k = 0; k < 4; k++) for (let j = 0; j < 3; j++) { g.fillStyle = (k + j) % 3 === 0 ? acc : (light ? '#d8d4cc' : '#1d1b2a'); g.fillRect(294 + k * 76, 104 + j * 76, 68, 68) } }
      g.fillStyle = fg; g.font = '13px "Paper Mono",monospace'; g.fillText(d.agency === 'Independent' ? d.title : d.agency, 28, 52);
      for (let k = 0; k < 3; k++) g.fillRect(520 + k * 32, 46, 22, 2);
      g.font = '54px "Paper Mono",monospace'; words.forEach((w, k) => g.fillText(w, 28, 140 + k * 62));
      g.font = '13px "Paper Mono",monospace'; g.globalAlpha = .65; g.fillText(d.category + ' — ' + d.year, 28, 364); g.globalAlpha = 1;
      g.fillStyle = acc; g.fillRect(28, 374, 90, 3);
    }
    g.fillStyle = '#1c1b26'; g.fillRect(0, 0, 640, 26); ['#ff5f57', '#febc2e', '#28c840'].forEach((cl, k) => { g.fillStyle = cl; g.beginPath(); g.arc(16 + k * 16, 13, 4.5, 0, 7); g.fill() });
    g.fillStyle = '#2c2b3a'; g.fillRect(200, 6, 240, 14); g.fillStyle = '#a9a6c8'; g.font = '10px "Paper Mono",monospace'; g.textAlign = 'center'; g.fillText(sl, 320, 17); g.textAlign = 'left';
    g.strokeStyle = acc; g.lineWidth = 3; g.strokeRect(1.5, 1.5, 637, 397); g.restore();
  });
  tex.anisotropy = 8; tex.avgCol = avgColor(tex.image); return tex;
}

/* the winner you're beside: the tooltip opens up into its full record (screenshot, award, points, agency…) */
function drawCardImg(i) { const c = tip.querySelector('canvas.tshot'), t = shot(D[i]); if (c && t && t.image) c.getContext('2d').drawImage(t.image, 0, 0, c.width, c.height) }
function showCard(i, force) { if (i === cardI && !force) return; cardI = i; Net.self.near = i >= 0 ? D[i].date : null; if (force) tipFor = '' }
const AWARD_LONG = { SOTD: 'FWA of the Day', SOTM: 'FWA of the Month', FOTY: 'FWA of the Year' };
const tipMore = i => {
  const d = D[i], row = (k, v, cls = '') => `<div class="${cls}"><dt>${k}</dt><dd>${v}</dd></div>`;
  return `<div class="tx"><div class="ti"><canvas class="tshot" width="480" height="300"></canvas><dl>` + row('Award', AWARD_LONG[d.award]) + row('Points', Math.round(d.score * 10)) + row('Agency', esc(d.agency)) + row('Category', esc(d.category)) +
    row('Built with', esc(d.tech.join(', '))) + row('Country', esc(d.country)) + row('Star', esc(KINDS[KIND[i]][0]), 'w') + (chainPos.has(i) ? (p => row('Path', `${p.n + 1} of ${p.len}`))(chainPos.get(i)) : '') +
    `</dl>${d.url ? `<a href="${esc(d.url)}" target="_blank" rel="noopener">Launch project →</a>` : ''}</div></div>`;
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const tipBox = (top, title) => `<span class="td">${esc(top)}</span><span class="tt">${esc(title)}</span>`;
const tipHTML = i => { const d = D[i], t = new Date(d.date + 'T00:00:00Z'); return tipBox(`${t.getUTCDate()} ${MONTHS[t.getUTCMonth()]} ${t.getUTCFullYear()}`, d.title) };

/* compass: heading ring around the reticle, with core and home markers */
const CMP = [{ pos: GC, label: 'core', c: '#ffc79a' }, { pos: new V3(0, 0, 0), label: 'home', c: '#ece9ff' }];
{
  const NS = 'http://www.w3.org/2000/svg', h = $('hdg'), cm = $('cmp');
  for (let a = 0; a < 360; a += 5) { const l = document.createElementNS(NS, 'line'), r = a / 180 * Math.PI, maj = a % 45 === 0, r0 = 24, r1 = maj ? 31 : 27; l.setAttribute('x1', Math.sin(r) * r0); l.setAttribute('y1', -Math.cos(r) * r0); l.setAttribute('x2', Math.sin(r) * r1); l.setAttribute('y2', -Math.cos(r) * r1); if (maj) l.setAttribute('class', 'maj'); h.appendChild(l) }
  CMP.forEach(m => { const g = document.createElementNS(NS, 'g'); g.setAttribute('class', 'mk'); g.style.setProperty('--c', m.c); const p = document.createElementNS(NS, 'path'); p.setAttribute('d', 'M0,-4.5 L3.6,3 L-3.6,3Z'); const t = document.createElementNS(NS, 'text'); t.textContent = m.label; g.append(p, t); cm.appendChild(g); m.g = g; m.p = p; m.t = t })
}
const _cv = new V3(), _e = new THREE.Euler();
function updateCompass() {
  if (LOOK.heading) { _e.setFromQuaternion(rig.q, 'YXZ'); $('hdg').setAttribute('transform', `rotate(${(-_e.y * 180 / Math.PI).toFixed(1)})`) }
  if (!LOOK.compass) return;
  for (const m of CMP) {
    _cv.copy(m.pos).applyMatrix4(camera.matrixWorldInverse); const a = Math.atan2(-_cv.y, _cv.x), R0 = 64, x = Math.cos(a) * R0, y = Math.sin(a) * R0;
    m.g.setAttribute('transform', `translate(${x.toFixed(1)},${y.toFixed(1)})`); m.p.setAttribute('transform', `rotate(${(a * 180 / Math.PI + 90).toFixed(1)})`); m.t.setAttribute('y', y > 0 ? 14 : -8); m.g.style.opacity = _cv.z < 0 ? .95 : .4
  }
}
/* regions: where you are, announced as you cross into it */
let region = null, arriveTimer = 0;
const _rl = new V3();
function regionOf(p) {
  if (p.distanceTo(GC) < Math.max(GAL_R0 * 1.1, BH.disk1 * 1.4)) return 'bh';
  if (ANDRO) for (let k = 0; k < SATS.length; k++) if (p.distanceTo(SATS[k].pos) < SATS[k].r * 2.5) return 'sat' + k;
  toLocal(p, _rl); const rr = Math.hypot(_rl.x, _rl.z);
  if (Math.abs(_rl.y) < 80000 && rr < GAL_R0 + GAL_LEN * 1.03) return eraOfU((rr - GAL_R0) / GAL_LEN);
  return 'void'
}
function regionName(r) {
  if (r === 'out') return 'Outpost'; if (typeof r === 'string' && r.startsWith('sat')) return SATS[+r.slice(3)].name; if (r === 'bh') return 'Black hole'; if (typeof r === 'number') return ERAS[r].name; return 'Deep space'
}
function arrive(r) {
  const el = $('arrive'); if (r === 'void') { el.classList.remove('show'); return }
  const set = (e, t, s) => { $('arE').textContent = e; $('arT').textContent = t; $('arS').textContent = s };
  if (r === 'out') set('Home', 'The Outpost', `${N.toLocaleString('en')} winners spiralling in toward the present`);
  else if (r === 'bh') set('Event horizon', 'The present', 'The newest winners circle the black hole · time runs slow here');
  else if (typeof r === 'string' && r.startsWith('sat')) { const sa = SATS[+r.slice(3)]; set('Satellite galaxy', sa.name, sa.name === 'M32' ? 'A compact elliptical hugging the disk' : 'A big, faint elliptical drifting nearby') }
  else { const e = ERAS[r]; set('Entering', e.name, (matchCount < N ? `${galCount[r].toLocaleString('en')} of ` : '') + `${galTotal[r].toLocaleString('en')} winners · ${e.y0}–${r === NERA - 1 ? 'today' : e.y0 + GAL_YRS - 1}`) }
  el.classList.add('show'); clearTimeout(arriveTimer); arriveTimer = setTimeout(() => el.classList.remove('show'), 3800);
}

/* instruments: built once, then only the values change */
const gauge = (() => {
  const el = $('gauge'), row = (k, inner, cls) => `<div class="row ${cls}"><span>${k}</span>${inner}</div>`;
  el.innerHTML = row('Speed', '<b data-v="speed"></b>', 'f') + row('Cruise', '<i class="bar"><i data-v="cruise"></i></i>', 'f') + row('Sector', '<b data-v="sector"></b>', 'f') + row('Time', '<b data-v="time"></b>', 'f t') + `<div class="row f"><span data-v="lockK"></span><b data-v="lockV"></b></div>` +
    row('Eras', `<b>${NERA}</b>`, 'm') + row('Sites', '<b data-v="sites"></b>', 'm') + row('Constellations', '<b data-v="cons"></b>', 'm');
  const q = k => el.querySelector(`[data-v="${k}"]`), T = {}; ['speed', 'sector', 'time', 'lockK', 'lockV', 'sites', 'cons'].forEach(k => T[k] = liveText(q(k)));
  const bar = q('cruise'), timeRow = el.querySelector('.row.t'); let bw = '', tShow = null, mode = '';
  const setMode = m => { if (mode === m) return; mode = m; el.querySelectorAll('.row').forEach(r => r.hidden = !r.classList.contains(m === 'fly' ? 'f' : 'm')); tShow = null };
  return {
    fly() {
      setMode('fly');
      T.speed(beta > .01 ? beta.toFixed(2) + ' c' : fmtSpd(player.vel.length()));
      const w = (player.cruise * 100).toFixed(0) + '%'; if (w !== bw) { bw = w; bar.style.width = w }
      T.sector(regionName(region) + (nearI >= 0 && nearCD < 60000 ? ' · ' + D[nearI].year : ''));
      const ts = tdil < .97; if (ts !== tShow) { tShow = ts; timeRow.hidden = !ts } if (ts) T.time('×' + tdil.toFixed(2));
      T.lockK(lockI >= 0 ? 'Locked' : auto ? 'Autopilot' : 'Pilots'); T.lockV(lockI >= 0 ? D[lockI].title : auto ? 'engaged' : String(1 + Net.peers.size));
    },
    map() { setMode('map'); T.sites(matchCount.toLocaleString('en')); T.cons(String(chain.length)) },
  };
})();

/* your own archive: a JSON/CSV export and screenshots, kept in this browser */
$('srcNote').textContent = USING_IMPORT ? `Your imported archive: ${N.toLocaleString('en')} winners, ${SHOT_KEYS.size.toLocaleString('en')} screenshots.` : 'Sample data shaped like FWA\'s archive; titles and screenshots are placeholders.';
$('dClear').hidden = !USING_IMPORT && !SHOT_KEYS.size;
const dStat = (msg, err) => { const e = $('dStat'); e.textContent = msg; e.classList.toggle('err', !!err) };
async function importData(file) {
  dStat('Reading ' + file.name + '…');
  let rows; try { const txt = await file.text(); rows = /\.csv$/i.test(file.name) || /^[^\[{]/.test(txt.trim()) ? parseCSV(txt) : (j => Array.isArray(j) ? j : (j.items || j.data || j.winners || j.sites || []))(JSON.parse(txt)) }
  catch (e) { return dStat('Couldn\'t read ' + file.name + '. Use a JSON array of winners or a CSV with a header row.', true) }
  const recs = normalizeRows(rows);
  if (!recs.length) return dStat('No rows with a usable date in ' + file.name + '. Each winner needs at least a date column.', true);
  if (!IDB.db || !(await IDB.put('kv', 'records', recs))) return dStat('This browser blocked local storage, so the archive can\'t be kept. Try a normal (non-private) window.', true);
  dStat(`Loaded ${recs.length.toLocaleString('en')} winners. Rebuilding the universe…`); setTimeout(() => location.reload(), 600);
}
async function importShots(files) {
  const imgs = [...files].filter(f => /^image\//.test(f.type) || /\.(png|jpe?g|webp|gif|avif)$/i.test(f.name));
  if (!imgs.length) return dStat('No images found in that selection.', true);
  if (!IDB.db) return dStat('This browser blocked local storage, so screenshots can\'t be kept.', true);
  let ok = 0; for (const f of imgs) { dStat(`Storing screenshots ${ok + 1} of ${imgs.length}…`); if (await IDB.put('shots', stem(f.name), f)) { ok++; SHOT_KEYS.add(stem(f.name)) } }
  resolveShots(); texCache.forEach(t => t.dispose()); texCache.clear(); SHOT.userData.i = -1;
  dStat(`Stored ${ok} screenshots. ${D.filter(d => d.shotKey).length.toLocaleString('en')} winners now have one.`, ok === 0); $('dClear').hidden = false;
}
$('fData').onchange = e => { const f = e.target.files[0]; if (f) importData(f); e.target.value = '' };
$('fShots').onchange = e => { if (e.target.files.length) importShots(e.target.files); e.target.value = '' };
$('dClear').onclick = async () => { await IDB.clear('kv'); await IDB.clear('shots'); dStat('Cleared. Back to sample data…'); setTimeout(() => location.reload(), 500) };
{
  let dragN = 0;
  addEventListener('dragenter', e => { if (e.dataTransfer && [...e.dataTransfer.types].includes('Files')) { dragN++; document.body.classList.add('drop') } });
  addEventListener('dragleave', () => { if (--dragN <= 0) { dragN = 0; document.body.classList.remove('drop') } });
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => { e.preventDefault(); dragN = 0; document.body.classList.remove('drop'); const fs = [...(e.dataTransfer?.files || [])], data = fs.find(f => /\.(json|csv)$/i.test(f.name)), shots = fs.filter(f => f !== data); if (shots.length) importShots(shots).then(() => data && importData(data)); else if (data) importData(data); if (!isOpen('panel')) $('fbtn').click() });
}
