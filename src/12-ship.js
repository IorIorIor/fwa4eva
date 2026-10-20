/* ───────────────────────── the outpost, the ship, its trail, and the dust right around you ───────────────────────── */
// collapse a hierarchy of small meshes into one mesh per material (dozens of draw calls become a handful)
function mergeByMaterial(group, keep = () => false) {
  group.updateMatrixWorld(true); const inv = group.matrixWorld.clone().invert(), byMat = new Map(), kept = [];
  group.traverse(o => { if (!o.isMesh || o === group) return; if (keep(o)) { kept.push(o); return } const g = o.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld)); (byMat.get(o.material) || byMat.set(o.material, []).get(o.material)).push(g) });
  const out = new THREE.Group(); byMat.forEach((gs, m) => out.add(new THREE.Mesh(mergeGeometries(gs.map(g => g.index ? g : g.toNonIndexed())), m)));
  return { merged: out, kept };
}
const outpost = new THREE.Group(); outpost.scale.setScalar(SHIP_K); outpost.visible = false;   // retired: flights start out past the rim now
const ring2 = new THREE.Group(); outpost.add(ring2);
const beacons = [], beamPivot = new THREE.Group();
{
  const hull = new THREE.MeshStandardMaterial({ color: 0xb9b4d6, roughness: .55, metalness: .35 }), dark = new THREE.MeshStandardMaterial({ color: 0x2a2740, roughness: .75, metalness: .2 }), win = new THREE.MeshStandardMaterial({ color: 0xffd9a0, emissive: 0xffb547, emissiveIntensity: 1.9 });
  const hub = new THREE.Group(), rg = new THREE.Group();
  const add = (geo, m, x, y, z, parent = hub) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o };
  const beacon = (col, x, y, z, parent) => { const b = new THREE.Mesh(new THREE.BoxGeometry(...(col === 0x5ee0b0 ? [4, 2, 4] : col === 0xff5f5f ? [5, 5, 5] : [3, 3, 3])), new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1 })); b.position.set(x, y, z); parent.add(b); beacons.push(b); return b };
  add(new THREE.CylinderGeometry(OUT.hubR, OUT.hubR, OUT.hubH * 2, 8), hull, 0, 0, 0);
  add(new THREE.CylinderGeometry(OUT.hubR * .7, OUT.hubR * .7, 20, 8), dark, 0, OUT.hubH + 6, 0);
  add(new THREE.CylinderGeometry(OUT.hubR * .55, OUT.hubR * .3, 30, 8), dark, 0, -OUT.hubH - 15, 0);
  for (let k = 0; k < 8; k++) { const a = k / 8 * Math.PI * 2; for (const y of [20, -20]) { const w = add(new THREE.BoxGeometry(10, 4, 1), win, Math.cos(a) * (OUT.hubR - .5), y, Math.sin(a) * (OUT.hubR - .5)); w.rotation.y = -a + Math.PI / 2 } }
  add(new THREE.BoxGeometry(OUT.padHalf * 2, 4, OUT.padHalf * 2), dark, 0, OUT.padY, 0);   // landing pad on top
  [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([x, z]) => beacon(0x5ee0b0, x * (OUT.padHalf - 4), OUT.padY + 3, z * (OUT.padHalf - 4), outpost));
  add(new THREE.BoxGeometry(60, .6, 3), win, 0, OUT.padY + 2.3, 0); add(new THREE.BoxGeometry(3, .6, 60), win, 0, OUT.padY + 2.3, 0);
  add(new THREE.BoxGeometry(2, 90, 2), hull, 0, -OUT.hubH - 75, 0);                          // antenna
  beacon(0xff5f5f, 0, -OUT.hubH - 122, 0, outpost);
  for (let k = 0; k < 4; k++) { const a = k / 4 * Math.PI * 2; const sp = add(new THREE.BoxGeometry(OUT.ringR - OUT.hubR, 6, 6), hull, Math.cos(a) * (OUT.ringR + OUT.hubR) / 2, 0, Math.sin(a) * (OUT.ringR + OUT.hubR) / 2, rg); sp.rotation.y = -a }
  for (let k = 0; k < 16; k++) {
    const a = k / 16 * Math.PI * 2, m = add(new THREE.BoxGeometry(30, OUT.ringT * 1.4, OUT.ringT * 1.6), k % 4 === 0 ? dark : hull, Math.cos(a) * OUT.ringR, 0, Math.sin(a) * OUT.ringR, rg); m.rotation.y = -a + Math.PI / 2;
    add(new THREE.BoxGeometry(18, 3, .6), win, 0, 4, OUT.ringT * .8 + .1, m);
    if (k % 4 === 2) beacon(0xffb547, 0, OUT.ringT * .7 + 2, 0, m);
  }
  add(new THREE.BoxGeometry(10, 6, 10), new THREE.MeshStandardMaterial({ color: 0xfff1d6, emissive: 0xffd28e, emissiveIntensity: 2.5 }), 0, -OUT.hubH - 26, 0);
  // ring beacons ride the turning ring: lift them out before merging, keeping their place
  rg.updateMatrixWorld(true); beacons.filter(b => b.parent !== outpost).forEach(b => { const w = new THREE.Matrix4().copy(b.matrixWorld); rg.updateMatrixWorld(true); b.parent.remove(b); b.matrix.copy(new THREE.Matrix4().copy(rg.matrixWorld).invert().multiply(w)); b.matrix.decompose(b.position, b.quaternion, b.scale); ring2.add(b) });
  outpost.add(mergeByMaterial(hub).merged); ring2.add(mergeByMaterial(rg).merged);
  outpost.add(new THREE.PointLight(0xffc98a, 1.2 * Math.PI, 45, 0));   // r184 falloff tuned to match the old (1-d/110)² curve over the station
  // a slow sweeping searchlight under the hub
  const bg = new THREE.ConeGeometry(80, 1600, 40, 1, true); bg.translate(0, -800, 0);
  const bm = skyMat({ side: THREE.DoubleSide }), vH = varying(positionGeometry.y.negate().div(1600), 'vH');
  bm.fragmentNode = vec4(vec3(1, .86, .62).mul(pow(vH.oneMinus(), 2.2).mul(.2).mul(pow(abs(dot(normalWorld, viewDir())), 1.4))), 1);
  const beam = new THREE.Mesh(bg, bm); beam.rotation.z = 1.05; beamPivot.position.set(0, -OUT.hubH - 26, 0); beamPivot.add(beam); outpost.add(beamPivot);
}

