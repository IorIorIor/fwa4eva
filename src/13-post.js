/* ───────────────────────── the frame: passes, bloom, lens and grade ───────────────────────── */
const VOID = new C3(0x06050d);
const volPass = pass(volScene, camera, { depthBuffer: false, samples: 0 });
const hazePass = pass(hazeScene, camera, { samples: 0 }); hazeScene.background = new C3(0, 0, 0);
const softPass = pass(softScene, camera, { samples: 0 });
const PU = {   // pipeline uniforms
  volOn: uniform(0), hazeScreen: uniform(1),
  exp: uniform(1), film: uniform(1), vig: uniform(.45), grain: uniform(.03), ab: uniform(0), beta: uniform(0), black: uniform(0), con: uniform(1), sat: uniform(1), cool: uniform(0),
  betaC: uniform(0), beam: uniform(1), vV: uniform(new V3(0, 0, -1)), tx: uniform(1), ty: uniform(1),   // the Doppler shift: β, beaming, travel direction (view space), tan of the half FOV
};
// soft layers sit on the gas (or the void), the haze is soft-clipped and screened over them: 1-(1-a)(1-b), never past white
softScene.backgroundNode = mix(vec3(VOID.r, VOID.g, VOID.b), volPass.getTextureNode().sample(screenUV).rgb, PU.volOn);
const bgAt = uv0 => {
  const s = min(softPass.getTextureNode().sample(uv0).rgb, 1), h = hazePass.getTextureNode().sample(uv0).rgb;
  return select(PU.hazeScreen.greaterThan(.5), exp(h.negate()).mul(s.oneMinus()).oneMinus(), min(s.add(h), 1));
};
scene.backgroundNode = bgAt(screenUV);
const bh = makeBlackHole(bgAt);
// the core's glare, seen from far off: a broad hot glow over the black hole that the bloom spreads wide
const coreFlare = (() => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softDot, color: new C3(1, .93, .82), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity: 0 })); s.position.copy(GC); s.renderOrder = 5; s.frustumCulled = false; scene.add(s); return s })();
const scenePass = pass(scene, camera, { samples: 4 });
const sceneTex = scenePass.getTextureNode();
const bloomPass = bloom(sceneTex.min(1), .45, .4, .72);
const bloomTex = bloomPass.getTextureNode();
const finalNode = Fn(() => {
  const vUv = screenUV, uv0 = vUv;
  const S = p => min(min(sceneTex.sample(p).rgb, 1).add(bloomTex.sample(p).rgb), 1);
  const d = vUv.sub(.5), r = length(d), o = d.mul(r).mul(PU.ab.mul(.03));
  const c = vec3(S(uv0.add(o)).r, S(uv0).g, S(uv0.sub(o)).b).toVar();
  If(PU.beta.greaterThan(.01), () => {   // radial light-speed blur
    const acc = c.toVar();
    for (let i = 1; i < 7; i++) acc.addAssign(S(uv0.sub(d.mul(PU.beta.mul(i / 6 * .06).mul(r)))));
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
  c.mulAssign(min(1, PU.vig.add(PU.beta.mul(.45))).mul(smoothstep(PU.beta.mul(-.18).add(.32), .9, r)).oneMinus());
  c.addAssign(fract(sin(dot(vUv.mul(vec2(1733, 977)), vec2(12.9898, 78.233)).add(fract(U.now).mul(91.7))).mul(43758.5453)).sub(.5).mul(PU.grain));
  return vec4(clamp(c, 0, 1), 1);
})();
loadProg(.6);
const pipeline = new THREE.RenderPipeline(renderer); pipeline.outputColorTransform = false; pipeline.outputNode = finalNode;
function setPassScales() { volPass.setResolutionScale(LOOK.volRes); softPass.setResolutionScale(LOOK.softRes); hazePass.setResolutionScale(LOOK.softRes); U.minSoft.value = 1 / LOOK.softRes }
