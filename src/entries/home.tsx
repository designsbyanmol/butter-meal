// src/entries/home.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import HomeApp from '../apps/HomeApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HomeApp />
  </React.StrictMode>,
);