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
  Toggle,
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
  resetSignal,
}: {
  particulars: HospitalParticular[];
  resetSignal?: number;
}) {
  const { tenant } = useTenant();

  const draftKey = tenant?.slug ? `hospital:ipd:draft::${tenant.slug}` : null;

  const [draft, setDraft, clearDraft] = useHospitalBillingDraft<IpdDraft>(
    draftKey,
    buildInitialDraft(),
  );

  useEffect(() => {
  setDraft((prev) => ({
    ...prev,
    dates: { ...prev.dates, to: today() },
  }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [advanceInput, setAdvanceInput] = useState<string>(
    draft.advance === 0 ? "" : String(draft.advance),
  );
  const [dateFromManual, setDateFromManual] = useState(false);

  useEffect(() => {
    setAdvanceInput(draft.advance === 0 ? "" : String(draft.advance));
  }, [draft.advance]);

  const addDays = (iso: string, delta: number): string => {
  if (!iso) return iso;
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  d.setDate(d.getDate() + delta);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const diffDaysInclusive = (from: string, to: string): number => {
  if (!from || !to) return 0;
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(1, Math.round((b - a) / 86_400_000) + 1);
};

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

const updateDates = (patch: Partial<IpdDraft["dates"]>) => {
  // Any explicit Date From change flips the manual flag so the anchor
  // sync below stops overwriting the user's choice.
  if ("from" in patch && patch.from !== draft.dates.from) {
    setDateFromManual(true);
  }
  setDraft((prev) => ({ ...prev, dates: { ...prev.dates, ...patch } }));
};

// External reset: HospitalBillingBody bumps `resetSignal` after the
// user confirms the Reset button. Clear the local draft and any
// in-flight form state so the user sees a fresh bill.
const lastResetSignalRef = React.useRef<number | undefined>(resetSignal);
React.useEffect(() => {
  if (resetSignal === undefined) return;
  if (resetSignal === lastResetSignalRef.current) return;
  lastResetSignalRef.current = resetSignal;

  clearDraft();
  setAdvanceInput('');          // reset the advance input string
  setDateFromManual(false);     // if you added the room-rent date logic
  // Any other transient UI state that should reset:
  setShowPreview(false);
  setShowSaveConfirm(false);
  setShowResetConfirm(false);
}, [resetSignal, clearDraft]);

const addRow = (p: HospitalParticular) => {
  setDraft((prev) => {
    const nextItems = [
      ...prev.items,
      {
        particularId: p.id,
        name: p.name,
        type: p.type,
        chargePerDay: p.charge,
        days: p.type === "per-day" ? 1 : 0,
        total: p.charge,
      },
    ];

    // If this is the FIRST per-day row and Date From wasn't manually
    // set, collapse the range to a single day to match `days = 1`.
    const isFirstPerDay =
      p.type === "per-day" &&
      !prev.items.some((it) => it.type === "per-day");

    if (isFirstPerDay && !dateFromManual) {
      return {
        ...prev,
        items: nextItems,
        dates: { ...prev.dates, from: prev.dates.to },
      };
    }

    return { ...prev, items: nextItems };
  });
};

  const updateRow = (index: number, patch: Partial<IpdBillItem>) => {
  setDraft((prev) => {
    const copy = [...prev.items];
    const row = { ...copy[index], ...patch };

    // Recompute this row's total.
    row.total =
      row.type === "per-day" ? row.chargePerDay * row.days : row.chargePerDay;
    copy[index] = row;

    // If this is the anchor row (first per-day row) and the user
    // changed `days`, realign Date From so the stay matches — unless
    // the user has already manually set Date From.
    const anchorIdx = copy.findIndex((it) => it.type === "per-day");
    const isAnchor = anchorIdx === index;

    if (isAnchor && "days" in patch && !dateFromManual) {
      const days = Math.max(1, Number(row.days) || 1);
      const newFrom = addDays(prev.dates.to, -(days - 1));
      return {
        ...prev,
        items: copy,
        dates: { ...prev.dates, from: newFrom },
      };
    }

    return { ...prev, items: copy };
  });
};

  const removeRow = (index: number) =>
    setDraft((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));

    useEffect(() => {
  const hasPerDay = draft.items.some((it) => it.type === "per-day");
  if (!hasPerDay) {
    setDateFromManual(false);
  }
}, [draft.items]);

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
      alert("IPD Bill saved!");
      clearDraft();
    } else {
      alert("Failed to save");
    }
  };

  const handleAdvanceFocus = () => {
    // When the field is focused and currently shows "0", clear it so the
    // user starts typing into an empty box rather than appending to "0".
    if (advanceInput === "0") setAdvanceInput("");
  };

  const handleAdvanceBlur = () => {
    // On blur, if the user left it empty, normalise back to 0.
    if (advanceInput.trim() === "") {
      setAdvanceInput("");
      setDraft((prev) => ({ ...prev, advance: 0 }));
    }
  };

  const handleAdvanceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setAdvanceInput(raw);
    // Keep draft.advance in sync as a number, or 0 if the field is empty.
    const n = raw === "" ? 0 : Number(raw);
    setDraft((prev) => ({
      ...prev,
      advance: Number.isFinite(n) ? n : 0,
    }));
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
      <div className={local.ipdToolbar}>
        <div className={local.ipdDateRow}>
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
        <div className={local.ipdToolbarActions}>
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
      </div>

      {/* ---------------- Form ---------------- */}
      <div className={local.ipdFormGrid}>
        <PatientPicker value={draft.patient} onChange={updatePatient} />
      </div>

      <div className={local.ipdParticulars}>
        <h4 className={local.ipdParticularsTitle}>Add Particulars</h4>
        <div className={local.ipdParticularsList}>
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
                    className={local.ipdDaysInput}
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

      <table className={`${local.formTable} ${local.ipdTotalsTable}`}>
        <tbody>
          <tr>
            <td className={local.ipdTotalsLabel}>Total</td>
            <td className={local.ipdTotalsValue}>
              <strong>{formatRupees(totalAmount)}</strong>
            </td>
          </tr>

          {draft.isPaid ? (
            <>
              <tr>
                <td className={local.ipdTotalsLabel}>Advance Paid</td>
                <td className={local.ipdTotalsValue}>
                  <strong>{formatRupees(totalAmount)}</strong>
                </td>
              </tr>
              <tr>
                <td className={local.ipdTotalsLabel}>Remaining</td>
                <td className={local.ipdTotalsValue}>
                  <strong>{formatRupees(0)}</strong>
                </td>
              </tr>
            </>
          ) : (
            <>
              <tr>
                <td className={local.ipdTotalsLabel}>Advance</td>
                <td className={local.ipdTotalsValue}>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={advanceInput}
                    onFocus={handleAdvanceFocus}
                    onBlur={handleAdvanceBlur}
                    onChange={handleAdvanceChange}
                    className={local.ipdAdvanceInput}
                  />
                </td>
              </tr>
              <tr>
                <td className={local.ipdTotalsLabel}>Remaining</td>
                <td className={local.ipdTotalsValue}>
                  <strong>{formatRupees(remaining)}</strong>
                </td>
              </tr>
            </>
          )}

          <tr>
            <td className={local.ipdTotalsLabel}>Mark as Paid</td>
            <td
              className={`${local.ipdTotalsValue} ${local.ipdTotalsToggleCell}`}
            >
              <Toggle
                checked={draft.isPaid}
                onChange={(e) =>
                  setDraft((prev) => ({
                    ...prev,
                    isPaid: e.target.checked,
                    advance: e.target.checked ? totalAmount : prev.advance,
                  }))
                }
              />
            </td>
          </tr>
        </tbody>
      </table>

      <div className={local.ipdFooterFields}>
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

      <div className={local.ipdActions}>
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
        <div className={local.ipdPreviewWrap}>
          <div className={local.ipdPreviewScaled}>
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
