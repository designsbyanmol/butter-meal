import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import SignupApp from '../apps/SignupApp';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <SignupApp />
  </React.StrictMode>,
);