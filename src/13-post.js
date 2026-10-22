/* ───────────────────────── the frame: passes, bloom, lens and grade ───────────────────────── */
const VOID = new C3(0x06050d);
const volPass = pass(volScene, camera, { depthBuffer: false, samples: 0 });
const hazePass = pass(hazeScene, camera, { samples: 0 }); hazeScene.background = new C3(0, 0, 0);
const softPass = pass(softScene, camera, { samples: 0 });
const arcPass = pass(arcScene, camera, { depthBuffer: false, samples: 0 });
const PU = {   // pipeline uniforms
  inv: uniform(0), apex: uniform(new THREE.Vector2(.5, .5)),   // apex: where on screen you're heading (or, looking back, coming from)   // the inverted monochrome look: black stars on white
  volOn: uniform(0), hazeScreen: uniform(1), volBlur: uniform(0),
  sw: uniform(0), swC: uniform(new THREE.Vector2(.5, .5)), swR: uniform(.1), swP: uniform(0), asp: uniform(1),   // the black hole twisting the picture round it: swirl (radians at its middle), where, how far it reaches (screen heights), how hard it pulls in, the screen's aspect
  exp: uniform(1), film: uniform(1), vig: uniform(.45), grain: uniform(.03), ab: uniform(0), beta: uniform(0), black: uniform(0), con: uniform(1), sat: uniform(1), cool: uniform(0),
  bgK: uniform(1), lv: uniform(0), lvMid: uniform(2),   // lv: the ring veil's levels over the whole frame (1 = all white, easing back to 0 = untouched)
    // the whole background (gas, haze, arcs) dims to this on the map, leaving the winners and the lines
  edge: uniform(0), edgeA: uniform(.1), edgeB: uniform(.25), nV: uniform(new V3(0, 1, 0)),   // edge-on: how much, the angle band (as sin), the disk normal in view space
  betaC: uniform(0), beam: uniform(1), vV: uniform(new V3(0, 0, -1)), tx: uniform(1), ty: uniform(1),   // the Doppler shift: β, beaming, travel direction (view space), tan of the half FOV
};
// soft layers sit on the gas (or the void), the haze is soft-clipped and screened over them: 1-(1-a)(1-b), never past white
// the gas is sampled with a small tent blur (volSmooth, in its own pixels) to iron out the ray-march grain
const volAt = Fn(() => { const T = volPass.getTextureNode(), o = vec2(PU.volBlur).div(U.res), c = T.sample(screenUV).rgb.mul(.4).toVar();
  c.addAssign(T.sample(screenUV.add(o)).rgb.mul(.15)); c.addAssign(T.sample(screenUV.sub(o)).rgb.mul(.15)); c.addAssign(T.sample(screenUV.add(vec2(o.x, o.y.negate()))).rgb.mul(.15)); c.addAssign(T.sample(screenUV.sub(vec2(o.x, o.y.negate()))).rgb.mul(.15)); return c });
