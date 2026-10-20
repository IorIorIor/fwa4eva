# FWA FOREVER

Every FWA winner as a star in one galaxy you fly through, as a mouse cursor. Time spirals inward: 2000 sits on the
rim, today circles a ray-traced supermassive black hole at the core.

Built on three.js r184 `WebGPURenderer` with TSL shaders, with an automatic WebGL 2 fallback (`?webgl` forces it).
Ships as one self-contained HTML page plus the soundtrack.

## Build and run

```sh
npm install
npm run build      # writes dist/index.html (CDN three.js), dist/dev.html (local three.js), dist/app.js
npm run serve      # http://localhost:8765/dist/dev.html
```

`dist/` is a static site: deploy `dist/index.html` and `dist/an-ending-ascent.mp3` anywhere.

Useful query flags: `?stats` (fps readout; or press the backtick key), `?webgl` (force the WebGL 2 fallback),
`?test` (no title card, deterministic hooks on `window.__sky` for scripted tests), `?norender` (logic only).

## Layout

The page is plain ES modules split by concern, concatenated in order into one module scope by `build.mjs`, then
bundled by esbuild (which inlines the three.js add-ons used).

| file | what |
| --- | --- |
| `src/00-head.js` | imports |
| `src/01-util.js` | helpers, storage, seeded random |
| `src/02-data.js` | the archive: sample data, CSV/JSON import, screenshots in IndexedDB |
| `src/03-settings.js` | every Look slider (`LOOK_DEF`), presets, migrations, galaxy shape |
| `src/04-world.js` | the world model: date to radius, arm spiral (rings or single-spiral layout), winner placement, black hole size from mass |
| `src/05-gfx-core.js` | renderer, scenes, shared uniforms and shader helpers (aberration, arm phase, blackbody) |
| `src/06-sky.js` | background stars, haze, sprite nebulae, dark clouds, arcs, volumetric gas |
| `src/07-blackhole.js` | the ray-traced Schwarzschild black hole, and the small disks the exotic winners use |
| `src/08-andromeda.js` | bulge, dust filaments, knots, outer disk, satellite galaxies |
| `src/09-rings.js` | time rings and the turning date ruler |
| `src/10-winners.js` | the winners: point-spread sprites, nearby suns, constellations |
| `src/11-exotics.js` | Month and Year winners as exotic objects |
| `src/12-ship.js` | outpost, the cursor-arrow ship, trail, motes, streaks |
| `src/13-post.js` | render passes, bloom, Doppler shift, grade |
| `src/14-flight.js` | flight model and cameras |
| `src/15-input.js` | input, map picking and zoom, aim assist |
| `src/16-ui.js` | filters, labels, tooltip, regions, instruments, archive import |
| `src/17-look.js` | Look panel to uniforms, settings sync |
| `src/18-audio.js` | music, engine, hover chimes |
| `src/18-net.js` | multiplayer |
| `src/19-guide.js` | first-flight tips, benchmark |
| `src/19-frame.js` | the frame loop |
| `src/20-boot.js` | warm-up, opening sequence, test hooks |
| `src/template.html`, `markup.html`, `style.css`, `font.css.part` | the page shell, HUD markup, styles, embedded fonts |

## Multiplayer

`src/18-net.js` shares each pilot's position a few times a second and draws everyone else as a cursor with a trail in
their own colour. Today the transport is the claude.ai artifact `room` capability, which only admits signed-in
claude.ai viewers. The page works solo without it. To make it open to anyone, swap `Net.connect` / `Net.send` for a
small WebSocket relay (Cloudflare Durable Objects, PartyKit, Liveblocks or Supabase Realtime all fit); the rest of
the module stays as it is.

## Tests

The `test/` scripts drive the page in headless Chromium (Playwright, WebGPU through SwiftShader):

```sh
pip install playwright && python -m playwright install chromium
python test/run2.py "http://localhost:8765/dist/dev.html?test" test/flight.js      # flight logic, no rendering
python test/shots.py "http://localhost:8765/dist/dev.html?test" out 1280 720 "start::await t.run(3)"
```

## Notes

- Settings are keyed by stable names, so saved Look settings (this browser, and the claude.ai account when hosted
  there) carry across versions.
- FF Good Pro is embedded in `src/font.css.part`; check its licence covers web embedding before deploying publicly.
- The soundtrack is "An Ending Ascent".
