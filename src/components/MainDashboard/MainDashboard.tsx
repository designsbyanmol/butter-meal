// components/MainDashboard/MainDashboard.tsx
import React, { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoginModal from '../Auth/LoginModal';
import styles from './MainDashboard.module.scss';

const MainDashboard: React.FC = () => {
  const { isAuthenticated, user, isAdmin } = useAuth();
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  if (!isAuthenticated) {
    return (
      <>
        <div className={styles.dashboard}>
          <div className={styles.hero}>
            <h1 className={styles.title}>Platform Administration</h1>
            <p className={styles.subtitle}>
              Sign in to manage stores, menus, and tenants.
            </p>
            <button
              className={styles.primaryBtn}
              onClick={() => setIsLoginOpen(true)}
            >
              Sign In
            </button>
            <p className={styles.hint}>
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
      <div className={styles.dashboard}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Welcome, {user?.name}</h1>
          <p className={styles.subtitle}>
            You don't have admin access on this page.
          </p>
          <p className={styles.hint}>
            Please visit your store's direct URL to continue.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.dashboard}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Welcome back, {user?.name}</h1>
        <p className={styles.subtitle}>This is your platform dashboard.</p>
        <p className={styles.hint}>
          Your custom dashboard UI goes here — add analytics, quick links,
          recent activity, or whatever you need.
        </p>
        <div className={styles.placeholder}>
          <p>Placeholder — replace with your dashboard content.</p>
        </div>
      </div>
    </div>
  );
};

export default MainDashboard;