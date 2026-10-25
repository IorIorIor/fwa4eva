/* ───────────────────────── the black hole, and the materials the exotic winners share with it ─────────────────────────
   The supermassive one is ray-traced: every pixel near it follows a light ray back through the curved space around the
   hole (Schwarzschild geodesics), picking up the thin accretion disk each time it crosses it. So the far side of the disk
   arches over and under the shadow, a photon ring hugs the edge, the approaching side is brighter and bluer, and the sky
   behind is lensed into an Einstein ring. The small stellar ones among the exotic winners use the simple disk below. */
const viewDir = () => normalize(cameraPosition.sub(positionWorld));
// accretion disk on a RingGeometry (r0..r1 in its own plane): the inside laps the outside, the approaching side is brighter
function diskMat(r0, r1, u) {
  const m = skyMat({ side: THREE.DoubleSide }), vT = varying(normalize(modelWorldMatrix.mul(vec4(positionGeometry.y.negate(), positionGeometry.x, 0, 0)).xyz), 'vT');
  m.fragmentNode = Fn(() => {
    const L = positionGeometry.xy, r = length(L), x = r.sub(r0).div(r1 - r0); Discard(x.lessThan(0).or(x.greaterThan(1)));
    const a = atan(L.y, L.x).sub(U.time.mul(1.4).mul(u.spin).mul(pow(float(r0).div(r), 1.5)));
    const q = vec3(cos(a).mul(3), sin(a).mul(3), r.div(r0).mul(6)), n = noise3(q).mul(.55).add(noise3(q.mul(2.3).add(4)).mul(.3)).add(noise3(q.mul(5.1).add(9)).mul(.15));
    const hot = pow(x.oneMinus(), float(1.7).div(u.hot)), col = mix(vec3(1, .38, .12), vec3(1, .9, .75), hot).add(vec3(.35, .45, .6).mul(pow(hot, 4))).toVar();
    const dop = dot(normalize(vT), viewDir()), beam = pow(max(.08, dop.mul(.8).add(1)), 3);
    col.assign(mix(col, col.mul(vec3(.75, .9, 1.3)), max(0, dop).mul(.6)));
    const I = n.mul(n).mul(1.6).add(.25).mul(hot.mul(2.2).add(.4)).mul(smoothstep(0, .05, x)).mul(smoothstep(.55, 1, x).oneMinus()).mul(beam);
    return vec4(col.mul(I).mul(u.br), 1);
  })();
  return m;
}
// relativistic jets on an open cylinder (uv.y runs along the jet)
function jetMat(u, col = new C3(.62, .78, 1)) {
  const m = skyMat({ side: THREE.DoubleSide }), c = uniform(col), vH = varying(uv().y, 'vH');
  m.fragmentNode = Fn(() => {
    const e = pow(abs(dot(normalWorld, viewDir())), 1.2), k = noise3(vec3(uv().x.mul(12), vH.mul(30).sub(U.time.mul(3)), 1));
    return vec4(c.mul(pow(vH.oneMinus(), 2.5)).mul(e).mul(k.mul(.9).add(.4)).mul(u.br), 1);
  })();
  m.jetColor = c; return m;
}
// a pulsar's lighthouse beams on an open cone
function beamMat(u) {
  const m = skyMat({ side: THREE.DoubleSide }), vH = varying(uv().y.oneMinus(), 'vH');
  m.fragmentNode = vec4(vec3(.75, .85, 1).mul(pow(vH.oneMinus(), 1.6)).mul(pow(abs(dot(normalWorld, viewDir())), 1.5)).mul(u.a), 1);
  return m;
}

/* the ray tracer, on the inside of a sphere around the hole (radius RP horizon radii). Works in units of the horizon
   radius rs, in the galaxy's own frame (disk in xz). Light bends as x'' = −1.5 h² x / r⁵ (the exact Schwarzschild path,
   h = |x × v| conserved), integrated with leapfrog steps that shrink near the hole. bgAt(uv) is the sky behind the
   scene; escaped rays read it where their bent direction lands on screen. */
