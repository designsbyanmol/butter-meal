import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminReviewsApp from '../apps/SuperAdminReviewsApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Reviews">
      <SuperAdminReviewsApp />
    </PageLoader>
  </React.StrictMode>,
);