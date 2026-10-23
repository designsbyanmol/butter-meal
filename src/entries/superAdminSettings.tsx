import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminSettingsApp from '../apps/SuperAdminSettingsApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Global Settings">
      <SuperAdminSettingsApp />
    </PageLoader>
  </React.StrictMode>,
);