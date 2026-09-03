// scripts/inline.js
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the built index.html
const distPath = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distPath, 'index.html');

// Read all files in dist
const files = fs.readdirSync(distPath);

// Create a map of file contents
const fileMap = {};

files.forEach(file => {
  if (file === 'index.html') return;
  const content = fs.readFileSync(path.join(distPath, file), 'utf-8');
  fileMap[file] = content;
});

// Read index.html
let html = fs.readFileSync(indexPath, 'utf-8');

// Replace script tags with inline content
html = html.replace(
  /<script\s+type="module"\s+src="([^"]+)"><\/script>/g,
  (match, src) => {
    const filename = src.split('/').pop();
    if (fileMap[filename]) {
      return `<script type="module">${fileMap[filename]}</script>`;
    }
    return match;
  }
);

// Replace CSS links with inline style
html = html.replace(
  /<link\s+rel="stylesheet"\s+href="([^"]+)">/g,
  (match, href) => {
    const filename = href.split('/').pop();
    if (fileMap[filename]) {
      return `<style>${fileMap[filename]}</style>`;
    }
    return match;
  }
);

// Write the inlined HTML
fs.writeFileSync(path.join(distPath, 'index.html'), html);

// Remove all other files (optional - keep only index.html)
const keepFiles = ['index.html'];
files.forEach(file => {
  if (!keepFiles.includes(file)) {
    fs.unlinkSync(path.join(distPath, file));
  }
});

console.log('✅ All files inlined into index.html');