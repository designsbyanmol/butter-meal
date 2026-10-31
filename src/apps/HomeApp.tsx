// src/apps/HomeApp.tsx
import React, { useEffect } from 'react';
import HomePage from '../components/Home/HomePage';
import { useNavigationPreloader } from '../hooks/useNavigationPreloader';

const HomeApp: React.FC = () => {
  const nav = useNavigationPreloader({ title: 'Opening signup...' });
  const goToSignup = () => {
    const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
    nav.show(() => {
      window.location.href = `${window.location.origin}${dir}p/signup.html`;
    }, 'Opening signup...');
  };

const handleTrySample = () => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
    nav.show(() => {
      window.location.href = `${window.location.origin}${dir}p/signup.html`;
    }, 'Try sample store - not yet implemented...');
};

  useEffect(() => {
    document.title = 'Dozzelo - Launch your online store, menu & dine-in billing';
  }, []);

  return <HomePage onSignup={goToSignup} onTrySample={handleTrySample} />;
};

export default HomeApp;