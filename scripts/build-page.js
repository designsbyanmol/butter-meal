// scripts/build-page.js
import { build } from 'vite';
import { PAGES, buildConfigForPage } from '../vite.config.ts';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distPath = path.join(__dirname, '..', 'dist');

const arg = process.argv[2];
if (!arg) {
  console.error('\nUsage: npm run build:page -- <PageName>');
  console.error('Pages:', PAGES.map((p) => p.html.replace('.html', '')).join(', '));
  process.exit(1);
}

const wanted = arg.toLowerCase().replace(/\.html$/, '').trim();
const page = PAGES.find(
  (p) => p.html.replace(/\.html$/i, '').toLowerCase() === wanted,
);

if (!page) {
  console.error(`\n✗ Unknown page: "${arg}"`);
  console.error(
    'Available:',
    PAGES.map((p) => p.html.replace('.html', '')).join(', '),
  );
  process.exit(1);
}

if (!fs.existsSync(distPath)) {
  fs.mkdirSync(distPath, { recursive: true });
}

const assetsDir = path.join(distPath, 'assets');
if (fs.existsSync(assetsDir)) {
  fs.rmSync(assetsDir, { recursive: true, force: true });
}

console.log(`\n▸ Building ${page.html} ...`);
const t0 = Date.now();
await build(buildConfigForPage(page));
console.log(`\n✓ ${page.html} rebuilt in ${Date.now() - t0}ms\n`);