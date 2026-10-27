import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminSectionApp from '../apps/TenantAdminSectionApp';
import PharmacyBillingBody from '../components/Admin/PharmacyBillingBody';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Pharmacy Billing">
      <TenantAdminSectionApp sectionKey="billing">
        <PharmacyBillingBody />
      </TenantAdminSectionApp>
    </PageLoader>
  </React.StrictMode>,
);