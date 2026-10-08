// scripts/inline.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');

if (!fs.existsSync(distPath)) {
  console.error('[inline] dist/ not found — did vite build fail?');
  process.exit(1);
}

for (const file of fs.readdirSync(distPath)) {
  if (file === 'index.html') continue;
  const full = path.join(distPath, file);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) {
    fs.rmSync(full, { recursive: true, force: true });
  } else {
    fs.unlinkSync(full);
  }
}

console.log('[inline] dist ready: index.html');