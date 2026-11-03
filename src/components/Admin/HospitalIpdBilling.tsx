// src/components/Admin/HospitalIpdBilling.tsx
import React, { useEffect, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import {
  Button,
  Input,
  FormField,
  ConfirmDialog,
  Modal,
  IconButton,
} from "../ui";
import { formatRupees } from "../../utils/subscription";
import { EyeIcon, ClockIcon } from "../../assets/svgs";
import { HospitalParticular, IpdBillItem } from "../../types";
import HospitalIpdPrintLayout from "./HospitalIpdPrintLayout";
import HospitalIpdHistory from "./HospitalIpdHistory";
import { PatientPicker, PatientValue, emptyPatient } from "./PatientPicker";
import { useHospitalBillingDraft } from "../../hooks/useHospitalBillingDraft";
import local from "./HospitalBilling.module.scss";

/* -------------------------------------------------------------------- */
/* Types                                                                */
/* -------------------------------------------------------------------- */

interface IpdDraft {
  patient: PatientValue;
  dates: { from: string; to: string };
  billNo: string;
  items: IpdBillItem[];
  advance: number;
  isPaid: boolean;
  footerHeading: string;
  footerInfo: string;
  disclaimer: string;
}

const today = (): string => new Date().toISOString().split("T")[0];

const freshBillNo = (): string => `IPD-${Date.now().toString().slice(-6)}`;

const buildInitialDraft = (): IpdDraft => ({
  patient: emptyPatient(),
  dates: { from: today(), to: today() },
  billNo: freshBillNo(),
  items: [],
  advance: 0,
  isPaid: false,
  footerHeading: "Best Wishes",
  footerInfo: "Take healthy diet and be sure to maintain hygine.",
  disclaimer: "Prepared under the observation.",
});

const combineAge = (years: string, months: string): string => {
  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  return parts.join(" ");
};

/**
 * True when the draft contains anything the user typed. Used by the
 * parent (HospitalBillingBody) to decide whether to auto-open this
 * billing form on reload.
 */
export const isIpdDraftNonEmpty = (d: IpdDraft): boolean => {
  if (d.patient.name.trim()) return true;
  if (d.patient.address.trim()) return true;
  if (d.patient.gender.trim()) return true;
  if (d.patient.ageYears.trim()) return true;
  if (d.patient.ageMonths.trim()) return true;
  if (d.items.length > 0) return true;
  if (d.advance !== 0) return true;
  return false;
};

/* -------------------------------------------------------------------- */
/* Component                                                            */
/* -------------------------------------------------------------------- */

export default function HospitalIpdBilling({
  particulars,
}: {
  particulars: HospitalParticular[];
}) {
  const { tenant } = useTenant();

  const draftKey = tenant?.slug ? `hospital:ipd:draft::${tenant.slug}` : null;

  const [draft, setDraft, clearDraft] = useHospitalBillingDraft<IpdDraft>(
    draftKey,
    buildInitialDraft(),
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  /* ---------------- Persist "has content" marker ---------------- */
  useEffect(() => {
    if (!tenant?.slug) return;
    try {
      const key = `hospital:ipd:hasContent::${tenant.slug}`;
      if (isIpdDraftNonEmpty(draft)) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }, [tenant?.slug, draft]);

  /* ---------------- Draft helpers ---------------- */
  const updatePatient = (p: PatientValue) =>
    setDraft((prev) => ({ ...prev, patient: p }));

  const updateDates = (patch: Partial<IpdDraft["dates"]>) =>
    setDraft((prev) => ({ ...prev, dates: { ...prev.dates, ...patch } }));

  const addRow = (p: HospitalParticular) => {
    setDraft((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        {
          particularId: p.id,
          name: p.name,
          type: p.type,
          chargePerDay: p.charge,
          days: p.type === "per-day" ? 1 : 0,
          total: p.charge,
        },
      ],
    }));
  };

  const updateRow = (index: number, patch: Partial<IpdBillItem>) => {
    setDraft((prev) => {
      const copy = [...prev.items];
      const row = { ...copy[index], ...patch };
      row.total =
        row.type === "per-day" ? row.chargePerDay * row.days : row.chargePerDay;
      copy[index] = row;
      return { ...prev, items: copy };
    });
  };

  const removeRow = (index: number) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

  const totalAmount = draft.items.reduce((s, it) => s + it.total, 0);
  const remaining = totalAmount - draft.advance;
  const hasContent = isIpdDraftNonEmpty(draft);

  /* ---------------- Save ---------------- */
  const saveBill = async () => {
  if (!tenant) return;
  setShowSaveConfirm(false);

  const finalAdvance = draft.isPaid ? totalAmount : draft.advance;
  const finalRemaining = draft.isPaid ? 0 : totalAmount - draft.advance;

  const ok = await supabaseService.saveIpdBill(tenant.slug, {
    bill_no: draft.billNo,
    patient_name: draft.patient.name,
    age: combineAge(draft.patient.ageYears, draft.patient.ageMonths),
    gender: draft.patient.gender,
    address: draft.patient.address,
    date_from: draft.dates.from,
    date_to: draft.dates.to,
    items: draft.items,
    total_amount: totalAmount,
    advance: finalAdvance,
    remaining: finalRemaining,
    is_paid: draft.isPaid,
    footer_heading: draft.footerHeading,
    footer_info: draft.footerInfo,
    disclaimer: draft.disclaimer,
  });

  if (ok) {
    alert('IPD Bill saved!');
    clearDraft();
  } else {
    alert('Failed to save');
  }
};

  /* ---------------- Render ---------------- */
  const printLayoutProps = {
    tenant,
    billNo: draft.billNo,
    patient: {
      name: draft.patient.name,
      age: combineAge(draft.patient.ageYears, draft.patient.ageMonths),
      gender: draft.patient.gender,
      address: draft.patient.address,
    },
    dates: draft.dates,
    items: draft.items,
    total: totalAmount,
    advance: draft.advance,
    remaining,
    isPaid: draft.isPaid,
    footerHeading: draft.footerHeading,
    footerInfo: draft.footerInfo,
    disclaimer: draft.disclaimer,
  } as const;

  return (
    <>
      {/* ---------------- Toolbar ---------------- */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 6,
          marginBottom: 16,
        }}
      >
        <IconButton
          variant="ghost"
          size="md"
          aria-label={showPreview ? "Hide preview" : "Show preview"}
          tooltip={showPreview ? "Hide preview" : "Show preview"}
          onClick={() => setShowPreview((v) => !v)}
        >
          <EyeIcon width={18} height={18} fill="#1e1e1e" />
        </IconButton>

        <IconButton
          variant="ghost"
          size="md"
          aria-label="Bill history"
          tooltip="Bill history"
          onClick={() => setIsHistoryOpen(true)}
        >
          <ClockIcon width={18} height={18} fill="#1e1e1e" />
        </IconButton>
      </div>

      {/* ---------------- Form ---------------- */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <PatientPicker value={draft.patient} onChange={updatePatient} />

        <div style={{ display: "flex", gap: 10 }}>
          <FormField label="Date From">
            <Input
              type="date"
              value={draft.dates.from}
              onChange={(e) => updateDates({ from: e.target.value })}
            />
          </FormField>
          <FormField label="Date To">
            <Input
              type="date"
              value={draft.dates.to}
              onChange={(e) => updateDates({ to: e.target.value })}
            />
          </FormField>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <h4 style={{ marginBottom: 10 }}>Add Particulars</h4>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {particulars.map((p) => (
            <Button
              key={p.id}
              size="sm"
              variant="secondary"
              onClick={() => addRow(p)}
            >
              + {p.name}
            </Button>
          ))}
        </div>
      </div>

      <table className={local.formTable}>
        <thead>
          <tr>
            <th>Particular</th>
            <th>Charge/Day</th>
            <th>Days</th>
            <th>Total</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {draft.items.map((it, i) => (
            <tr key={i}>
              <td>{it.name}</td>
              <td>{formatRupees(it.chargePerDay)}</td>
              <td>
                {it.type === "per-day" ? (
                  <Input
                    type="number"
                    value={it.days}
                    onChange={(e) =>
                      updateRow(i, { days: Number(e.target.value) })
                    }
                    style={{ width: 60, padding: 4 }}
                  />
                ) : (
                  "-"
                )}
              </td>
              <td>{formatRupees(it.total)}</td>
              <td>
                <Button size="xs" variant="danger" onClick={() => removeRow(i)}>
                  X
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          flexDirection: "column",
          alignItems: "flex-end",
          marginTop: 20,
          gap: 10,
        }}
      >
        <div>
          Total: <strong>{formatRupees(totalAmount)}</strong>
        </div>
        <div>
          {draft.isPaid ? (
            <>
              <div className={local.totalRow}>
                <span>Amount Paid (Advance):</span>
                <strong>{formatRupees(totalAmount)}</strong>
              </div>
              <div className={local.totalRow}>
                <span>Remaining:</span>
                <strong>{formatRupees(0)}</strong>
              </div>
            </>
          ) : (
            <>
              <div>
                Advance:{" "}
                <Input
                  type="number"
                  value={draft.advance}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      advance: Number(e.target.value),
                    }))
                  }
                  style={{
                    width: 100,
                    padding: 4,
                    display: "inline-block",
                    marginLeft: 10,
                  }}
                />
              </div>
              <div>
                Remaining: <strong>{formatRupees(remaining)}</strong>
              </div>
            </>
          )}
        </div>
        <label>
          <input
            type="checkbox"
            checked={draft.isPaid}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                isPaid: e.target.checked,
                // When marking paid, snap the stored advance to the full total.
                advance: e.target.checked ? totalAmount : prev.advance,
              }))
            }
          />{" "}
          Mark as Paid
        </label>
      </div>

      <div style={{ marginTop: 20, display: "grid", gap: 10 }}>
        <FormField label="Footer Heading">
          <Input
            value={draft.footerHeading}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                footerHeading: e.target.value,
              }))
            }
          />
        </FormField>
        <FormField label="Footer Info">
          <Input
            value={draft.footerInfo}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                footerInfo: e.target.value,
              }))
            }
          />
        </FormField>
        <FormField label="Disclaimer">
          <Input
            value={draft.disclaimer}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                disclaimer: e.target.value,
              }))
            }
          />
        </FormField>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 10,
          marginTop: 20,
        }}
      >
        <Button
          variant="ghost"
          onClick={() => setShowResetConfirm(true)}
          disabled={!hasContent}
        >
          Reset Bill
        </Button>
        <Button
          variant="primary"
          onClick={() => setShowSaveConfirm(true)}
          disabled={!hasContent || !draft.patient.name.trim()}
        >
          Save Bill
        </Button>
      </div>

      {/* ---------------- Preview modal ---------------- */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`IPD Bill Preview - ${draft.billNo}`}
        size="md"
        mobileFullScreen
        footer={
          <Button variant="ghost" onClick={() => setShowPreview(false)}>
            Close
          </Button>
        }
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: 8,
            height: '100vh'
          }}
        >
          <div
            style={{
              transform: "scale(0.72)",
              transformOrigin: "top center",
            }}
          >
            <HospitalIpdPrintLayout {...printLayoutProps} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Save this IPD bill?"
        message={
          <>
            Save bill <strong>#{draft.billNo}</strong> for{" "}
            <strong>{draft.patient.name || "patient"}</strong> to history? The
            form will be cleared after saving.
          </>
        }
        confirmText="Yes, save & reset"
        onConfirm={saveBill}
        onCancel={() => setShowSaveConfirm(false)}
      />

      <ConfirmDialog
        isOpen={showResetConfirm}
        title="Reset this bill?"
        message="This will clear all patient details and items on the form. Saved bills in history are not affected."
        confirmText="Yes, reset"
        variant="danger"
        onConfirm={() => {
          clearDraft();
          setShowResetConfirm(false);
        }}
        onCancel={() => setShowResetConfirm(false)}
      />

      <HospitalIpdHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  );
}
