import React from 'react';
import TenantAdminSectionApp from './TenantAdminSectionApp';
import HospitalBillingBody from '../components/Admin/HospitalBillingBody';

const TenantAdminHospitalBillingApp: React.FC = () => (
  <TenantAdminSectionApp sectionKey="hospital_billing">
    <HospitalBillingBody />
  </TenantAdminSectionApp>
);

export default TenantAdminHospitalBillingApp;