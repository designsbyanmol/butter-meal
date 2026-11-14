// src/components/Admin/HospitalOpdPrintLayout.tsx
import React, { forwardRef } from "react";
import { Tenant } from "../../contexts/TenantContext";
import type { OpdVitals } from "../../types";
import local from "./HospitalBilling.module.scss";

interface OpdPrintLayoutProps {
  tenant: Tenant | null;
  billNo: string;
  patient: {
    name: string;
    phone?: string;
    age: string;
    gender: string;
    address: string;
  };
  doctorName?: string;
  department?: string; // ← new
  serviceName?: string; // ← new
  price?: number;
  vitals: OpdVitals;
  facilities: string[];
  footerHeading: string;
  footerInfo: string;
  disclaimer: string;
}

const HospitalOpdPrintLayout = forwardRef<HTMLDivElement, OpdPrintLayoutProps>(
  (
    {
      tenant,
      billNo,
      patient,
      doctorName,
      department,
      serviceName,
      price,
      vitals,
      facilities,
      footerHeading,
      footerInfo,
      disclaimer,
    },
    ref,
  ) => {
    const avatar =
      tenant?.avatarUrl ||
      "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/avatar/avatar.png";

    return (
      <div ref={ref} className={local.a4Page}>
        {/* Watermark */}
        <div
          className={local.watermark}
          style={{ backgroundImage: `url(${avatar})` }}
        />

        {/* Top Header Row */}
        <div className={local.opdHeaderRow}>
          <div className={local.dateBox}>
            <span className={local.headerLabel}>Date of OPD - </span>
            <span>{new Date().toLocaleDateString("en-IN")}</span>
          </div>
          <p className={local.billNoBox}>Bill No. {billNo}</p>
          <div className={local.regNoBox}>
            <span className={local.headerLabel}>
              Reg No. - {tenant?.registrationNo || "-"}
            </span>
          </div>
        </div>

        {/* Main Hospital Info & Title */}
        <div className={local.opdMainHeader}>
          <div className={local.avatarBox}>
            <img src={avatar} alt="Hospital Avatar" />
          </div>
          <div className={local.hospitalInfoBox}>
            <h1>{tenant?.displayName || "Hospital Name"}</h1>
            <p>{tenant?.storeAddress || "Hospital Address"}</p>
            <p>
              Contact no. {tenant?.whatsappPhone || "-"},{" "}
              {tenant?.ownerPhone || "-"}
            </p>
            <div className={local.hospitalDep}>
              {department && (
                <span>
                  <strong>Department:</strong> {department}
                </span>
              )}
              {serviceName && (
                <span>
                  <strong>Service:</strong> {serviceName}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Body Split */}
        <div className={local.opdBodyContainer}>
          {/* Left Sidebar (Facilities) */}
          <div className={local.opdSidebar}>
            <h3>Available Facilities</h3>
            <ul>
              {facilities.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </div>

          {/* Right Main Area */}
          <div className={local.opdMainContent}>
            <div className={local.patientRow}>
              <span>
                <strong>Name:</strong> {patient.name} ({patient.age})
              </span>
              <span>
                <strong>Gender:</strong> {patient.gender}
              </span>
              {price !== undefined && price > 0 && (
                <span>
                  <strong>Fee:</strong> ₹
                  {Number(price).toLocaleString("en-IN", {
                    maximumFractionDigits: 2,
                  })}
                </span>
              )}
              <span className={local.addressCell}>
                <strong>Address:</strong> {patient.address}
              </span>
              {doctorName && (
                <span className={local.doctorCell}>
                  <strong>Doctor:</strong> {doctorName}
                </span>
              )}
            </div>

            <div className={local.opdVitalsRow}>
              {Object.entries(vitals)
                .filter(([label]) => label.trim() !== "")
                .map(([label, value]) => (
                  <span key={label}>
                    <strong>{label}:</strong> {value}
                  </span>
                ))}
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
          <div className={local.disclaimerBox}>{disclaimer}</div>
        </div>
      </div>
    );
  },
);

export default HospitalOpdPrintLayout;
