import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminStoresApp from '../apps/SuperAdminStoresApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SuperAdminStoresApp />
  </React.StrictMode>,
);