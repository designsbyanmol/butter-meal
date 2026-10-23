import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminInfoApp from '../apps/TenantAdminInfoApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Store Information">
      <TenantAdminInfoApp />
    </PageLoader>
  </React.StrictMode>,
);