softScene.backgroundNode = mix(vec3(VOID.r, VOID.g, VOID.b), volAt(), PU.volOn);
const bgAt = uv0 => {
  // looking along the disk every soft layer piles up into one white band: rays that graze the plane get dimmed
  const ray = normalize(vec3(uv0.x.mul(2).sub(1).mul(PU.tx), uv0.y.mul(-2).add(1).mul(PU.ty), -1)), ek = PU.edge.mul(smoothstep(PU.edgeA, PU.edgeB, abs(dot(ray, PU.nV))).oneMinus()).oneMinus();
  const s = min(softPass.getTextureNode().sample(uv0).rgb.mul(ek), 1), h = hazePass.getTextureNode().sample(uv0).rgb.mul(ek);
  return select(PU.hazeScreen.greaterThan(.5), exp(h.negate()).mul(s.oneMinus()).oneMinus(), min(s.add(h), 1)).add(arcPass.getTextureNode().sample(uv0).rgb).mul(PU.bgK);   // the arcs add their light on top, as they did in the scene
};
scene.backgroundNode = bgAt(screenUV);
const bh = makeBlackHole(bgAt);
// the core's glare, seen from far off: a broad hot glow over the black hole that the bloom spreads wide
const coreFlare = (() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: new C3(1, .93, .82), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 })); s.position.copy(GC); s.renderOrder = 5; s.frustumCulled = false; scene.add(s); return s })();
// the core's puffs: a small cloud of soft star puffs round the black hole, a bulge in the middle thinning out into a flat
// disk (built once in unit space; size, height, count and grain are set each frame)
const corePuffs = (() => {
  const n = 40000, p = new Float32Array(n * 3), R_ = mulberry32(4242), g = gaussOf(R_), c = new Float32Array(n * 3), cc = new C3();
  for (let i = 0; i < n; i++) {
    if (R_() < .45) { p.set([g() * .2, g() * .14, g() * .2], i * 3) }   // the bulge: a squashed ball
    else { const r = Math.min(1.2, -Math.log(1 - R_() * .96) * .32), a = R_() * Math.PI * 2, h = .02 + .07 * Math.exp(-((r / .35) ** 2)); p.set([Math.cos(a) * r, g() * h, Math.sin(a) * r], i * 3) }   // the disk it thins out into
    cc.setHSL(.08 + R_() * .05, .5, .62 + R_() * .25); c.set([cc.r, cc.g, cc.b], i * 3);
  }
  const m = softPoints(p, { cols: c, size: .03, op: .03, order: 1, fx: true }); m.position.copy(GC); m.quaternion.copy(GQ); return m;
})();
// the same puffs (and the bulge's), raymarched instead: a glowing, self-shadowing cloud with the same shape, its grain from noise
const puffVol = (() => {
  const u = { cam: uniform(new V3()), E: uniform(1), sB: uniform(1), kB: uniform(0), R: uniform(1), H: uniform(1), kC: uniform(0), f: uniform(1), grain: uniform(.7), fB: uniform(1), gB: uniform(.7), gC: uniform(.7), shB: uniform(1), shC: uniform(1), vB: uniform(0), vC: uniform(0), flB: uniform(0), flC: uniform(0), tB: uniform(.5), tC: uniform(.5), kG: uniform(0), sG: uniform(1), dust: uniform(.6), steps: uniform(32), bh: uniform(BH.sh * 2), tint: uniform(.5), occ: uniform(.15) };
  const m = skyMat({ blend: 'premul', side: THREE.BackSide, depthTest: false });
  m.fragmentNode = Fn(() => {
    const ro = u.cam, rd = normalize(positionGeometry.sub(u.cam)).toVar();
    const b = dot(ro, rd), c = dot(ro, ro).sub(1), disc = b.mul(b).sub(c); Discard(disc.lessThan(0));
    const sd = sqrt(disc), t0 = max(0, b.negate().sub(sd)), t1 = b.negate().add(sd); Discard(t1.lessThanEqual(t0));   // (not 'sq': that's the square helper used below)
    const ds = t1.sub(t0).div(u.steps).toVar(), t = t0.add(ds.mul(ign(screenUV.mul(U.res)))).toVar(), dw = ds.mul(u.E);
    const col = vec3(0).toVar(), T = float(1).toVar();
    Loop(64, ({ i }) => {
      If(float(i).greaterThanEqual(u.steps).or(T.lessThan(.02)), () => { Break() });
      const pl = ro.add(rd.mul(t)), edgeK = smoothstep(1, .72, length(pl)), x = pl.mul(u.E).toVar(); t.addAssign(ds);   // galaxy frame, world units from the core; edgeK: thins out toward the bounding sphere, so it has no rim
      const r = length(x.xz), qb = vec3(x.x, x.y.div(.55), x.z).div(u.sB), qc = vec3(x.x, x.y.div(u.H.mul(.7).max(.01)), x.z).div(u.R.mul(.2));
      const hD = u.R.mul(exp(r.div(u.R.mul(.35)).pow(2).negate()).mul(.07).add(.02)).mul(u.H).max(1);
      const bul = exp(dot(qb, qb).mul(-.5)).mul(u.kB).div(u.sB);
      const cor = exp(dot(qc, qc).mul(-.5)).mul(.45).add(exp(r.div(u.R.mul(.32)).negate()).mul(exp(sq(x.y.div(hD)).mul(-.5))).mul(.55)).mul(u.kC).div(u.R);
      // each part keeps its own puff settings: grain size (size, detail, count), mottling (texture), edge (crisp), size variety, brightness variety, colour
      const grainOf = (f, amt, sh, vr, fl) => { const n = fbm5(x.mul(f)), n2 = noise3(x.mul(f.mul(.43)).add(7.7)), g0 = pow(n.mul(2.2).sub(.35).max(0), sh);
        const g1 = mix(g0, pow(noise3(x.mul(f.mul(2.6)).add(3.3)).mul(2).sub(.4).max(0), sh), vr.mul(n2));   // size variety: some places finer
        return mix(1, g1, amt).mul(mix(1, n2.mul(1.8).add(.1), fl)) };
      const tintOf = k => select(k.lessThan(.5), mix(vec3(.72, .86, 1.2), vec3(1), k.mul(2)), mix(vec3(1), vec3(1.2, .9, .62), k.sub(.5).mul(2)));
      const grB = grainOf(u.fB, u.gB, u.shB, u.vB, u.flB), grC = grainOf(u.f, u.gC, u.shC, u.vC, u.flC), clr = smoothstep(u.bh, u.bh.mul(2), length(x));
      const qg = length(x).div(u.sG), glw = exp(qg.mul(qg).mul(-.5)).mul(u.kG).div(u.sG);   // the core's glow: a soft sphere of light
      const dB = bul.mul(grB), dC = cor.mul(grC).add(glw), d = dB.add(dC).mul(clr).mul(edgeK).mul(dw), gr = dB.add(dC).div(bul.add(cor).max(1e-9));
      const tc = tintOf(u.tB).mul(dB).add(tintOf(u.tC).mul(dC)).div(dB.add(dC).max(1e-9)).mul(tintOf(u.tint).mul(2).sub(1).max(.3));
      col.addAssign(T.mul(mix(vec3(1, .8, .58), vec3(1, .93, .82), gr.min(1))).mul(tc).mul(d)); T.mulAssign(exp(d.mul(u.dust).negate()));
    });
    return vec4(col, T.oneMinus().mul(u.occ));   // the dust shades the puffs' own light; it only hides the galaxy behind a little (occ)
  })();
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 24), m); mesh.position.copy(GC); mesh.quaternion.copy(GQ); mesh.frustumCulled = false; mesh.renderOrder = 2; mesh.visible = false; softScene.add(mesh);
  return { mesh, u };
})();
const scenePass = pass(scene, camera, { samples: 4 });
const sceneTex = scenePass.getTextureNode();
const bloomPass = bloom(sceneTex.min(1), .45, .4, .72);
const bloomTex = bloomPass.getTextureNode();
const trailPass = pass(trailScene, camera, { samples: 4 }), trailTex = trailPass.getTextureNode();
const finalNode = Fn(() => {
  const vUv = screenUV, uv0 = vec2(vUv).toVar();
  If(PU.sw.add(PU.swP).greaterThan(.001), () => {   // falling in: space twists round the hole and the picture is drawn in toward it
    const ar = vec2(PU.asp, 1), q = vUv.sub(PU.swC).mul(ar), R2 = PU.swR.mul(PU.swR), f = R2.div(dot(q, q).add(R2)), a = PU.sw.mul(f), cs = cos(a), sn = sin(a);
    const w = vec2(q.x.mul(cs).sub(q.y.mul(sn)), q.x.mul(sn).add(q.y.mul(cs))).mul(PU.swP.mul(f).add(1)).div(ar).add(PU.swC);
    uv0.assign(abs(fract(w.mul(.5)).mul(2).sub(1)).oneMinus());   // (mirrored back in where it reaches past the screen's edge, so nothing smears)
  });
  const S = p => min(min(sceneTex.sample(p).rgb, 1).add(bloomTex.sample(p).rgb), 1);
  const d0 = vUv.sub(.5), d = vUv.sub(PU.apex), r = length(d0), ra = length(d), o = d.mul(ra).mul(PU.ab.mul(.03));   // the fringes and the light-speed streaks spread from the apex, wherever the camera looks from
  const c = vec3(S(uv0.add(o)).r, S(uv0).g, S(uv0.sub(o)).b).toVar();
  If(PU.beta.greaterThan(.01), () => {   // radial light-speed blur
    const acc = c.toVar();
    for (let i = 1; i < 7; i++) acc.addAssign(S(uv0.sub(d.mul(PU.beta.mul(i / 6 * .06).mul(min(ra, 1.2))))));
    c.assign(acc.div(7));
  });
  If(PU.betaC.greaterThan(.002), () => {   // Doppler: light from ahead arrives bluer and brighter, from behind redder and dimmer
    const dir = normalize(vec3(vUv.x.mul(2).sub(1).mul(PU.tx), vUv.y.mul(-2).add(1).mul(PU.ty), -1)), b = PU.betaC;
    const D = float(1).div(float(1).div(sqrt(b.mul(b).oneMinus())).mul(b.mul(dot(dir, PU.vV)).oneMinus()));   // 1 / γ(1 − β cos θ')
    c.assign(c.mul(bbRGB(D.mul(6600))).mul(min(2.5, pow(D, PU.beam.mul(1.2)))));
  });
  c.mulAssign(PU.exp);
  const fc = c.mul(c.mul(2.51).add(.03)).div(c.mul(c.mul(2.43).add(.59)).add(.14)); c.assign(mix(min(c, 1), fc, PU.film));
  c.assign(pow(max(vec3(0), c.sub(PU.black).div(PU.black.oneMinus())), vec3(PU.con)));            // true blacks, then contrast
  const lu = dot(c, vec3(.2126, .7152, .0722)); c.assign(mix(vec3(lu), c, PU.sat)); c.assign(mix(c, lu.mul(vec3(.78, .9, 1.12)), PU.cool));   // grade toward cold
  If(PU.inv.greaterThan(.001), () => { c.assign(mix(c, vec3(dot(c, vec3(.2126, .7152, .0722)).oneMinus()), PU.inv)) });   // inverted: the sky turns white, the stars black
  { const tc = trailTex.sample(vUv).rgb, tm = max(max(tc.r, tc.g), tc.b); c.assign(mix(c.add(tc.div(max(1, tm))), mix(c, tc.div(max(tm, 1e-4)), min(1, tm)), PU.inv)) }   // the trails over the graded sky (on white they're laid on like paint, keeping their colour)   // the trails over the graded sky; where they pile up they brighten to full colour, never to white
  c.mulAssign(min(1, PU.vig.add(PU.beta.mul(.45))).mul(smoothstep(PU.beta.mul(-.18).add(.32), .9, r)).oneMinus());
  If(PU.lv.greaterThan(.001), () => { const o = PU.lv.mul(PU.lv); c.assign(pow(clamp(c.div(max(.02, PU.lv.oneMinus())), 0, 1), vec3(float(1).div(PU.lv.mul(PU.lvMid).add(1)))).mul(o.oneMinus()).add(o)) });   /* levels: the white point drops, the mids lift and the black point rises, all to white at 1 */
  c.addAssign(fract(sin(dot(vUv.mul(vec2(1733, 977)), vec2(12.9898, 78.233)).add(fract(U.now).mul(91.7))).mul(43758.5453)).sub(.5).mul(PU.grain));
  return vec4(clamp(c, 0, 1), 1);
})();
loadProg(.6);
const pipeline = new THREE.RenderPipeline(renderer); pipeline.outputColorTransform = false; pipeline.outputNode = finalNode;
function setPassScales() { arcPass.setResolutionScale(LOOK.arcs > 0 ? LOOK.arcRes ?? 1 : 1 / 32); volPass.setResolutionScale(LOOK.volumetric ? LOOK.volRes : 1 / 32);   /* (a layer that's switched off still renders: at a postage stamp it costs nothing) */ softPass.setResolutionScale(LOOK.softRes); hazePass.setResolutionScale(LOOK.softRes); U.minSoft.value = 1 / LOOK.softRes }
