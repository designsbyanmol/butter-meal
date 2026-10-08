// scripts/inline.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

// Keep index.html and sw.js — delete everything else.
const keep = new Set(['index.html', 'sw.js']);

for (const file of fs.readdirSync(distPath)) {
  if (keep.has(file)) continue;
  const full = path.join(distPath, file);
  if (fs.statSync(full).isDirectory()) {
    fs.rmSync(full, { recursive: true, force: true });
  } else {
    fs.unlinkSync(full);
  }
}

console.log('[inline] dist ready:', Array.from(keep).join(', '));