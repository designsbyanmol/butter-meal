import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminMenuApp from '../apps/TenantAdminMenuApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Products">
      <TenantAdminMenuApp />
    </PageLoader>
  </React.StrictMode>,
);