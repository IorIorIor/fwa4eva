/* ───────────────────────── renderer, scenes, shared shader library ─────────────────────────
   Four scenes, rendered back to front:
     volScene   raymarched gas (optional), at its own reduced resolution
     softScene  everything soft and low-frequency (nebulae, lanes, glows, outer disk), at reduced resolution
     hazeScene  the arm haze, accumulated additively and then soft-clipped (a screen blend that can't blow out)
     scene      everything crisp at full resolution, laid over the other three, then bloom and the grade */
const canvas = $('gl');
const renderer = new THREE.WebGPURenderer({ canvas, antialias: false, forceWebGL: QS.has('webgl'), powerPreference: 'high-performance' });   // MSAA lives on the 3D pass only, not the full-screen post quad
await renderer.init();
renderer.highPrecision = true;   // model-view matrices in 64-bit on the CPU: the ship stays rock steady a million units from home
const GPU = renderer.backend.isWebGPUBackend === true;
let DPR = Math.min(LOOK.maxDpr, devicePixelRatio || 1);
renderer.setPixelRatio(DPR);
renderer.setClearColor(0x06050d, 1);
const camera = new THREE.PerspectiveCamera(62, 1, .15, 6e7);
const scene = new THREE.Scene(), softScene = new THREE.Scene(), hazeScene = new THREE.Scene(), volScene = new THREE.Scene();
scene.add(camera);
scene.add(new THREE.HemisphereLight(0xb8b0ff, 0x1a1430, 1.1 * Math.PI));   // three's lights are physically based now; × π keeps the old intensities
const sunLight = new THREE.DirectionalLight(0xffffff, .8 * Math.PI); sunLight.position.set(.62, .48, .36); scene.add(sunLight);
const rimLight = new THREE.DirectionalLight(0x8fa6ff, .9 * Math.PI); rimLight.position.set(-.62, -.3, -.5); scene.add(rimLight);   // cool back light so silhouettes read
// the ship flies on its own layer: a second, transparent canvas above the instruments, so the pointer is never covered by them
const shipCanvas = document.createElement('canvas'); shipCanvas.id = 'shipLayer'; shipCanvas.setAttribute('aria-hidden', 'true'); canvas.after(shipCanvas);
const shipRenderer = new THREE.WebGPURenderer({ canvas: shipCanvas, antialias: true, alpha: true, forceWebGL: QS.has('webgl') });
await shipRenderer.init(); shipRenderer.highPrecision = true; shipRenderer.setPixelRatio(DPR); shipRenderer.setClearColor(0x000000, 0);
loadProg(.3);
const shipScene = new THREE.Scene(); shipScene.add(new THREE.HemisphereLight(0xb8b0ff, 0x1a1430, 1.1 * Math.PI), sunLight.clone(), rimLight.clone());

/* uniforms every layer can read */
const U = {
  time: uniform(0),            // world time (runs slow near the black hole)
  now: uniform(0),             // wall-clock seconds
  res: uniform(new THREE.Vector2(1, 1)),   // drawing buffer size in device pixels
  vdir: uniform(new V3(0, 0, -1)),          // direction of travel
  beta: uniform(0),            // how close to light speed (drives aberration)
  minSoft: uniform(2),         // one pixel of the reduced-resolution soft target, in full-resolution pixels
  GC: uniform(GC.clone()), GQ: uniform(GQ3.clone()), GQI: uniform(GQI3.clone()),
  // radial colour (cream core → pink-violet → blue rim) and distance dimming, shared by most galaxy layers
  rad: uniform(0), rc1: uniform(new C3()), rc2: uniform(new C3()), rc3: uniform(new C3()), farK: uniform(.5), far0: uniform(150000), far1: uniform(900000),
  dpr: uniform(1),             // device pixels per CSS pixel
  bhClear: uniform(BH.sh * 1.5),   // haze thins out inside this radius of the black hole
};
const pxScale = U.res.y.mul(.55);   // "uPx" in the old shaders: point size per unit of size·distance⁻¹

