import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SuperAdminApp from '../apps/SuperAdminApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SuperAdminApp />
  </React.StrictMode>,
);