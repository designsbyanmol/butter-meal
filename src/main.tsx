// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { db } from './services/database.service';
import { installManifestLink } from './pwa/manifest';
import { registerInlineServiceWorker } from './pwa/registerSw';
import { initInstallPrompt } from './pwa/installPrompt';

const basePath =
  window.location.origin +
  window.location.pathname.replace(/index\.html?$/, '');

// Fire-and-forget PWA bootstrap. Runs before React mounts.
(async () => {
  try {
    installManifestLink({
      startUrl: `${basePath}?hub=1`,
      scope: basePath,
    });
    await registerInlineServiceWorker();
    initInstallPrompt();
  } catch (err) {
    console.warn('[pwa] bootstrap failed:', err);
  }
})();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

db.startConnectionCheck().catch(() => {});