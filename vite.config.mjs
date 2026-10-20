// Vite (what `canopy dev` / `canopy deploy` and `npm run dev` / `npm run build` use).
// index.html is a stub: this plugin swaps in the real page from src/template.tpl, and serves src/main.js as the
// concatenated app source (see shell.mjs). Editing anything in src/ reloads the page.
import { join } from 'node:path';
import { ROOT, SRC, appSource, pageHtml } from './shell.mjs';

const MAIN = join(SRC, 'main.js');

const fwa = {
  name: 'fwa-forever',
  enforce: 'pre',
  transformIndexHtml: { order: 'pre', handler: () => pageHtml({ script: '<script type="module" src="/src/main.js"></script>' }) },
  load(id) { if (id.split('?')[0] === MAIN) return appSource() },
  configureServer(server) {
    server.watcher.add(SRC);
    server.watcher.on('change', file => {
      if (!file.startsWith(SRC) || file === MAIN) return;
      for (const m of server.moduleGraph.getModulesByFile(MAIN) ?? []) server.moduleGraph.invalidateModule(m);
      server.ws.send({ type: 'full-reload' });
    });
  },
};

export default {
  root: ROOT,
  plugins: [fwa],
  build: { target: 'esnext', outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  optimizeDeps: { entries: ['index.html'], esbuildOptions: { target: 'esnext' } },
  // `npm run dev` talks to the relay from `npm start` (run both) for multiplayer while developing
  server: { port: 5173, proxy: { '/ws': { target: 'ws://localhost:8787', ws: true } } },
};
