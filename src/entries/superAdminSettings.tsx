import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminSettingsApp from '../apps/SuperAdminSettingsApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SuperAdminSettingsApp />
  </React.StrictMode>,
);