import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminInfoApp from '../apps/TenantAdminInfoApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminInfoApp />
  </React.StrictMode>,
);