/* ── shared shader functions ── */
const hash3 = Fn(([p_]) => { const p = fract(p_.mul(.1031)).toVar(); p.addAssign(dot(p, p.yzx.add(33.33))); return fract(p.x.add(p.y).mul(p.z)) }).setLayout({ name: 'hash3', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });
const noise3 = Fn(([p]) => {
  const i = floor(p).toVar(), f = fract(p).toVar(); f.assign(f.mul(f).mul(f.mul(-2).add(3)));
  const h = (x, y, z) => hash3(i.add(vec3(x, y, z)));
  return mix(mix(mix(h(0, 0, 0), h(1, 0, 0), f.x), mix(h(0, 1, 0), h(1, 1, 0), f.x), f.y), mix(mix(h(0, 0, 1), h(1, 0, 1), f.x), mix(h(0, 1, 1), h(1, 1, 1), f.x), f.y), f.z)
}).setLayout({ name: 'noise3', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });
const fbm5 = Fn(([p_]) => { const p = vec3(p_).toVar(), s = float(0).toVar(), a = float(.5).toVar(); Loop(5, () => { s.addAssign(a.mul(noise3(p))); p.assign(p.mul(2.07).add(vec3(1.7, 9.2, 3.1))); a.mulAssign(.5) }); return s })
  .setLayout({ name: 'fbm5', type: 'float', inputs: [{ name: 'p', type: 'vec3' }] });
const luma = c => dot(c, vec3(.3, .59, .11));
const monoTint = (c, k) => mix(c, luma(c).mul(vec3(.72, .86, 1.15)), k);            // the cold monochrome grade some layers take
const hueRot = (c, a) => { const k = vec3(.57735), ca = cos(a); return c.mul(ca).add(cross(k, c).mul(sin(a))).add(k.mul(dot(k, c)).mul(ca.oneMinus())) };
const farDim = d => float(1).sub(U.farK.mul(smoothstep(U.far0, U.far1, d)));
const radCol = rr => { const u = rr.sub(GAL_R0).div(GAL_LEN); return select(u.lessThan(.4), mix(U.rc1, U.rc2, smoothstep(-.15, .4, u)), mix(U.rc2, U.rc3, smoothstep(.4, .85, u))) };
const toGal = p => U.GQI.mul(p.sub(U.GC));            // world → galaxy frame (disk in xz)
const fromGal = l => U.GC.add(U.GQ.mul(l));
// relativistic aberration, as it really is: moving at β, a source at angle θ from the direction of travel appears at
// cos θ' = (cos θ + β) / (1 + β cos θ), so the sky crowds forward. (The colour shift and beaming happen per pixel in the final pass.)
const aberrate = wp => {
  const r = wp.sub(cameraPosition), L = length(r), d = r.div(max(L, 1e-3)), ct = dot(d, U.vdir), b = U.beta;
  const c2 = ct.add(b).div(b.mul(ct).add(1)), s2 = sqrt(max(0, c2.mul(c2).oneMinus()));
  const pr = d.sub(U.vdir.mul(ct)), pl = length(pr), pd = select(pl.greaterThan(1e-5), pr.div(pl), vec3(0));
  return cameraPosition.add(U.vdir.mul(c2).add(pd.mul(s2)).mul(L));
};
// the arm spiral on the GPU (the twin of armPhase in the world model)
const armPhT = r => {
  if (SPIRAL) {
    const u = r.sub(GAL_R0).div(GAL_LEN); if (SP_FLAT) return u.mul(SP_TW);
    const c = clamp(u, 0, 1), tau = log(c.mul(-(SP_G - 1) / SP_G).add(1)).mul(-1 / SP_LG).add(u.sub(c).mul(mix(SP_S0, SP_S1, step(0, u))));
    return tau.mul(SP_TW);
  }
  const x = log(max(r, GAL_R0 * .5)), base = x.sub(Math.log(GAL_R0)).mul(WIND); if (!ARM.lock) return base;
  const u = clamp(r.sub(GAL_R0).div(GAL_LEN), 0, 1), E = pow(u, 1 / .62).oneMinus().mul(5.4);
  const mid = float(5).sub(E).mul(ARM.d).add(ARM.ph25), out = x.sub(ARM.x00).mul(WIND).add(ARM.ph25 + 5 * ARM.d);
  const w1 = smoothstep(ARM.x25 - ARM.h, ARM.x25 + ARM.h, x), w2 = smoothstep(ARM.x00 - ARM.h, ARM.x00 + ARM.h, x);
  return mix(base, mix(mix(base, mid, w1), out, w2), ARM.lock);
};
// 0 on an arm's centre line, 1 halfway between arms (local galaxy-frame x, z)
const armDaT = (lx, lz) => abs(fract(atan(lz, lx).sub(armPhT(length(vec2(lx, lz)))).mul(ARMS / 6.28318).add(.5)).sub(.5)).mul(2);
// a blackbody's colour (normalised so the brightest channel is 1); 6600 K is white
const bbRGB = T => {
  const t = T.div(100), hi = t.greaterThan(66), tt = max(t.sub(60), 1e-3);
  const r = select(hi, pow(tt, -.1332).mul(1.2929), 1), g = select(hi, pow(tt, -.0755).mul(1.1299), log(max(t, 1)).mul(.3901).sub(.6318));
  const b = select(hi, 1, select(t.lessThan(19), 0, log(max(t.sub(10), 1)).mul(.5432).sub(1.1963)));
  return clamp(vec3(r, g, b), 0, 1);
};

