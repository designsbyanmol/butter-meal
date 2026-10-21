// src/apps/SuperAdminSettingsApp.tsx
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import SuperAdminSectionApp from './SuperAdminSectionApp';
import SettingsModalBody from '../components/MainDashboard/Modals/SettingsModalBody';

const SuperAdminSettingsApp: React.FC = () => {
  const { isAuthenticated, isLoading, user } = useAuth();
  return (
    <SuperAdminSectionApp
      isAuthenticated={isAuthenticated}
      isLoading={isLoading}
      isPlatformAdmin={!!user?.isPlatformAdmin}
      sectionKey="settings"
    >
      <SettingsModalBody />
    </SuperAdminSectionApp>
  );
};

export default SuperAdminSettingsApp;