const RP = 26, BH_STEPS = 300; let BH_RP = RP;   // (BH_RP: the lens sphere now; a giant hole bends only what's close to it, or it would blow the whole galaxy up)
function makeBlackHole(bgAt) {
  const u = {
    cam: uniform(new V3()), rot: uniform(new THREE.Matrix3()), vrot: uniform(new THREE.Matrix3()), px: uniform(1), py: uniform(1),
    veil: uniform(0), rin: uniform(3), rout: uniform(10), br: uniform(1), hot: uniform(1), warm: uniform(0), spin: uniform(1), halo: uniform(1), dop: uniform(1), lens: uniform(1), steps: uniform(150), t: uniform(0), skyDark: uniform(0), clear: uniform(1), rp: uniform(RP),
  };
  const m = new THREE.NodeMaterial(); m.side = THREE.BackSide; m.depthTest = false; m.depthWrite = false; m.transparent = false;
  const accel = (q, h2, rr) => q.mul(h2.mul(-1.5).mul(u.lens).div(pow(rr, 5)).mul(smoothstep(u.rp, u.rp.mul(.55), rr)));   // fades to straight lines at the rim, so the edge is seamless
  // the disk: thin, Keplerian, Novikov–Thorne temperature, turbulence that shears with the orbit (two phases cross-fade so it never winds up)
  const streaks = (a, r) => noise3(vec3(cos(a).mul(2.6), sin(a).mul(2.6), r.mul(1.7))).mul(.55).add(noise3(vec3(cos(a).mul(6.5), sin(a).mul(6.5), r.mul(4.9).add(7))).mul(.3)).add(noise3(vec3(cos(a).mul(15), sin(a).mul(15), r.mul(11).add(3))).mul(.15));
  m.fragmentNode = Fn(() => {
    const rd = normalize(u.rot.mul(positionWorld.sub(cameraPosition))).toVar(), ro = u.cam;
    const b = dot(ro, rd), c = dot(ro, ro).sub(u.rp.mul(u.rp)), t0 = max(0, b.negate().sub(sqrt(max(b.mul(b).sub(c), 0))));
    const p = ro.add(rd.mul(t0)).toVar(), v = vec3(rd).toVar(), hv = cross(p, v), h2 = dot(hv, hv).toVar();
    const col = vec3(0).toVar(), A = float(0).toVar(), dead = float(0).toVar(), nX = float(0).toVar();
    Loop(BH_STEPS, ({ i }) => {
      const r = length(p).toVar();
      If(float(i).greaterThanEqual(u.steps).or(A.greaterThan(.995)), () => { Break() });
      If(r.lessThan(1.02).or(r.lessThan(1.5).and(dot(p, v).lessThan(0))), () => { dead.assign(1); Break() });   // inside the photon sphere and falling: gone
      If(r.greaterThan(u.rp).and(dot(p, v).greaterThan(0)), () => { Break() });
      const dt = clamp(r.mul(.085), .02, 4), pp = vec3(p).toVar();
      { const hy = p.y.div(r.mul(.05).add(.08)), gl = exp(hy.mul(hy).negate()).mul(smoothstep(u.rin.mul(.85), u.rin.mul(1.3), r)).mul(smoothstep(u.rout, u.rout.mul(.4), r));   // a faint warm haze hugging the inner disk
        col.addAssign(vec3(1, .62, .34).mul(gl).mul(dt).mul(u.br).mul(.016).mul(A.oneMinus())) }
      v.addAssign(accel(p, h2, r).mul(dt.mul(.5))); p.addAssign(v.mul(dt)); v.addAssign(accel(p, h2, length(p)).mul(dt.mul(.5)));
      If(pp.y.mul(p.y).lessThan(0), () => {   // crossed the disk plane
        const q = mix(pp, p, pp.y.div(pp.y.sub(p.y))), rq = length(q.xz).toVar();
        If(rq.greaterThan(u.rin).and(rq.lessThan(u.rout)), () => {
          const ph = atan(q.z, q.x), om = u.spin.mul(.7).mul(pow(u.rin.div(rq), 1.5)), T = 6, f1 = fract(u.t.div(T)), w1 = abs(f1.mul(2).sub(1)).oneMinus();
          const tex = mix(mix(streaks(ph.add(om.mul(fract(f1.add(.5)).mul(T))), rq), streaks(ph.add(om.mul(f1.mul(T))), rq), w1), .55, min(.85, nX.mul(.45)));   // lensed images are squeezed thin: keep them smooth
          const s0 = u.rin.div(rq), Tn = pow(max(0, s0.mul(s0).mul(s0).mul(sqrt(s0).oneMinus()).div(.0567)), .25);   // 1 at its hottest, just outside the inner edge
          const beta = sqrt(float(.5).div(rq.sub(1))), gam = float(1).div(sqrt(beta.mul(beta).oneMinus())), tg = normalize(vec3(q.z, 0, q.x.negate()));   // it turns against the galaxy
          const g = sqrt(float(1).div(rq).oneMinus()).div(gam.mul(beta.mul(dot(tg, normalize(v).negate())).oneMinus())), gD = mix(1, g, u.dop);   // gravitational × Doppler shift
          const dens = smoothstep(u.rin, u.rin.mul(1.12), rq).mul(smoothstep(u.rout.mul(.5), u.rout, rq).oneMinus());
          const a = clamp(dens.mul(tex.mul(1.1).add(.25)), 0, 1).mul(.92);
          const I = Tn.mul(Tn).mul(Tn).mul(Tn).mul(pow(gD, 3)).mul(smoothstep(.2, .85, tex).mul(1.5).add(.35)).mul(u.br).mul(select(nX.greaterThan(.5), u.halo, 1));
          const em0 = bbRGB(Tn.mul(gD).mul(u.hot).mul(9000).add(800)).mul(I), em = mix(em0, vec3(1, .66, .3).mul(luma(em0)).mul(1.39), u.warm);   // warmth: toward yellow-orange at the same brightness
          const ac = a.mul(mix(1, clamp(luma(em).mul(3), 0, 1), u.clear));   // where the disk is dim it lets the sky through, rather than laying a dark band over it
          col.addAssign(em.mul(a).mul(A.oneMinus())); A.addAssign(ac.mul(A.oneMinus())); nX.addAssign(1);
        });
      });
    });
    // the sky behind: where the bent ray lands on screen (mirrored back in if it leaves the screen), plus faint lensed stars
    const vn = normalize(v), rel = u.vrot.mul(p.add(vn.mul(60)).sub(ro)), dep0 = rel.z.negate(), dep = select(abs(dep0).lessThan(1e-4), 1e-4, dep0);   // behind you: the antipode
    const ndc = vec2(rel.x.mul(u.px).div(dep), rel.y.mul(u.py).div(dep)), uvb = vec2(ndc.x.mul(.5).add(.5), ndc.y.mul(-.5).add(.5));
    const mir = x => abs(fract(x.mul(.5)).mul(2).sub(1)).oneMinus();
    // where the bent ray lands off screen there is no sky to read: fade (not step) to the unbent view there, so no hard edges
    const inEdge = min(min(uvb.x, uvb.y.oneMinus()), min(uvb.x.oneMinus(), uvb.y)), onS = smoothstep(-.02, .12, inEdge).mul(step(0, dep0));
    const bg = mix(bgAt(screenUV), bgAt(vec2(mir(uvb.x), mir(uvb.y))), onS).mul(mix(mix(1, .22, u.skyDark), 1, smoothstep(2.7, 10, sqrt(h2)))).toVar();   // (the sky right around the hole can be darkened, so its own light reads: Look → bhSkyDark)
    const bend = acos(clamp(dot(vn, rd), -1, 1)), cell = floor(vn.mul(260)), hs = hash3(cell), fp = fract(vn.mul(260)).sub(.5);
    bg.addAssign(vec3(.9, .93, 1).mul(step(.985, hs)).mul(exp(dot(fp, fp).mul(-40))).mul(smoothstep(.03, .3, bend)).mul(.8));
    // the core's glow between you and the hole veils it: from afar the shadow is a soft darkening in the light, not a hole punched through it
    return vec4(mix(col.add(bg.mul(A.oneMinus()).mul(dead.oneMinus())), bgAt(screenUV), u.veil), 1);
  })();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), m); mesh.position.copy(GC); mesh.frustumCulled = false; mesh.renderOrder = -1000; scene.add(mesh);
  // objects behind the shadow are hidden by a depth-only sphere the size of the shadow
  const shadow = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 32), new THREE.MeshBasicMaterial({ colorWrite: false })); shadow.position.copy(GC); shadow.renderOrder = -999; scene.add(shadow);
  return { mesh, shadow, u };
}
