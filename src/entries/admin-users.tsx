import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminUsersApp from '../apps/TenantAdminUsersApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="User Management">
      <TenantAdminUsersApp />
    </PageLoader>
  </React.StrictMode>,
);