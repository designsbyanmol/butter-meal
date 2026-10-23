import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminApp from '../apps/SuperAdminApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Super Admin">
      <SuperAdminApp />
    </PageLoader>
  </React.StrictMode>,
);