/* the ship: a mouse pointer. The classic arrow, extruded: a black face inside a white border that steps down around it,
   like the pointer on a Mac. Tip forward; the stem is the engine, with a round hole in its back where the trail comes out. */
const ARROW = (() => {
  const P0 = [[0, 0], [0, 16.6], [4.2, 12.6], [7.3, 19.2], [9.6, 18.2], [6.6, 11.7], [11.7, 11.7]], k = .36;
  const ax = Math.atan2(8.45, 18.7), rot = ([x, y]) => [x * Math.cos(ax) - y * Math.sin(ax), x * Math.sin(ax) + y * Math.cos(ax)];   // tip → stem along the axis
  const R = P0.map(rot), cx = R.reduce((s, p) => s + p[0], 0) / R.length, cy = R.reduce((s, p) => s + p[1], 0) / R.length;
  const pts = R.map(([x, y]) => [(x - cx) * k, (y - cy) * k]);
  const stem = rot([8.45, 18.7]); return { pts, ax, tail: [(stem[0] - cx) * k, (stem[1] - cy) * k] };
})();
function inflate(pts, o) {   // offset a polygon outward by o (mitred, clamped at sharp corners)
  const n = pts.length; let ar = 0; for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ar += a[0] * b[1] - b[0] * a[1] } const sg = Math.sign(ar);
  const nrm = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [sg * dy / l, -sg * dx / l] };
  return pts.map((p, i) => {
    const n1 = nrm(pts[(i + n - 1) % n], p), n2 = nrm(p, pts[(i + 1) % n]), bx = n1[0] + n2[0], by = n1[1] + n2[1], bl = Math.hypot(bx, by) || 1;
    const L = o * Math.min(3.5, 1 / Math.sqrt(Math.max(.02, (1 + n1[0] * n2[0] + n1[1] * n2[1]) / 2)));   // mitre length
    return [p[0] + bx / bl * L, p[1] + by / bl * L];
  });
}
const ARROW_TILT = 0;
/* the engine: a round hole in the back of the stem. It's drawn as one disc whose shader looks into a tube behind it
   (where the view ray meets the wall or the floor), so it reads as a real opening from any angle. The floor is the light. */
