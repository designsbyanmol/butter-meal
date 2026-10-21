// src/apps/TenantAdminOrdersApp.tsx
import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import DineinOrdersModalBody from '../components/MainDashboard/DineinOrdersModalBody';

const TenantAdminOrdersApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="orders">
    <DineinOrdersModalBody mode="admin" />
  </TenantAdminSectionApp>
);

export default TenantAdminOrdersApp;