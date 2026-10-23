import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminOrdersApp from '../apps/TenantAdminOrdersApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Orders">
      <TenantAdminOrdersApp />
    </PageLoader>
  </React.StrictMode>,
);