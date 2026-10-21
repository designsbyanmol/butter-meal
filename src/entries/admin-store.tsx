import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminStoreApp from '../apps/TenantAdminStoreApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminStoreApp />
  </React.StrictMode>,
);