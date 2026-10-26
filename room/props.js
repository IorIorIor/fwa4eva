/* ───────────────────────── the room's props, each on its own ─────────────────────────
   Everything that will stand on the desk or hang on the wall, built from plain three.js parts in metres at real size, so the
   same code drops into the room (01-zroom) later. makeProps(THREE, ctx) → [{ id, name, note, make() → Object3D }]; an object
   may carry userData.update(t) for anything that moves (the modem's lights). ctx: { RoundedBoxGeometry, img: { kesey, webdesign,
   motd, sotd, persepolis } (loaded <img>s), logo (the FWA mark's SVG path, viewBox 509 × 149), col(hex) → THREE.Color }. */
export function makeProps(THREE, ctx) {
  const { RoundedBoxGeometry, img, logo } = ctx, col = ctx.col || (h => new THREE.Color(h));
  const rnd = (() => { let a = 2000; return () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } })();
  const std = (hex, rough = .6, metal = 0, o = {}) => new THREE.MeshStandardMaterial({ color: col(hex), roughness: rough, metalness: metal, ...o });
  const phys = (hex, o = {}) => new THREE.MeshPhysicalMaterial({ color: col(hex), roughness: .4, ...o });
  const rbox = (w, h, d, r = .002, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-5, h / 2 - 1e-5, d / 2 - 1e-5));
  const mesh = (g, m, x = 0, y = 0, z = 0, parent) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; if (parent) parent.add(o); return o };
  const tex = (w, h, draw, o = {}) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'); draw(g, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = o.data ? THREE.NoColorSpace : THREE.SRGBColorSpace; t.anisotropy = 8; if (o.rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(o.rep[0], o.rep[1]) } return t };
  const imgTex = (im, crop) => tex(crop ? crop[2] : im.naturalWidth, crop ? crop[3] : im.naturalHeight, (g, w, h) => crop ? g.drawImage(im, crop[0], crop[1], crop[2], crop[3], 0, 0, w, h) : g.drawImage(im, 0, 0, w, h));
  const logoPath = logo ? new Path2D(logo) : null;
  const drawLogo = (g, x, y, w, color) => { if (!logoPath) return; g.save(); g.translate(x, y); g.scale(w / 509, w / 509); g.fillStyle = color; g.fill(logoPath, 'evenodd'); g.restore() };
  const mono = '"IBM Plex Mono", "Courier New", monospace', sans = '"Helvetica Neue", Arial, sans-serif';
  // a block of pages seen from its edges: fine lines along the paper
  const pagesTex = (n = 400) => tex(512, 64, (g, w, h) => { g.fillStyle = '#f1ebdc'; g.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const y = rnd() * h; g.fillStyle = `rgba(120,105,80,${.05 + rnd() * .12})`; g.fillRect(0, y, w, .6) } });
  const box6 = (g, mats) => new THREE.Mesh(g, mats);   // (box faces: +x −x +y −y +z −z)
  const at = (o, x, y, z, parent) => { o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; parent.add(o); return o };
  const ext = (s, depth, bev = 0, seg = 3) => new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bev > 0, bevelThickness: bev, bevelSize: bev, bevelSegments: seg, curveSegments: 24 });
  const rrect = (w, h, r, x = 0, y = 0) => { const s = new THREE.Shape(), l = x - w / 2, rt = x + w / 2, b = y - h / 2, t = y + h / 2; s.moveTo(l + r, b); s.lineTo(rt - r, b); s.quadraticCurveTo(rt, b, rt, b + r); s.lineTo(rt, t - r); s.quadraticCurveTo(rt, t, rt - r, t); s.lineTo(l + r, t); s.quadraticCurveTo(l, t, l, t - r); s.lineTo(l, b + r); s.quadraticCurveTo(l, b, l + r, b); return s };
  const ellipse = (rx, ry = rx) => { const s = new THREE.Shape(); s.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0); return s };
  const poly = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s };
  // UVs laid flat over a shape's outline (x, y → 0..1 across its bounds); planar() also paints a canvas for it, the drawing done in the
  // shape's own units through X(x), Y(y) (s: canvas pixels per unit)
  const flatUV = geo => { geo.computeBoundingBox(); const b = geo.boundingBox, p = geo.attributes.position, uv = geo.attributes.uv, w = b.max.x - b.min.x, h = b.max.y - b.min.y; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) - b.min.x) / w, (p.getY(i) - b.min.y) / h); return b };
  // smooth shading across an extrusion's bevels (it comes out faceted): normals averaged over every corner sharing a point
  const smooth = geo => { geo.computeVertexNormals(); const p = geo.attributes.position, n = geo.attributes.normal, acc = new Map(), key = i => `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    for (let i = 0; i < p.count; i++) { const k = key(i), a = acc.get(k) || [0, 0, 0]; a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i); acc.set(k, a) }
    for (let i = 0; i < p.count; i++) { const [x, y, z] = acc.get(key(i)), l = Math.hypot(x, y, z) || 1; n.setXYZ(i, x / l, y / l, z / l) } return geo };
  const planar = (geo, ppu, draw, o) => { const b = flatUV(geo), w = b.max.x - b.min.x, h = b.max.y - b.min.y; return tex(Math.ceil(w * ppu), Math.ceil(h * ppu), (c, cw, ch) => draw(c, x => (x - b.min.x) * cw / w, y => (b.max.y - y) * ch / h, cw / w, cw, ch), o) };

  // ── 1. The Kesey Signal (paperback) ──
  function kesey() {
    const g = new THREE.Group(), W = .152, H = .2266, T = .021, blue = '#2b3f97', cov = std(blue, .55), pt = pagesTex();
    const pagesSide = new THREE.MeshStandardMaterial({ map: pt, roughness: .9 }), pagesTop = new THREE.MeshStandardMaterial({ map: pt.clone(), roughness: .9 }); pagesTop.map.rotation = Math.PI / 2; pagesTop.map.center.set(.5, .5); pagesTop.map.needsUpdate = true;
    const p = box6(new THREE.BoxGeometry(W - .002, H - .003, T - .0016), [pagesTop, cov, pagesSide, pagesSide, cov, cov]); p.position.x = .001; p.castShadow = p.receiveShadow = true; g.add(p);
    const front = new THREE.MeshStandardMaterial({ map: imgTex(img.kesey), roughness: .45 });
    at(box6(new THREE.BoxGeometry(W, H, .0008), [cov, cov, cov, cov, front, cov]), 0, 0, T / 2 - .0004, g);
    const back = new THREE.MeshStandardMaterial({ map: tex(304, 453, (c, w, h) => { c.fillStyle = blue; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `16px ${mono}`; ['"Some truths are', 'embedded in code."', '', 'A thriller from the', 'founder of the FWA.'].forEach((l, i) => c.fillText(l, 34, 70 + i * 24)); c.fillStyle = '#fff'; c.fillRect(200, 370, 76, 50); c.fillStyle = '#111'; for (let x = 206; x < 270; x += 2 + (rnd() * 3 | 0)) c.fillRect(x, 376, 1 + (rnd() * 2 | 0), 34) }), roughness: .5 });
    at(box6(new THREE.BoxGeometry(W, H, .0008), [cov, cov, cov, cov, cov, back]), 0, 0, -T / 2 + .0004, g);
    const spine = new THREE.MeshStandardMaterial({ map: tex(64, 680, (c, w, h) => { c.fillStyle = blue; c.fillRect(0, 0, w, h); c.save(); c.translate(w / 2 + 8, 40); c.rotate(Math.PI / 2); c.fillStyle = '#fff'; c.font = `500 24px ${mono}`; c.fillText('THE KESEY SIGNAL', 0, 0); c.font = `20px ${mono}`; c.fillText('<Rob Ford>', 430, 0); c.restore() }), roughness: .5 });
    at(box6(new THREE.BoxGeometry(.0008, H, T), [cov, spine, cov, cov, cov, cov]), -W / 2 + .0004, 0, 0, g);
    g.position.y = H / 2; const r = new THREE.Group(); r.add(g); return r;
  }

  // ── 2. Web Design: The Evolution of the Digital World 1990–Today (TASCHEN hardcover) ──
  function webdesign() {
    const g = new THREE.Group(), W = .25, H = .323, T = .048, bt = .003, blue = '#2a63c4', board = std(blue, .5), pt = pagesTex(900);
    const pagesSide = new THREE.MeshStandardMaterial({ map: pt, roughness: .9 }), pagesTop = new THREE.MeshStandardMaterial({ map: pt.clone(), roughness: .9 }); pagesTop.map.rotation = Math.PI / 2; pagesTop.map.center.set(.5, .5); pagesTop.map.needsUpdate = true;
    const p = box6(new THREE.BoxGeometry(W - .008, H - .008, T - 2 * bt), [pagesTop, board, pagesSide, pagesSide, board, board]); p.position.x = .002; p.castShadow = p.receiveShadow = true; g.add(p);
    const im = img.webdesign, front = new THREE.MeshStandardMaterial({ map: imgTex(im, [3, 2, Math.round(im.naturalWidth * .945), Math.round(im.naturalHeight * .968)]), roughness: .35 });
    at(box6(rbox(W, H, bt, .0012, 2), [board, board, board, board, front, board]), .002, 0, T / 2 - bt / 2, g);
    at(box6(rbox(W, H, bt, .0012, 2), [board, board, board, board, board, board]), .002, 0, -T / 2 + bt / 2, g);
    // the rounded spine, its title running down it
    const sp = new THREE.MeshStandardMaterial({ map: tex(160, 1024, (c, w, h) => { c.fillStyle = blue; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(255,255,255,${.03 + rnd() * .05})`; c.fillRect(0, rnd() * h, w, 10 + rnd() * 40) } c.save(); c.translate(w / 2 + 14, 70); c.rotate(Math.PI / 2); c.fillStyle = '#eef3ff'; c.font = `500 46px ${mono}`; c.fillText('Web Design', 0, 0); c.font = `26px ${mono}`; c.fillText('Rob Ford', 360, 0); c.font = `bold 30px ${sans}`; c.fillText('TASCHEN', 780, 0); c.restore() }), roughness: .45 });
    const sg = new THREE.CylinderGeometry(T / 2, T / 2, H, 32, 1, true, Math.PI, Math.PI); const s = mesh(sg, sp, -W / 2 + .002 + .0005, 0, 0, g); s.material.side = THREE.DoubleSide; s.scale.x = .35;
    g.position.y = H / 2; const r = new THREE.Group(); r.add(g); return r;
  }

  // ── 3 & 4. The award certificates, framed: thin black frame, a white mat, glass ──
  function framed(im) {
    const g = new THREE.Group(), pw = .28, ph = pw * im.naturalHeight / im.naturalWidth, mat = .032, fw = .016, fd = .024, W = pw + 2 * mat + 2 * fw, H = ph + 2 * mat + 2 * fw;
    const frameM = std('#121214', .38, .65);
    [[0, H / 2 - fw / 2, W, fw], [0, -H / 2 + fw / 2, W, fw], [-W / 2 + fw / 2, 0, fw, H - 2 * fw], [W / 2 - fw / 2, 0, fw, H - 2 * fw]].forEach(([x, y, w, h]) => mesh(rbox(w, h, fd, .0015, 2), frameM, x, y, 0, g));
    { const s = new THREE.Shape(); s.moveTo(-W / 2 + fw, -H / 2 + fw); s.lineTo(W / 2 - fw, -H / 2 + fw); s.lineTo(W / 2 - fw, H / 2 - fw); s.lineTo(-W / 2 + fw, H / 2 - fw); s.closePath();
      const hole = new THREE.Path(); hole.moveTo(-pw / 2, -ph / 2); hole.lineTo(-pw / 2, ph / 2); hole.lineTo(pw / 2, ph / 2); hole.lineTo(pw / 2, -ph / 2); hole.closePath(); s.holes.push(hole);
      mesh(new THREE.ExtrudeGeometry(s, { depth: .002, bevelEnabled: false }), std('#f4f1ea', .95), 0, 0, fd / 2 - .009, g) }   // the mat
    mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: imgTex(im), roughness: .85, envMapIntensity: .35 }), 0, 0, fd / 2 - .0095, g);   // the print
    mesh(new THREE.BoxGeometry(W - 2 * fw, H - 2 * fw, .003), std('#3a3530', .9), 0, 0, -fd / 2 + .004, g);   // backing
    const glass = mesh(new THREE.PlaneGeometry(W - 2 * fw, H - 2 * fw), phys('#ffffff', { roughness: .03, metalness: 0, transparent: true, opacity: .045, envMapIntensity: .7, clearcoat: 1, clearcoatRoughness: .02 }), 0, 0, fd / 2 - .004, g); glass.castShadow = false;
    g.position.y = H / 2; const r = new THREE.Group(); r.add(g); return r;
  }

  // ── 5. A postcard from the Getty: Persepolis (the Apadana as it was, from "Persepolis Reimagined"), 10 × 15 cm ──
  function postcard() {
    const W = .15, H = .10, F = 1500, Fh = 1000, im = img.persepolis, cw = Math.min(im.naturalWidth, Math.round(im.naturalHeight * 1.5)), chh = Math.round(cw / 1.5);
    const front = imgTex(im, [Math.round((im.naturalWidth - cw) / 2), Math.round((im.naturalHeight - chh) / 2), cw, chh]);
    const back = tex(F, Fh, (c, w, h) => {
      c.fillStyle = '#f7f2e6'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(120,100,70,.05)'; for (let i = 0; i < 3000; i++) c.fillRect(rnd() * w, rnd() * h, 2, 2);
      c.strokeStyle = '#b9ae98'; c.lineWidth = 3; c.beginPath(); c.moveTo(w * .55, 90); c.lineTo(w * .55, h - 90); c.stroke(); for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(w * .6, h * .45 + i * 110); c.lineTo(w - 90, h * .45 + i * 110); c.stroke() }
      c.strokeStyle = '#8a7f6a'; c.lineWidth = 4; c.strokeRect(w - 290, 80, 200, 240); c.fillStyle = '#d9a35c'; c.fillRect(w - 280, 90, 180, 220); c.fillStyle = '#7a5434'; c.fillRect(w - 205, 130, 30, 150); c.fillRect(w - 225, 120, 70, 16);   // the stamp
      c.strokeStyle = 'rgba(40,40,60,.6)'; c.lineWidth = 5; c.beginPath(); c.arc(w - 330, 220, 95, 0, 7); c.stroke(); for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(w - 520, 160 + k * 30); c.bezierCurveTo(w - 470, 140 + k * 30, w - 420, 190 + k * 30, w - 380, 165 + k * 30); c.stroke() }   // the postmark
      c.strokeStyle = '#2a3a7a'; c.lineWidth = 5; c.lineCap = 'round'; for (let l = 0; l < 7; l++) { c.beginPath(); let x = 90; const y = 200 + l * 95; c.moveTo(x, y); while (x < w * .5 - 40 - (l === 6 ? 300 : 0)) { const s = 18 + rnd() * 30; c.quadraticCurveTo(x + s / 2, y - 18 - rnd() * 22, x + s, y + rnd() * 6); x += s + (rnd() < .2 ? 22 : 0); if (rnd() < .2) c.moveTo(x, y) } c.stroke() }   // a handwritten note
      c.fillStyle = '#6b6252'; c.font = `24px ${sans}`; c.fillText('The J. Paul Getty Museum · Getty Villa, Malibu', 90, h - 60);
    });
    const geo = new THREE.PlaneGeometry(W, H, 24, 2), pos = geo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i) / (W / 2); pos.setZ(i, .003 * x * x) } geo.computeVertexNormals();   // a slight bow, as card does
    const g = new THREE.Group(); const a = mesh(geo, new THREE.MeshStandardMaterial({ map: front, roughness: .5 }), 0, 0, 0, g), b = mesh(geo, new THREE.MeshStandardMaterial({ map: back, roughness: .8, side: THREE.BackSide }), 0, 0, -.0003, g); a.receiveShadow = b.receiveShadow = false;   // (paper this thin would only shadow itself)
    g.rotation.x = -Math.PI / 2; g.position.y = .004; const r = new THREE.Group(); r.add(g); return r;
  }

  // ── 6. The Medal of Honor, the Army's: a gold star hanging one point down, each point ending in a trefoil with a green oak leaf on it,
  //       in a green laurel wreath, Minerva in the middle ringed by UNITED STATES OF AMERICA; two rings hang it from the bar that says
  //       VALOR, an eagle on top, and that from the light blue ribbon with its white stars (built in millimetres) ──
  function medal() {
    const md = new THREE.Group(), gold = std('#e2b24c', .28, 1), enamel = phys('#0c4a29', { roughness: .2, clearcoat: 1, clearcoatRoughness: .06 }), HI = '#f6d681', LO = '#a8792b', INK = '#6e4c17';
    const relief = (t, b = 1.6) => new THREE.MeshStandardMaterial({ map: t, bumpMap: t, bumpScale: b, roughness: .3, metalness: 1 });   // (bright = raised)
    const field = (c, cw, ch, f = LO) => { c.fillStyle = f; c.fillRect(0, 0, cw, ch) };
    const trace = (c, X, Y, pts, close = true) => { c.beginPath(); pts.forEach(([x, y], i) => i ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y))); if (close) c.closePath() };
    // the star: five rays from inner corners at 12.3 out to 21.4, where the trefoils sit
    const Rin = 12.3, Ra = 21.4, hw = 1.8, ang = k => -Math.PI / 2 + k * Math.PI * 2 / 5, dir = a => [Math.cos(a), Math.sin(a)], sp = [];
    for (let k = 0; k < 5; k++) { const [ux, uy] = dir(ang(k)), [ix, iy] = dir(ang(k) - Math.PI / 5); sp.push([ix * Rin, iy * Rin], [ux * Ra + uy * hw, uy * Ra - ux * hw], [ux * Ra - uy * hw, uy * Ra + ux * hw]) }
    const sg = ext(poly(sp), 1.1, .45, 3), sT = planar(sg, 24, (c, X, Y, s, cw, ch) => { field(c, cw, ch, '#d4a64a'); c.strokeStyle = HI; c.lineWidth = s * .8; c.lineJoin = 'round'; trace(c, X, Y, sp); c.stroke();
      c.strokeStyle = '#b8892f'; c.lineWidth = s * .25; for (let k = 0; k < 5; k++) { const [ux, uy] = dir(ang(k)); c.beginPath(); c.moveTo(X(ux * 10), Y(uy * 10)); c.lineTo(X(ux * Ra), Y(uy * Ra)); c.stroke() } });   // a raised edge and a ridge down each ray
    mesh(sg, relief(sT, 1.2), 0, 0, 1, md);
    const lobeL = ext(ellipse(2.05), 1.1, .45, 3), lobeS = ext(ellipse(1.7), 1.1, .45, 3);
    for (let k = 0; k < 5; k++) { const [ux, uy] = dir(ang(k)); mesh(lobeL, gold, ux * (Ra + 1.5), uy * (Ra + 1.5), 1, md); for (const s of [-1, 1]) mesh(lobeS, gold, ux * (Ra - .4) - s * uy * 2.3, uy * (Ra - .4) + s * ux * 2.3, 1, md) }   // the trefoils
    { const n = 28, L = 7, up = [];   // a lobed oak leaf in green enamel on each ray
      for (let i = 0; i <= n; i++) { const t = i / n; up.push([t * L, 1.45 * Math.sin(Math.PI * Math.pow(t, .8)) * (1 + .3 * Math.cos(t * Math.PI * 7))]) }
      const og = new THREE.ShapeGeometry(poly([...up, ...up.slice(1, -1).reverse().map(([x, y]) => [x, -y])]));
      for (let k = 0; k < 5; k++) { const a = ang(k), [ux, uy] = dir(a), o = mesh(og, enamel, ux * 13.3, uy * 13.3, 2.6, md); o.rotation.z = a; o.castShadow = false } }
    // the laurel wreath behind it: a gold stem, the leaves in pairs climbing both sides from the bottom, green in gold rims
    const Rw = 20.2; mesh(new THREE.TorusGeometry(Rw, .55, 8, 128), gold, 0, 0, .5, md);
    { const leaf = new THREE.Shape(); leaf.moveTo(0, 0); leaf.quadraticCurveTo(2.3, 1.4, 4.8, 0); leaf.quadraticCurveTo(2.3, -1.4, 0, 0);
      const lg = ext(leaf, .3, .25, 2), lgIn = new THREE.ShapeGeometry(leaf, 10), tilt = .5;
      for (const side of [-1, 1]) for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + side * (.16 + i * .253), gx = -Math.sin(a) * side, gy = Math.cos(a) * side, ga = Math.atan2(gy, gx), nx = Math.cos(a), ny = Math.sin(a);
        for (const io of [1, -1]) { const lf = new THREE.Group(); lf.position.set(nx * (Rw + io * .35), ny * (Rw + io * .35), .4); lf.rotation.z = ga - io * side * tilt; md.add(lf);
          mesh(lg, gold, 0, 0, 0, lf); const e = mesh(lgIn, enamel, .43, 0, .58, lf); e.scale.setScalar(.82); e.castShadow = false } } }
    // Minerva, in her crested helmet, facing right, UNITED STATES OF AMERICA round her and a little shield below
    const mg = ext(ellipse(10.6), .9, .4, 3), mT = planar(mg, 48, (c, X, Y, s, cw, ch) => { field(c, cw, ch);
      c.fillStyle = HI; trace(c, X, Y, [[-3.4, -7.2], [2.2, -7.2], [1.6, -5.2], [1.5, -4.1], [2.6, -3.6], [3, -3], [2.9, -2.5], [3.2, -2.2], [2.95, -1.9], [3.25, -1.6], [3.3, -1.2], [3.9, -1.05], [3.15, .55], [3, .9], [4.1, 1.3], [4, 1.9], [2.6, 2.3], [2.4, 3.6], [1.4, 4.6], [2, 5.6], [1, 6.6], [-1.2, 7], [-3.4, 6.2], [-5.2, 4.4], [-6.4, 2], [-5.6, 1.8], [-4.6, 3.2], [-4.4, 2.2], [-4.6, .8], [-5, -.2], [-4.6, -1.6], [-5, -3], [-4, -3.6], [-3.4, -4.2], [-3, -5.2]]); c.fill();
      c.strokeStyle = INK; c.lineWidth = s * .22; c.lineCap = c.lineJoin = 'round';
      trace(c, X, Y, [[2.6, 2.3], [0, 1.7], [-2.4, 1.2], [-4.5, 1]], false); c.stroke();   // the helmet's rim
      trace(c, X, Y, [[1.4, 4.6], [-.8, 5.4], [-3, 4.9], [-4.6, 3.2]], false); c.stroke();   // under the crest
      for (let k = 0; k < 5; k++) { trace(c, X, Y, [[1 - k * 1.3, 6.4 - k * .25], [.2 - k * 1.25, 5.3 - k * .3]], false); c.stroke() }   // the plume's strands
      trace(c, X, Y, [[1.9, .25], [2.55, .45], [2.3, -.05]], false); c.stroke();   // an eye
      for (let k = 0; k < 4; k++) { trace(c, X, Y, [[-2.2 - k * .55, .6], [-2.6 - k * .6, -1.6], [-2.4 - k * .55, -3.4]], false); c.stroke() }   // her hair
      trace(c, X, Y, [[1.2, -1.6], [.4, -2.6]], false); c.stroke();
      c.fillStyle = HI; trace(c, X, Y, [[-1.1, -7.7], [1.1, -7.7], [1.1, -8.7], [0, -9.7], [-1.1, -8.7]]); c.fill(); c.strokeStyle = INK; c.lineWidth = s * .15; for (const x of [-.55, 0, .55]) { c.beginPath(); c.moveTo(X(x), Y(-8.1)); c.lineTo(X(x), Y(-9.2)); c.stroke() }
      c.fillStyle = HI; c.font = `bold ${1.55 * s}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; const words = 'UNITED STATES OF AMERICA', a0 = 208 * Math.PI / 180, a1 = -28 * Math.PI / 180;
      [...words].forEach((chr, i) => { const t = a0 + (a1 - a0) * i / (words.length - 1); c.save(); c.translate(X(Math.cos(t) * 8.55), Y(Math.sin(t) * 8.55)); c.rotate(Math.PI / 2 - t); c.fillText(chr, 0, 0); c.restore() });
      c.strokeStyle = HI; c.lineWidth = s * .35; c.beginPath(); c.arc(X(0), Y(0), s * 9.9, 0, 7); c.stroke() });
    mesh(mg, relief(mT, 2.2), 0, 0, 2.3, md); mesh(new THREE.TorusGeometry(10.6, .5, 10, 96), gold, 0, 0, 3.6, md);
    // the bar, VALOR on it between raised borders, with the two rings down to the star's upper points
    const bw = 32, bh = 6.2, by = 24.7, bg = ext(rrect(bw, bh, .6), .8, .35, 2), bT = planar(bg, 32, (c, X, Y, s, cw, ch) => { field(c, cw, ch); c.strokeStyle = HI; c.lineWidth = s * .6; c.strokeRect(X(-bw / 2 + .5), Y(bh / 2 - .5), (bw - 1) * s, (bh - 1) * s);
      c.fillStyle = HI; c.font = `bold ${4.3 * s}px Georgia, "Times New Roman", serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; try { c.letterSpacing = `${1.4 * s}px` } catch (e) { } c.fillText('VALOR', X(.7), Y(-.15)) });
    mesh(bg, relief(bT, 2), 0, by, 1.2, md);
    for (const sd of [-1, 1]) { mesh(ext(ellipse(1.3), .7, .3, 2), gold, sd * 12.8, by - bh / 2 - .2, 1.3, md); const rg = mesh(new THREE.TorusGeometry(1.9, .42, 10, 32), gold, sd * 13.2, 20.3, 2.1, md); rg.rotation.set(0, 1.15, sd * .35) }
    // the eagle, wings raised, head turned to its right, on crossed arrows
    const eg = [[-3.2, 0], [-4, 3], [-8, 3.5], [-8, 5], [-11.5, 6], [-11, 7.5], [-14, 9], [-13, 10.5], [-16, 12], [-15, 13.5], [-17.5, 15.5], [-16.5, 18.2], [-11, 16.2], [-6.5, 13.2], [-3, 10.5], [-2.8, 11.6], [-4.8, 12.3], [-3.2, 13.2], [-1.6, 14.4], [.4, 14.2], [1.5, 12.6], [2.4, 10.6], [6.5, 13.2], [11, 16.2], [16.5, 18.2], [17.5, 15.5], [15, 13.5], [16, 12], [13, 10.5], [14, 9], [11, 7.5], [11.5, 6], [8, 5], [8, 3.5], [4, 3], [3.2, 0]];
    const egG = ext(poly(eg), 1.3, .5, 3), eT = planar(egG, 28, (c, X, Y, s, cw, ch) => { field(c, cw, ch, '#ecc263'); c.strokeStyle = INK; c.lineWidth = s * .28; c.lineCap = 'round';
      for (const sd of [-1, 1]) { for (const [x, y] of [[8, 4.2], [11.2, 6.8], [13.5, 9.8], [15.5, 12.8], [17, 16.5], [13.5, 16.4], [9.5, 14.4]]) { c.beginPath(); c.moveTo(X(sd * 4), Y(9.4)); c.lineTo(X(sd * x), Y(y)); c.stroke() } }   // the long feathers
      for (let k = 0; k < 4; k++) { c.beginPath(); c.moveTo(X(-2.3), Y(8.6 - k * 2)); c.lineTo(X(0), Y(7.6 - k * 2)); c.lineTo(X(2.3), Y(8.6 - k * 2)); c.stroke() }   // breast feathers
      c.beginPath(); c.moveTo(X(-4.6), Y(12.4)); c.lineTo(X(-3), Y(12.2)); c.stroke(); c.fillStyle = INK; c.beginPath(); c.arc(X(-2.2), Y(12.95), s * .38, 0, 7); c.fill() });
    mesh(egG, relief(eT, 1.6), 0, by + bh / 2, 1.2, md);
    for (const sd of [-1, 1]) { const th = .28, rod = mesh(new THREE.CylinderGeometry(.5, .5, 13.4, 10), gold, sd * 8.6, by + bh / 2 + 2.4, 1.7, md); rod.rotation.z = -sd * (Math.PI / 2 - th); const tip = mesh(new THREE.ConeGeometry(1.1, 2.6, 12), gold, sd * 15.6, by + bh / 2 + 4.4, 1.7, md); tip.rotation.z = rod.rotation.z }
    // the ribbon: light blue moiré, thirteen white stars
    const ribT = tex(1024, 384, (c, w, h) => { c.fillStyle = '#3c72c6'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 170; i++) { c.strokeStyle = `rgba(255,255,255,${.02 + rnd() * .035})`; c.lineWidth = 2 + rnd() * 5; const y = rnd() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * .3, y + (rnd() - .5) * 120, w * .7, y + (rnd() - .5) * 120, w, y + (rnd() - .5) * 60); c.stroke() }
      c.fillStyle = 'rgba(0,0,20,.14)'; c.fillRect(0, 0, w, 7); c.fillRect(0, h - 7, w, 7);
      const star5 = (x, y, r) => { c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .42 : r; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) } c.closePath(); c.fill() };
      c.fillStyle = '#f7f6f1'; [[4, .25], [5, .5], [4, .75]].forEach(([n, fy]) => { for (let i = 0; i < n; i++) star5(w / 2 + (i - (n - 1) / 2) * 96, h * fy, 22) }) });
    const rgeo = new THREE.PlaneGeometry(84, 32, 48, 4), rp = rgeo.attributes.position; for (let i = 0; i < rp.count; i++) rp.setZ(i, -.9 + .5 * Math.sin(rp.getX(i) * .09)); rgeo.computeVertexNormals();
    mesh(rgeo, new THREE.MeshStandardMaterial({ map: ribT, roughness: .75, envMapIntensity: .25, side: THREE.DoubleSide }), 0, by + bh / 2 + 28, 0, md);
    md.scale.setScalar(.001); md.rotation.x = -Math.PI / 2; md.position.y = .0015; const r = new THREE.Group(); r.add(md); return r;
  }

  // ── 7. A black 1967 Ford Mustang fastback, a 1:24 toy ──
  function mustang() {
    const g = new THREE.Group(), L = .19, Wd = .074, paint = phys('#0b0b0d', { roughness: .18, metalness: .5, clearcoat: 1, clearcoatRoughness: .04 }), chrome = std('#e8e8ee', .12, 1), glass = phys('#101418', { roughness: .02, metalness: .1, transparent: true, opacity: .82, clearcoat: 1 }), rubber = std('#141414', .85);
    // the side profile below the windows (x along the car, nose at +x): long hood, wheel arches, the Kamm tail
    const wb = .114, wr = .0165, fx = L / 2 - .036, rx = fx - wb;   // wheelbase, wheel radius, front and rear axles
    const body = new THREE.Shape(); const y0 = .012, belt = .036;
    body.moveTo(-L / 2, y0 + .006); body.lineTo(rx - wr - .004, y0); body.absarc(rx, y0, wr + .004, Math.PI, 0, true); body.lineTo(fx - wr - .004, y0); body.absarc(fx, y0, wr + .004, Math.PI, 0, true); body.lineTo(L / 2 - .004, y0 + .004);
    body.quadraticCurveTo(L / 2 + .002, y0 + .012, L / 2, .028); body.lineTo(L / 2 - .006, .033); body.lineTo(L / 2 - .05, belt); body.lineTo(-L / 2 + .02, belt + .002); body.quadraticCurveTo(-L / 2, belt + .002, -L / 2, .028); body.closePath();
    const bg = new THREE.ExtrudeGeometry(body, { depth: Wd - .008, bevelEnabled: true, bevelThickness: .004, bevelSize: .003, bevelSegments: 4, curveSegments: 16 }); bg.translate(0, 0, -(Wd - .008) / 2);
    mesh(bg, paint, 0, 0, 0, g);
    // the greenhouse: the fastback roof sweeping down to the tail, glass all round with a painted roof over it
    const cab = new THREE.Shape(); cab.moveTo(.026, belt - .001); cab.quadraticCurveTo(.012, .05, -.006, .054); cab.lineTo(-.03, .054); cab.quadraticCurveTo(-.06, .05, -.084, belt + .001); cab.closePath();
    const cg = new THREE.ExtrudeGeometry(cab, { depth: Wd - .022, bevelEnabled: true, bevelThickness: .003, bevelSize: .0025, bevelSegments: 3, curveSegments: 12 }); cg.translate(0, 0, -(Wd - .022) / 2); mesh(cg, glass, 0, 0, 0, g);
    const roof = new THREE.Shape(); roof.moveTo(.004, .0525); roof.quadraticCurveTo(-.006, .0555, -.03, .0555); roof.quadraticCurveTo(-.058, .052, -.08, belt + .002); roof.lineTo(-.07, belt + .002); roof.quadraticCurveTo(-.05, .048, -.03, .0505); roof.lineTo(-.004, .0505); roof.closePath();
    const rgm = new THREE.ExtrudeGeometry(roof, { depth: Wd - .02, bevelEnabled: true, bevelThickness: .0028, bevelSize: .002, bevelSegments: 3, curveSegments: 12 }); rgm.translate(0, 0, -(Wd - .02) / 2); mesh(rgm, paint, 0, .0004, 0, g);   // (the roof and C-pillars; the windows show either side)
    // wheels: rubber with chrome five-slot wheels
    const tireG = new THREE.TorusGeometry(wr - .004, .0046, 16, 40), hubT = tex(256, 256, (c, w, h) => { c.fillStyle = '#d8d8de'; c.beginPath(); c.arc(128, 128, 126, 0, 7); c.fill(); c.fillStyle = '#2a2a2e'; for (let i = 0; i < 5; i++) { c.save(); c.translate(128, 128); c.rotate(i * Math.PI * 2 / 5); c.beginPath(); c.ellipse(0, -72, 22, 36, 0, 0, 7); c.fill(); c.restore() } c.fillStyle = '#9a9aa2'; c.beginPath(); c.arc(128, 128, 28, 0, 7); c.fill() });
    const hubM = new THREE.MeshStandardMaterial({ map: hubT, metalness: 1, roughness: .2 });
    for (const x of [fx, rx]) for (const z of [-1, 1]) { const w = new THREE.Group(); w.position.set(x, wr - .001, z * (Wd / 2 - .006)); g.add(w); mesh(tireG, rubber, 0, 0, 0, w); const hb = mesh(new THREE.CircleGeometry(wr - .0045, 32), hubM, 0, 0, z * .0035, w); if (z < 0) hb.rotation.y = Math.PI; const back = mesh(new THREE.CylinderGeometry(wr - .004, wr - .004, .006, 24), rubber, 0, 0, 0, w); back.rotation.x = Math.PI / 2 }
    // chrome bumpers, the grille with its headlights, the tail with its three-bar lights
    mesh(rbox(.006, .006, Wd - .002, .002), chrome, L / 2 + .001, .02, 0, g); mesh(rbox(.006, .006, Wd - .002, .002), chrome, -L / 2 - .001, .022, 0, g);
    mesh(new THREE.BoxGeometry(.002, .011, Wd - .02), std('#1a1a1a', .7, .2), L / 2 + .0035, .027, 0, g);
    for (const z of [-1, 1]) { const hl = mesh(new THREE.CylinderGeometry(.0042, .0042, .002, 20), chrome, L / 2 + .0045, .027, z * (Wd / 2 - .016), g); hl.rotation.z = Math.PI / 2; const ln = mesh(new THREE.CircleGeometry(.0034, 20), std('#fffbe8', .1, 0, { emissive: col('#fff6d0'), emissiveIntensity: .25 }), L / 2 + .0057, .027, z * (Wd / 2 - .016), g); ln.rotation.y = Math.PI / 2 }
    mesh(new THREE.BoxGeometry(.002, .01, Wd - .01), std('#15151a', .6), -L / 2 - .002, .03, 0, g);
    for (const z of [-1, 1]) for (let k = 0; k < 3; k++) mesh(new THREE.BoxGeometry(.0024, .007, .0034), std('#b01818', .3, 0, { emissive: col('#a00'), emissiveIntensity: .35 }), -L / 2 - .0028, .03, z * (Wd / 2 - .009 - k * .0045), g);
    mesh(new THREE.BoxGeometry(.012, .0012, .006), chrome, -.02, belt + .001, Wd / 2 - .002, g);   // a door handle
    { const scp = mesh(new THREE.BoxGeometry(.014, .006, .002), std('#050505', .5), -.045, .026, Wd / 2 + .0015, g); scp.rotation.z = .25; const s2 = scp.clone(); s2.position.z = -scp.position.z; g.add(s2) }   // the side scoops
    return g;
  }

  // ── 8. Nokia 3310 (2000), dark blue with its silver frame, traced off a photo of one: built in millimetres, P(x, y) turning the
  //       photo's pixels into them; the screen is its own 84 × 48 pixels ──
  function nokia() {
    const ph = new THREE.Group(), KY = 17.4, P = (x, y) => [(x - 527) / 16.7, (1005 - y) / KY];
    const navy = phys('#1f2640', { roughness: .55, clearcoat: .25, clearcoatRoughness: .35 }), frameM = std('#aaa693', .35, .55), keyHex = '#cfcfc9', ink = '#1d3324';
    const D = 7, BT = 6, BS = 3.5, F = D / 2 + BT;   // the body's depth, its edges rounded right round, and where the front face is
    // the body, a little wider through the middle, its edges rounded right off
    const body = new THREE.Shape(); body.moveTo(0, 53.2); body.lineTo(-11.5, 53.2); body.quadraticCurveTo(-19.4, 53.1, -19.5, 45.1); body.bezierCurveTo(-19.8, 29.4, -20.7, 0, -20.5, -19.6); body.bezierCurveTo(-20.4, -34.3, -19.8, -41.2, -19.6, -45.1); body.quadraticCurveTo(-19.2, -53.2, -11.5, -53.2);
    body.lineTo(11.5, -53.2); body.quadraticCurveTo(19.2, -53.2, 19.6, -45.1); body.bezierCurveTo(19.8, -41.2, 20.4, -34.3, 20.5, -19.6); body.bezierCurveTo(20.7, 0, 19.8, 29.4, 19.5, 45.1); body.quadraticCurveTo(19.4, 53.1, 11.5, 53.2); body.closePath();
    const bgeo = new THREE.ExtrudeGeometry(body, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: BS, bevelSegments: 10, curveSegments: 24 }); bgeo.translate(0, 0, -D / 2); mesh(smooth(bgeo), navy, 0, 0, 0, ph);
    mesh(rbox(9, 3, 5, 1.2), std('#17191f', .5), 0, 56.4, 0, ph);   // the power key, on top
    mesh(rbox(10, 1.2, 3, .4), std('#0b0c10', .6), 0, -56.6, -1.5, ph);   // the charger socket
    // the silver frame: round the top, down both sides of the screen and closing under it where the keys sit
    const fr = new THREE.Shape(); fr.moveTo(...P(527, 85)); fr.bezierCurveTo(...P(337, 84), ...P(212, 100), ...P(202, 200)); fr.bezierCurveTo(...P(192, 420), ...P(177, 800), ...P(192, 980)); fr.bezierCurveTo(...P(207, 1120), ...P(337, 1250), ...P(527, 1255));
    fr.bezierCurveTo(...P(717, 1250), ...P(847, 1120), ...P(862, 980)); fr.bezierCurveTo(...P(877, 800), ...P(862, 420), ...P(852, 200)); fr.bezierCurveTo(...P(842, 100), ...P(717, 84), ...P(527, 85));
    const hole = new THREE.Path(); hole.moveTo(...P(527, 112)); hole.bezierCurveTo(...P(367, 112), ...P(269, 118), ...P(257, 200)); hole.bezierCurveTo(...P(245, 450), ...P(222, 800), ...P(229, 935)); hole.bezierCurveTo(...P(235, 990), ...P(337, 1028), ...P(527, 1030));
    hole.bezierCurveTo(...P(717, 1028), ...P(819, 990), ...P(825, 935)); hole.bezierCurveTo(...P(832, 800), ...P(809, 450), ...P(797, 200)); hole.bezierCurveTo(...P(785, 118), ...P(687, 112), ...P(527, 112)); fr.holes.push(hole);
    mesh(ext(fr, .2, .3, 3), frameM, 0, 0, F - .1, ph);
    // the earpiece: a raised spine with five holes
    { const s = new THREE.Shape(); s.moveTo(...P(527, 95)); s.bezierCurveTo(...P(549, 135), ...P(549, 310), ...P(527, 350)); s.bezierCurveTo(...P(505, 310), ...P(505, 135), ...P(527, 95));
      mesh(ext(s, .25, .12, 2), phys('#212945', { roughness: .45, clearcoat: .3 }), 0, 0, F - .1, ph);
      const hg = new THREE.ShapeGeometry(ellipse(.55, .32), 16), hm = std('#05060a', .9); for (const y of [125, 170, 215, 263, 313]) mesh(hg, hm, ...P(527, y), F + .29, ph) }
    // the NOKIA badge
    { const t = tex(512, 96, (c, w, h) => { c.fillStyle = '#d8d8d4'; c.fillRect(0, 0, w, h); c.strokeStyle = '#111'; c.lineWidth = 9; c.strokeRect(4, 4, w - 8, h - 8); c.fillStyle = '#111'; c.font = `bold 70px ${sans}`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.translate(w / 2, h / 2 + 3); c.scale(1.85, 1); c.fillText('NOKIA', 0, 0); c.restore() });
      at(box6(new THREE.BoxGeometry(14.7, 2.8, .4), [frameM, frameM, frameM, frameM, std('#ffffff', .3, .5, { map: t }), frameM]), ...P(527, 423), F + .15, ph) }
    // the screen: 84 × 48 pixels, the clock, signal and battery, the ringing-tone face singing, Menü
    const lcd = (() => {
      const W = 84, H = 48, on = new Uint8Array(W * H), set = (x, y) => { if (x >= 0 && y >= 0 && x < W && y < H) on[y * W + x] = 1 };
      const put = (rows, x0, y0) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) if (r[i] === '#') set(x0 + i, y0 + j) });
      const line = (x0, y0, x1, y1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)); for (let i = 0; i <= n; i++) set(Math.round(x0 + (x1 - x0) * i / n), Math.round(y0 + (y1 - y0) * i / n)) };
      const font = { '1': ['..##.', '.###.', '..##.', '..##.', '..##.', '..##.', '.####'], '6': ['.###.', '##...', '##...', '####.', '##.##', '##.##', '.###.'], '5': ['#####', '##...', '####.', '...##', '...##', '##.##', '.###.'], '2': ['.###.', '##.##', '...##', '..##.', '.##..', '##...', '#####'], ':': ['..', '##', '##', '..', '##', '##', '..'],
        M: ['##...##', '###.###', '#######', '##.#.##', '##...##', '##...##', '##...##'], e: ['.....', '.....', '.###.', '##.##', '#####', '##...', '.####'], n: ['.....', '.....', '####.', '##.##', '##.##', '##.##', '##.##'], 'ü': ['##.##', '.....', '##.##', '##.##', '##.##', '##.##', '.####'] };
      const word = (s, x, y) => { for (const ch of s) { put(font[ch], x, y); x += font[ch][0].length + 1 } };
      word('16:52', 50, 1); word('Menü', 30, 40);
      for (let k = 0; k < 4; k++) for (let j = 0; j < 4; j++) for (const x of [1, 2, 81, 82]) set(x, 14 + k * 5 + j);   // signal (left) and battery (right)
      put(['#.#.#', '#.#.#', '.###.', '..#..', '..#..'], 0, 34); put(['.###.', '#####', '#...#', '#...#', '#####'], 79, 34);   // the aerial and the battery under them
      for (let a = 0; a < 360; a += 3) set(Math.round(44 + 10.5 * Math.cos(a * Math.PI / 180)), Math.round(22 + 9.5 * Math.sin(a * Math.PI / 180)));   // the face
      put(['.#', '#.', '#.'], 41, 17); put(['.#', '#.', '#.'], 47, 17); put(['..##', '.###', '####', '###.', '##..'], 38, 24);   // its eyes, its mouth open in song
      line(25, 20, 33, 23); line(24, 25, 34, 26); line(25, 30, 33, 28);   // the song blowing out
      const two = ['..#####', '..#...#', '..#...#', '..#...#', '###.###', '###.###'], one = ['..#..', '..##.', '..#.#', '..#..', '###..', '###..'];
      put(two, 10, 11); put(one, 19, 9); put(one, 10, 23); put(two, 15, 25);   // and its notes
      return tex(640, 448, (c, w, h) => {
        const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#a8c681'); gr.addColorStop(1, '#8fb067'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
        const ox = 26, oy = 32, each = f => { for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (on[y * W + x]) f(ox + x * 7, oy + y * 8) };
        c.fillStyle = 'rgba(40,60,20,.16)'; each((x, y) => c.fillRect(x + 2, y + 2, 6, 7)); c.fillStyle = '#141c0f'; each((x, y) => c.fillRect(x, y, 6, 7));   // each pixel, and its shadow on the back of the glass
        const v = c.createRadialGradient(w / 2, h / 2, h * .3, w / 2, h / 2, w * .62); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(20,40,10,.3)'); c.fillStyle = v; c.fillRect(0, 0, w, h);
      });
    })();
    { const [lx, ly] = P(527, 735); mesh(new THREE.ShapeGeometry(rrect(34.2, 24.5, 1.7, lx, ly), 8), std('#141912', .5), 0, 0, F + .02, ph);
      const lg = new THREE.ShapeGeometry(rrect(33.2, 23.5, 1.3, lx, ly), 8); flatUV(lg); mesh(lg, std('#ffffff', .45, 0, { map: lcd, emissive: col('#ffffff'), emissiveMap: lcd, emissiveIntensity: .25, envMapIntensity: .35 }), 0, 0, F + .05, ph) }
    // the navi key with its blue line, the C key and the up / down rocker either side
    { const s = new THREE.Shape(); s.moveTo(...P(372, 1048)); s.quadraticCurveTo(...P(527, 990), ...P(682, 1048)); s.quadraticCurveTo(...P(527, 1135), ...P(372, 1048));
      mesh(ext(s, .5, .45, 4), std(keyHex, .3, .45), 0, 0, F + .55, ph);
      mesh(new THREE.ShapeGeometry(rrect(8, .6, .3, ...P(527, 1047)), 6), std('#3d9ee6', .35, 0, { emissive: col('#2a8ad8'), emissiveIntensity: .3 }), 0, 0, F + 1.52, ph) }
    const soft = (w, h, r, px, py, rot, draw) => { const geo = ext(rrect(w, h, r), .6, .45, 4), t = planar(geo, 30, (c, X, Y, s, cw, ch) => { c.fillStyle = keyHex; c.fillRect(0, 0, cw, ch); c.strokeStyle = ink; c.lineWidth = s * .42; c.lineCap = 'round'; draw(c, X, Y, s) }); mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: .3, metalness: .45 }), ...P(px, py), F + .35, ph).rotation.z = rot };
    soft(8.4, 5, 1.6, 332, 1122, -.35, (c, X, Y, s) => { c.beginPath(); c.arc(X(-.6), Y(0), s * 1.1, Math.PI * .3, Math.PI * 1.7); c.stroke() });
    soft(12.8, 6, 2, 690, 1150, .31, (c, X, Y, s) => { c.beginPath(); c.moveTo(X(2.4), Y(1.8)); c.quadraticCurveTo(X(3.5), Y(1.8), X(3.6), Y(.5)); c.stroke(); c.beginPath(); c.moveTo(X(-3.6), Y(-.5)); c.quadraticCurveTo(X(-3.5), Y(-1.8), X(-2.4), Y(-1.8)); c.stroke() });
    // the twelve oval keys, fanned in a smile, each in its dark surround
    const keyGeo = ext(ellipse(4.3, 2.5), .6, .45, 4), rimGeo = new THREE.ShapeGeometry(ellipse(5, 3.15), 32), rimM = std('#0f1324', .7); flatUV(keyGeo);
    const label = (d, l) => tex(300, 186, (c, w, h) => {
      c.fillStyle = keyHex; c.fillRect(0, 0, w, h); c.fillStyle = c.strokeStyle = ink; c.lineWidth = 7; c.lineCap = c.lineJoin = 'round';
      const big = (t, x, y) => { c.font = `bold 80px ${sans}`; c.fillText(t, x, y) }, sm = (t, x, y) => { c.font = `bold 46px ${sans}`; c.fillText(t, x, y) };
      ({ '1': () => { big('1', 62, 92); c.beginPath(); c.arc(166, 118, 14, 0, 7); c.stroke(); c.beginPath(); c.arc(212, 118, 14, 0, 7); c.stroke(); c.beginPath(); c.moveTo(166, 132); c.lineTo(212, 132); c.stroke() },
        '3': () => { sm(l, 58, 132); big(d, 196, 94) }, '6': () => { sm(l, 52, 136); big(d, 200, 92) }, '9': () => { sm(l, 46, 140); big(d, 204, 92) },
        '4': () => { big(d, 62, 92); sm(l, 120, 140) }, '7': () => { big(d, 60, 92); sm(l, 104, 142) },
        '*': () => { big('*', 82, 136); c.font = `bold 56px ${sans}`; c.fillText('+', 150, 146) },
        '0': () => { big('0', 92, 124); c.beginPath(); c.moveTo(150, 104); c.lineTo(150, 124); c.lineTo(206, 124); c.lineTo(206, 104); c.stroke() },
        '#': () => { c.beginPath(); c.moveTo(82, 140); c.lineTo(82, 112); c.lineTo(104, 92); c.lineTo(126, 112); c.lineTo(126, 140); c.closePath(); c.stroke(); big('#', 168, 104) } }[d] || (() => { big(d, 86, 122); sm(l, 146, 122) }))();
    });
    const lab = [['1', ''], ['2', 'abc'], ['3', 'def'], ['4', 'ghi'], ['5', 'jkl'], ['6', 'mno'], ['7', 'pqrs'], ['8', 'tuv'], ['9', 'wxyz'], ['*', ''], ['0', ''], ['#', '']];
    [[13.4, 1307, 1335, 12], [13.1, 1420, 1460, 10], [12.9, 1555, 1590, 12], [12.2, 1690, 1720, 16]].forEach(([dx, ys, ym, tilt], row) => [-1, 0, 1].forEach(sd => {
      const [d, l] = lab[row * 3 + sd + 1], x = sd * dx, y = (1005 - (sd ? ys : ym)) / KY, rot = sd * tilt * Math.PI / 180;
      mesh(rimGeo, rimM, x, y, F + .02, ph).rotation.z = rot;
      mesh(keyGeo, new THREE.MeshStandardMaterial({ map: label(d, l), roughness: .3, metalness: .45 }), x, y, F + .35, ph).rotation.z = rot }));
    { const dg = new THREE.ShapeGeometry(ellipse(.3), 10), dm = std('#0b0d18', .8); for (const x of [-1.1, 1.1]) mesh(dg, dm, x, (1005 - 1530) / KY, F + .02, ph) }   // the microphone
    ph.scale.setScalar(.001); ph.rotation.x = -Math.PI / 2; ph.position.y = F * .001; const r = new THREE.Group(); r.add(ph); return r;
  }

  // ── 9. A 56K modem: beige, a smoked front with its little red lights blinking away ──
  function modem() {
    const g = new THREE.Group(), W = .155, D = .2, H = .034, beige = std('#d9d1bd', .55);
    mesh(rbox(W, H, D, .008, 4), beige, 0, H / 2 + .004, 0, g);
    mesh(rbox(W - .03, .004, D - .05, .002, 2), std('#cfc6b0', .6), 0, H + .005, -.01, g);   // the raised top panel
    const lab = tex(512, 64, (c, w, h) => { c.fillStyle = '#1b1715'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.75)'; c.font = `bold 15px ${sans}`; c.textAlign = 'center'; ['AA', 'CD', 'RD', 'SD', 'TR', 'CS', 'ARQ', 'OH'].forEach((t, i) => c.fillText(t, 70 + i * 52, 52)); c.textAlign = 'left'; c.font = `bold 18px ${sans}`; c.fillStyle = '#c9c0a8'; c.fillText('56K', 8, 24) });
    mesh(new THREE.PlaneGeometry(W - .02, .02), std('#1b1715', .25, .1, { map: lab }), 0, .02, D / 2 + .0004, g);   // the smoked front
    const leds = ['AA', 'CD', 'RD', 'SD', 'TR', 'CS', 'ARQ', 'OH'].map((n, i) => { const m = std('#3a0606', .3, 0, { emissive: col('#ff2a1a'), emissiveIntensity: 0 }); const l = mesh(new THREE.CylinderGeometry(.0018, .0018, .002, 16), m, -(W - .02) / 2 + (70 + i * 52) / 512 * (W - .02), .0235, D / 2 + .001, g); l.rotation.x = Math.PI / 2; return { n, m, next: 0, on: 0 } });
    { const top = tex(512, 128, (c, w, h) => { c.fillStyle = '#cfc6b0'; c.fillRect(0, 0, w, h); c.fillStyle = '#6b6352'; c.font = `bold 40px ${sans}`; c.fillText('56K FAXMODEM', 30, 60); c.font = `22px ${sans}`; c.fillText('V.90 · x2 · 56,000 bps', 32, 98) }); mesh(new THREE.PlaneGeometry(.1, .025), std('#cfc6b0', .6, 0, { map: top }), 0, H + .0072, .04, g).rotation.x = -Math.PI / 2 }
    for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) mesh(new THREE.CylinderGeometry(.006, .007, .004, 16), std('#222', .9), x * (W / 2 - .015), .002, z * (D / 2 - .02), g);
    g.userData.update = t => {   // TR, CS and OH steady, CD on, AA off, RD / SD chattering, ARQ blinking
      for (const L of leds) {
        if (L.n === 'TR' || L.n === 'CS' || L.n === 'OH' || L.n === 'CD') L.on = 1; else if (L.n === 'AA') L.on = 0;
        else if (L.n === 'ARQ') L.on = (t * 1.6 % 1) < .5 ? 1 : 0;
        else if (t > L.next) { L.on = L.on ? 0 : 1; L.next = t + (L.on ? .02 + Math.random() * .09 : .03 + Math.random() * .25) }
        L.m.emissiveIntensity = L.on ? 3.2 : 0;
      }
    };
    return g;
  }

  // ── 10. A ball webcam on a clip, over the top edge of a monitor: its origin is that edge (the top of the monitor at y 0, its front at
  //        z 0); a lip down the front, a pad on top, a leg hinged down the back ──
  function webcam() {
    const g = new THREE.Group(), R = .03, shell = phys('#e9eaee', { roughness: .32, clearcoat: .8, clearcoatRoughness: .2 }), dark = std('#18191c', .4), clipM = std('#c9cbd1', .4, .2), rub = std('#2a2a2e', .9);
    mesh(rbox(.05, .006, .046, .0025), clipM, 0, .003, -.021, g);   // the pad on top
    mesh(rbox(.05, .002, .04, .001), rub, 0, .0005, -.022, g);   // (its rubber underside)
    mesh(rbox(.05, .022, .005, .002), clipM, 0, -.008, .0025, g);   // the lip down the front
    mesh(new THREE.CylinderGeometry(.0042, .0042, .05, 16), clipM, 0, .003, -.046, g).rotation.z = Math.PI / 2;   // the hinge
    { const leg = new THREE.Group(); leg.position.set(0, .003, -.046); leg.rotation.x = .55; g.add(leg); mesh(rbox(.044, .062, .005, .002), clipM, 0, -.031, 0, leg); mesh(rbox(.044, .006, .008, .002), rub, 0, -.062, .001, leg) }   // the leg down the back, a rubber foot
    mesh(new THREE.CylinderGeometry(.007, .011, .012, 24), clipM, 0, .012, -.02, g);   // the neck
    const orb = new THREE.Group(); orb.position.set(0, .016 + R, -.02); orb.rotation.y = -.2; g.add(orb);   // (turned a little toward you)
    mesh(new THREE.SphereGeometry(R, 48, 32), shell, 0, 0, 0, orb);
    mesh(new THREE.TorusGeometry(R * .995, .0007, 8, 64), std('#b5b7be', .4, .3), 0, 0, 0, orb).rotation.y = Math.PI / 2;   // the seam
    const face = mesh(new THREE.CylinderGeometry(R * .62, R * .62, .004, 48), dark, 0, 0, R * .84, orb); face.rotation.x = Math.PI / 2;
    mesh(new THREE.TorusGeometry(.0105, .0016, 12, 48), std('#9fa3ab', .2, 1), 0, 0, R * .84 + .002, orb);
    const lens = mesh(new THREE.SphereGeometry(.0095, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), phys('#0b1626', { roughness: .02, metalness: .2, clearcoat: 1, iridescence: .6 }), 0, 0, R * .84 + .001, orb); lens.rotation.x = Math.PI / 2; lens.scale.y = .5;
    const led = mesh(new THREE.SphereGeometry(.0015, 12, 8), std('#103a8a', .3, 0, { emissive: col('#3a7dff'), emissiveIntensity: 2.5 }), .013, .012, R * .84 + .002, orb);
    g.userData.update = t => { led.material.emissiveIntensity = 1.6 + Math.sin(t * 3) * .9 };
    return g;
  }

  // ── 11. Macromedia Flash 5, in its box ──
  function flashbox() {
    const W = .19, H = .235, D = .052, frontT = tex(760, 940, (c, w, h) => {
      c.fillStyle = '#111114'; c.fillRect(0, 0, w, h); const glow = c.createRadialGradient(w * .5, h * .5, 20, w * .5, h * .5, w * .7); glow.addColorStop(0, '#e2401c'); glow.addColorStop(.35, '#a3180e'); glow.addColorStop(1, 'rgba(20,6,6,0)'); c.fillStyle = glow; c.fillRect(0, 0, w, h);
      c.strokeStyle = 'rgba(255,190,120,.25)'; c.lineWidth = 2; for (let i = 0; i < 26; i++) { c.beginPath(); c.arc(w * .5, h * .52, 60 + i * 18, -2.6 + i * .05, .2 + i * .07); c.stroke() }   // the swirl
      c.fillStyle = '#fff'; c.fillRect(0, 0, w, 110); c.fillStyle = '#111'; c.font = `bold 46px ${sans}`; c.fillText('macromedia', 44, 72); c.fillStyle = '#d6331a'; c.beginPath(); c.arc(w - 80, 55, 30, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = `bold 150px ${sans}`; c.fillText('Flash', 60, h * .5 + 40); c.font = `bold 190px ${sans}`; c.fillStyle = '#ffb347'; c.fillText('5', w - 190, h * .5 + 60);
      c.fillStyle = 'rgba(255,255,255,.85)'; c.font = `30px ${sans}`; c.fillText('Create and deliver the web', 62, h * .5 + 110);
      c.fillStyle = '#fff'; c.font = `24px ${sans}`; c.fillText('Windows® · Macintosh®', 62, h - 50); c.fillText('CD-ROM', w - 160, h - 50);
    }), sideT = tex(220, 940, (c, w, h) => { c.fillStyle = '#16161a'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.fillRect(0, 0, w, 110); c.save(); c.translate(w / 2 + 34, 170); c.rotate(Math.PI / 2); c.fillStyle = '#fff'; c.font = `bold 92px ${sans}`; c.fillText('Flash 5', 0, 0); c.fillStyle = '#ff8a3a'; c.font = `bold 34px ${sans}`; c.fillText('macromedia', 480, -10); c.restore() }), plain = std('#16161a', .45);
    const m = new THREE.MeshStandardMaterial({ map: frontT, roughness: .32 }), sm = new THREE.MeshStandardMaterial({ map: sideT, roughness: .35 });
    const b = box6(rbox(W, H, D, .0015, 2), [sm, sm, plain, plain, m, plain]); b.castShadow = b.receiveShadow = true; b.position.y = H / 2;
    const g = new THREE.Group(); g.add(b); return g;
  }

  // ── 12. A Post-it, "SOTY" in marker ──
  function postit() {
    const S = .076, t = tex(512, 512, (c, w, h) => {
      c.fillStyle = '#fbe96a'; c.fillRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(.18, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(120,90,0,.10)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
      c.strokeStyle = '#151515'; c.lineCap = c.lineJoin = 'round';
      const pen = (pts, wd = 15) => { c.lineWidth = wd; c.beginPath(); pts.forEach(([x, y], i) => { const jx = x + (rnd() - .5) * 3, jy = y + (rnd() - .5) * 3; i ? c.lineTo(jx, jy) : c.moveTo(jx, jy) }); c.stroke() };
      const arc = (cx, cy, rx, ry, a0, a1, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * rx, cy + Math.sin(a) * ry] });
      c.save(); c.translate(36, 70); c.rotate(-.06);
      pen([...arc(80, 150, 46, 40, -.3, -Math.PI * 1.15), ...arc(70, 236, 52, 46, -Math.PI * .5, Math.PI * .85)]);   // S
      pen(arc(205, 196, 52, 84, 0, Math.PI * 2.08, 30));   // O
      pen([[262, 108], [372, 102]]); pen([[318, 106], [314, 286]]);   // T
      pen([[386, 110], [420, 190]]); pen([[462, 104], [420, 190], [416, 288]]);   // Y
      c.restore();
      c.lineWidth = 9; c.beginPath(); c.moveTo(60, 400); c.bezierCurveTo(170, 384, 310, 410, 452, 386); c.stroke();   // underlined
      c.fillStyle = '#151515'; c.font = `italic 34px "Comic Sans MS", "Marker Felt", cursive`; c.fillText('2000!', 340, 470);
    });
    const geo = new THREE.PlaneGeometry(S, S, 12, 12), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / S + .5; p.setZ(i, Math.pow(Math.max(0, .35 - y), 2) * .03) } geo.computeVertexNormals();   // the bottom curls up off the desk (the glue strip is at the top)
    const g = new THREE.Group(); const m = mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: .85, side: THREE.DoubleSide }), 0, 0, 0, g); m.castShadow = true; m.receiveShadow = false;
    g.rotation.x = -Math.PI / 2; g.rotation.z = .12; g.position.y = .0006; const r = new THREE.Group(); r.add(g); return r;
  }

  // ── 13. The FWA mug ──
  function mug() {
    const g = new THREE.Group(), R = .041, Hm = .095, wall = .0045, glaze = phys('#f6f5f1', { roughness: .22, clearcoat: .9, clearcoatRoughness: .12 });
    const prof = [[0, 0], [R - .006, 0], [R - .002, .0015], [R, .006], [R, Hm - .002], [R - .0012, Hm], [R - wall, Hm - .0005], [R - wall, .012], [R - wall - .006, .0065], [0, .0065]].map(([x, y]) => new THREE.Vector2(x, y));
    mesh(new THREE.LatheGeometry(prof, 72), glaze, 0, 0, 0, g);
    mesh(new THREE.CircleGeometry(R - wall - .0002, 48), phys('#2a160c', { roughness: .08, clearcoat: 1 }), 0, Hm - .014, 0, g).rotation.x = -Math.PI / 2;   // the coffee
    const hc = new THREE.CatmullRomCurve3([[R - .003, .079], [R + .009, .0805], [R + .023, .076], [R + .031, .062], [R + .0325, .046], [R + .027, .031], [R + .014, .0215], [R - .003, .02]].map(([x, y]) => new THREE.Vector3(x, y, 0)), false, 'centripetal');
    mesh(new THREE.TubeGeometry(hc, 72, .0056, 16, false), glaze, 0, 0, 0, g).scale.z = 1.3;   // the handle, both ends sunk into the wall (a little wider than it is thick)
    const print = tex(1024, 512, (c, w, hh) => { c.clearRect(0, 0, w, hh); drawLogo(c, w * .5 - 190, hh * .5 - 80, 380, '#111'); c.fillStyle = '#111'; c.font = `500 22px ${mono}`; c.textAlign = 'center'; c.fillText('FAVOURITE WEBSITE AWARDS', w * .5, hh * .5 + 74) });
    const pg = new THREE.CylinderGeometry(R + .0004, R + .0004, Hm * .62, 64, 1, true, .6 - Math.PI * .4, Math.PI * .8); const pm = mesh(pg, new THREE.MeshStandardMaterial({ map: print, transparent: true, roughness: .3, depthWrite: false }), 0, Hm * .5, 0, g); pm.castShadow = false;   // the print, turned a little toward the handle's side (as you'd see it holding the mug)
    return g;
  }

  // the hand that writes on things: a marker font where there is one, a little wobble
  const hand = '"Marker Felt", "Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive';
  const scrawl = (c, lines, x, y, size, lh, rot = 0, color = '#151515') => { c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = color; c.font = `bold ${size}px ${hand}`; c.textAlign = 'center'; lines.forEach((l, i) => { c.save(); c.translate((rnd() - .5) * size * .1, i * lh); c.rotate((rnd() - .5) * .06); c.fillText(l, 0, 0); c.restore() }); c.restore() };

  // ── 14. CD-Rs: a jewel case, a disc rainbow side up on it and one on top, label up, in Sharpie ──
  function cdrs() {
    const g = new THREE.Group(), R = .06, r0 = .0075, T = .0012;
    const dye = phys('#a9b9cc', { metalness: 1, roughness: .1, iridescence: 1, iridescenceIOR: 2, iridescenceThicknessRange: [200, 900] }), edge = std('#c9ccd2', .3, .6);
    const label = (lines, rot) => tex(1024, 1024, (c, w) => {
      const C = w / 2, gr = c.createRadialGradient(C, C, 60, C, C, C); gr.addColorStop(0, '#e9eaee'); gr.addColorStop(1, '#c4c6cc'); c.fillStyle = gr; c.fillRect(0, 0, w, w);
      c.strokeStyle = 'rgba(255,255,255,.35)'; for (let i = 0; i < 70; i++) { c.lineWidth = 1 + rnd() * 2; c.beginPath(); c.arc(C, C, C * (.3 + rnd() * .7), 0, 7); c.stroke() }   // (brushed, in rings)
      c.fillStyle = 'rgba(205,210,216,.9)'; c.beginPath(); c.arc(C, C, C * .3, 0, 7); c.fill(); c.strokeStyle = 'rgba(120,125,135,.6)'; c.lineWidth = 3; c.beginPath(); c.arc(C, C, C * .3, 0, 7); c.stroke(); c.beginPath(); c.arc(C, C, C * .22, 0, 7); c.stroke();   // the clear hub and its stacking ring
      c.fillStyle = '#3d4552'; c.font = `bold 34px ${sans}`; c.textAlign = 'center'; c.save(); c.translate(C, C); c.rotate(-.5); c.fillText('CD-R  80 min  700 MB', 0, -C * .82); c.restore();
      c.strokeStyle = '#3d4552'; c.lineWidth = 4; c.beginPath(); c.arc(C, C, C * .9, -2.6, -.4); c.stroke();
      scrawl(c, lines, C, C - 150, 92, 104, rot);
    });
    const disc = (tTop) => { const d = new THREE.Group(); const top = mesh(new THREE.RingGeometry(r0, R, 96, 1), new THREE.MeshStandardMaterial({ map: tTop, roughness: .35, metalness: .3 }), 0, T / 2, 0, d); top.rotation.x = -Math.PI / 2;
      const bot = mesh(new THREE.RingGeometry(r0, R, 96, 1), dye, 0, -T / 2, 0, d); bot.rotation.x = Math.PI / 2;
      mesh(new THREE.CylinderGeometry(R, R, T, 96, 1, true), edge, 0, 0, 0, d); mesh(new THREE.CylinderGeometry(r0, r0, T, 32, 1, true), edge, 0, 0, 0, d); return d };
    // the jewel case: black tray, clear lid on its hinge, a disc in it
    const cw = .142, cd = .125, ch = .0104, clear = phys('#ffffff', { roughness: .04, transparent: true, opacity: .16, clearcoat: 1, clearcoatRoughness: .02 });
    mesh(rbox(cw - .006, .006, cd - .002, .001, 2), std('#111114', .45), .003, .003, 0, g);
    mesh(new THREE.CylinderGeometry(.007, .007, .002, 32), std('#1a1a1e', .4), .006, .007, 0, g);   // the hub that holds it
    { const inner = disc(label(['fonts', '+ old sites'], -.1)); inner.position.set(.006, .0068, 0); inner.rotation.y = 1.9; g.add(inner) }
    const lid = mesh(rbox(cw, .003, cd, .0008, 2), clear, 0, ch - .0015, 0, g); lid.castShadow = false;
    mesh(new THREE.CylinderGeometry(.0024, .0024, cd, 12), clear, -cw / 2 + .0024, ch - .0026, 0, g).rotation.x = Math.PI / 2;
    // and two on top of it: the rainbow one, then the one that matters
    const b = disc(label(['music', 'mix 2000'], .2)); b.rotation.set(Math.PI, .5, 0); b.position.set(-.014, ch + T / 2, .008); g.add(b);
    const a = disc(label(['FWA', 'site v3 FINAL', 'final_FINAL2.fla'], 0)); a.rotation.y = -.35; a.position.set(.024, ch + T * 1.5 + .0002, -.012); g.add(a);
    return g;
  }

  // ── 15. A pen cup in black wire mesh, three Sharpies and a pencil in it ──
  function pencup() {
    const g = new THREE.Group(), Rc = .036, Hc = .1, wire = std('#141416', .55, .4);
    const holes = tex(64, 64, (c, w, h) => { c.fillStyle = '#fff'; c.fillRect(0, 0, w, h); c.fillStyle = '#000'; c.beginPath(); c.arc(w / 2, h / 2, w * .34, 0, 7); c.fill() }, { data: true, rep: [34, 11] });
    mesh(new THREE.CylinderGeometry(Rc, Rc * .94, Hc, 64, 1, true), new THREE.MeshStandardMaterial({ color: col('#141416'), roughness: .55, metalness: .4, alphaMap: holes, alphaTest: .5, side: THREE.DoubleSide }), 0, Hc / 2, 0, g);
    mesh(new THREE.CylinderGeometry(Rc * .94, Rc * .94, .003, 48), wire, 0, .0015, 0, g);   // the bottom
    mesh(new THREE.TorusGeometry(Rc, .0018, 8, 64), wire, 0, Hc, 0, g).rotation.x = Math.PI / 2; mesh(new THREE.TorusGeometry(Rc * .94, .0018, 8, 64), wire, 0, .002, 0, g).rotation.x = Math.PI / 2;   // its rims
    const band = tex(64, 512, (c, w, h) => { c.fillStyle = '#d7d8db'; c.fillRect(0, 0, w, h); c.save(); c.translate(w / 2 + 12, 30); c.rotate(Math.PI / 2); c.fillStyle = '#111'; c.font = `italic bold 44px ${sans}`; c.fillText('SHARPIE', 0, 0); c.font = `bold 16px ${sans}`; c.fillText('PERMANENT MARKER', 230, -6); c.restore() });
    const sharpie = ink => { const s = new THREE.Group(), capM = std(ink, .4), r = .0057;
      mesh(new THREE.CylinderGeometry(r, r, .078, 24), new THREE.MeshStandardMaterial({ map: band, roughness: .5 }), 0, .039, 0, s);   // the barrel, its label
      mesh(new THREE.CylinderGeometry(r, r * .8, .016, 24), capM, 0, -.008, 0, s);   // the end, the ink's colour
      mesh(new THREE.CylinderGeometry(r * 1.1, r * 1.1, .046, 24), capM, 0, .078 + .023, 0, s); mesh(new THREE.SphereGeometry(r * 1.1, 24, 8, 0, Math.PI * 2, 0, Math.PI / 2), capM, 0, .124, 0, s);   // the cap
      mesh(rbox(.0035, .03, .0022, .0009, 2), capM, 0, .106, r * 1.1 + .0008, s);   // its clip
      return s };
    const pencil = () => { const s = new THREE.Group(), r = .0037;
      mesh(new THREE.CylinderGeometry(r, r, .15, 6), std('#f2c21b', .5), 0, .075, 0, s); mesh(new THREE.ConeGeometry(r, .016, 6), std('#e8c9a0', .8), 0, -.008, 0, s).rotation.x = Math.PI;
      mesh(new THREE.CylinderGeometry(r * 1.05, r * 1.05, .011, 16), std('#c9cbd0', .25, 1), 0, .1555, 0, s); mesh(new THREE.CylinderGeometry(r, r, .008, 16), std('#f08aa0', .8), 0, .165, 0, s);   // the ferrule and the rubber
      return s };
    [[sharpie('#111111'), -.008, .006, .22, .1], [sharpie('#c4161c'), .009, -.004, -.16, .2], [sharpie('#1f4fbf'), -.004, -.01, .08, -.24], [pencil(), .007, .01, -.2, -.12]].forEach(([p, x, z, rz, rx]) => { p.position.set(x, .016, z); p.rotation.set(rx, 0, rz); g.add(p) });
    return g;
  }

  // ── 16. Game Boy Color, in purple, a game going on its screen (built in millimetres) ──
  function gameboy() {
    const gb = new THREE.Group(), body = phys('#6a4c9c', { roughness: .38, clearcoat: .55, clearcoatRoughness: .3 }), dark = std('#26232c', .45), D = 15, BT = 6, F = D / 2 + BT;
    { const s = new THREE.Shape(), w = 36, t = 63.5, b = -63.5, rt = 4, rb = 12; s.moveTo(-w + rt, t); s.lineTo(w - rt, t); s.quadraticCurveTo(w, t, w, t - rt); s.lineTo(w, b + rb); s.quadraticCurveTo(w, b, w - rb, b); s.lineTo(-w + rb, b); s.quadraticCurveTo(-w, b, -w, b + rb); s.lineTo(-w, t - rt); s.quadraticCurveTo(-w, t, -w + rt, t);
      const geo = new THREE.ExtrudeGeometry(s, { depth: D, bevelEnabled: true, bevelThickness: BT, bevelSize: 3, bevelSegments: 8, curveSegments: 16 }); geo.translate(0, 0, -D / 2); mesh(smooth(geo), body, 0, 0, 0, gb) }
    // the screen's lens, GAME BOY COLOR under the screen, the power light
    { const lg = new THREE.ShapeGeometry(rrect(60, 50, 5, 0, 32), 6); const t = planar(lg, 12, (c, X, Y, s, cw, ch) => { c.fillStyle = '#2c2b33'; c.fillRect(0, 0, cw, ch); c.font = `italic bold ${3.6 * s}px ${sans}`; c.textAlign = 'center'; c.fillStyle = '#d8d6e0'; c.fillText('GAME BOY', X(-6), Y(10)); [['C', '#e03a3a'], ['O', '#f0a020'], ['L', '#3cb043'], ['O', '#2f7fe0'], ['R', '#9a4fd0']].forEach(([l, cl], i) => { c.fillStyle = cl; c.fillText(l, X(9.5 + i * 3.4), Y(10)) }); c.fillStyle = '#ff2a2a'; c.beginPath(); c.arc(X(-25), Y(42), s * 1.1, 0, 7); c.fill() });
      mesh(lg, std('#ffffff', .15, 0, { map: t }), 0, 0, F + .05, gb) }
    const scr = tex(640, 576, c => {   // 160 × 144: a sky, clouds, hills, a little hero on the ground, coins in the air
      c.imageSmoothingEnabled = false; const p = (x, y, w, h, cl) => { c.fillStyle = cl; c.fillRect(x * 4, y * 4, w * 4, h * 4) };
      p(0, 0, 160, 144, '#7ec8f8'); for (const [x, y] of [[20, 20], [96, 34], [130, 14]]) { p(x, y, 22, 6, '#fff'); p(x + 4, y - 4, 12, 4, '#fff') }
      for (let x = 0; x < 160; x += 2) { const h = 26 + Math.round(10 * Math.sin(x * .05) + 6 * Math.sin(x * .13)); p(x, 144 - 24 - h, 2, h, '#4caf50') }
      p(0, 120, 160, 24, '#c8783c'); for (let x = 0; x < 160; x += 16) { p(x, 120, 16, 3, '#8a4a20'); p(x + 7, 123, 2, 21, '#8a4a20') }
      p(40, 104, 10, 6, '#e53935'); p(40, 110, 10, 7, '#1e3a8a'); p(42, 100, 6, 4, '#ffcc99'); p(40, 117, 4, 3, '#5d3a1a'); p(46, 117, 4, 3, '#5d3a1a');   // the hero
      for (const [x, y] of [[70, 84], [82, 78], [94, 84]]) { p(x, y, 6, 8, '#ffd23f'); p(x + 2, y + 2, 2, 4, '#c9971a') }
      p(110, 92, 16, 16, '#d97a2b'); p(113, 95, 10, 10, '#f0b04a');   // a block with something in it
    });
    mesh(new THREE.PlaneGeometry(44, 39.6), std('#ffffff', .3, 0, { map: scr, emissive: col('#ffffff'), emissiveMap: scr, emissiveIntensity: .35 }), 0, 33, F + .1, gb);
    mesh(new THREE.PlaneGeometry(14, 3.5), new THREE.MeshStandardMaterial({ map: tex(256, 64, (c, w, h) => { c.fillStyle = '#6a4c9c'; c.fillRect(0, 0, w, h); c.fillStyle = '#4a3374'; c.font = `bold 44px ${sans}`; c.textAlign = 'center'; c.fillText('Nintendo', w / 2, 46) }), roughness: .4 }), 0, 1, F + .03, gb);
    // the cross, the A and B, SELECT and START, the speaker
    mesh(new THREE.CircleGeometry(12, 40), std('#55397f', .5), -19, -24, F + .02, gb);
    mesh(ext(poly([[-3.5, 10], [3.5, 10], [3.5, 3.5], [10, 3.5], [10, -3.5], [3.5, -3.5], [3.5, -10], [-3.5, -10], [-3.5, -3.5], [-10, -3.5], [-10, 3.5], [-3.5, 3.5]]), 1.2, .5, 2), dark, -19, -24, F + .2, gb);
    for (const [x, y] of [[24, -18], [11, -25]]) mesh(new THREE.CylinderGeometry(4.6, 4.6, 2.6, 32), dark, x, y, F + .6, gb).rotation.x = Math.PI / 2;
    for (const x of [-6.5, 6.5]) mesh(rbox(9, 3.2, 1.6, 1.5), std('#7c7a86', .5), x, -44, F + .3, gb).rotation.z = .45;
    for (let k = 0; k < 6; k++) mesh(rbox(1.4, 11, 1, .6), std('#3a2a55', .7), 17 + k * 3, -47 + k * 1.2, F, gb).rotation.z = -.45;
    // a cartridge in the slot at the back of the top
    mesh(rbox(57, 30, 7.5, 1.5), std('#6f7075', .5), 0, 63.5 + 1 + 14 - 15, -8.5, gb);
    gb.scale.setScalar(.001); gb.rotation.x = -Math.PI / 2; gb.position.y = F * .001; const r = new THREE.Group(); r.add(gb); return r;
  }

  // ── 17. A lava lamp: the rocket, purple liquid, orange wax rising and falling, and the glow it gives ──
  function lavalamp() {
    const g = new THREE.Group(), lathe = (pts, m) => mesh(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 64), m, 0, 0, 0, g);
    const metal = std('#c9a64a', .25, 1);
    lathe([[0, 0], [.056, 0], [.057, .004], [.05, .05], [.04, .1], [.034, .13], [0, .13]], metal);   // the base
    lathe([[0, .33], [.023, .33], [.017, .35], [.011, .37], [0, .372]], metal);   // the cap
    const bottle = [[.033, .13], [.04, .16], [.045, .2], [.043, .24], [.035, .28], [.026, .31], [.023, .33]];
    const glass = lathe([[0, .13], ...bottle, [0, .33]], phys('#5a1f86', { roughness: .05, clearcoat: 1, clearcoatRoughness: .03, transparent: true, opacity: .5, depthWrite: false, emissive: col('#6a2aa0'), emissiveIntensity: .7 })); glass.castShadow = false;
    const rAt = y => { for (let i = 1; i < bottle.length; i++) { const [r1, y1] = bottle[i], [r0, y0] = bottle[i - 1]; if (y <= y1) return r0 + (r1 - r0) * (y - y0) / (y1 - y0) } return .023 };
    const wax = std('#ff7a1a', .5, 0, { emissive: col('#ff5a10'), emissiveIntensity: 1.3 });
    const pool = mesh(new THREE.SphereGeometry(1, 32, 16), wax, 0, .138, 0, g); pool.scale.set(.03, .008, .03); pool.castShadow = false;
    const blobs = [.014, .011, .016, .009, .012, .008].map((s, i) => { const m = mesh(new THREE.SphereGeometry(1, 24, 16), wax, 0, .15, 0, g); m.castShadow = false; m.userData.live = true; return { m, s, ph: i * 1.7, T: 22 + i * 7, ax: (i % 3 - 1) * .006 } });
    pool.userData.live = true;
    const light = new THREE.PointLight(0xff8a40, .3, 1.2, 2); light.position.y = .22; light.userData.base = .3; g.add(light); g.userData.light = light;
    g.userData.update = t => {   // each blob rises, lingers at the top, sinks again, stretching as it goes
      for (const b of blobs) { const u = (t / b.T + b.ph) % 1, e = .5 - .5 * Math.cos(u * Math.PI * 2), y = .148 + e * .155, v = Math.abs(Math.sin(u * Math.PI * 2)), rr = Math.min(b.s, rAt(y) - .004);
        b.m.position.set(b.ax + Math.sin(t * .2 + b.ph) * .004, y, Math.cos(t * .17 + b.ph) * .004); b.m.scale.set(rr * (1 - .2 * v), rr * (1 + .45 * v), rr * (1 - .2 * v)) }
      pool.scale.y = .008 + .002 * Math.sin(t * .3);
    };
    g.userData.update(0); return g;
  }

  // ── 18. A wall clock on the time where you are (the second hand ticks) ──
  function clock() {
    const g = new THREE.Group(), R = .125, Dp = .04, black = std('#151517', .4);
    const face = tex(1024, 1024, (c, w) => { const C = w / 2; c.fillStyle = '#f6f4ee'; c.fillRect(0, 0, w, w); c.fillStyle = '#151515';
      for (let i = 0; i < 60; i++) { c.save(); c.translate(C, C); c.rotate(i * Math.PI / 30); c.fillRect(i % 5 ? -2 : -6, -C * .93, i % 5 ? 4 : 12, i % 5 ? 22 : 54); c.restore() }
      c.font = `500 104px ${sans}`; c.textAlign = 'center'; c.textBaseline = 'middle'; for (let n = 1; n <= 12; n++) { const a = n * Math.PI / 6; c.fillText(n, C + Math.sin(a) * C * .7, C - Math.cos(a) * C * .7) }
      c.font = `500 28px ${sans}`; c.fillStyle = '#777'; c.fillText('QUARTZ', C, C + C * .36) });
    { const rim = mesh(new THREE.TorusGeometry(R, .011, 16, 96), black, 0, 0, Dp - .011, g); mesh(new THREE.CylinderGeometry(R, R, Dp - .011, 96, 1, true), black, 0, 0, (Dp - .011) / 2, g).rotation.x = Math.PI / 2; rim.castShadow = true }
    mesh(new THREE.CircleGeometry(R - .004, 96), new THREE.MeshStandardMaterial({ map: face, roughness: .7 }), 0, 0, .012, g);
    const hand = (len, w, tail, m, z) => { const p = new THREE.Group(); p.position.z = z; p.userData.live = true; g.add(p); mesh(rbox(w, len + tail, .0012, Math.min(w / 2.2, .002), 2), m, 0, (len - tail) / 2, 0, p); return p };
    const hH = hand(.062, .0075, .014, black, .016), hM = hand(.094, .005, .016, black, .0175), hS = hand(.1, .0016, .026, std('#d0201a', .4), .019);
    mesh(new THREE.CylinderGeometry(.0045, .0045, .006, 24), std('#d0201a', .4), 0, 0, .02, g).rotation.x = Math.PI / 2;
    const glass = mesh(new THREE.CircleGeometry(R - .002, 96), phys('#ffffff', { roughness: .03, transparent: true, opacity: .07, clearcoat: 1 }), 0, 0, Dp - .012, g); glass.castShadow = false;
    g.userData.update = () => { const d = new Date(), s = d.getSeconds(), m = d.getMinutes() + s / 60, h = d.getHours() % 12 + m / 60; hS.rotation.z = -s * Math.PI / 30; hM.rotation.z = -m * Math.PI / 30; hH.rotation.z = -h * Math.PI / 6 };
    g.userData.update(); g.position.y = R + .011; const r = new THREE.Group(); r.add(g); return r;
  }

  // ── 19. Post-its for the monitor's bezel, upright, stuck by the top and curling off a little below (origin: the middle of its back) ──
  function note(lines, hex, size = 88) {
    const S = .076, t = tex(512, 512, (c, w, h) => { c.fillStyle = hex; c.fillRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, 'rgba(255,255,255,.12)'); gr.addColorStop(.2, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(90,60,0,.1)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); scrawl(c, lines, w / 2, 170, size, size * 1.15, -.05) });
    const geo = new THREE.PlaneGeometry(S, S, 10, 10), p = geo.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i) / S + .5; p.setZ(i, Math.pow(Math.max(0, .55 - y), 2) * .028) } geo.computeVertexNormals();
    const g = new THREE.Group(), m = mesh(geo, new THREE.MeshStandardMaterial({ map: t, roughness: .85, side: THREE.DoubleSide }), 0, 0, .0003, g); m.receiveShadow = false; return g;
  }

  return [
    { id: 'kesey', name: 'The Kesey Signal', note: 'Rob Ford’s thriller, paperback · 15.2 × 22.7 cm', make: kesey },
    { id: 'webdesign', name: 'Web Design: The Evolution of the Digital World 1990–Today', note: 'Rob Ford, TASCHEN hardcover · 25 × 32 cm', make: webdesign },
    { id: 'motd', name: 'Mobile of the Day certificate', note: 'Framed, behind glass · 43 × 64 cm', make: () => framed(img.motd) },
    { id: 'sotd', name: 'Site of the Day certificate', note: 'Framed, behind glass · 43 × 64 cm', make: () => framed(img.sotd) },
    { id: 'postcard', name: 'Postcard: Persepolis, from the Getty', note: 'Front and back, slightly bowed · 15 × 10 cm', make: postcard },
    { id: 'medal', name: 'Medal of Honor', note: 'The Army’s: star, wreath, VALOR bar and eagle, on its ribbon · 5 cm across', make: medal },
    { id: 'mustang', name: '1967 Ford Mustang fastback', note: 'Black, a 1:24 toy · 19 cm long', make: mustang },
    { id: 'nokia', name: 'Nokia 3310', note: 'Came out in 2000 · 11.3 × 4.8 cm, a ringing tone on the screen', make: nokia },
    { id: 'modem', name: '56K modem', note: 'Its lights always chattering away', make: modem },
    { id: 'webcam', name: 'Ball webcam', note: 'On a clip, over the corner of the monitor', make: webcam },
    { id: 'flash', name: 'Macromedia Flash 5', note: 'The box, 2000 · what the early winners were made with', make: flashbox },
    { id: 'postit', name: 'Post-it: SOTY', note: 'Marker, the corner curling up', make: postit },
    { id: 'mug', name: 'FWA mug', note: 'With coffee in it', make: mug },
    { id: 'cdrs', name: 'CD-Rs', note: 'A jewel case and two discs, one in Sharpie: FWA site v3 FINAL', make: cdrs },
    { id: 'pencup', name: 'Pen cup', note: 'Black wire mesh: three Sharpies and a pencil', make: pencup },
    { id: 'gameboy', name: 'Game Boy Color', note: 'In purple, a game on · 13.3 × 7.8 cm', make: gameboy },
    { id: 'lavalamp', name: 'Lava lamp', note: 'Purple, the orange wax rising and falling, and its glow · 37 cm', make: lavalamp },
    { id: 'clock', name: 'Wall clock', note: 'On your own time · 25 cm', make: clock },
    { id: 'noteA', name: 'Post-it on the monitor', note: 'Pink, stuck to the bezel', make: () => note(['judge', '12 sites', 'by FRI!'], '#ff9fc6', 80) },
    { id: 'noteB', name: 'Post-it on the monitor', note: 'Yellow, stuck to the bezel', make: () => note(['BACKUP', 'the .fla!!'], '#fbe96a', 84) },
  ];
}