/* ── geometry helpers ── */
const QUAD = new THREE.PlaneGeometry(1, 1);
// pack per-instance attributes into one interleaved buffer (WebGPU allows only 8 vertex buffers per draw)
function packInstances(g, n, attrs) {
  const keys = Object.keys(attrs), stride = keys.reduce((s, k) => s + attrs[k][1], 0), data = new Float32Array(n * stride);
  let off = 0; for (const k of keys) { const [a, sz] = attrs[k]; for (let i = 0; i < n; i++) for (let c = 0; c < sz; c++) data[i * stride + off + c] = a[i * sz + c]; off += sz }
  const buf = new THREE.InstancedInterleavedBuffer(data, stride); off = 0;
  for (const k of keys) { g.setAttribute(k, new THREE.InterleavedBufferAttribute(buf, attrs[k][1], off)); off += attrs[k][1] }
  return g;
}
// n camera-facing quads; attrs: { name: [Float32Array, itemSize] }, packed into one instance buffer
function quads(n, attrs) {
  const g = new THREE.InstancedBufferGeometry(); g.index = QUAD.index; g.setAttribute('position', QUAD.attributes.position); g.setAttribute('uv', QUAD.attributes.uv);
  packInstances(g, n, attrs); g.instanceCount = n; return g;
}
const ia = (name, type) => attribute(name, type);
// clip position of a quad corner around a centre, sized in device pixels
const billboardPx = (mv, px) => { const clip = cameraProjectionMatrix.mul(mv); return clip.add(vec4(positionGeometry.xy.mul(px).mul(clip.w).mul(vec2(2).div(U.res)), 0, 0)) };
// clip position of a quad corner around a centre, sized in world units (a camera-facing sprite)
const billboardW = (mv, size) => cameraProjectionMatrix.mul(vec4(mv.xy.add(positionGeometry.xy.mul(size)), mv.z, 1));
const radial = () => length(uv().sub(.5)).mul(2);       // 0 at a quad's centre, 1 at its edge
// a material for the many self-lit, transparent things in the sky
function skyMat({ blend = 'add', side = THREE.FrontSide, depthTest = true, depthWrite = false } = {}) {
  const m = new THREE.NodeMaterial(); m.transparent = true; m.depthWrite = depthWrite; m.depthTest = depthTest; m.side = side;
  if (blend === 'add') { m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneFactor; m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneFactor }   // premultiplied colour, added
  else if (blend === 'alpha') m.blending = THREE.NormalBlending;
  else if (blend === 'premul') { m.blending = THREE.CustomBlending; m.blendSrc = THREE.OneFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor }
  return m;
}
function layer(obj, target = scene, order = 0) { obj.frustumCulled = false; obj.renderOrder = order; target.add(obj); return obj }

