// components/MainDashboard/MainDashboard.tsx
import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';
import LoginModal from '../Auth/LoginModal';
import AdminDashboardCards from './AdminDashboardCards';
import SuperAdminShell from './SuperAdminShell';
import { useIsMobile } from '../../hooks/useIsMobile';
import local from './MainDashboard.module.scss';

const MainDashboard: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = React.useState(false);
  const isMobile = useIsMobile(900);

  if (!isAuthenticated) {
    return (
      <>
        <div className={local.dashboard}>
          <div className={local.hero}>
            <h1 className={local.title}>Platform Administration</h1>
            <p className={local.subtitle}>
              Sign in to manage stores, menus, and tenants.
            </p>
            <Button
              shape="pill"
              size="lg"
              onClick={() => setIsLoginOpen(true)}
              variant="secondary"
            >
              Sign In
            </Button>
            <p className={local.hint}>
              Customers should use their store's direct link.
            </p>
          </div>
        </div>
        <LoginModal
          isOpen={isLoginOpen}
          onClose={() => setIsLoginOpen(false)}
        />
      </>
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

  // Mobile fallback — the legacy card grid.
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