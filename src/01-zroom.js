/* ───────────────────────── the room: a desk in the year 2000 ─────────────────────────
   The first thing you see. The renderer starts here (before anything else is loaded), the room is built and shown, and only
   then does the galaxy load, behind its screen: the opening (the mark and its button, see intro.startPortal) sits on the
   CRT's glass while it loads, the galaxy fades in there, the button turns to Start. Start flies the camera into the monitor;
   once the glass fills the window the room is gone and the opening carries on full size from exactly that picture.
   The room is its own little scene in metres with its own pipeline (tone mapped, bloom, vignette, grain). The galaxy reaches
   the glass as a render target (room.galaxy wraps the main render); the opening's own page (#portalLoad) and the 3D pointer's
   layer are laid onto the glass with a CSS perspective transform, so they line up with it and stay clickable.
   Settings: Look → Room (read safely: this runs before the settings exist). ?noroom skips it. */
const canvas = $('gl');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL: QS.has('webgl'), powerPreference: 'high-performance' });   // MSAA lives on the 3D pass only, not the full-screen post
await renderer.init();
const RL = (k, d) => { try { const v = LOOK[k]; return v ?? d } catch (e) { return d } };   // a room setting (the settings come later in the load)
const room = (() => {
  const H0 = document.documentElement, on0 = H0.classList.contains('roomboot') && !QS.has('test');
  const st = { on: false, phase: 'off', t: 0, fade: 0, sway: new THREE.Vector2(), aim: new V3(), ptr: { x: innerWidth / 2, y: innerHeight / 2, in: false }, dv: 0, M: null, Mi: null, band: [0, 0, 1, 1], onDone: null };
  if (!on0) { H0.classList.remove('roomboot'); return { on: false, on0: false, diving: false, galaxy: f => f(), galaxyReady() { }, skip() { } } }
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1)); renderer.setSize(innerWidth, innerHeight, false);
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, .02, 40);
  const lin = h => new C3(h).convertSRGBToLinear();
  const std = (hex, rough = .6, metal = 0, o = {}) => Object.assign(new THREE.MeshStandardNodeMaterial({ color: lin(hex), roughness: rough, metalness: metal }), o);
  const add = (geo, mat, x = 0, y = 0, z = 0, parent = sc) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; parent.add(m); return m };
  const rbox = (w, h, d, r = .006, seg = 3) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
  const cvTex = (w, h, draw, srgb = true, rep = null) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]) } return t };
  const rnd = mulberry32(2000);

  // ── surfaces ──
  const woodTex = cvTex(1024, 256, (g, w, h) => {   // varnished veneer, the grain running along the desk
    g.fillStyle = '#8a5530'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const y0 = rnd() * h, a = 1 + rnd() * 5, f = .002 + rnd() * .01, ph = rnd() * 9, dk = rnd(); g.strokeStyle = dk < .55 ? `rgba(60,28,10,${.08 + rnd() * .22})` : `rgba(190,120,70,${.05 + rnd() * .12})`; g.lineWidth = .6 + rnd() * 2.4; g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = y0 + Math.sin(x * f + ph) * a + Math.sin(x * f * 3.1 + ph * 2) * a * .3; x ? g.lineTo(x, y) : g.moveTo(x, y) } g.stroke() }
    const im = g.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const n = (rnd() - .5) * 14; d[i] += n; d[i + 1] += n * .8; d[i + 2] += n * .6 } g.putImageData(im, 0, 0);
  });
  const woodSide = woodTex.clone(); woodSide.needsUpdate = true; woodSide.rotation = Math.PI / 2; woodSide.center.set(.5, .5);
  const noiseTex = (n, lo, hi, rep) => cvTex(n, n, (g, w, h) => { const im = g.createImageData(w, h), d = im.data; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = lo + (hi - lo) * (rnd() * .6 + .4 * (Math.sin(x * .07 + Math.sin(y * .05) * 2) * .5 + .5)), i = (y * w + x) * 4; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = 255 } g.putImageData(im, 0, 0) }, false, rep);
  const plaster = noiseTex(256, 120, 255, [6, 3]);
  const wood = new THREE.MeshPhysicalNodeMaterial({ color: lin('#ffffff'), map: woodTex, roughness: .42, clearcoat: .55, clearcoatRoughness: .3 });
  const woodV = new THREE.MeshPhysicalNodeMaterial({ color: lin('#c8c8c8'), map: woodSide, roughness: .5, clearcoat: .35, clearcoatRoughness: .4 });
  const woodDark = new THREE.MeshPhysicalNodeMaterial({ color: lin('#8a8a8a'), map: woodSide, roughness: .55, clearcoat: .25, clearcoatRoughness: .45 });
  const wall = new THREE.MeshStandardNodeMaterial({ color: lin('#33465f'), roughness: .95, bumpMap: plaster, bumpScale: .6 });
  const floorM = std('#17130f', .85);
  const beige = std('#d9ceb5', .5), beigeD = std('#c7bb9f', .55), beigeL = std('#e4dac4', .45), grey = std('#7d7a72', .6), dark = std('#1c1b1a', .7);

  // ── the room ──
  const W = 6, H = 3;
  add(new THREE.PlaneGeometry(W, H), wall, 0, H / 2, 0).castShadow = false;
  { const m = add(new THREE.PlaneGeometry(3, H), wall, 1.32, H / 2, 1.5); m.rotation.y = -Math.PI / 2; m.castShadow = false }   // the side wall on the right
  { const m = add(new THREE.PlaneGeometry(W, 4), floorM, 0, 0, 2); m.rotation.x = -Math.PI / 2; m.castShadow = false }
  { const sk = std('#1d2230', .7); add(new THREE.BoxGeometry(W, .08, .015), sk, 0, .04, .008); add(new THREE.BoxGeometry(.015, .08, 3), sk, 1.312, .04, 1.5) }   // skirting

  // ── the desk ── top 1.72 × .66 at .74 m; a cabinet each side, the keyboard tray pulled out between them
  const D = { w: 1.72, d: .66, h: .74, t: .032, z0: .04 }, zc = D.z0 + D.d / 2;
  add(rbox(D.w, D.t, D.d, .012), wood, 0, D.h - D.t / 2, zc);
  for (const sx of [-1, 1]) {
    const x = sx * (D.w / 2 - .22);
    add(new THREE.BoxGeometry(.42, D.h - D.t - .02, D.d - .05), woodDark, x, (D.h - D.t - .02) / 2 + .02, zc - .01);   // the cabinet
    add(rbox(.38, D.h - D.t - .1, .018, .004), woodV, x, (D.h - D.t) / 2 + .03, D.z0 + D.d - .03);   // its door
    add(new THREE.BoxGeometry(.004, .09, .012), std('#b9a37a', .3, .8), x - sx * .15, D.h - .2, D.z0 + D.d - .015);   // brass pull
  }
  add(new THREE.BoxGeometry(D.w - .86, .06, .02), woodDark, 0, D.h - D.t - .03, D.z0 + D.d - .03);   // the apron over the tray
  add(new THREE.BoxGeometry(D.w - .86, .4, .02), dark, 0, .45, D.z0 + .06);   // the back panel, in shadow
  const tray = new THREE.Group(); tray.position.set(0, .615, D.z0 + D.d + .08); sc.add(tray);   // (pulled out)
  for (const sx of [-1, 1]) add(new THREE.BoxGeometry(.015, .03, .5), dark, sx * .41, .6, D.z0 + D.d - .2);   // its rails
  add(new THREE.BoxGeometry(.84, .02, .42), woodV, 0, 0, .0, tray); add(rbox(.84, .045, .02, .004), wood, 0, .012, .21, tray);   // the tray and its front lip

  // ── the monitor: a 17" CRT, a little left of the middle ──
  const mon = new THREE.Group(); mon.position.set(-.03, D.h, .33); sc.add(mon);
  add(new THREE.CylinderGeometry(.13, .14, .022, 48), beige, 0, .011, .02, mon).scale.z = .8;   // the swivel foot
  add(new THREE.CylinderGeometry(.05, .07, .05, 32), beigeD, 0, .045, .0, mon);
  const BW = .43, BH = .405, BD = .07, by = .07 + BH / 2;   // bezel
  add(rbox(BW, BH, BD, .018, 4), beigeL, 0, by, .14, mon);
  { const g = new THREE.CylinderGeometry(.18, .275, .34, 4, 1); g.rotateY(Math.PI / 4); g.rotateX(-Math.PI / 2); g.scale(1, .93, 1); add(g, beige, 0, by - .01, -.07, mon) }   // the tube's housing tapering back
  add(rbox(.2, .16, .06, .02), beigeD, 0, by - .02, -.27, mon);   // the neck at the very back
  // the glass, set in a darker inner frame. It shows the galaxy's picture (gT) once it's there, faintly lined like a CRT
  const SW = .33, SH = .25, GA = SW / SH, glassZ = .14 + BD / 2 + .002;
  add(rbox(SW + .04, SH + .036, .01, .006), std('#a99f8a', .6), 0, by + .012, glassZ - .006, mon);
  const gRT = new THREE.RenderTarget(4, 3, { depthBuffer: false, generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter }); const gT = texture(gRT.texture), FLIP = renderer.backend.isWebGPUBackend === true;   // (WebGPU keeps a render target top row first: read it the other way up)
  const U2 = { exp: uniform(0), bloomK: uniform(.35), vig: uniform(.55), grain: uniform(.035), time: uniform(0), res: uniform(new THREE.Vector2(1, 1)), scrOn: uniform(0), scrBr: uniform(1), glow: uniform(.35), k: uniform(0), band: uniform(new THREE.Vector4(0, 0, 1, 1)) };
  // the monitor from afar: a faint rolling bar and flicker (gone as you reach the glass); the CRT proper is laid over the whole
  // screen as the glass fills it (crtFx below), so nothing in the move itself changes
  const C = { flick: uniform(.25), roll: uniform(.3), idle: uniform(.3) };
  const h1 = x => fract(sin(x.mul(12.9898)).mul(43758.5453));
  const texUV = g => FLIP ? g : vec2(g.x, g.y.oneMinus());   // a point on the glass (v from the top) → the picture
  const rollAt = (y, amt) => exp(fract(y.sub(U2.time.mul(.23))).sub(.5).mul(9).pow(2).negate()).mul(C.roll).mul(amt).mul(.12);   // a soft brighter band drifting down the screen
  const flickAt = amt => float(1).sub(h1(floor(U2.time.mul(24))).mul(C.flick).mul(amt).mul(.18));
  const glassMat = new THREE.MeshPhysicalNodeMaterial({ color: lin('#0b0f12'), roughness: .12, metalness: 0, clearcoat: 1, clearcoatRoughness: .05 });
  glassMat.emissiveNode = Fn(() => {
    const g = vec2(uv().x, uv().y.oneMinus()), q = uv().sub(.5).mul(2), vig = float(1).sub(dot(q.mul(q), vec2(.22, .3))).clamp(0, 1);
    const pic = pow(gT.sample(texUV(g)).rgb, vec3(2.2)).mul(U2.scrBr), glow = pow(gT.sample(texUV(g)).level(4).rgb, vec3(2.2)).mul(.12), idle = C.idle.mul(U2.k.oneMinus());   // (the picture is display-ready: back to light, so the room's grade treats it like any other light)
    const lit = pic.add(glow).mul(U2.scrOn).add(rollAt(g.y, idle).mul(U2.scrOn)).mul(flickAt(idle));
    return lit.add(vec3(.012, .02, .026).mul(U2.glow)).mul(mix(vig, 1, U2.k));
  })();
  const glass = add(new THREE.PlaneGeometry(SW, SH), glassMat, 0, by + .012, glassZ, mon); glass.castShadow = false;
  for (let k = 0; k < 5; k++) add(rbox(.022, .008, .006, .002), beigeD, -.07 + k * .03, .07 + .028, .14 + BD / 2 + .002, mon);   // the adjust buttons
  add(new THREE.CylinderGeometry(.009, .009, .006, 24).rotateX(Math.PI / 2), beigeD, .16, .07 + .028, .14 + BD / 2 + .003, mon);   // power
  add(new THREE.SphereGeometry(.0025, 8, 6), std('#2bff6a', .3, 0, { emissive: lin('#2bff6a'), emissiveIntensity: 2 }), .135, .07 + .028, .14 + BD / 2 + .004, mon);   // its green light

  // ── the speakers ──
  const spk = x => {
    const g = new THREE.Group(); g.position.set(x, D.h, .38); sc.add(g); const w = .1, h = .2, d = .1;
    add(rbox(w, h, d, .012), beigeL, 0, h / 2, 0, g);
    const gr = add(new THREE.CircleGeometry(.5, 40), std('#9a917f', .9), 0, .085, d / 2 + .001, g); gr.scale.set(.074, .118, 1); gr.castShadow = false;   // the grille
    const rim = add(new THREE.RingGeometry(.5, .56, 40), beigeD, 0, .085, d / 2 + .0015, g); rim.scale.set(.074, .118, 1); rim.castShadow = false;
    add(new THREE.CylinderGeometry(.017, .017, .006, 24).rotateX(Math.PI / 2), std('#6f685c', .6), 0, .165, d / 2 + .001, g);   // the tweeter
    add(new THREE.SphereGeometry(.009, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateX(Math.PI / 2), std('#3a3631', .5), 0, .165, d / 2 + .003, g);
    return g;
  };
  spk(-.34); const spR = spk(.33);
  add(new THREE.CylinderGeometry(.006, .006, .004, 16).rotateX(Math.PI / 2), grey, .02, .03, .05 + .002, spR); add(new THREE.CylinderGeometry(.006, .006, .004, 16).rotateX(Math.PI / 2), grey, -.02, .03, .05 + .002, spR);   // volume knobs

  // ── the tower ──
  const tw = new THREE.Group(); tw.position.set(.66, D.h, .3); sc.add(tw); const TW = .2, TH = .44, TD = .46, fz = TD / 2 + .001;
  add(rbox(TW, TH, TD, .008), beige, 0, TH / 2, 0, tw);
  add(rbox(TW - .02, TH - .03, .02, .006), beigeL, 0, TH / 2, TD / 2 - .005, tw);   // the front panel
  add(rbox(.16, .042, .01, .003), beigeD, 0, TH - .06, fz + .006, tw); add(new THREE.BoxGeometry(.12, .003, .002), dark, 0, TH - .062, fz + .012, tw); add(rbox(.012, .006, .004, .001), grey, .055, TH - .072, fz + .012, tw);   // the CD drive
  for (const y of [TH - .11, TH - .155]) add(new THREE.BoxGeometry(.16, .002, .004), beigeD, 0, y, fz + .008, tw);   // blank bays
  add(rbox(.13, .026, .008, .002), beigeD, 0, .2, fz + .006, tw); add(new THREE.BoxGeometry(.09, .003, .002), dark, 0, .2, fz + .011, tw);   // the floppy drive
  add(new THREE.CylinderGeometry(.013, .013, .008, 24).rotateX(Math.PI / 2), beigeD, .045, .14, fz + .006, tw);   // power
  add(new THREE.SphereGeometry(.003, 8, 6), std('#ffb347', .3, 0, { emissive: lin('#ff9a2a'), emissiveIntensity: 1.5 }), .045, .11, fz + .006, tw);
  { const b = add(new THREE.CircleGeometry(.5, 32), std('#2f4fa0', .35, .2), -.02, .08, fz + .011, tw); b.scale.set(.06, .018, 1) }   // the badge
  add(new THREE.BoxGeometry(.035, .045, .002), std('#d8d2c8', .7), -.07, TH - .2, fz + .011, tw);   // the sticker

  // ── the keyboard: a full 104 keys on the tray ──
  const kb = new THREE.Group(); kb.position.set(-.06, .015, -.02); kb.rotation.x = .045; tray.add(kb);
  add(rbox(.47, .03, .17, .008), beigeL, 0, .012, 0, kb);
  { const U = .019, keys = [], row = (y, list, x0 = 0) => { let x = x0; for (const k of list) { if (k < 0) { x -= k; continue } keys.push([x + k / 2, y, k, 1]); x += k } };
    row(0, [1, -1, 1, 1, 1, 1, -.5, 1, 1, 1, 1, -.5, 1, 1, 1, 1, -.25, 1, 1, 1]);   // Esc, F1–F12, PrtSc…
    row(1.25, [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2, -.25, 1, 1, 1, -.25, 1, 1, 1, 1]);
    row(2.25, [1.5, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, -.25, 1, 1, 1, -.25, 1, 1, 1]);
    row(3.25, [1.75, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.25, -3.5, 1, 1, 1]);
    row(4.25, [2.25, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 2.75, -1.25, 1, -1.25, 1, 1, 1]);
    row(5.25, [1.25, 1.25, 1.25, 6.25, 1.25, 1.25, 1.25, 1.25, -.25, 1, 1, 1, -.25, 2, 1]);
    keys.push([23, 2.75, 1, 2], [22.75, 4.75, 1, 2]);   // the numpad's tall + and Enter
    const g = rbox(1, 1, 1, .18, 2), im = new THREE.InstancedMesh(g, std('#ffffff', .55), keys.length), mm = new THREE.Matrix4();
    keys.forEach(([x, y, w, h], i) => { const big = w > 1.2 || h > 1; mm.compose(new V3(-.215 + x * U, .031, -.07 + y * U + (h - 1) * U / 2), new Q4(), new V3(w * U - .003, .011, h * U - .003)); im.setMatrixAt(i, mm); im.setColorAt(i, lin(big ? '#c9bea6' : '#e2d8c2')) });
    im.castShadow = im.receiveShadow = true; kb.add(im);
  }
  // the mouse on its pad
  { add(rbox(.23, .004, .2, .002), std('#3d3644', .95, 0, { map: noiseTex(128, 70, 140, [2, 2]) }), .3, .012, -.02, tray);
    const ms = add(new THREE.SphereGeometry(1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), beigeL, .31, .014, -.03, tray); ms.scale.set(.032, .03, .055); ms.rotation.y = -.15 }

  // ── cables ── (to the back of the desk)
  const cab = (pts, r = .0035, m = std('#2a2826', .6)) => add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(p => new V3(...p))), 48, r, 6), m);
  cab([[.31, .63, .58], [.36, .66, .42], [.3, D.h + .002, .2], [.24, D.h + .002, .1], [.2, D.h + .02, .05]], .002, std('#d8cfbc', .5));   // the mouse
  cab([[.33, D.h + .02, .33], [.26, D.h + .003, .26], [.22, D.h + .004, .2], [.12, D.h + .003, .18], [-.02, D.h + .01, .1]]);
  cab([[.38, D.h + .02, .33], [.45, D.h + .003, .24], [.5, D.h + .003, .18], [.44, D.h + .004, .1], [.3, D.h + .01, .06]], .003, std('#cfc6b1', .5));
  cab([[-.36, D.h + .02, .33], [-.3, D.h + .003, .2], [-.18, D.h + .004, .14], [-.05, D.h + .01, .06]]);
  cab([[-.03, D.h + .1, .05], [-.03, D.h + .01, .045], [.05, D.h + .003, .05], [.5, D.h + .003, .07], [.6, D.h + .05, .07]], .004);   // monitor to the tower

  // ── the lamp: a black anglepoise on the left, its shade turned down toward the screen ──
  const lamp = new THREE.Group(); lamp.position.set(-.64, D.h, .24); sc.add(lamp);
  const lb = std('#0b0b0c', .32, .55), seg = (a, b, r = .007) => { const A = new V3(...a), B = new V3(...b), m = add(new THREE.CylinderGeometry(r, r, A.distanceTo(B), 12), lb, 0, 0, 0, lamp); m.position.copy(A).add(B).multiplyScalar(.5); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), B.clone().sub(A).normalize()); return m };
  add(new THREE.CylinderGeometry(.075, .085, .022, 40), lb, 0, .011, 0, lamp);
  add(new THREE.CylinderGeometry(.012, .016, .04, 16), lb, 0, .04, 0, lamp);
  const E = [-.08, .33, -.02], T = [.05, .6, .0], S = [.13, .52, .03];   // elbow, top joint, the shade
  seg([0, .05, 0], E); seg([.012, .05, .006], [E[0] + .01, E[1] - .02, E[2] + .006], .0025);   // the arm, and its spring rod
  seg(E, T); seg([E[0] + .01, E[1] + .02, E[2] + .006], [T[0] - .008, T[1] - .02, T[2] + .006], .0025);
  for (const p of [E, T]) add(new THREE.SphereGeometry(.012, 12, 8), lb, ...p, lamp);
  seg(T, S, .006);
  const shade = new THREE.Group(); shade.position.set(...S); lamp.add(shade);
  { const prof = [[.082, -.05], [.075, -.02], [.04, .03], [.03, .05], [.025, .07], [.0, .07]].map(([r, y]) => new THREE.Vector2(r, y));   // (rim to crown, so its faces look outward)
    const g = new THREE.LatheGeometry(prof, 48), outM = std('#0c0c0e', .35, .5), inM = std('#f2e6d0', .6, 0, { side: THREE.BackSide, emissive: lin('#ffd8a0'), emissiveIntensity: 1.2 });
    add(g, outM, 0, 0, 0, shade); const inner = add(g, inM, 0, 0, 0, shade); inner.castShadow = false; inner.scale.setScalar(.985);
    shade.rotation.z = .55; shade.rotation.x = .2; shade.scale.setScalar(1.2) }
  const bulb = add(new THREE.SphereGeometry(.022, 20, 12), new THREE.MeshBasicNodeMaterial({ color: lin('#fff1d8').multiplyScalar(6) }), 0, -.03, 0, shade); bulb.castShadow = false;
  { add(new THREE.CylinderGeometry(.0008, .0008, .06, 6), std('#4a463f', .5, .4), .055, -.085, 0, shade); add(new THREE.SphereGeometry(.0035, 8, 6), std('#6a655c', .6), .055, -.115, 0, shade) }   // the pull chain

  // ── light ──
  const spot = new THREE.SpotLight(0xffffff, 1, 6, THREE.MathUtils.degToRad(52), .65, 2);
  spot.castShadow = true; spot.shadow.mapSize.set(2048, 2048); spot.shadow.bias = -.0004; spot.shadow.normalBias = .01; spot.shadow.camera.near = .05; spot.shadow.camera.far = 6;
  sc.add(spot, spot.target);
  const bulbGlow = new THREE.PointLight(0xffd29a, 1, 1.6, 2); sc.add(bulbGlow);   // the shade's own glow, close in
  const scrLight = new THREE.SpotLight(0x9fc4ff, 1, 4, THREE.MathUtils.degToRad(75), 1, 2); mon.add(scrLight, scrLight.target); scrLight.position.set(0, by, glassZ + .02); scrLight.target.position.set(0, by - .05, 1.5);
  const hemi = new THREE.HemisphereLight(0x2a3a5c, 0x0a0806, 1); sc.add(hemi);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // ── the picture: tone mapped, bloom, vignette, grain. At the end of the dive it hands over to the galaxy's own picture (k) ──
  const pipe = new THREE.RenderPipeline(renderer); pipe.outputColorTransform = false;
  const rp = pass(sc, cam, { samples: 4 }), col = rp.getTextureNode('output'), bl = bloom(col, .35, .5, .85);
  pipe.outputNode = Fn(() => {
    const q = screenUV.sub(.5), v = float(1).sub(dot(q, q).mul(U2.vig.mul(1.6))).clamp(0, 1);
    const c = acesFilmicToneMapping(col.rgb.add(bl.rgb.mul(U2.bloomK.div(.35))), U2.exp).mul(v).toVar();
    const n = fract(sin(dot(screenUV.mul(U2.res).add(fract(U2.time.mul(7.13)).mul(91.7)), vec2(12.9898, 78.233))).mul(43758.5453)).sub(.5);
    const B = U2.band, direct = gT.sample(texUV(vec2(mix(B.x, B.z, screenUV.x), mix(B.y, B.w, screenUV.y)))).rgb;   // the window's part of the glass, full screen: the galaxy exactly as it'll be drawn next
    return vec4(mix(sRGBTransferOETF(c).add(n.mul(U2.grain)), direct, U2.k), 1);
  })();

  // ── the opening's page and the pointer's layer, laid onto the glass ──
  // which part of the glass is "the window": the glass is GA wide; the window's own shape sits in its middle, as wide or as tall as it
  function bandOf() { const A = innerWidth / Math.max(1, innerHeight); return A >= GA ? [0, .5 - GA / A / 2, 1, .5 + GA / A / 2] : [.5 - A / GA / 2, 0, .5 + A / GA / 2, 1] }   // [u0, v0, u1, v1], v from the top
  const _p = new V3();
  const toScreen = (u, v) => { glass.localToWorld(_p.set((u - .5) * SW, (.5 - v) * SH, 0)).project(cam); return [(_p.x * .5 + .5) * innerWidth, (-_p.y * .5 + .5) * innerHeight] };
  function homography(w, h, P) {   // the CSS matrix taking the box (0,0)…(w,h) onto the four points P (tl, tr, br, bl), and its inverse
    const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = P, dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3, dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3, den = dx1 * dy2 - dx2 * dy1 || 1e-9;
    const g = (dx3 * dy2 - dx2 * dy3) / den, hh = (dx1 * dy3 - dx3 * dy1) / den, a = x1 - x0 + g * x1, b = x3 - x0 + hh * x3, c = x0, d = y1 - y0 + g * y1, e = y3 - y0 + hh * y3, f = y0;
    const m = [a / w, b / h, c, d / w, e / h, f, g / w, hh / h, 1];   // row-major 3×3: (x, y, 1) in the box → the screen
    const [A, B, C, Dd, E, F, G, Hh, I] = m, det = A * (E * I - F * Hh) - B * (Dd * I - F * G) + C * (Dd * Hh - E * G) || 1e-12;
    const mi = [(E * I - F * Hh) / det, (C * Hh - B * I) / det, (B * F - C * E) / det, (F * G - Dd * I) / det, (A * I - C * G) / det, (C * Dd - A * F) / det, (Dd * Hh - E * G) / det, (B * G - A * Hh) / det, (A * E - B * Dd) / det];
    return { css: `matrix3d(${m[0]},${m[3]},0,${m[6]},${m[1]},${m[4]},0,${m[7]},0,0,1,0,${m[2]},${m[5]},0,${m[8]})`, mi };
  }
  const MOB = matchMedia('(pointer: coarse)').matches, SHEET = matchMedia('(max-width: 760px), (pointer: coarse)');   // a phone or tablet: no pointer of your own, so the 3D one sits on the glass from the start and goes where you tap
  const layers = () => [$('portalLoad'), MOB ? $('shipLayer') : null].filter(Boolean);   // (with a mouse the 3D pointer only takes over once you're through the glass: until then it's your own)
  function place() {
    const b = bandOf(); st.band = b; U2.band.value.set(b[0], b[1], b[2], b[3]);
    const P = [toScreen(b[0], b[1]), toScreen(b[2], b[1]), toScreen(b[2], b[3]), toScreen(b[0], b[3])], hm = homography(innerWidth, innerHeight, P); st.Mi = hm.mi;
    for (const el of layers()) { el.style.transformOrigin = '0 0'; el.style.transform = hm.css }
    const pl = $('portalLoad'); if (pl) pl.style.opacity = (st.lab && st.lab.p > 1 ? 0 : st.fade).toFixed(3);
  }
  const toWindow = (x, y) => { const m = st.Mi; if (!m) return [x, y]; const w = m[6] * x + m[7] * y + m[8]; return [(m[0] * x + m[1] * y + m[2]) / w, (m[3] * x + m[4] * y + m[5]) / w] };   // a point on screen → where it falls on the opening's page
  const unplace = () => { for (const el of layers()) { el.style.transform = ''; el.style.transformOrigin = '' } const pl = $('portalLoad'); if (pl) pl.style.opacity = '' };

  // ── the CRT over the whole screen: plain layers over every pixel (scan lines, phosphor stripes, dark corners, a rolling bar,
  // static, flicker, a phosphor punch), so the picture underneath is never touched. a: how much of it (0 = gone) ──
  const crtFx = (() => {
    const el = document.createElement('div'); el.id = 'crtFx'; el.setAttribute('aria-hidden', 'true'); el.innerHTML = '<i class="cg"></i><i class="cs"></i><i class="cm"></i><i class="cv"></i><i class="cr"></i><i class="cn"></i><i class="cf"></i>'; document.body.appendChild(el);
    const [cg, cs, cm, cv, cr, cn, cf] = el.children;
    { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'), im = g.createImageData(160, 160); for (let i = 0; i < im.data.length; i += 4) { const v = Math.random() * 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255 } g.putImageData(im, 0, 0); cn.style.backgroundImage = `url(${c.toDataURL()})` }
    let a = 0, dec = null;
    function draw(now) {
      if (a <= .002) { el.style.display = 'none'; return } el.style.display = 'block';
      el.style.setProperty('--sp', Math.max(2, innerHeight / Math.max(40, RL('crtLines', 260))).toFixed(2) + 'px'); el.style.setProperty('--tp', Math.max(1.5, innerWidth / Math.max(40, RL('crtTriads', 340))).toFixed(2) + 'px');
      cs.style.opacity = (RL('crtScan', .35) * a).toFixed(3); cm.style.opacity = (RL('crtMask', .35) * a * .55).toFixed(3); cv.style.opacity = Math.min(1, RL('crtVig', .6) * a).toFixed(3);
      cn.style.opacity = (RL('crtNoise', .25) * a * .4).toFixed(3); cn.style.backgroundPosition = `${(Math.random() * 160) | 0}px ${(Math.random() * 160) | 0}px`;
      cf.style.opacity = (RL('crtFlicker', .25) * a * Math.random() * .22).toFixed(3);
      cr.style.opacity = Math.min(1, RL('crtRoll', .3) * a * 1.6).toFixed(3); cr.style.transform = `translateY(${(((now * .00022) % 1.3) - .2) * innerHeight}px)`;
      const gl = RL('crtGlow', .5) * a, f = gl > .01 ? `brightness(${(1 + .3 * gl).toFixed(3)}) saturate(${(1 + .45 * gl).toFixed(3)}) contrast(${(1 + .1 * gl).toFixed(3)})` : 'none'; if (cg.dataset.f !== f) { cg.dataset.f = f; cg.style.backdropFilter = cg.style.webkitBackdropFilter = f }
    }
    const step = now => { if (!dec) return; const x = Math.min(1, (now - dec.t0) / 1000 / dec.out); a = dec.from * (1 - x) * (1 - x); draw(now); if (x < 1) requestAnimationFrame(step); else dec = null };
    return { set(v) { a = v; dec = null; draw(performance.now()) }, decay(out, from) { dec = { t0: performance.now(), out, from }; requestAnimationFrame(step) } };
  })();

  // ── each frame ──
  const _b = new V3(), _t = new V3(), _q1 = new Q4(), _p0 = new V3(), _p1 = new V3(), _m4 = new THREE.Matrix4(), _n = new V3(), _u = new V3();
  function apply() {
    const warm = RL('roomLampWarm', .6), lc = new C3(1, 1 - .22 * warm, 1 - .5 * warm), lmp = RL('roomLamp', 1), scr = RL('roomScreen', .5);
    spot.color.copy(lc); spot.intensity = 11 * lmp; spot.angle = THREE.MathUtils.degToRad(RL('roomLampCone', 52)); spot.penumbra = RL('roomLampSoft', .65); spot.shadow.radius = RL('roomShadow', 4);
    bulbGlow.color.copy(lc); bulbGlow.intensity = .5 * lmp;
    logoAt(1);
    { const bs = RL('roomBtn', 6.8).toFixed(2), by = (RL('roomBtnY', .82) * 100).toFixed(1) + '%'; if (bs !== st.bs || by !== st.by) { st.bs = bs; st.by = by; H0.style.setProperty('--rbs', bs); H0.style.setProperty('--rby', by) } }   // the Start button's size and place on the glass
    scrLight.intensity = 3 * scr * (1 + U2.scrOn.value * 2); U2.glow.value = scr * 3; U2.scrBr.value = RL('roomScreenBright', 1.4);
    C.flick.value = RL('crtFlicker', .25); C.roll.value = RL('crtRoll', .3); C.idle.value = RL('crtIdle', .3);
    hemi.intensity = .9 * RL('roomFill', 1);
    wall.color.copy(lin('#33465f')).multiplyScalar(RL('roomWall', 1)); const wk = RL('roomWood', 1); wood.color.setScalar(wk); woodV.color.copy(lin('#c8c8c8')).multiplyScalar(wk); woodDark.color.copy(lin('#8a8a8a')).multiplyScalar(wk);
    U2.exp.value = RL('roomExposure', 1.3) * st.fade; U2.bloomK.value = RL('roomBloom', .35); U2.vig.value = RL('roomVignette', .55) * (1 - U2.k.value); U2.grain.value = RL('roomGrain', .035);
  }
  function frame(now) {
    const dt = Math.min(.05, Math.max(0, (now - (st.t || now)) / 1000)); st.t = now; U2.time.value = now / 1000;
    if (st.fade < 1) st.fade = Math.min(1, st.fade + dt / Math.max(.05, RL('roomFadeIn', 1.2)));
    if (st.phase !== 'loading' && U2.scrOn.value < 1) U2.scrOn.value = Math.min(1, U2.scrOn.value + dt / .6);   // (the galaxy's picture warms up on the glass)
    apply();
    renderer.getDrawingBufferSize(U2.res.value);
    // the camera: in front of the desk, a little above it, swaying a touch with the pointer
    const sw = RL('roomSway', .04), px = st.ptr.in ? st.ptr.x / innerWidth - .5 : 0, py = st.ptr.in ? st.ptr.y / innerHeight - .5 : 0, f = Math.min(1, dt * 3);
    if (st.phase !== 'dive' && !st.lab) { st.sway.x += (px - st.sway.x) * f; st.sway.y += (py - st.sway.y) * f } else if (st.lab) st.sway.set(0, 0)
    const cx = RL('roomCamX', 0);
    cam.fov = RL('roomFov', 36); cam.aspect = innerWidth / Math.max(1, innerHeight); cam.updateProjectionMatrix();
    cam.position.set(cx + st.sway.x * sw * 2, RL('roomCamH', 1.2) - st.sway.y * sw, RL('roomCamZ', 2.45)); st.aim.set(cx * .6, RL('roomAimY', .9), .25); cam.up.set(0, 1, 0); cam.lookAt(st.aim);
    const peak = RL('crtPeak', 1), cin = Math.min(.99, RL('crtIn', .9)), out = Math.max(.05, RL('crtOut', .7));
    if (st.lab) { labStep(dt); const sh = SHEET.matches ? innerHeight * .2 * (1 - sstep(Math.max(0, st.lab.p), .6, 1)) : 0; if (sh > .5) cam.setViewOffset(innerWidth, innerHeight, 0, sh, innerWidth, innerHeight); else cam.clearViewOffset() }   /* (on a phone the playground is a sheet over the bottom: the room is lifted into the top part) */ else if (cam.view && cam.view.enabled) cam.clearViewOffset();   // the CRT playground: the move held wherever you scrub it
    else if (st.phase === 'dive') {   // into the glass, the first part of the one move (see mkRun); the CRT comes over the screen as the glass fills it
      const R = st.run; R.t += dt; const s = Math.min(R.s(R.t), R.Dr); posed(s / R.Dr); crtFx.set(peak * sstep(s / R.Dr, cin, 1));
      if (R.s(R.t) >= R.Dr) { finish(); crtFx.decay(out, peak); return }   // the glass fills the window: the galaxy carries on with the same run, the CRT fades off it
    }
    cam.updateMatrixWorld();
    // the lamp's light leaves the bulb along the shade's axis
    shade.updateWorldMatrix(true, false); bulb.getWorldPosition(_b); spot.position.copy(_b); bulbGlow.position.copy(_b).add(_t.set(0, -.03, 0));
    _t.set(0, -1, 0).transformDirection(shade.matrixWorld); spot.target.position.copy(_b).addScaledVector(_t, 1);
    place();
    pipe.render();
  }
  const loop = now => { if (!st.on) return; requestAnimationFrame(loop); try { frame(now) } catch (e) { console.error(e) } };
  // the camera at a point p (0 … 1) of the way into the glass: nearer by the run's log distance, turning square onto it
  function prepRun() {
    st.q0 = cam.quaternion.clone(); glassPose(); const b = bandOf(), d1 = (b[3] - b[1]) * SH / (2 * Math.tan(cam.fov * Math.PI / 360)); st.d0 = cam.position.distanceTo(_t); st.dir0 = cam.position.clone().sub(_t).normalize();
    let Dg = 1.8; try { Dg = Math.max(.3, intro.lnPV - intro.lnD0) } catch (e) { }
    st.run = mkRun(Math.max(.2, Math.log(st.d0 / d1)), Dg, Math.max(.6, RL('roomDive', 2.8)));
  }
  function posed(p) {
    const w = sstep(p, 0, 1), Dr = st.run.Dr; glassPose(); _p1.copy(_t).addScaledVector(_n, st.d0 * Math.exp(-Dr)); _m4.lookAt(_p1, _t, _u); _q1.setFromRotationMatrix(_m4);
    _p0.copy(st.dir0).lerp(_n, w).normalize(); cam.position.copy(_t).addScaledVector(_p0, st.d0 * Math.exp(-Dr * p)); cam.quaternion.slerpQuaternions(st.q0, _q1, w); U2.k.value = sstep(p, .8, 1);
  }
  function finish() {
    st.on = false; st.phase = 'done'; unplace(); if (st.lab) lab(false);
    H0.classList.remove('roomboot', 'roomlive'); document.body.classList.remove('room', 'roommob');
    renderer.shadowMap.enabled = false; const cb = st.onDone; st.onDone = null; if (cb) cb();
    setTimeout(() => { sc.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose() }); gRT.dispose() }, 2000);
  }
  // the galaxy's picture for the glass: the main render, aimed into the render target, with the lens opened out so the window's
  // own view is exactly the middle of it (the glass's shape around it)
  const _s = new THREE.Vector2();
  function galaxy(fn) {
    if (!st.on) return fn();
    renderer.getDrawingBufferSize(_s); const w = Math.max(64, Math.min(st.phase === 'post' ? 2560 : 1600, Math.round(_s.x))), h = Math.round(w / GA); if (gRT.width !== w || gRT.height !== h) gRT.setSize(w, h);
    const c = camera;
    const fov = c.fov, asp = c.aspect, A = innerWidth / Math.max(1, innerHeight), t = Math.tan(fov * Math.PI / 360), tR = A >= GA ? t * A / GA : t;
    c.fov = 2 * Math.atan(tR) * 180 / Math.PI; c.aspect = GA; c.updateProjectionMatrix();
    renderer.setRenderTarget(gRT); try { fn() } finally { renderer.setRenderTarget(null); c.fov = fov; c.aspect = asp; c.updateProjectionMatrix() }
  }
  // Start: on the glass, the opening's button (or Enter / Space); Esc skips the room and the opening
  // the one move, room → glass → galaxy → behind your pointer, as log distance travelled (each e-fold nearer counts 1): it eases in,
  // then carries on at one steady pace through the glass and down into the galaxy, and the settle behind your pointer brakes it
  // (intro.settleStart takes over at that pace). Dr: the room's share, Dg: the galaxy's
  function mkRun(Dr, Dg, T) { const a = .45, L = Dr + Dg, k = L / (T * (1 - a / 2)); return { t: 0, Dr, Dg, L, vend: k, s: t => { const u = t / T; return k * T * (u < a ? u * u / (2 * a) : u - a / 2) } } }
  function glassPose() { glass.updateWorldMatrix(true, false); glass.getWorldPosition(_t); _n.set(0, 0, 1).transformDirection(glass.matrixWorld); _u.set(0, 1, 0).transformDirection(glass.matrixWorld) }
  function dive() {
    if (st.phase !== 'ready' || st.lab) return; st.phase = 'dive'; prepRun();
    try { setMuted(false); setMusicOff(false); audio(); intro.heard = true } catch (e) { }   // (the sound starts with Start)
    st.onDone = () => { try { intro.ready = true; intro.rr = st.run; if (MOB) return; intro.mx = intro.mxs = Math.max(-1, Math.min(1, st.ptr.x / innerWidth * 2 - 1)); intro.my = intro.mys = Math.max(-1, Math.min(1, -(st.ptr.y / innerHeight * 2 - 1))); if (!coarse && !lockFailed) { st.lockT = performance.now() + 800; requestLock() } } catch (e) { } };   // the opening carries on the same move from there, and your pointer becomes the 3D one right where it is (the lock still counts as part of the click)
  }
  // input: in the room nothing reaches the galaxy (no dragging, swiping or scrolling it round); only Start, the panels, and on a phone the taps that move the pointer on the glass
  const onBtn = e => e.target && e.target.closest && e.target.closest('#plEnter'), inUI = e => e.target && e.target.closest && e.target.closest('#lookPanel,#crtLab'), held = () => st.on && st.phase !== 'post';
  addEventListener('pointermove', e => { if ((st.on || performance.now() < (st.lockT || 0)) && document.pointerLockElement && Math.abs(e.movementX) + Math.abs(e.movementY) > 80) { e.stopImmediatePropagation(); return }   /* (the jump some browsers report as the lock takes hold: not a real move) */ if (!document.pointerLockElement) { st.ptr.x = e.clientX; st.ptr.y = e.clientY; st.ptr.in = true } if (held() && !inUI(e)) e.stopImmediatePropagation() }, true);
  addEventListener('pointerdown', e => { if (held() && !inUI(e)) { e.stopImmediatePropagation(); if (e.pointerType === 'touch' && (st.phase === 'ready' || st.phase === 'loading')) { const x0 = e.clientX, y0 = e.clientY; clearTimeout(st.lp); st.lpAt = [x0, y0]; st.lp = setTimeout(() => { st.lp = 0; st.lpFired = true; if (st.lab) lab(false); else lab(true) }, 650) } } }, true);   // a long press on the room (touch): the CRT playground, open or shut
  addEventListener('pointermove', e => { if (st.lp && st.lpAt && Math.hypot(e.clientX - st.lpAt[0], e.clientY - st.lpAt[1]) > 12) { clearTimeout(st.lp); st.lp = 0 } }, true);
  ['pointerup', 'pointercancel'].forEach(t => addEventListener(t, () => { if (st.lp) { clearTimeout(st.lp); st.lp = 0 } }, true));
  addEventListener('pointerup', e => {
    if (!held() || inUI(e)) return; e.stopImmediatePropagation(); if (st.phase !== 'ready' || st.lab || st.lpFired) { st.lpFired = false; return }
    if (MOB) { const [wx, wy] = toWindow(e.clientX, e.clientY); if (wx >= 0 && wx <= innerWidth && wy >= 0 && wy <= innerHeight) try { intro.mx = wx / innerWidth * 2 - 1; intro.my = -(wy / innerHeight * 2 - 1) } catch (er) { } }   // a tap on the glass: the pointer glides there
    if (onBtn(e)) dive();
  }, true);
  ['touchstart', 'touchmove', 'touchend'].forEach(t => addEventListener(t, e => { if (held() && !inUI(e)) { e.stopImmediatePropagation(); if (t === 'touchmove' && e.cancelable) e.preventDefault() } }, { capture: true, passive: false }));
  addEventListener('wheel', e => { if (held() && !inUI(e)) e.stopImmediatePropagation() }, { capture: true, passive: true });
  addEventListener('keydown', e => {
    if (!st.on || (e.target.matches && e.target.matches('input,textarea,select'))) return; const k = e.key;
    if (st.phase === 'post') return;
    if (k === 'Enter' || k === ' ' || k === 'ArrowDown') { e.preventDefault(); e.stopImmediatePropagation(); if (st.phase === 'ready') dive() }
    else if (k === 'Escape' && st.lab) { e.stopImmediatePropagation(); lab(false) }
    else if (k === 'Escape') { if (st.phase === 'ready') { st.onDone = null; finish(); logoAt(9) } else e.stopImmediatePropagation() }   // (ready: the opening's own Esc then skips it too)
  }, true);
  addEventListener('resize', () => { if (st.on) renderer.setSize(innerWidth, innerHeight, false) });

  // ── the CRT playground (Look → Room: CRT → Playground, or #crt-lab): the move held wherever you scrub it, or played through,
  // over and over, with every CRT setting beside it. 0 … 1 is the room up to the glass, 1 … 1.4 is just through it ──
  const LAB_KEYS = ['crtPeak', 'crtIn', 'crtOut', 'crtScan', 'crtLines', 'crtMask', 'crtTriads', 'crtGlow', 'crtFlicker', 'crtRoll', 'crtNoise', 'crtVig', 'crtIdle', 'roomDive'];
  let labEl = null, labSave = 0;
  function buildLab() {
    if (labEl) return; const rows = []; LOOK_DEF.forEach(([, rs]) => rs.forEach(r => { if (LAB_KEYS.includes(r[0])) rows.push(r) })); rows.sort((a, b) => LAB_KEYS.indexOf(a[0]) - LAB_KEYS.indexOf(b[0]));
    labEl = document.createElement('div'); labEl.id = 'crtLab';
    labEl.innerHTML = `<header><b>CRT playground</b><button type="button" class="x" aria-label="Close">✕</button></header><div class="cl-scrub"><span>The move: room · glass · through</span><input type="range" min="0" max="1.4" step=".001" value="0"><div class="cl-btns"><button type="button" class="btn play">▶ Play</button><button type="button" class="btn loop">Loop</button><button type="button" class="btn copy">Copy settings</button></div></div><div class="cl-rows"></div><p class="cl-msg"></p>`;
    const box = labEl.querySelector('.cl-rows'), scrub = labEl.querySelector('.cl-scrub input'), msg = labEl.querySelector('.cl-msg');
    for (const [k, label, , def, mn, mx, stp] of rows) {
      const w = document.createElement('label'); w.className = 'cl-row'; const dec = stp < .01 ? 3 : stp < 1 ? 2 : 0, v = LOOK[k] ?? def;
      w.innerHTML = `<span>${label}</span><input type="range" min="${mn}" max="${mx}" step="${stp}" value="${v}"><output>${(+v).toFixed(dec)}</output>`;
      const inp = w.querySelector('input'), o = w.querySelector('output'); inp.oninput = () => { LOOK[k] = +inp.value; o.textContent = (+inp.value).toFixed(dec); clearTimeout(labSave); labSave = setTimeout(() => { try { saveLook() } catch (e) { } }, 300) };
      box.appendChild(w);
    }
    scrub.oninput = () => { if (st.lab) { st.lab.p = +scrub.value; st.lab.play = false } };
    labEl.querySelector('.play').onclick = () => { if (st.lab) { st.lab.play = true; st.lab.t = 0; st.lab.tArr = null } };
    labEl.querySelector('.loop').onclick = e => { if (st.lab) { st.lab.loop = !st.lab.loop; e.target.classList.toggle('on', st.lab.loop); if (st.lab.loop && !st.lab.play) { st.lab.play = true; st.lab.t = 0; st.lab.tArr = null } } };
    labEl.querySelector('.copy').onclick = async () => { const o = {}; LAB_KEYS.forEach(k => { if (LOOK[k] != null) o[k] = LOOK[k] }); const t = 'FWA FOREVER look settings: ' + JSON.stringify(o); try { await navigator.clipboard.writeText(t); msg.textContent = 'Copied: paste it in the chat' } catch (e) { msg.textContent = t } };
    labEl.querySelector('.x').onclick = () => lab(false);
    labEl.scrub = scrub; document.body.appendChild(labEl);
  }
  function lab(on = true) {
    if (on && !st.lab && st.on && st.phase !== 'dive' && st.phase !== 'post') { buildLab(); st.lab = { p: 0, play: false, loop: false, t: 0, tArr: null, prep: false }; labEl.hidden = false; labEl.scrub.value = 0 }
    else if (!on && st.lab) { st.lab = null; if (labEl) labEl.hidden = true; crtFx.set(0); U2.k.value = 0 }
  }
  function labStep(dt) {
    const L = st.lab, peak = RL('crtPeak', 1), cin = Math.min(.99, RL('crtIn', .9)), out = Math.max(.05, RL('crtOut', .7)); if (!L.prep) { prepRun(); L.prep = true }   // (from where the camera rests)
    if (L.play) {   // the real timing: the run up to the glass, then the fade once through
      L.t += dt; const R = st.run, s = R.s(L.t); if (s >= R.Dr && L.tArr == null) L.tArr = L.t;
      L.p = L.tArr == null ? s / R.Dr : 1 + .4 * Math.min(1, (L.t - L.tArr) / out);
      if (L.p >= 1.4) { if (L.loop) { L.t = -.6; L.tArr = null } else L.play = false } labEl.scrub.value = Math.max(0, L.p);
    }
    const p = Math.max(0, L.p); if (p <= 1) { posed(p); crtFx.set(peak * sstep(p, cin, 1)) } else { posed(1); const x = Math.min(1, (p - 1) / .4); crtFx.set(peak * (1 - x) * (1 - x)); U2.k.value = 1 }
  }

  // build, compile, show: then the galaxy loads behind the glass
  H0.classList.add('nomark');   // (only the galaxy on the glass: no mark round it, here or after)
  // the FWA logo on the glass, flat on it, near the top: it comes at you with the glass and, once you're through, carries on
  // past you at the same pace (afterGlass, from the opening's move) and is gone
  const logo = (() => { const pl = $('portalLoad'), mk = document.querySelector('#intro .mark'); if (!pl || !mk) return null; const el = document.createElement('div'); el.id = 'rmLogo'; const sv = mk.cloneNode(true); sv.removeAttribute('class'); el.appendChild(sv); pl.appendChild(el); return el })();
  const logoAt = (m = 1) => { if (!logo) return; const y = RL('roomLogoY', .2) * 100, w = RL('roomLogo', .46) * 100; logo.style.top = (50 + (y - 50) * m).toFixed(3) + '%'; logo.style.width = (w * m).toFixed(3) + '%'; logo.style.opacity = (1 - sstep(m, 1.5, 3)).toFixed(3); logo.style.display = m > 3.2 ? 'none' : '' };   // m: how much nearer than on the glass (scaled about the middle of the view)
  const startP = (async () => {
    cam.aspect = innerWidth / Math.max(1, innerHeight); cam.updateProjectionMatrix();
    try { await renderer.compileAsync(sc, cam) } catch (e) { }
    st.on = true; st.phase = 'loading'; document.body.classList.add('room'); if (MOB) document.body.classList.add('roommob'); H0.classList.add('roomlive'); requestAnimationFrame(loop);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));   // (two frames of it on screen before the heavy loading starts)
  })();
  return {
    get on() { return st.on }, on0: true, get diving() { return st.phase === 'dive' }, get phase() { return st.phase }, startP, galaxy, dive,
    galaxyReady() { if (st.phase === 'loading') { st.phase = 'ready'; if (/crt-?lab/.test(location.hash)) lab(true) } }, lab, get ptrOn() { return MOB && (st.phase === 'ready' || st.phase === 'dive') },   // the opening has its galaxy up: the glass shows it and Start works
    skip() { if (st.on) finish(); logoAt(9) }, afterGlass(s) { logoAt(Math.exp(Math.max(0, s))) }, glass, cam, scene: sc, get st() { return st },
  };
})();
await room.startP;
// between the files that follow, a breath for the room to draw a frame (see shell.mjs), so it never freezes while the galaxy loads
let roomYT = 0;
const roomYield = () => { if (!room.on || performance.now() - roomYT < 40) return; return new Promise(r => requestAnimationFrame(() => setTimeout(() => { roomYT = performance.now(); r() }, 0))) };
