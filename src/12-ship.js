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

/* the ships: mouse pointers, every standard one from macOS and Windows, extruded: a black face inside a white border that
   steps down around it. Drawn in pointer pixels (y down, about 20 px tall) as polygons, some with holes; each has a tip
   (it flies that way) and a tail, near where the engine sits in its back edge. The plain arrow is free; the rest unlock
   as you collect rings. */
const CP = {   // little shape helpers, in pointer pixels
  circ: (cx, cy, r, n = 36) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos(i / n * 2 * Math.PI), cy + r * Math.sin(i / n * 2 * Math.PI)]),
  rect: (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
  bar: (ax, ay, bx, by, w) => { const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1, nx = -dy / l * w / 2, ny = dx / l * w / 2; return [[ax + nx, ay + ny], [bx + nx, by + ny], [bx - nx, by - ny], [ax - nx, ay - ny]] },
  rr: (x0, y0, x1, y1, r) => { const o = []; [[x1 - r, y0 + r, -90], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, 90], [x0 + r, y0 + r, 180]].forEach(([cx, cy, a0]) => { for (let k = 0; k <= 6; k++) { const a = (a0 + k * 15) * Math.PI / 180; o.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]) } }); return o },
  arc: (cx, cy, r0, r1, a0, a1, n = 24) => { const o = []; for (let k = 0; k <= n; k++) { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; o.push([cx + r1 * Math.cos(a), cy + r1 * Math.sin(a)]) } for (let k = n; k >= 0; k--) { const a = (a0 + (a1 - a0) * k / n) * Math.PI / 180; o.push([cx + r0 * Math.cos(a), cy + r0 * Math.sin(a)]) } return o },
  ring: (cx, cy, r0, r1) => ({ o: CP.circ(cx, cy, r1), h: [CP.circ(cx, cy, r0)] }),
  plus: (cx, cy, a, w) => [[cx - w, cy - a], [cx + w, cy - a], [cx + w, cy - w], [cx + a, cy - w], [cx + a, cy + w], [cx + w, cy + w], [cx + w, cy + a], [cx - w, cy + a], [cx - w, cy + w], [cx - a, cy + w], [cx - a, cy - w], [cx - w, cy - w]],
};
const P_ARROW = [[0, 0], [0, 16.6], [4.2, 12.6], [7.3, 19.2], [9.6, 18.2], [6.6, 11.7], [11.7, 11.7]];
const CURSORS = [
  { name: 'Arrow', parts: [P_ARROW], tip: [0, 0], tail: [8.45, 18.7] },
  { name: 'Arrow (Windows)', parts: [[[0, 0], [0, 17.5], [4, 13.6], [6.8, 19.8], [9.4, 18.7], [6.7, 12.6], [12.2, 12.6]]], tip: [0, 0], tail: [8.1, 19] },
  { name: 'Pointing hand', parts: [CP.rr(6, 0, 9.4, 12, 1.7), CP.rr(3.4, 8.5, 16.6, 20, 2.2), CP.circ(11.3, 9.6, 1.7), CP.circ(13.4, 10.2, 1.6), CP.circ(15.2, 11, 1.4), CP.bar(4.5, 15, .8, 10.6, 2.8)], tip: [7.7, .3], tail: [10, 18.4] },
  { name: 'I-beam', parts: [CP.rect(4, 1.5, 6, 18.5), CP.rect(1.5, 0, 8.5, 1.8), CP.rect(1.5, 18.2, 8.5, 20)], tip: [5, 0], tail: [5, 19] },
  { name: 'Crosshair', parts: [CP.rect(9, 0, 11, 20), CP.rect(0, 9, 20, 11)], tip: [10, 0], tail: [10, 19] },
  { name: 'Open hand', parts: [CP.circ(10, 13.5, 6.2), CP.rr(4.2, 3, 6.6, 13, 1.2), CP.rr(7.2, 1, 9.6, 12, 1.2), CP.rr(10.3, 1.6, 12.7, 12, 1.2), CP.rr(13.4, 3.6, 15.8, 13, 1.2), CP.bar(5, 15, 1.4, 10.2, 2.4)], tip: [8.4, 1], tail: [10, 18] },
  { name: 'Closed hand', parts: [CP.rr(3, 7, 17, 19, 3), CP.circ(5.6, 7.6, 1.8), CP.circ(8.6, 7, 1.8), CP.circ(11.6, 7, 1.8), CP.circ(14.5, 7.6, 1.8)], tip: [10, 5], tail: [10, 18] },
  { name: 'Move', parts: [CP.rect(9, 3, 11, 17), CP.rect(3, 9, 17, 11), [[10, 0], [13.5, 4], [6.5, 4]], [[10, 20], [6.5, 16], [13.5, 16]], [[0, 10], [4, 6.5], [4, 13.5]], [[20, 10], [16, 13.5], [16, 6.5]]], tip: [10, 0], tail: [10, 17] },
  { name: 'Resize up/down', parts: [CP.rect(9, 3.5, 11, 16.5), [[10, 0], [14, 5], [6, 5]], [[10, 20], [6, 15], [14, 15]]], tip: [10, 0], tail: [10, 17] },
  { name: 'Resize left/right', parts: [CP.rect(3.5, 9, 16.5, 11), [[20, 10], [15, 14], [15, 6]], [[0, 10], [5, 6], [5, 14]]], tip: [20, 10], tail: [3, 10] },
  { name: 'Resize ↖↘', parts: [CP.bar(4, 4, 16, 16, 2.4), [[1, 1], [7.5, 1.8], [1.8, 7.5]], [[19, 19], [12.5, 18.2], [18.2, 12.5]]], tip: [1, 1], tail: [17, 17] },
  { name: 'Resize ↗↙', parts: [CP.bar(16, 4, 4, 16, 2.4), [[19, 1], [18.2, 7.5], [12.5, 1.8]], [[1, 19], [1.8, 12.5], [7.5, 18.2]]], tip: [19, 1], tail: [3, 17] },
  { name: 'Not allowed', parts: [CP.ring(10, 10, 6.6, 9.2), CP.bar(5.4, 5.4, 14.6, 14.6, 2.4)], tip: [10, .8], tail: [10, 18] },
  { name: 'Wait', parts: [CP.circ(10, 10, 9.5, 48)], tip: [10, .5], tail: [10, 17] },
  { name: 'Busy', parts: [CP.ring(10, 10, 6, 9.4)], tip: [10, .6], tail: [10, 18] },
  { name: 'Help', parts: [P_ARROW, CP.arc(16.6, 6.4, 1.7, 3.4, 180, 420), CP.rect(15.8, 9.4, 17.4, 12), CP.circ(16.6, 14.2, 1.15, 16)], tip: [0, 0], tail: [8.45, 18.7] },
  { name: 'Copy', parts: [P_ARROW, { o: CP.circ(15.5, 15.5, 4.6), h: [CP.plus(15.5, 15.5, 2.8, .6)] }], tip: [0, 0], tail: [8.45, 18.7] },
  { name: 'Context menu', parts: [P_ARROW, { o: CP.rr(12, 9, 20.5, 19.5, 1), h: [CP.rect(13.5, 11, 19, 12.3), CP.rect(13.5, 13.6, 19, 14.9), CP.rect(13.5, 16.2, 19, 17.5)] }], tip: [0, 0], tail: [8.45, 18.7] },
  { name: 'Alternate select', parts: [[[10, 0], [17.5, 8], [12.6, 8], [12.6, 20], [7.4, 20], [7.4, 8], [2.5, 8]]], tip: [10, 0], tail: [10, 19] },
  { name: 'Handwriting', parts: [CP.bar(18.2, 1.8, 5.2, 14.8, 4.4), [[1, 19], [3, 12.4], [7.6, 17]]], tip: [1, 19], tail: [17, 3] },
  { name: 'Location', parts: [{ o: CP.circ(10, 8, 7.2), h: [CP.circ(10, 8, 2.8, 24)] }, [[4.2, 11.6], [15.8, 11.6], [10, 20]]], tip: [10, 20], tail: [10, 2] },
  { name: 'Zoom', parts: [CP.ring(8, 8, 4.8, 7.4), CP.bar(13, 13, 19.2, 19.2, 3.4)], tip: [3, 3], tail: [18.5, 18.5] },
  { name: 'Cell', parts: [CP.rect(7, 0, 13, 20), CP.rect(0, 7, 20, 13)], tip: [10, 0], tail: [10, 19] },
  { name: 'Vertical text', parts: [CP.rect(1.5, 9, 18.5, 11), CP.rect(0, 5.5, 1.8, 14.5), CP.rect(18.2, 5.5, 20, 14.5)], tip: [20, 10], tail: [1, 10] },
];
const SHIP_UNLOCK = k => 0;   // rings needed for each pointer: all unlocked for now (was k * 5)
function cursorGeo(def) {   // rotate so the tip leads and the tail trails along the axis, centre it, scale to ship units
  const k = .36, d = [def.tail[0] - def.tip[0], def.tail[1] - def.tip[1]], ax = Math.atan2(d[0], d[1]), rot = ([x, y]) => [x * Math.cos(ax) - y * Math.sin(ax), x * Math.sin(ax) + y * Math.cos(ax)];
  const parts = def.parts.map(p => Array.isArray(p) ? { o: p, h: [] } : p), outer = parts.flatMap(p => p.o).map(rot);
  const cx = outer.reduce((s, p) => s + p[0], 0) / outer.length, cy = outer.reduce((s, p) => s + p[1], 0) / outer.length, tf = p => { const [x, y] = rot(p); return [(x - cx) * k, (y - cy) * k] };
  const polys = parts.map(p => ({ o: p.o.map(tf), h: p.h.map(h => h.map(tf)) })), all = polys.flatMap(p => p.o);
  // the engine sits in the back edge: straight back from the tail point, the last outline edge it crosses
  let [tx, ty] = tf(def.tail), back = ty;
  for (const p of polys) { const o = p.o; for (let i = 0; i < o.length; i++) { const a = o[i], b = o[(i + 1) % o.length]; if ((a[0] - tx) * (b[0] - tx) <= 0 && a[0] !== b[0]) { const y = a[1] + (b[1] - a[1]) * (tx - a[0]) / (b[0] - a[0]); if (y > back && y < ty + 3) back = y } } }
  const pts = [tf(def.tip), ...all], lft = all.reduce((a, b) => b[0] < a[0] ? b : a), rgt = all.reduce((a, b) => b[0] > a[0] ? b : a);
  return { polys, pts, ax, tail: [tx, back], nav: [lft, rgt, pts[0]], name: def.name };
}
let ARROW = cursorGeo(CURSORS[0]);
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
function holeMesh() {   // inside: a turbine. Fan blades on the floor of the tube spin with the engine, a spinner cone at the hub, ribbed walls; the exhaust glows through the gaps
  const u = { col: uniform(new C3(1, .3, .3)), on: uniform(0), spin: uniform(0) }, m = new THREE.MeshBasicNodeMaterial();
  const pv = varying(modelViewMatrix.mul(vec4(positionGeometry, 1)).xyz), pg = varying(positionGeometry.xy);
  m.colorNode = Fn(() => {
    const v = normalize(transpose(modelViewMatrix).mul(vec4(normalize(pv), 0)).xyz), q = pg, r = float(HOLE.r), d = float(HOLE.d);
    const vz = min(v.z, -.02), a = max(dot(v.xy, v.xy), 1e-6), b = dot(q, v.xy), c = dot(q, q).sub(r.mul(r));
    const tw = sqrt(max(b.mul(b).sub(a.mul(c)), 0)).sub(b).div(a), tb = d.div(vz.negate()), floor_ = step(tb, tw);
    const zw = min(tw.mul(vz.negate()), d), qb = q.add(v.xy.mul(tb)), core = exp(dot(qb, qb).div(r.mul(r).mul(.22)).negate());
    // the wall: machined rings and fine ribs, darker deeper in, lit by the exhaust
    const qw = q.add(v.xy.mul(tw)), aw = atan(qw.y, qw.x), ribs = cos(aw.mul(28)).mul(.5).add(.5), rings = smoothstep(.75, 1, abs(sin(zw.mul(40))));
    const wall = u.col.mul(exp(d.sub(zw).mul(-4.5))).mul(u.on.mul(1.4)).add(vec3(.05, .05, .055).mul(ribs.mul(.5).add(.6)).mul(rings.mul(.6).add(.5)).mul(exp(zw.mul(-2.2))));
    // the floor: thirteen twisted blades turning round a spinner cone; between them, the burn
    const pr = length(qb).div(r), an = atan(qb.y, qb.x), bt = fract(an.add(u.spin).add(pr.mul(1.4)).mul(13 / 6.28318)), blade = smoothstep(.12, .2, bt).mul(smoothstep(.72, .62, bt));
    const hub = smoothstep(.34, .3, pr), cone = pow(max(0, pr.div(.32).oneMinus()), .6), lip = smoothstep(.9, .97, pr);
    const burn = mix(u.col, vec3(1), core.mul(.65)).mul(u.on.mul(core.mul(5).add(1.6))).add(vec3(.02));
    const metal = vec3(.16, .16, .18).mul(bt.mul(.9).add(.35)).add(u.col.mul(u.on).mul(.18));   // each blade catches light along its face
    const fan = mix(burn, metal, blade.mul(hub.oneMinus())), spinner = vec3(.5, .5, .53).mul(cone.mul(.8).add(.25)).add(vec3(.35).mul(pow(cone, 6)));
    const flr = mix(mix(fan, spinner, hub), vec3(.03), lip);
    return mix(wall, flr, floor_);
  })();
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(HOLE.r, 40), m); mesh.u = u; return mesh;
}   // flat: the tip points exactly where you're going (the chase camera sits high enough to see the face)
// one set of materials for every ship, worn: very fine scuffs, hairline scratches and rub marks in the metal (roughness)
const SCUFF = (() => {   // worn metal, drawn once at 1024²: a roughness map (light = duller) and a matching bump map (dark = cut in)
  const S = 1024, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c }, cr = mk(), cb = mk(), r = cr.getContext('2d'), b = cb.getContext('2d'), R = mulberry32(5150);
  r.fillStyle = 'rgb(120,120,120)'; r.fillRect(0, 0, S, S); b.fillStyle = 'rgb(128,128,128)'; b.fillRect(0, 0, S, S);
  { const n = document.createElement('canvas'); n.width = n.height = 16; const ng = n.getContext('2d'); for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const v = 100 + R() * 56 | 0; ng.fillStyle = `rgb(${v},${v},${v})`; ng.fillRect(x, y, 1, 1) }
    r.globalAlpha = .55; r.imageSmoothingEnabled = true; r.drawImage(n, 0, 0, S, S); r.globalAlpha = 1 }   // uneven wear: some areas duller than others
  const line = (ctx, x, y, a, l, w, col, bend = 0) => { ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l * .5 - Math.sin(a) * bend, y + Math.sin(a) * l * .5 + Math.cos(a) * bend, x + Math.cos(a) * l, y + Math.sin(a) * l); ctx.stroke() };
  const GRAIN = .32;
  for (let i = 0; i < 14000; i++) { const x = R() * S, y = R() * S, l = 10 + R() * 70, v = R() < .5 ? 150 : 95; line(r, x, y, GRAIN + (R() - .5) * .04, l, .35 + R() * .5, `rgba(${v},${v},${v},${.05 + R() * .07})`) }   // brushed grain
  for (let i = 0; i < 2200; i++) { const x = R() * S, y = R() * S, a = R() < .6 ? GRAIN + (R() - .5) * .5 : R() * Math.PI, l = 4 + Math.pow(R(), 3) * 220, w = .3 + R() * .7, al = .1 + R() * .35;   // hairlines, every way
    line(r, x, y, a, l, w, `rgba(225,225,225,${al})`, (R() - .5) * l * .15); line(b, x, y, a, l, w, `rgba(60,60,60,${al})`, 0) }
  for (let k = 0; k < 70; k++) { const cx = R() * S, cy = R() * S, a = R() * Math.PI, rr = 10 + R() * 45, n = 20 + R() * 60 | 0;   // rub marks: a patch of short parallel scratches
    for (let i = 0; i < n; i++) { const t = R(), d = (R() - .5) * 2 * rr, x = cx + Math.cos(a + 1.57) * d + (R() - .5) * rr, y = cy + Math.sin(a + 1.57) * d + (R() - .5) * rr, l = 3 + R() * rr * .8; line(r, x, y, a + (R() - .5) * .12, l, .3 + t * .5, `rgba(210,210,210,${.08 + R() * .2})`); line(b, x, y, a, l, .4, 'rgba(80,80,80,.25)') } }
  for (let i = 0; i < 70; i++) { const x = R() * S, y = R() * S, a = R() * Math.PI, l = 30 + R() * 260, bend = (R() - .5) * 40;   // a few real gouges: a cut with burred edges
    line(r, x, y, a, l, 2.2, 'rgba(235,235,235,.5)', bend); line(r, x, y, a, l, .8, 'rgba(70,70,70,.7)', bend); line(b, x, y, a, l, 2.4, 'rgba(170,170,170,.6)', bend); line(b, x, y, a, l, 1, 'rgba(20,20,20,.9)', bend) }
  for (let i = 0; i < 9000; i++) { const x = R() * S, y = R() * S, z = .6 + R() * 1.6, v = R() < .5 ? 200 : 60; r.fillStyle = `rgba(${v},${v},${v},${.06 + R() * .12})`; r.fillRect(x, y, z, z); if (R() < .3) { b.fillStyle = 'rgba(40,40,40,.35)'; b.fillRect(x, y, z, z) } }   // pitting and specks
  const tex = (c, srgb) => { const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(.11, .11); t.anisotropy = 8; if (srgb) t.colorSpace = THREE.NoColorSpace; return t };
  return { rough: tex(cr), bump: tex(cb) };
})();
const SHIP_MAT = {
  white: new THREE.MeshPhysicalMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: .32, roughness: .5, metalness: .05, roughnessMap: SCUFF.rough, bumpMap: SCUFF.bump, bumpScale: .35, clearcoat: 0, clearcoatRoughness: .1, clearcoatRoughnessMap: SCUFF.rough }),   // clear lacquer over the paint: that's what carries the reflections
  black: new THREE.MeshPhysicalMaterial({ color: 0x0a0a0c, roughness: .5, metalness: .6, roughnessMap: SCUFF.rough, bumpMap: SCUFF.bump, bumpScale: .35, clearcoat: 0, clearcoatRoughness: .1, clearcoatRoughnessMap: SCUFF.rough }),
  rim: new THREE.MeshStandardMaterial({ color: 0x6c6c74, emissive: 0xffffff, emissiveIntensity: .05, roughness: .45, metalness: .75, roughnessMap: SCUFF.rough, bumpMap: SCUFF.bump, bumpScale: .35 }),
};
function makeAvatar(geo = ARROW) {
  const g = new THREE.Group(), body = new THREE.Group(), M = SHIP_MAT;
  const path = (pts, P = THREE.Shape) => { const s = new P(); pts.forEach(([x, y], i) => i ? s.lineTo(x, y) : s.moveTo(x, y)); s.closePath(); return s };
  const slab = (o, holes, depth, mats) => { const s = path(o); holes.forEach(h => s.holes.push(path(h, THREE.Path))); const gg = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false }); gg.translate(0, 0, -depth / 2); gg.rotateX(Math.PI / 2); return new THREE.Mesh(gg, mats) };
  geo.polys.forEach(p => body.add(slab(p.o, p.h, 1.3, [M.black, M.black]), slab(inflate(p.o, .42), p.h.map(h => inflate(h, -.42)), .96, [M.white, M.rim])));   // the border's top is white, its edges a soft grey
  body.rotation.x = ARROW_TILT;   // tip raised, so from the chase camera it reads as a pointer, face on
  g.add(body);
  const [tx, tz] = geo.tail, tail = new V3(tx, 0, tz + HOLE.z).applyEuler(new THREE.Euler(ARROW_TILT, 0, 0)); g.userData.tail = tail;   // the mouth of the hole
  const hole = holeMesh(); hole.position.copy(tail).add(new V3(0, 0, .004)); g.add(hole); g.userData.hole = hole.u;
  // the exhaust: a soft, blurred ball of light just behind the hole (no cone)
  const flame = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: 0xffb547, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  flame.position.set(tail.x, tail.y, tail.z + .35); flame.scale.set(1.5, 1.5, 1); g.add(flame); g.userData.flame = flame;
  // the trail emitter: a soft light in the back of the stem, faint at rest and bright while you thrust
  const em = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: 0xffffff, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 })); em.position.set(tail.x, tail.y, tail.z + .05); em.scale.setScalar(HOLE.r * 3.2); g.add(em); g.userData.emit = em;
  const nav = c => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: 2 }), dot = (c, p) => { const b = new THREE.Mesh(new THREE.BoxGeometry(.32, .32, .32), nav(c)); b.position.copy(p); g.add(b); return b };
  const at = p => new V3(p[0], .7, p[1]).applyEuler(new THREE.Euler(ARROW_TILT, 0, 0));
  g.userData.nav = [dot(0xff4a4a, at(geo.nav[0])), dot(0x4aff8a, at(geo.nav[1])), dot(0xffffff, at(geo.nav[2]))];
  return g;
}
let SHIP_LEN = (Math.max(...ARROW.pts.map(p => p[1])) - Math.min(...ARROW.pts.map(p => p[1]))) * .68 * SHIP_K * SHIP_SC;   // tip to tail, in world units
const avatar = makeAvatar(); avatar.scale.setScalar(.68 * SHIP_K * SHIP_SC); shipScene.add(avatar);   // on the ship layer, over the HUD
let shipK = 0;   // which pointer you fly
function setShip(k) {   // swap the ship's shape in place (same group, same materials), keeping the lights, engine and trail hooks
  k = Math.max(0, Math.min(CURSORS.length - 1, k | 0)); shipK = k; ARROW = cursorGeo(CURSORS[k]); store.set('sotd-ship-k', String(k));
  const ng = makeAvatar(ARROW); avatar.clear(); [...ng.children].forEach(c => avatar.add(c)); avatar.userData = ng.userData;
  SHIP_LEN = (Math.max(...ARROW.pts.map(p => p[1])) - Math.min(...ARROW.pts.map(p => p[1]))) * .68 * SHIP_K * SHIP_SC; avatar.userData.nav.forEach(b => b.visible = !!LOOK.nav);
}
/* the engine flare: a hard white point, a wide bloom round it and thin diffraction spikes, all sized in screen pixels so it
   reads the same at any distance. It sits at the mouth of the hole and only shows while you can see into it. */
