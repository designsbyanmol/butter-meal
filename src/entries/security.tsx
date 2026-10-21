import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import StaticApp from '../apps/StaticApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <StaticApp
      title="Security"
      description="We're preparing a dedicated contact page. In the meantime, reach us at ContactDozzelo@gmail.com."
    />
  </React.StrictMode>,
);