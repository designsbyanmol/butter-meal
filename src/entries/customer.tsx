import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import CustomerApp from '../apps/CustomerApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <CustomerApp />
  </React.StrictMode>,
);