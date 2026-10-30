// src/entries/admin-menu.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminSectionApp from '../apps/TenantAdminSectionApp';
import AdminPanelBody from '../components/Admin/AdminPanelBody';
import BillingBody from '../components/Admin/BillingBody';
import PageLoader from '../components/Preloader/PageLoader';

const url = new URL(window.location.href);
const isBilling = url.searchParams.get('body') === 'billing';
const sectionKey = isBilling ? 'billing' : 'menu';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title={isBilling ? 'Billing' : 'Products'}>
      <TenantAdminSectionApp sectionKey={sectionKey}>
        {isBilling ? <BillingBody /> : <AdminPanelBody />}
      </TenantAdminSectionApp>
    </PageLoader>
  </React.StrictMode>,
);