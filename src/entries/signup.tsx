import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SignupApp from '../apps/SignupApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Create your store">
      <SignupApp />
    </PageLoader>
  </React.StrictMode>,
);