// components/MainDashboard/MainDashboard.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Button } from '../ui';
import LoginModal from '../Auth/LoginModal';
import ReviewsOverview from './ReviewsOverview';
import local from './MainDashboard.module.scss';

const MainDashboard: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // ---------- Unauthenticated ----------
  if (!isAuthenticated) {
    return (
      <>
        <div className={local.dashboard}>
          <div className={local.hero}>
            <h1 className={local.title}>Platform Administration</h1>
            <p className={local.subtitle}>
              Sign in to manage stores, menus, and tenants.
            </p>
            <Button shape="pill" size="lg" onClick={() => setIsLoginOpen(true)} variant="secondary">
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

  // ---------- Authenticated, not admin ----------
  if (!isAdmin) {
    return (
      <div className={local.dashboard}>
        <div className={local.hero}>
          <h1 className={local.title}>Welcome, {user?.name}</h1>
          <p className={local.subtitle}>
            You don't have admin access on this page.
          </p>
          <p className={local.hint}>
            Please visit your store's direct URL to continue.
          </p>
        </div>
      </div>
    );
  }

  // ---------- Admin ----------
  return (
    <div className={local.dashboard}>
      <div className={local.hero}>
        <h1 className={local.title}>Welcome back, {user?.name}</h1>
        <p className={local.subtitle}>This is your platform dashboard.</p>
        <ReviewsOverview />
      </div>
    </div>
  );
};

export default MainDashboard;