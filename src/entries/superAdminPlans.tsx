import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminPlansApp from '../apps/SuperAdminPlansApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Plans">
      <SuperAdminPlansApp />
    </PageLoader>
  </React.StrictMode>,
);