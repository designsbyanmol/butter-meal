// src/components/MainDashboard/MainDashboard.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import SuperAdminShell from './SuperAdminShell';
import HomePage from '../Home/HomePage';
import local from './MainDashboard.module.scss';

const goToSignup = () => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  window.location.href = `${window.location.origin}${dir}signup.html`;
};

const handleTrySample = () => {
  console.log('Try sample store - not yet implemented');
};

const MainDashboard: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();

  if (!isAuthenticated) {
    return (
      <HomePage
        onSignup={goToSignup}
        onTrySample={handleTrySample}
      />
    );
  }

  if (!isAdmin) {
    return (
      <div className={local.dashboard}>
        <div className={local.hero}>
          <h1 className={local.title}>Welcome, {user?.name}</h1>
          <p className={local.subtitle}>
            You don't have admin access on this page.
          </p>
        </div>
      </div>
    );
  }

  return <SuperAdminShell />;
};

export default MainDashboard;