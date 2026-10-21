// src/apps/TenantAdminInfoApp.tsx
import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import InfoPopupBody from '../components/Store/InfoPopupBody';

const TenantAdminInfoApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="info">
    <InfoPopupBody />
  </TenantAdminSectionApp>
);

export default TenantAdminInfoApp;