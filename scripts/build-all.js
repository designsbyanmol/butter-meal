// scripts/build-all.js
import { build } from 'vite';
import { PAGES, buildConfigForPage } from '../vite.config.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force') || args.has('-f');
const DRY_RUN = args.has('--dry') || args.has('-d');

const cacheDir = path.join(
  __dirname,
  '..',
  'node_modules',
  '.cache',
  'incremental-build',
);

const readManifest = (pageName) => {
  const p = path.join(cacheDir, `${pageName}.json`);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
};

const needsRebuild = (pageName) => {
  if (FORCE) return { rebuild: true, reason: 'forced (--force)' };

  const manifest = readManifest(pageName);
  if (!manifest) return { rebuild: true, reason: 'no manifest yet' };

  if (manifest.entry && !fs.existsSync(manifest.entry)) {
    return { rebuild: true, reason: 'entry file moved' };
  }

  let newestMtime = 0;
  let newestFile = '';

  for (const mod of manifest.modules) {
    try {
      const stat = fs.statSync(mod);
      if (stat.mtimeMs > newestMtime) {
        newestMtime = stat.mtimeMs;
        newestFile = mod;
      }
    } catch {
      return { rebuild: true, reason: `module removed: ${mod}` };
    }
  }

  if (newestMtime > manifest.builtAt) {
    return {
      rebuild: true,
      reason: `changed: ${path.relative(process.cwd(), newestFile)}`,
    };
  }

  return { rebuild: false };
};

const plan = PAGES.map((page) => {
  const name = page.html.replace('.html', '').toLowerCase();
  const decision = needsRebuild(name);
  return { page, name, ...decision };
});

const toBuild = plan.filter((p) => p.rebuild);
const toSkip = plan.filter((p) => !p.rebuild);

console.log('');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`Build plan (${PAGES.length} pages)`);
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
for (const p of plan) {
  console.log(
    `  ${p.rebuild ? '→' : '✓'} ${p.page.html.padEnd(22)} ${
      p.rebuild ? `rebuild — ${p.reason}` : 'up to date'
    }`,
  );
}
console.log(`\n${toBuild.length} to build, ${toSkip.length} skipped\n`);

if (DRY_RUN) {
  console.log('(--dry — exiting without building)');
  process.exit(0);
}

if (toBuild.length === 0) {
  console.log('Nothing to do. Use `npm run build -- --force` to rebuild all.');
  process.exit(0);
}

const t0 = Date.now();
for (const { page } of toBuild) {
  console.log(`\n▸ Building ${page.html} ...`);
  const start = Date.now();
  await build(buildConfigForPage(page));
  console.log(`✓ ${page.html} built in ${Date.now() - start}ms`);
}

console.log(`\nDone in ${Date.now() - t0}ms — built ${toBuild.length}, skipped ${toSkip.length}\n`);