/* ── textures ── */
const softDot = radialTex(64, [[0, 'rgba(255,255,255,1)'], [.35, 'rgba(255,255,255,.35)'], [1, 'rgba(255,255,255,0)']]);
const glowTex = radialTex(256, [[0, 'rgba(255,214,160,.45)'], [.25, 'rgba(190,150,255,.14)'], [1, 'rgba(0,0,0,0)']]);
// four domain-warped noise tiles: red = cloud density, green = bright filaments
const nebAtlas = (() => {
  const SZ = 512, T = 256, c = document.createElement('canvas'); c.width = c.height = SZ; const g = c.getContext('2d'), img = g.createImageData(SZ, SZ), px = img.data;
  const perm = new Uint8Array(512); { const r = mulberry32(4242), p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; const t = p[i]; p[i] = p[j]; p[j] = t } for (let i = 0; i < 512; i++)perm[i] = p[i & 255] }
  const gr = (h, x, y) => ((h & 1) ? x : -x) + ((h & 2) ? y : -y), fd = t => t * t * t * (t * (t * 6 - 15) + 10);
  const pn = (x, y) => { const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255; x -= fx; y -= fy; const u = fd(x), v = fd(y), a = perm[X] + Y, b = perm[X + 1] + Y; return (1 - v) * ((1 - u) * gr(perm[a], x, y) + u * gr(perm[b], x - 1, y)) + v * ((1 - u) * gr(perm[a + 1], x, y - 1) + u * gr(perm[b + 1], x - 1, y - 1)) };
  const fbm = (x, y, o) => { let s = 0, a = .5; for (let i = 0; i < o; i++) { s += a * pn(x, y); x = x * 2.03 + 17.1; y = y * 2.03 + 9.7; a *= .5 } return s };
  for (let t = 0; t < 4; t++) {
    const ox = (t & 1) * T, oy = (t >> 1) * T, sd = t * 31.7 + 3.1;
    for (let y = 0; y < T; y++) for (let x = 0; x < T; x++) {
      const u = x / T * 2 - 1, v = y / T * 2 - 1, X = u * 2.1 + sd, Y = v * 2.1 + sd * .7;
      const qx = fbm(X, Y, 4), qy = fbm(X + 5.2, Y + 1.3, 4), rx = fbm(X + 3.4 * qx + 1.7, Y + 3.4 * qy + 9.2, 4), ry = fbm(X + 3.4 * qx + 8.3, Y + 3.4 * qy + 2.8, 4);
      const den = fbm(X + 3 * rx, Y + 3 * ry, 5) * .5 + .5, m = Math.max(0, 1 - (Math.hypot(u, v) + qx * .45));
      const dn = Math.pow(Math.max(0, den - .3) / .7, 1.5) * m * m, fil = Math.pow(Math.max(0, 1 - Math.abs(rx) * 3.2), 8) * m;
      const i = ((oy + y) * SZ + ox + x) * 4; px[i] = Math.min(255, dn * 330); px[i + 1] = Math.min(255, fil * 255); px[i + 2] = 0; px[i + 3] = 255
    }
  }
  g.putImageData(img, 0, 0); const tx = new THREE.CanvasTexture(c); tx.generateMipmaps = false; tx.minFilter = THREE.LinearFilter; return tx
})();
