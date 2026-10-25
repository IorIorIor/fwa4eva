/* ───────────────────────── the room's props, each on its own ─────────────────────────
   Everything that will stand on the desk or hang on the wall, built from plain three.js parts in metres at real size, so the
   same code drops into the room (01-zroom) later. makeProps(THREE, ctx) → [{ id, name, note, make() → Object3D }]; an object
   may carry userData.update(t) for anything that moves (the modem's lights). ctx: { RoundedBoxGeometry, img: { kesey, webdesign,
   motd, sotd } (loaded <img>s), logo (the FWA mark's SVG path, viewBox 509 × 149), col(hex) → THREE.Color }. */
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

  // ── 5. A postcard from the Getty: Persepolis ──
  function postcard() {
    const W = .148, H = .105, F = 1480, Fh = 1050;
    const front = tex(F, Fh, (c, w, h) => {
      const sky = c.createLinearGradient(0, 0, 0, h * .7); sky.addColorStop(0, '#f2b46a'); sky.addColorStop(.55, '#f6d49a'); sky.addColorStop(1, '#f9e7c4'); c.fillStyle = sky; c.fillRect(0, 0, w, h);
      c.fillStyle = 'rgba(255,240,210,.9)'; c.beginPath(); c.arc(w * .78, h * .3, 70, 0, 7); c.fill();   // the low sun
      c.fillStyle = '#b98a5c'; c.beginPath(); c.moveTo(0, h * .55); for (let x = 0; x <= w; x += 40) c.lineTo(x, h * .5 - Math.sin(x * .004) * 40 - Math.sin(x * .011) * 18); c.lineTo(w, h); c.lineTo(0, h); c.fill();   // the mountain behind
      c.fillStyle = '#c9a37a'; c.fillRect(0, h * .74, w, h * .26); c.fillStyle = '#a57d55'; c.fillRect(0, h * .74, w, 10);   // the terrace
      const stone = '#8a6646', shade = '#6e4f35';
      const column = (x, top, wid) => { c.fillStyle = stone; c.fillRect(x - wid / 2, top, wid, h * .74 - top); c.fillStyle = shade; for (let k = -2; k <= 2; k++) c.fillRect(x + k * wid / 5 - 1, top + 10, 2, h * .74 - top - 20); c.fillStyle = stone; c.fillRect(x - wid * .9, h * .74 - 22, wid * 1.8, 22);
        c.beginPath(); c.moveTo(x - wid * 1.6, top); c.quadraticCurveTo(x - wid * 1.9, top - 28, x - wid * 1.2, top - 36); c.lineTo(x + wid * 1.2, top - 36); c.quadraticCurveTo(x + wid * 1.9, top - 28, x + wid * 1.6, top); c.fill() };   // fluted, with a double-bull capital
      [[120, .2], [260, .26], [400, .17], [700, .3], [860, .24], [1010, .33]].forEach(([x, t]) => column(x, h * t, 34));
      c.fillStyle = stone; c.fillRect(1150, h * .28, 70, h * .46); c.fillRect(1330, h * .28, 70, h * .46); c.fillRect(1130, h * .24, 290, 40);   // the Gate of All Nations
      c.fillStyle = shade; c.beginPath(); c.moveTo(1158, h * .62); c.lineTo(1212, h * .44); c.lineTo(1212, h * .62); c.fill(); c.beginPath(); c.moveTo(1392, h * .62); c.lineTo(1338, h * .44); c.lineTo(1338, h * .62); c.fill();   // (its winged bulls, in silhouette)
      c.fillStyle = 'rgba(70,40,20,.25)'; for (let i = 0; i < 900; i++) c.fillRect(rnd() * w, h * .74 + rnd() * h * .26, 2, 2);
      c.fillStyle = '#fffaf0'; c.font = `600 76px Georgia, "Times New Roman", serif`; c.fillText('PERSEPOLIS', 70, h - 110); c.font = `italic 34px Georgia, serif`; c.fillText('Persepolis Reimagined · Getty Villa', 74, h - 58);
      c.strokeStyle = 'rgba(255,255,255,.8)'; c.lineWidth = 10; c.strokeRect(5, 5, w - 10, h - 10);
    });
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

  // ── 6. A medal of honour: a gold medal on its ribbon ──
  function medal() {
    const g = new THREE.Group(), R = .022, gold = std('#d8b04a', .28, 1);
    const relief = tex(512, 512, (c, w, h) => { c.fillStyle = '#000'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff';
      c.save(); c.translate(256, 256); c.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? 70 : 170, a = -Math.PI / 2 + i * Math.PI / 5; c.lineTo(Math.cos(a) * r, Math.sin(a) * r) } c.closePath(); c.fill();   // a star
      for (const sd of [-1, 1]) for (let k = 0; k < 11; k++) { const a = Math.PI / 2 + sd * (.35 + k * .22); c.save(); c.translate(Math.cos(a) * 205, Math.sin(a) * 205); c.rotate(a + sd * .9); c.beginPath(); c.ellipse(0, 0, 24, 9, 0, 0, 7); c.fill(); c.restore() }   // a laurel wreath round it
      c.lineWidth = 10; c.strokeStyle = '#fff'; c.beginPath(); c.arc(0, 0, 240, 0, 7); c.stroke(); c.restore() }, { data: true });
    const face = new THREE.MeshStandardMaterial({ color: col('#d8b04a'), roughness: .3, metalness: 1, bumpMap: relief, bumpScale: 2.2 });
    const disc = mesh(new THREE.CylinderGeometry(R, R, .0028, 64), [gold, face, gold], 0, 0, 0, g); disc.rotation.x = Math.PI / 2;
    mesh(new THREE.TorusGeometry(R, .0016, 12, 64), gold, 0, 0, 0, g);
    mesh(new THREE.TorusGeometry(.0035, .0009, 8, 24), gold, 0, R + .003, 0, g);   // the suspension ring
    // the ribbon: a strip folded to a point at the bottom, red with a white stripe and gold edges
    const rib = tex(128, 256, (c, w, h) => { c.fillStyle = '#9e1b24'; c.fillRect(0, 0, w, h); c.fillStyle = '#f4efe4'; c.fillRect(w * .42, 0, w * .16, h); c.fillStyle = '#c9a23e'; c.fillRect(0, 0, 8, h); c.fillRect(w - 8, 0, 8, h); for (let y = 0; y < h; y += 2) { c.fillStyle = `rgba(0,0,0,${.04 + rnd() * .05})`; c.fillRect(0, y, w, 1) } });
    const s = new THREE.Shape(), rw = .036, rh = .05; s.moveTo(-rw / 2, rh); s.lineTo(rw / 2, rh); s.lineTo(rw / 2, .008); s.lineTo(0, 0); s.lineTo(-rw / 2, .008); s.closePath();
    const rg = new THREE.ShapeGeometry(s); { const p = rg.attributes.position, uvA = rg.attributes.uv; for (let i = 0; i < p.count; i++) uvA.setXY(i, (p.getX(i) + rw / 2) / rw, p.getY(i) / rh) }
    const ribbon = mesh(rg, new THREE.MeshStandardMaterial({ map: rib, roughness: .7, side: THREE.DoubleSide }), 0, R + .006, -.001, g);
    mesh(new THREE.BoxGeometry(rw + .004, .006, .003), gold, 0, R + .006 + rh, -.001, g);   // the bar at the top
    g.rotation.x = -Math.PI / 2 + .12; g.position.y = .004; const r = new THREE.Group(); r.add(g); return r;
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

  // ── 8. Nokia 3310 (2000), dark blue, Snake on the screen ──
  function nokia() {
    const g = new THREE.Group(), W = .048, H = .113, navy = phys('#14204a', { roughness: .5, clearcoat: .4, clearcoatRoughness: .35, envMapIntensity: .6 }), greyBack = std('#5d6068', .6), keyM = std('#b9bcc4', .7);
    mesh(rbox(W, H, .015, .0085, 5), navy, 0, 0, .0035, g); mesh(rbox(W - .003, H - .004, .011, .007, 4), greyBack, 0, .001, -.004, g);
    const bezel = mesh(rbox(.036, .034, .002, .004, 3), std('#9ea2ab', .4, .3), 0, .028, .0105, g);
    const lcd = tex(336, 192, (c, w, h) => { c.fillStyle = '#8fb26a'; c.fillRect(0, 0, w, h); const px = 4, dk = '#1d2a12'; c.fillStyle = dk; c.font = `bold 22px ${mono}`; c.fillText('0042', 12, 26); c.fillRect(8, 34, w - 16, 3); c.fillRect(8, h - 12, w - 16, 3); c.fillRect(8, 34, 3, h - 43); c.fillRect(w - 11, 34, 3, h - 43);
      const snake = [[20, 20], [21, 20], [22, 20], [23, 20], [24, 20], [25, 20], [25, 21], [25, 22], [26, 22], [27, 22], [28, 22], [29, 22], [30, 22], [31, 22], [31, 23], [31, 24]]; snake.forEach(([x, y]) => c.fillRect(x * px * 1.5 - 60, y * px * 1.5 - 70, px * 1.4, px * 1.4)); c.fillRect(60 * 1.5 + 30, 30 * 1.5 + 60, 6, 6) });
    mesh(new THREE.PlaneGeometry(.029, .0165), std('#8fb26a', .5, 0, { map: lcd, emissive: col('#ffffff'), emissiveMap: lcd, emissiveIntensity: .45 }), 0, .027, .0116, g);
    const label = tex(256, 48, (c, w, h) => { c.fillStyle = '#9ea2ab'; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = `bold 30px ${sans}`; c.textAlign = 'center'; c.fillText('NOKIA', w / 2, 34) });
    mesh(new THREE.PlaneGeometry(.022, .004), new THREE.MeshStandardMaterial({ map: label, roughness: .5 }), 0, .0415, .0116, g);
    mesh(rbox(.012, .0018, .002, .0008, 2), std('#0a0a0c', .8), 0, .051, .0105, g);   // the earpiece
    // the navi key, the C key and the up / down rocker
    const navi = mesh(new THREE.CylinderGeometry(.0085, .0085, .003, 40), std('#2f4e9a', .45, .1), 0, .0035, .011, g); navi.rotation.x = Math.PI / 2; navi.scale.set(1.25, 1, .62);
    mesh(rbox(.007, .0045, .003, .0018, 3), keyM, .0165, .006, .0108, g); mesh(rbox(.0065, .011, .003, .0025, 3), keyM, -.0165, .0035, .0108, g);
    const keyT = d => tex(64, 48, (c, w, h) => { c.fillStyle = '#b9bcc4'; c.fillRect(0, 0, w, h); c.fillStyle = '#20232b'; c.font = `bold 26px ${sans}`; c.textAlign = 'center'; c.fillText(d, w / 2, 34) });
    ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#'].forEach((d, i) => { const x = (i % 3 - 1) * .0125, y = -.012 - Math.floor(i / 3) * .0092; const k = mesh(rbox(.0105, .0072, .0028, .0025, 3), keyM, x, y, .0106, g); mesh(new THREE.PlaneGeometry(.0095, .0066), new THREE.MeshStandardMaterial({ map: keyT(d), roughness: .7 }), x, y, .0121, g) });
    g.rotation.x = -Math.PI / 2 + .02; g.position.y = .011; const r = new THREE.Group(); r.add(g); return r;
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

  // ── 10. A ball webcam on its stand ──
  function webcam() {
    const g = new THREE.Group(), R = .03, shell = phys('#e9eaee', { roughness: .32, clearcoat: .8, clearcoatRoughness: .2 }), dark = std('#18191c', .4);
    const base = mesh(new THREE.CylinderGeometry(.03, .034, .008, 48), std('#c9cbd1', .4, .2), 0, .004, 0, g);
    mesh(new THREE.CylinderGeometry(.006, .008, .03, 24), std('#c9cbd1', .35, .3), 0, .022, 0, g);
    const orb = new THREE.Group(); orb.position.y = .037 + R; g.add(orb);
    mesh(new THREE.SphereGeometry(R, 48, 32), shell, 0, 0, 0, orb);
    mesh(new THREE.TorusGeometry(R * .995, .0007, 8, 64), std('#b5b7be', .4, .3), 0, 0, 0, orb).rotation.y = Math.PI / 2;   // the seam
    const face = mesh(new THREE.CylinderGeometry(R * .62, R * .62, .004, 48), dark, 0, 0, R * .84, orb); face.rotation.x = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(.0105, .0016, 12, 48), std('#9fa3ab', .2, 1), 0, 0, R * .84 + .002, orb);
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
    const h = mesh(new THREE.TorusGeometry(.024, .0065, 16, 40, Math.PI * 1.12), glaze, R + .006, Hm * .52, 0, g); h.rotation.z = -Math.PI * .56; h.scale.set(.85, 1.15, 1);   // the handle
    const print = tex(1024, 512, (c, w, hh) => { c.clearRect(0, 0, w, hh); drawLogo(c, w * .5 - 190, hh * .5 - 80, 380, '#111'); c.fillStyle = '#111'; c.font = `500 22px ${mono}`; c.textAlign = 'center'; c.fillText('FAVOURITE WEBSITE AWARDS', w * .5, hh * .5 + 74) });
    const pg = new THREE.CylinderGeometry(R + .0004, R + .0004, Hm * .62, 64, 1, true, .6 - Math.PI * .4, Math.PI * .8); const pm = mesh(pg, new THREE.MeshStandardMaterial({ map: print, transparent: true, roughness: .3, depthWrite: false }), 0, Hm * .5, 0, g); pm.castShadow = false;   // the print, turned a little toward the handle's side (as you'd see it holding the mug)
    return g;
  }

  return [
    { id: 'kesey', name: 'The Kesey Signal', note: 'Rob Ford’s thriller, paperback · 15.2 × 22.7 cm', make: kesey },
    { id: 'webdesign', name: 'Web Design: The Evolution of the Digital World 1990–Today', note: 'Rob Ford, TASCHEN hardcover · 25 × 32 cm', make: webdesign },
    { id: 'motd', name: 'Mobile of the Day certificate', note: 'Framed, behind glass · 43 × 64 cm', make: () => framed(img.motd) },
    { id: 'sotd', name: 'Site of the Day certificate', note: 'Framed, behind glass · 43 × 64 cm', make: () => framed(img.sotd) },
    { id: 'postcard', name: 'Postcard: Persepolis, from the Getty', note: 'Front and back, slightly bowed · 14.8 × 10.5 cm', make: postcard },
    { id: 'medal', name: 'Medal of honour', note: 'Gold, on its ribbon · 4.4 cm across', make: medal },
    { id: 'mustang', name: '1967 Ford Mustang fastback', note: 'Black, a 1:24 toy · 19 cm long', make: mustang },
    { id: 'nokia', name: 'Nokia 3310', note: 'Came out in 2000 · Snake on the screen', make: nokia },
    { id: 'modem', name: '56K modem', note: 'Its lights always chattering away', make: modem },
    { id: 'webcam', name: 'Ball webcam', note: 'Sits on top of the monitor', make: webcam },
    { id: 'flash', name: 'Macromedia Flash 5', note: 'The box, 2000 · what the early winners were made with', make: flashbox },
    { id: 'postit', name: 'Post-it: SOTY', note: 'Marker, the corner curling up', make: postit },
    { id: 'mug', name: 'FWA mug', note: 'With coffee in it', make: mug },
  ];
}
