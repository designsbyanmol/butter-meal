import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminStoreApp from '../apps/TenantAdminStoreApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Store Management">
      <TenantAdminStoreApp />
    </PageLoader>
  </React.StrictMode>,
);