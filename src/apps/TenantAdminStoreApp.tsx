// src/apps/TenantAdminStoreApp.tsx
import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import StoreModalBody from '../components/Store/StoreModalBody';

const TenantAdminStoreApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="store">
    <StoreModalBody />
  </TenantAdminSectionApp>
);

export default TenantAdminStoreApp;