const HOLE = { r: .3, d: .55, z: .42 };   // radius, depth (model units), and how far the border sits behind the stem's end
function holeMesh() {
  const u = { col: uniform(new C3(1, .3, .3)), on: uniform(0) }, m = new THREE.MeshBasicNodeMaterial();
  const pv = varying(modelViewMatrix.mul(vec4(positionGeometry, 1)).xyz), pg = varying(positionGeometry.xy);
  m.colorNode = Fn(() => {
    const v = normalize(transpose(modelViewMatrix).mul(vec4(normalize(pv), 0)).xyz), q = pg, r = float(HOLE.r), d = float(HOLE.d);
    const vz = min(v.z, -.02), a = max(dot(v.xy, v.xy), 1e-6), b = dot(q, v.xy), c = dot(q, q).sub(r.mul(r));
    const tw = sqrt(max(b.mul(b).sub(a.mul(c)), 0)).sub(b).div(a), tb = d.div(vz.negate()), floor_ = step(tb, tw);
    const zw = min(tw.mul(vz.negate()), d), qb = q.add(v.xy.mul(tb)), core = exp(dot(qb, qb).div(r.mul(r).mul(.22)).negate());
    const wall = u.col.mul(exp(d.sub(zw).mul(-4.5))).mul(u.on.mul(1.4)).add(vec3(.015));
    const flr = mix(u.col, vec3(1), core.mul(.65)).mul(u.on.mul(core.mul(5).add(1.6))).add(vec3(.02));
    return mix(wall, flr, floor_);
  })();
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(HOLE.r, 40), m); mesh.u = u; return mesh;
}   // flat: the tip points exactly where you're going (the chase camera sits high enough to see the face)
function makeAvatar() {
  const g = new THREE.Group(), body = new THREE.Group();
  const shape = pts => { const s = new THREE.Shape(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s };
  const slab = (pts, depth, mats) => { const geo = new THREE.ExtrudeGeometry(shape(pts), { depth, bevelEnabled: false }); geo.translate(0, 0, -depth / 2); geo.rotateX(Math.PI / 2); return new THREE.Mesh(geo, mats) };
  const white = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .32, roughness: .38, metalness: .05 });
  const black = new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .42, metalness: .25 }), rim = new THREE.MeshStandardMaterial({ color: 0x6c6c74, emissive: 0xffffff, emissiveIntensity: .05, roughness: .5, metalness: .1 });
  body.add(slab(ARROW.pts, 1.3, [black, black]), slab(inflate(ARROW.pts, .42), .96, [white, rim]));   // the border's top is white, its edges a soft grey
  body.rotation.x = ARROW_TILT;   // tip raised, so from the chase camera it reads as a pointer, face on
  g.add(body);
  const [tx, tz] = ARROW.tail, tail = new V3(tx, 0, tz + HOLE.z).applyEuler(new THREE.Euler(ARROW_TILT, 0, 0)); g.userData.tail = tail;   // the mouth of the hole
  const hole = holeMesh(); hole.position.copy(tail).add(new V3(0, 0, .004)); g.add(hole); g.userData.hole = hole.u;
  const fg = new THREE.ConeGeometry(.55, 3, 12, 1, true); fg.rotateX(Math.PI / 2); fg.translate(tail.x, tail.y, tail.z + 1.5);
  const flame = new THREE.Mesh(fg, new THREE.MeshBasicMaterial({ color: 0xffb547, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(flame); g.userData.flame = flame;
  // the trail emitter: a soft light in the back of the stem, faint at rest and bright while you thrust
  const em = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); em.position.set(tail.x, tail.y, tail.z + .05); em.scale.setScalar(HOLE.r * 3.2); g.add(em); g.userData.emit = em;
  const nav = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 }), dot = (c, p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.32, .32, .32), nav(c)); b.position.copy(p); g.add(b); return b };
  const at = i => new V3(ARROW.pts[i][0], .7, ARROW.pts[i][1]).applyEuler(new THREE.Euler(ARROW_TILT, 0, 0));
  g.userData.nav = [dot(0xff4a4a, at(1)), dot(0x4aff8a, at(6)), dot(0xffffff, at(0))];
  return g;
}
const avatar = makeAvatar(); avatar.scale.setScalar(.68 * SHIP_K); scene.add(avatar);
/* the engine flare: a hard white point, a wide bloom round it and thin diffraction spikes, all sized in screen pixels so it
   reads the same at any distance. It sits at the mouth of the hole and only shows while you can see into it. */
