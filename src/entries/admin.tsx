import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminApp from '../apps/TenantAdminApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Store Admin">
      <TenantAdminApp />
    </PageLoader>
  </React.StrictMode>,
);