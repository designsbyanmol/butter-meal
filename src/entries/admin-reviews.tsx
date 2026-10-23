import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminReviewsApp from '../apps/TenantAdminReviewsApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Reviews">
      <TenantAdminReviewsApp />
    </PageLoader>
  </React.StrictMode>,
);