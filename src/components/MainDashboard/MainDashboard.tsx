// components/MainDashboard/MainDashboard.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';
import LoginModal from '../Auth/LoginModal';
import AdminDashboardCards from './AdminDashboardCards';
import SuperAdminShell from './SuperAdminShell';
import HomePage from '../Home/HomePage';
import { useIsMobile } from '../../hooks/useIsMobile';
import local from './MainDashboard.module.scss';

const goToSignup = () => {
  try {
    const url = new URL(window.location.href);
    url.searchParams.set('_sign-up', '1');
    window.location.href = url.toString();
  } catch {
    const sep = window.location.search ? '&' : '?';
    window.location.href =
      window.location.href.split('?')[0] + `${sep}_sign-up=1`;
  }
};

const handleTrySample = () => {
  // TODO: define behavior. Options:
  //   - Open a modal that shows a read-only demo store
  //   - Navigate to a hosted demo tenant URL
  //   - Show a video walkthrough
  console.log('Try sample store - not yet implemented');
};

const MainDashboard: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();
  const isMobile = useIsMobile(900);

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

  // Desktop shell.
  if (!isMobile) {
    return <SuperAdminShell />;
  }

  // Mobile fallback - the legacy card grid.
  return (
    <div className={local.dashboard}>
      <div className={local.hero}>
        <h1 className={local.title}>Welcome back, {user?.name}</h1>
        <p className={local.subtitle}>Everything you need, in one place.</p>
        <AdminDashboardCards />
      </div>
    </div>
  );
};

export default MainDashboard;