const flare = (() => {
  const u = { col: uniform(new C3(1, .4, .4)), k: uniform(0), n: uniform(4), turn: uniform(Math.PI / 4), px: uniform(280) };
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  m.colorNode = Fn(() => {
    const p = uv().sub(.5).mul(u.px), r = length(p), L = u.px.mul(.5), spikes = float(0).toVar();
    for (let j = 0; j < 4; j++) {   // up to four lines through the centre: 2, 4, 6 or 8 spikes
      const a = u.turn.add(float(j * 2 * Math.PI).div(u.n)), dir = vec2(cos(a), sin(a)), along = abs(dot(p, dir)), across = abs(dot(p, vec2(dir.y.negate(), dir.x)));
      const w = along.mul(.006).add(.75), fall = pow(max(0, along.div(L).oneMinus()), 2.6);
      spikes.addAssign(exp(across.div(w).pow(2).negate()).mul(fall).mul(step(float(j).add(.5), u.n.mul(.5))));
    }
    const core = exp(r.div(1.5).pow(2).negate()), bloomIn = exp(r.div(L.mul(.022)).negate()), bloomOut = exp(r.div(L.mul(.15)).negate());
    const c = mix(u.col, vec3(1), .55).mul(spikes.mul(1.1)).add(vec3(1).mul(core.mul(6))).add(mix(u.col, vec3(1), .35).mul(bloomIn.mul(1.1))).add(u.col.mul(bloomOut.mul(.4)));
    return vec4(c.mul(u.k), 1);
  })();
  const s = new THREE.Sprite(m); s.renderOrder = 6; s.frustumCulled = false; s.u = u; s.position.copy(avatar.userData.tail).add(new V3(0, 0, .06)); avatar.add(s); return s;
})();

/* TRON light trail: emitted only while you thrust. Each point keeps the colour and brightness it was born with,
   so the trail records how fast you were going along its length. Vertices are written relative to the ship,
   which keeps them steady however far from home you are. */
const TR_MAX = 1000, TR_STRAND = 230;
const trPos = new Float32Array(TR_MAX * 6), trT = new Float32Array(TR_MAX * 2), trV = new Float32Array(TR_MAX * 2), trC = new Float32Array(TR_MAX * 6), trA = new Float32Array(TR_MAX * 2);
for (let k = 0; k < TR_MAX; k++) { trV[k * 2] = 1; trV[k * 2 + 1] = -1 }
const trail = (() => {
  const g = new THREE.BufferGeometry(), ix = []; for (let k = 0; k < TR_MAX - 1; k++) { const a = k * 2; ix.push(a, a + 1, a + 2, a + 1, a + 3, a + 2) } g.setIndex(ix);
  [['position', trPos, 3], ['aT', trT, 1], ['aV', trV, 1], ['aC', trC, 3], ['aA', trA, 1]].forEach(([n, a, c]) => g.setAttribute(n, new THREE.BufferAttribute(a, c).setUsage(THREE.DynamicDrawUsage)));
  const u = { core: uniform(1), glow: uniform(1), taper: uniform(1.35), shim: uniform(.08), nearA: uniform(4), nearB: uniform(30) }, m = skyMat({ side: THREE.DoubleSide });
  const vT = varying(attribute('aT', 'float')), vV = varying(attribute('aV', 'float')), vC = varying(attribute('aC', 'vec3'));
  const vA = varying(attribute('aA', 'float').mul(smoothstep(u.nearA, u.nearB, modelViewMatrix.mul(vec4(positionGeometry, 1)).z.negate())));
  m.fragmentNode = Fn(() => {
    const core = exp(vV.mul(vV).mul(-38)), halo = exp(vV.mul(vV).mul(-3.5)), along = pow(max(0, vT.oneMinus()), u.taper);
    const flick = u.shim.oneMinus().add(u.shim.mul(sin(vT.mul(240).sub(U.now.mul(30)))));
    return vec4(vC.mul(halo).mul(.85).mul(u.glow).add(mix(vC, vec3(1), .75).mul(core).mul(1.6).mul(u.core)).mul(along).mul(flick).mul(vA), 1);
  })();
  const mesh = layer(new THREE.Mesh(g, m), scene, 0); mesh.u = u; return mesh;
})();

