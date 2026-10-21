// src/apps/TenantAdminUsersApp.tsx
import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import UserManagementBody from '../components/Admin/UserManagementBody';

const TenantAdminUsersApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="users">
    <UserManagementBody />
  </TenantAdminSectionApp>
);

export default TenantAdminUsersApp;