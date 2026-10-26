# FWA FOREVER

Every FWA winner as a star in one galaxy you fly through as a mouse-cursor ship. three.js r184 `WebGPURenderer` + TSL
shaders (WebGL 2 fallback via `?webgl`). Deployed on Railway from `main`; owner: Laurens (creative director, designs by eye
and gives quick visual feedback; keep replies short).

## Run

- `npm run dev` → http://localhost:5173. Reloads on any `src/` change; the multiplayer relay runs on the same port.
- `npm run build` → `dist/`; `npm start` serves `dist/` + relay on `$PORT` (what Railway runs, see `railway.json`).
- Commit and push straight to `main` (Laurens's call); Railway deploys it.
- `npm run build:single` → `dist-single/index.html`, one self-contained page; also runs eslint `no-undef` on the
  concatenated source. Run it after every change: it is the only lint.

## How the source works

- `src/NN-name.js` are NOT real modules: they are concatenated in order into one module scope (`shell.mjs`), so every
  top-level name is shared. Order matters (a file can only use names from earlier files at load time).
- `vite.config.mjs` serves that concatenation as `src/main.js`; `index.html` is a stub replaced by `src/template.tpl`
  (+ `markup.tpl`, `style.css`, `font.css.part`). The `.tpl` names keep Vite's HTML scanner away from the placeholders.
- Settings: every slider is a row in `LOOK_DEF` (`src/03-settings.js`), keyed by a stable name. Defaults = the row value,
  overridden by `MY_LOOK` (Laurens's tuned look). When he pastes "FWA FOREVER look settings: {...}" (Look → Copy
  settings), merge those keys into `MY_LOOK` (skip keys with no row). Galaxy-shape settings (`SHAPE`) apply on Rebuild.
- Keys: W thrust, Shift/Space boost, A/D roll, S brake, M map, H home, C Look panel, P pilots list, G fly to nearest pilot, X hold current speed, R rings game on/off,
  ↑/↓ speed mode, ←/→ or Q/E nearer/farther winner, F free pointer.
- Data: the real archive (IorIorIor/fwa4eva-data, private) ships with the app in `public/data/` (archive.json + shots/YYYY/*.webp).
  Refresh it with `npm run data` (copies from a clone at `../fwa4eva-data`). Days before the archive starts borrow real winners.
- THE ROOM (branch `the-room`, from `main`): it opens in a 3D room in the year 2000 (`src/01-zroom.js`: the renderer is made there,
  first thing, so the room shows before anything else loads; `shell.mjs` puts `await roomYield()` between the later files so it keeps
  drawing while the galaxy loads). The opening (`intro.startPortal`) runs on the CRT: the galaxy is rendered into the glass's render
  target (`room.galaxy(fn)` wraps every main render while `room.on`) and `#portalLoad` + `#shipLayer` are laid onto the glass with a CSS
  matrix3d. Start → `room.dive()`: one move (`mkRun`, log distance) into the glass; when the glass fills the window the room goes and
  the opening takes the move on (`intro.rr`). The CRT is plain CSS layers over the whole screen (`crtFx`), on as the glass fills it and
  fading off after. CRT: Look → Room: CRT and its playground (`room.lab()`, `#crt-lab`). On touch the 3D pointer sits on the glass and goes where you tap.
  Look → Room; `?noroom` (or roomOn 0) skips it.
  The props (books, certificates, postcard, medal, Mustang, Nokia, modem, webcam, Flash box, Post-its, mug, CD-Rs, pen cup, Game Boy,
  lava lamp, wall clock on local time) are `room/props.js`: plain three.js
  at real size, shared with their viewer (`python3 room/build-viewer.py out.html`); `shell.mjs` puts it just before 01-zroom with `ROOM_IMG`
  (the pictures in `public/room/`, written inline in the single build). Where each stands: the `at(...)` list in 01-zroom, then
  `ROOM_POS`: Laurens arranges the room in the playground (Arrange: click a thing, gizmo moves / turns it; the lamp's head turns) and
  pastes "FWA FOREVER room positions: {...}": merge those into `ROOM_POS` (moved things are also kept in his browser, `fwa-room-pos-v1`).
- Music: `src/18-ascent.js`, the generative Ascent instrument (no mp3). Its dials are Look rows `a_…`; Look → Music has an import
  field for settings copied from the Ascent toy.
- Multiplayer: `relay.mjs` (WebSocket at `/ws`, positions only, deals each pilot a distinct hue). On claude.ai the page
  uses the artifact room instead. `?bots=N` adds pretend pilots for testing.

## Pitfalls

- Long one-line statements carry trailing `// comments`. When inserting code, never place it after a `//` on the same
  line: it silently becomes part of the comment (this has broken things twice). After edits, grep for code that ended
  up inside comments.
- TSL: numbers are fine as node args; `transpose`, `step(edge, x)`; no NaN-prone `smoothstep(a, a, x)`.
- Camera/ship far from the origin: `renderer.highPrecision = true`; never compute view direction from world
  `cameraPosition` in shaders near the ship (float precision), use `modelViewMatrix` instead.
- The ship renders on its own transparent canvas above the HUD (`shipRenderer`/`shipScene`); trails render in
  `trailScene` and are added after the colour grade.

## Testing

`test/` has Playwright scripts that drive the page headless (WebGPU via SwiftShader; slow). Use `?test` (deterministic
hooks on `window.__sky`, e.g. `await __sky.run(n)`, `__sky.tickOnly()`) and `?norender` for logic-only runs.
`python test/shots.py URL prefix W H "name::js;;name::js"` takes posed screenshots.
