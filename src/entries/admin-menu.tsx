import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminMenuApp from '../apps/TenantAdminMenuApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminMenuApp />
  </React.StrictMode>,
);