const flare = (() => {
  const u = { col: uniform(new C3(1, .4, .4)), k: uniform(0), n: uniform(4), turn: uniform(Math.PI / 4), px: uniform(280), spk: uniform(1), rate: uniform(2), glow: uniform(1), half: uniform(0), q: uniform(840), ig: uniform(0), pop: uniform(0) };
  const m = new THREE.SpriteNodeMaterial({ transparent: true, depthWrite: false, depthTest: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor });
  m.colorNode = Fn(() => {
    const p = uv().sub(.5).mul(u.q), r = length(p), L = u.px.mul(.5), spikes = float(0).toVar();   // the quad (q px) is three times the spikes, so the glow has room to fade out
    for (let j = 0; j < 4; j++) {   // up to four lines through the centre: 2, 4, 6 or 8 spikes
      const a = u.turn.add(float(j * 2 * Math.PI).div(u.n)), dir = vec2(cos(a), sin(a)), along = abs(dot(p, dir)), across = abs(dot(p, vec2(dir.y.negate(), dir.x)));
      const w = along.mul(.006).add(.75), fall = pow(max(0, along.div(j % 2 ? L.mul(u.half.mul(-.5).add(1)) : L).oneMinus()), 2.6);   // with 'half' on, every other line is half as long
      // sparkle: each line twinkles on its own beat, and glints run out along it
      const tw = sin(U.now.mul(u.rate).mul(1 + j * .37).add(j * 2.1)).mul(.5).add(.5), gl = pow(sin(along.div(L).mul(18).sub(U.now.mul(u.rate).mul(3 + j))).mul(.5).add(.5), 6);
      spikes.addAssign(exp(sq(across.div(w)).negate()).mul(fall).mul(step(float(j).add(.5), u.n.mul(.5))).mul(u.spk.mul(tw.sub(.6).add(gl.mul(.8))).add(1).max(.15)));
    }
    spikes.mulAssign(u.ig.mul(1.5).add(1));   // ignition: the spikes flare
    const core = exp(r.div(1.5).pow(2).negate()).mul(u.ig.mul(8).add(1)), bloomIn = exp(r.div(L.mul(.022)).negate()).mul(u.glow), bloomOut = exp(r.div(L.mul(.15).mul(u.glow.sqrt().min(2.2)).mul(u.pop.add(1))).negate()).mul(u.glow.min(3).add(u.pop.mul(3)));   // pop: a ring collected, the engine bursts with light
    const c = mix(u.col, vec3(1), .55).mul(spikes.mul(1.1)).add(vec3(1).mul(core.mul(6))).add(mix(u.col, vec3(1), .35).mul(bloomIn.mul(1.1))).add(u.col.mul(bloomOut.mul(.4)));
    const cc = clamp(c.mul(u.k).mul(smoothstep(u.q.mul(.5), u.q.mul(.3), r)), 0, 1);   // nothing reaches the quad's edge
    return vec4(cc, max(max(cc.r, cc.g), cc.b));   // light on the transparent ship layer: alpha covers the colour
  })();
  const s = new THREE.Sprite(m); s.renderOrder = 60; s.frustumCulled = false; s.u = u; shipScene.add(s); return s;   // on the ship's layer, over the arrow; placed at the engine each frame
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
  const u = { core: uniform(1), glow: uniform(1), taper: uniform(1.35), shim: uniform(.08), nearA: uniform(4), nearB: uniform(30), hot: uniform(1), hotW: uniform(2), hotT: uniform(1) }, m = skyMat({ side: THREE.DoubleSide, depthTest: false });
  const vT = varying(attribute('aT', 'float')), vV = varying(attribute('aV', 'float')), vC = varying(attribute('aC', 'vec3'));
  const vA = varying(clamp(attribute('aA', 'float'), 0, 1).mul(smoothstep(u.nearA, u.nearB.max(u.nearA.add(.001)), modelViewMatrix.mul(vec4(positionGeometry, 1)).z.negate())));
  m.fragmentNode = Fn(() => {
    const core = exp(vV.mul(vV).mul(-38)), halo = exp(vV.mul(vV).mul(-3.5)), along = pow(max(0, vT.oneMinus()), u.taper);
    const flick = u.shim.oneMinus().add(u.shim.mul(sin(vT.mul(240).sub(U.now.mul(30)))));
    const c0 = vC.mul(halo).mul(.85).mul(u.glow).add(mix(vC, vec3(1), .3).mul(core).mul(1.6).mul(u.core)).mul(along).mul(max(flick, 0)).mul(vA);
    const c = c0.div(max(1, max(max(c0.r, c0.g), c0.b).div(1.25)));   // too bright scales down as a whole rather than burning to white: the pilot's colour survives
    // the white-hot thread down the middle, straight out of the engine: hotW px wide at the mouth, tapering to nothing, added on top
    const px = abs(vV).div(max(fwidth(vV), 1e-5)), hw = u.hotW.mul(.5).mul(pow(max(0, vT.oneMinus()), u.hotT)), hot = smoothstep(hw.add(.5), hw.sub(.5), px).mul(min(hw.mul(2), 1)).mul(u.hot).mul(vA);
    const cc = clamp(c.add(vec3(hot)), 0, 1); return vec4(cc, max(max(cc.r, cc.g), cc.b));   // light on the transparent ship canvas: alpha must cover the colour (premultiplied), or the browser drops it
  })();
  const mesh = layer(new THREE.Mesh(g, m), shipScene, 50); mesh.u = u; return mesh;   // on the ship's own layer, drawn after it: the trail runs over the arrow (light only, so the clear canvas adds it to the view)
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
  const u = { box: uniform(600), camMod: uniform(new V3()), flow: uniform(new V3()), size: uniform(1), op: uniform(.5), follow: uniform(1), core: uniform(1), sB: uniform(1), bhR: uniform(1), bhZ: uniform(4), bhH: uniform(.08) }, m = skyMat(), vA = varyingProperty('float', 'vA'), vC = varyingProperty('vec3', 'vC');
  m.vertexNode = Fn(() => {
    const B = u.box, rel = mod(ia('aP', 'vec3').mul(B).add(u.flow).sub(u.camMod).add(B), B.mul(2)).sub(B).toVar(), aR = ia('aR', 'float');
    const l = toGal(cameraPosition.add(rel)), rr = length(l.xz), uu = rr.sub(GAL_R0).div(GAL_LEN);
    const da = armDaT(l.x, l.z).div(armWT(rr)), arm = exp(da.mul(da).mul(-5));
    const th = exp(rr.div(-120000)).mul(14000).add(4000), disk = exp(l.y.mul(l.y).negate().div(th.mul(th).mul(2)));
    const dens = disk.mul(smoothstep(-.12, .02, uu)).mul(smoothstep(.98, 1.12, uu).oneMinus()).mul(arm.mul(.85).add(.15));
    // core mode: thicker toward the middle of the bulge; close to the black hole only in a thin sheet along its disk
    const r3 = length(l), zone = smoothstep(u.bhR.mul(u.bhZ), u.bhR.mul(u.bhZ).mul(.6), r3), bulgeD = exp(r3.div(u.sB).pow(2).mul(-.5));
    const sheet = exp(sq(l.y.div(u.bhR.mul(u.bhH))).negate()).mul(smoothstep(u.bhR.mul(1.6), u.bhR.mul(.9), rr)).mul(smoothstep(u.bhR.mul(.12), u.bhR.mul(.25), rr));
    const densC = mix(bulgeD, sheet, zone);
    const edge = smoothstep(.55, 1, max(max(abs(rel.x), abs(rel.y)), abs(rel.z)).div(B)).oneMinus();
    const mv = vec4(cameraViewMatrix.mul(vec4(rel, 0)).xyz, 1).toVar();
    const ps = aR.mul(3.4).add(1.6).mul(u.size).mul(pxScale).div(max(mv.z.negate(), 1)).toVar();
    vA.assign(u.op.mul(edge).mul(mix(1, mix(dens, densC, u.core), u.follow)).mul(aR.mul(.7).add(.3)).mul(min(1, ps)));
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
