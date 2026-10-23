// src/entries/contact.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import ContactPage from '../components/Contact/ContactPage';
import PageLoader from '../components/Preloader/PageLoader';
import '../index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Contact us">
      <ContactPage />
    </PageLoader>
  </React.StrictMode>,
);