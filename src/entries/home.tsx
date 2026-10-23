import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import HomeApp from '../apps/HomeApp';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Welcome to Dozzelo">
      <HomeApp />
    </PageLoader>
  </React.StrictMode>,
);