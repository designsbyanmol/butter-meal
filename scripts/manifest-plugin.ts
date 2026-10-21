// scripts/manifest-plugin.ts
import fs from 'fs';
import path from 'path';
import type { Plugin } from 'vite';

const CACHE_DIR = path.join(
  process.cwd(),
  'node_modules/.cache/incremental-build',
);

export const ensureCacheDir = (): void => {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
};

export const manifestPlugin = (pageName: string, pageHtml: string): Plugin => ({
  name: `manifest-${pageName}`,
  apply: 'build',

  buildEnd(err) {
    if (err) return;

    const graph = (this as any).getModuleIds?.() ?? [];

    const modules = Array.from(graph)
      .filter((id): id is string => typeof id === 'string')
      .filter((id) => !id.startsWith('\0'))
      .filter((id) => id.includes(process.cwd()))
      .map((id) => id.split('?')[0])
      .filter((id) => id.length > 0);

    const entry = modules.find((id) => id.includes('/src/entries/')) ?? '';

    let newestMtime = 0;
    for (const mod of modules) {
      try {
        const stat = fs.statSync(mod);
        if (stat.mtimeMs > newestMtime) newestMtime = stat.mtimeMs;
      } catch {
        /* ignore */
      }
    }

    const manifest = {
      page: pageHtml,
      entry,
      modules,
      builtAt: newestMtime || Date.now(),
    };

    ensureCacheDir();
    const out = path.join(CACHE_DIR, `${pageName}.json`);
    fs.writeFileSync(out, JSON.stringify(manifest, null, 2));

    // eslint-disable-next-line no-console
    console.log(`    manifest: ${modules.length} modules recorded`);
  },
});