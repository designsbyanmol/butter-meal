// src/components/Admin/HospitalIpdPrintLayout.tsx
import React, { forwardRef } from "react";
import { formatRupees } from "../../utils/subscription";
import { Tenant } from "../../contexts/TenantContext";
import {
  IpdBillItem,
  IpdDischargeType,
  IPD_DISCHARGE_LABELS,
} from "../../types";
import local from "./HospitalBilling.module.scss";

interface IpdPrintLayoutProps {
  tenant: Tenant | null;
  billNo: string;
  patient: { name: string; age: string; gender: string; address: string };
  dates: { from: string; to: string };
  items: IpdBillItem[];
  total: number;
  advance: number;
  remaining: number;
  isPaid: boolean;
  footerHeading: string;
  footerInfo: string;
  disclaimer: string;
  dischargeType?: IpdDischargeType | null;
}

const numberToWords = (num: number): string => {
  const a = [
    "",
    "one ",
    "two ",
    "three ",
    "four ",
    "five ",
    "six ",
    "seven ",
    "eight ",
    "nine ",
    "ten ",
    "eleven ",
    "twelve ",
    "thirteen ",
    "fourteen ",
    "fifteen ",
    "sixteen ",
    "seventeen ",
    "eighteen ",
    "nineteen ",
  ];
  const b = [
    "",
    "",
    "twenty",
    "thirty",
    "forty",
    "fifty",
    "sixty",
    "seventy",
    "eighty",
    "ninety",
  ];

  const numStr = Math.floor(num).toString();
  if (numStr.length > 9) return "overflow";
  const n = ("000000000" + numStr)
    .slice(-9)
    .match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
  if (!n) return "";

  const grp = (digits: string): string => {
    const d = Number(digits);
    if (d === 0) return "";
    if (d < 20) return a[d];
    const tens = b[Number(digits[0])];
    const ones = a[Number(digits[1])];
    return (tens + " " + ones).trim() + " ";
  };

  let str = "";
  str += n[1] !== "00" ? grp(n[1]) + "crore " : "";
  str += n[2] !== "00" ? grp(n[2]) + "lakh " : "";
  str += n[3] !== "00" ? grp(n[3]) + "thousand " : "";
  str += n[4] !== "0" ? a[Number(n[4])] + "hundred " : "";
  str +=
    n[5] !== "00"
      ? (str !== "" ? "and " : "") + grp(n[5]) + "only"
      : str !== ""
        ? "only"
        : "";

  return str.trim();
};

const HospitalIpdPrintLayout = forwardRef<HTMLDivElement, IpdPrintLayoutProps>(
  (
    {
      tenant,
      billNo,
      patient,
      dates,
      items,
      total,
      advance,
      remaining,
      isPaid,
      footerHeading,
      footerInfo,
      disclaimer,
      dischargeType,
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

        {/* ───── Top Header Row (matches OPD) ───── */}
        <div className={local.opdHeaderRow}>
          <div className={local.dateBox}>
            <span className={local.headerLabel}>Date of IPD - </span>
            <span>{new Date().toLocaleDateString("en-IN")}</span>
          </div>
          <p className={local.billNoBox}>Bill No. {billNo}</p>
          <div className={local.regNoBox}>
            <span className={local.headerLabel}>
              Reg No. - {tenant?.registrationNo || "-"}
            </span>
          </div>
        </div>

        {/* ───── Main Hospital Info & Title (matches OPD) ───── */}
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
          </div>
        </div>

        {/* ───── Body Split (matches OPD) ───── */}
        <div className={local.opdBodyContainer}>
          {/* Right Main Area */}
          <div className={local.opdMainContent}>
            {/* Patient row 1 */}
            <div className={local.patientRow}>
              <span>
                <strong>Patient name:</strong> {patient.name}
              </span>
              <span>
                <strong>Age:</strong> {patient.age}
              </span>
              <span>
                <strong>Gender:</strong> {patient.gender}
              </span>
              <span className={local.addressCell}>
                <strong>Address:</strong> {patient.address}
              </span>
            </div>

            {/* Items table (IPD-specific body) */}
            <table className={local.ipdTable}>
              <thead>
                <tr>
                  <th style={{ width: "45%" }}>Particulars</th>
                  <th style={{ width: "20%" }}>Charge/Day</th>
                  <th style={{ width: "15%" }}>Days</th>
                  <th style={{ width: "20%" }}>Total Charge</th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, i) => (
                  <tr key={i}>
                    <td>{it.name}</td>
                    <td>{formatRupees(it.chargePerDay)}</td>
                    <td>{it.type === "per-day" ? it.days : "-"}</td>
                    <td>{formatRupees(it.total)}</td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={4} className={local.emptyTable}>
                      No items added
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* Totals row (kept from IPD, styled like OPD vitals row) */}
            <div className={local.ipdTotalsRow}>
              <div className={local.wordsBox}>
                <strong>Total Amount in words</strong>
                <p className={local.italic}>{numberToWords(total)}</p>
              </div>
              <div className={local.mathBox}>
                <div className={local.mathRow}>
                  <span>Total Amount</span>
                  <span>{formatRupees(total)}</span>
                </div>
                <div className={local.mathRow}>
                  <span>{isPaid ? "Amount Paid (Advance)" : "Advance Paid"}</span>
                  <span>{formatRupees(advance)}</span>
                </div>
                {!isPaid && (
                  <div className={local.mathRow}>
                    <span>Remaining</span>
                    <span>{formatRupees(remaining)}</span>
                  </div>
                )}
                <div className={local.mathRow}>
                  <span>Paid</span>
                  <span>{isPaid ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ───── Footer (matches OPD) ───── */}
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

export default HospitalIpdPrintLayout;