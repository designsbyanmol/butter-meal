import React from 'react';
import ReactDOM from 'react-dom/client';
import '../index.css';
import TenantAdminSectionApp from '../apps/TenantAdminSectionApp';
import HospitalAppointmentsBody from '../components/Admin/HospitalAppointmentsBody';
import PageLoader from '../components/Preloader/PageLoader';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PageLoader title="Appointments">
      <TenantAdminSectionApp sectionKey="appointments">
        <HospitalAppointmentsBody />
      </TenantAdminSectionApp>
    </PageLoader>
  </React.StrictMode>,
);