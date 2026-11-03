// src/components/Admin/HospitalOpdPrintLayout.tsx
import React, { forwardRef } from 'react';
import { Tenant } from '../../contexts/TenantContext';
import local from './HospitalBilling.module.scss';

interface OpdPrintLayoutProps {
  tenant: Tenant | null;
  billNo: string;
  patient: { name: string; age: string; gender: string; address: string };
  doctorName?: string;
  vitals: { bp: string; spo2: string; pulse: string; temp: string; weight: string };
  facilities: string[];
  footerHeading: string;
  footerInfo: string;
  disclaimer: string;
}

const HospitalOpdPrintLayout = forwardRef<HTMLDivElement, OpdPrintLayoutProps>(
  ({ tenant, billNo, patient,doctorName, vitals, facilities, footerHeading, footerInfo, disclaimer }, ref) => {
    
    const avatar = tenant?.avatarUrl || 'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/avatar/avatar.png';
    
    return (
      <div ref={ref} className={local.a4Page}>
        {/* Watermark */}
        <div className={local.watermark} style={{ backgroundImage: `url(${avatar})` }} />

        {/* Top Header Row */}
        <div className={local.opdHeaderRow}>
          <div className={local.dateBox}>
            <span className={local.headerLabel}>Date of OPD - </span>
            <span>{new Date().toLocaleDateString('en-IN')}</span>
          </div>
          <p  className={local.billNoBox}>Bill No. {billNo}</p>
          <div className={local.regNoBox}>
            <span className={local.headerLabel}>Reg No. - {tenant?.registrationNo || '-'}</span>
          </div>
        </div>

        {/* Main Hospital Info & Title */}
        <div className={local.opdMainHeader}>
          <div className={local.avatarBox}>
            <img src={avatar} alt="Hospital Avatar" />
          </div>
          <div className={local.hospitalInfoBox}>
            <h1>{tenant?.displayName || 'Hospital Name'}</h1>
            <p>{tenant?.storeAddress || 'Hospital Address'}</p>
            <p>Contact no. {tenant?.whatsappPhone || '-'}, {tenant?.ownerPhone || '-'}</p>
          </div>
        </div>

        {/* Body Split */}
        <div className={local.opdBodyContainer}>
          {/* Left Sidebar (Facilities) */}
          <div className={local.opdSidebar}>
            <h3>Available Facilities</h3>
            <ul>
              {facilities.map(f => <li key={f}>{f}</li>)}
            </ul>
          </div>

          {/* Right Main Area */}
          <div className={local.opdMainContent}>
            <div className={local.opdPatientBar}>
              <div className={local.patientRow}>
                <span><strong>Patient name:</strong> {patient.name}</span>
                <span><strong>Age:</strong> {patient.age}</span>
                <span><strong>Gender:</strong> {patient.gender}</span>
              </div>
              <div className={local.patientRow}>
                <span className={local.addressCell}><strong>Address:</strong> {patient.address}</span>
                          {doctorName && (
  <div className={local.doctorCell}>
    <strong>Doctor:</strong> {doctorName}
  </div>
)}
              </div>
            </div>

            <div className={local.opdVitalsRow}>
              <span><strong>BP:</strong> {vitals.bp || ''}</span>
              <span><strong>SpO2:</strong> {vitals.spo2 || ''}</span>
              <span><strong>Pulse:</strong> {vitals.pulse || ''}</span>
              <span><strong>Temp:</strong> {vitals.temp || ''}</span>
              <span><strong>Weight:</strong> {vitals.weight || ''}</span>
            </div>
            
            <h2 className={local.opdRxTitle}>Rₓ</h2>
          </div>
        </div>

        {/* Footer */}
        <div className={local.opdFooter}>
          <div className={local.footerBox}>
            <strong>{footerHeading}</strong>
            <p>{footerInfo}</p>
          </div>
          <div className={local.disclaimerBox}>
            {disclaimer}
          </div>
        </div>
      </div>
    );
  }
);

export default HospitalOpdPrintLayout;