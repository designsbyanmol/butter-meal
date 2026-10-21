import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminReviewsApp from '../apps/TenantAdminReviewsApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <TenantAdminReviewsApp />
  </React.StrictMode>,
);