// Vite (what `canopy dev` / `canopy deploy` and `npm run dev` / `npm run build` use).
// index.html is a stub: this plugin swaps in the real page from src/template.tpl, and serves src/main.js as the
// concatenated app source (see shell.mjs). Editing anything in src/ reloads the page; the multiplayer relay runs at /ws.
import { join } from 'node:path';
import { ROOT, SRC, appSource, pageHtml } from './shell.mjs';
import { attachRelay } from './relay.mjs';

const MAIN = join(SRC, 'main.js');

const fwa = {
  name: 'fwa-forever',
  enforce: 'pre',
  transformIndexHtml: { order: 'pre', handler: () => pageHtml({ script: '<script type="module" src="/src/main.js"></script>' }) },
  load(id) { if (id.split('?')[0] === MAIN) return appSource() },
  configureServer(server) {
    if (server.httpServer) attachRelay(server.httpServer);   // multiplayer in dev too, on the same port
    server.watcher.add(SRC);
    const reload = file => {
      if (!file.startsWith(SRC) || file === MAIN) return;
      try { for (const m of server.moduleGraph.getModulesByFile(MAIN) ?? []) server.moduleGraph.invalidateModule(m) } catch { }
      (server.hot ?? server.ws).send({ type: 'full-reload', path: '*' });
      server.config.logger.info(`  ${file.slice(SRC.length + 1)} changed: reloading`, { timestamp: true });
    };
    server.watcher.on('change', reload); server.watcher.on('add', reload);
  },
};

export default {
  root: ROOT,
  plugins: [fwa],
  build: { target: 'esnext', outDir: 'dist', emptyOutDir: true, chunkSizeWarningLimit: 4000 },
  optimizeDeps: { entries: ['index.html'], esbuildOptions: { target: 'esnext' } },
  server: { port: 5173 },
};
