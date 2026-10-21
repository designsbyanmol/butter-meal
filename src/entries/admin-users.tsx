import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminUsersApp from '../apps/TenantAdminUsersApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminUsersApp />
  </React.StrictMode>,
);