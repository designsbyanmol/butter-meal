// scripts/inline.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

// Keep only index.html — everything else goes away.
for (const file of fs.readdirSync(distPath)) {
  if (file === 'index.html') continue;
  const full = path.join(distPath, file);
  const stat = fs.statSync(full);
  if (stat.isDirectory()) fs.rmSync(full, { recursive: true, force: true });
  else fs.unlinkSync(full);
}

console.log('[inline] single-file dist ready: index.html');