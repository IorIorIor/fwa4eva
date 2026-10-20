# FWA FOREVER

Every FWA winner as a star in one galaxy you fly through, as a mouse cursor. Time spirals inward: 2000 sits on the
rim, today circles a ray-traced supermassive black hole at the core.

Built on three.js r184 `WebGPURenderer` with TSL shaders, with an automatic WebGL 2 fallback (`?webgl` forces it).
Ships as one self-contained HTML page plus the soundtrack.

## Build and run

```sh
npm install
npm run dev          # Vite dev server; edits in src/ reload the page
npm run build        # dist/: the built site
npm start            # serves dist/ plus the multiplayer relay (what Railway runs)
npm run build:single # dist-single/: one self-contained page plus the soundtrack, three.js from a CDN
```

`index.html` is a stub: `vite.config.mjs` swaps in the page from `src/template.tpl` and serves `src/main.js` as the
`src/NN-*.js` files concatenated in order (`shell.mjs` does the assembling for both builds).

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
| `src/template.tpl`, `markup.tpl`, `style.css`, `font.css.part` | the page shell, HUD markup, styles, embedded fonts |

## Multiplayer

`server.mjs` serves the built site and runs a small WebSocket relay at `/ws`: each pilot sends where they are ten
times a second and the relay passes it on to everyone else. No accounts, nothing stored. The page connects to
`/ws` on its own host automatically (on claude.ai it uses the artifact's room instead). `?relay=wss://host/ws` points a
page at another relay.

Locally: `npm run build && npm start` (http://localhost:8787), or `npm start` beside `npm run dev` (Vite proxies `/ws`).

## Deploying (Railway)

Connect the GitHub repo; `railway.json` builds with `npm run build` and starts `npm start`, which listens on `$PORT`.
`/health` reports how many pilots are connected.

## Tests

The `test/` scripts drive the page in headless Chromium (Playwright, WebGPU through SwiftShader):

```sh
pip install playwright && python -m playwright install chromium
python test/run2.py "http://localhost:5173/?test" test/flight.js      # flight logic, no rendering
python test/shots.py "http://localhost:5173/?test" out 1280 720 "start::await t.run(3)"
```

## Notes

- Settings are keyed by stable names, so saved Look settings (this browser, and the claude.ai account when hosted
  there) carry across versions.
- FF Good Pro is embedded in `src/font.css.part`; check its licence covers web embedding before deploying publicly.
- The soundtrack is "An Ending Ascent".
