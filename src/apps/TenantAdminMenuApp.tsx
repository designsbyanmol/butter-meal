// src/apps/TenantAdminMenuApp.tsx
import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import AdminPanelBody from '../components/Admin/AdminPanelBody';

const TenantAdminMenuApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="menu">
    <AdminPanelBody />
  </TenantAdminSectionApp>
);

export default TenantAdminMenuApp;