/* the ship's shadow on the galaxy plane when you skim it */
const shadowMesh = (() => {
  const tex = radialTex(128, [[0, 'rgba(0,0,0,.85)'], [.45, 'rgba(0,0,0,.35)'], [1, 'rgba(0,0,0,0)']]), geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const m = layer(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, color: 0x000000, transparent: true, depthWrite: false, opacity: 0, side: THREE.DoubleSide })), scene, 1); m.visible = false; return m;
})();

/* dust motes: world-fixed grains tiled around the camera. Thick in the disk and the arms, thin in the halo, warm near
   the core and cold toward the rim, drifting with the galaxy. Computed camera-relative so they never shimmer. */
const MOTE_N = 8000;
const motes = (() => {
  const a = new Float32Array(MOTE_N * 3), r = new Float32Array(MOTE_N); for (let i = 0; i < MOTE_N; i++) { a[i * 3] = Math.random() * 2 - 1; a[i * 3 + 1] = Math.random() * 2 - 1; a[i * 3 + 2] = Math.random() * 2 - 1; r[i] = Math.random() }
  const u = { box: uniform(600), camMod: uniform(new V3()), flow: uniform(new V3()), size: uniform(1), op: uniform(.5), follow: uniform(1) }, m = skyMat(), vA = varyingProperty('float', 'vA'), vC = varyingProperty('vec3', 'vC');
  m.vertexNode = Fn(() => {
    const B = u.box, rel = mod(ia('aP', 'vec3').mul(B).add(u.flow).sub(u.camMod).add(B), B.mul(2)).sub(B).toVar(), aR = ia('aR', 'float');
    const l = toGal(cameraPosition.add(rel)), rr = length(l.xz), uu = rr.sub(GAL_R0).div(GAL_LEN);
    const da = armDaT(l.x, l.z), arm = exp(da.mul(da).mul(-5));
    const th = exp(rr.div(-120000)).mul(14000).add(4000), disk = exp(l.y.mul(l.y).negate().div(th.mul(th).mul(2)));
    const dens = disk.mul(smoothstep(-.12, .02, uu)).mul(smoothstep(.98, 1.12, uu).oneMinus()).mul(arm.mul(.85).add(.15));
    const edge = smoothstep(.55, 1, max(max(abs(rel.x), abs(rel.y)), abs(rel.z)).div(B)).oneMinus();
    const mv = vec4(cameraViewMatrix.mul(vec4(rel, 0)).xyz, 1).toVar();
    const ps = aR.mul(3.4).add(1.6).mul(u.size).mul(pxScale).div(max(mv.z.negate(), 1)).toVar();
    vA.assign(u.op.mul(edge).mul(mix(1, dens, u.follow)).mul(aR.mul(.7).add(.3)).mul(min(1, ps)));
    vC.assign(mix(vec3(1, .8, .6), vec3(.66, .77, 1), smoothstep(0, .55, uu)));
    return billboardPx(mv, clamp(ps, .8, 14));
  })();
  m.fragmentNode = Fn(() => { const d = radial(); Discard(d.greaterThan(1)); return vec4(vC.mul(vA).mul(exp(d.mul(d).mul(-3))), 1) })();
  const mesh = layer(new THREE.Mesh(quads(MOTE_N, { aP: [a, 3], aR: [r, 1] }), m), scene, 0); mesh.u = u; return mesh;
})();
/* speed streaks: short lines around the ship, stretched along the direction of travel */
const SL_N = 2400, SL_H = 1000;
const streaks = (() => {
  const off = new Float32Array(SL_N * 2 * 3), end = new Float32Array(SL_N * 2);
  for (let i = 0; i < SL_N; i++) { const o = [0, 1, 2].map(() => (Math.random() * 2 - 1) * SL_H); off.set(o, i * 6); off.set(o, i * 6 + 3); end[i * 2 + 1] = 1 }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(SL_N * 6), 3)); g.setAttribute('aOff', new THREE.BufferAttribute(off, 3)); g.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
  const u = { disp: uniform(new V3()), dir: uniform(new V3()), len: uniform(0), op: uniform(0) };
  const m = new THREE.LineBasicNodeMaterial({ color: 0xd8d2ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  m.positionNode = mod(attribute('aOff', 'vec3').sub(u.disp).add(SL_H), SL_H * 2).sub(SL_H).add(u.dir.mul(u.len).mul(attribute('aEnd', 'float')));
  m.opacityNode = u.op;
  const mesh = layer(new THREE.LineSegments(g, m), scene, 0); mesh.u = u; return mesh;
})();
