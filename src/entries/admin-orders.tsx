import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminOrdersApp from '../apps/TenantAdminOrdersApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminOrdersApp />
  </React.StrictMode>,
);