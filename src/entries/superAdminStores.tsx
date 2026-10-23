import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminStoresApp from '../apps/SuperAdminStoresApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Stores">
      <SuperAdminStoresApp />
    </PageLoader>
  </React.StrictMode>,
);