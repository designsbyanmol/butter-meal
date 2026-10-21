// src/apps/HomeApp.tsx
import React, { useEffect } from 'react';
import HomePage from '../components/Home/HomePage';

const goToSignup = () => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  window.location.href = `${window.location.origin}${dir}p/signup.html`;
};

const handleTrySample = () => {
  console.log('Try sample store - not yet implemented');
};

const HomeApp: React.FC = () => {
  useEffect(() => {
    document.title = 'Dozzelo - Launch your online store, menu & dine-in billing';
  }, []);

  return <HomePage onSignup={goToSignup} onTrySample={handleTrySample} />;
};

export default HomeApp;