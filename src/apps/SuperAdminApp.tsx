// src/apps/SuperAdminApp.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { useIsMobile } from '../hooks/useIsMobile';
import MainDashboard from '../components/MainDashboard/MainDashboard';
import LoginModal from '../components/Auth/LoginModal';
import DashboardSkeleton from '../components/DashboardSkeleton/DashboardSkeleton';

/**
 * The SuperAdmin entry is the platform admin's home. It requires a
 * signed-in platform admin; anyone else gets the login modal.
 */
const SuperAdminApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const isMobile = useIsMobile(900);

  if (isLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }

  if (!isAuthenticated) {
    return (
      <>
        <div style={{ minHeight: '100vh', background: '#f8fafc' }} />
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
        />
      </>
    );
  }

  if (!user?.isPlatformAdmin) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 24,
          textAlign: 'center',
        }}
      >
        <div>
          <h2 style={{ margin: '0 0 8px' }}>Not authorized</h2>
          <p style={{ margin: 0, color: '#666', fontSize: 14 }}>
            This page is for platform administrators only.
          </p>
        </div>
      </div>
    );
  }

  return <MainDashboard />;
};

export default SuperAdminApp;