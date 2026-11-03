import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminHospitalBillingApp from '../apps/TenantAdminHospitalBillingApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Hospital Billing">
      <TenantAdminHospitalBillingApp />
    </PageLoader>
  </React.StrictMode>,
);