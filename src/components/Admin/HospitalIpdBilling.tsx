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
import { EyeIcon, ClockIcon, EditIcon } from "../../assets/svgs";
import {
  HospitalParticular,
  IpdBill,
  IpdBillItem,
  IpdDefaults,
} from "../../types";
import HospitalIpdPrintLayout from "./HospitalIpdPrintLayout";
import HospitalIpdHistory from "./HospitalIpdHistory";
import { PatientPicker, PatientValue, emptyPatient } from "./PatientPicker";
import { DEFAULT_IPD_ROWS } from "../../data/hospitalParticulars";
import { useHospitalBillingDraft } from "../../hooks/useHospitalBillingDraft";
import local from "./HospitalBilling.module.scss";

interface IpdDraft {
  patient: PatientValue;
  dates: { from: string; to: string };
  billNo: string;
  items: IpdBillItem[];
  advance: number;
  isPaid: boolean;
}

const today = (): string => new Date().toISOString().split("T")[0];

const freshBillNo = (): string => `IPD-${Date.now().toString().slice(-6)}`;

const buildInitialDraft = (): IpdDraft => {
  const defaultRows: IpdBillItem[] = DEFAULT_IPD_ROWS.map((p, i) => ({
    // The DB row has no id yet (it's seeded from a static list), so
    // synthesize a stable one. Using name ensures two seeded rows
    // with different names never collide.
    particularId: `default::${i}::${p.name}`,
    name: p.name,
    type: p.type,
    chargePerDay: p.charge,
    days: p.type === "per-day" ? 1 : 0,
    total: p.type === "per-day" ? p.charge : p.charge,
  }));

  // First per-day row is the "anchor" for stay duration. Set Date From
  // to today so the initial draft shows a coherent one-day stay.
  const hasPerDay = defaultRows.some((r) => r.type === "per-day");

  return {
    patient: emptyPatient(),
    dates: {
      from: hasPerDay ? today() : today(),
      to: today(),
    },
    billNo: freshBillNo(),
    items: defaultRows,
    advance: 0,
    isPaid: false,
  };
};

const DEFAULT_IPD: IpdDefaults = {
  footerHeading: "Best Wishes",
  footerInfo: "Take healthy diet and be sure to maintain hygine.",
  disclaimer: "Prepared under the observation.",
};

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
  editingBill,
  onEditSaved,
  onEditCancel,
  hideToolbarActions = false,
}: {
  particulars: HospitalParticular[];
  resetSignal?: number;
  editingBill?: IpdBill | null;
  onEditSaved?: () => void;
  onEditCancel?: () => void;
  hideToolbarActions?: boolean;
}) {
  const { tenant } = useTenant();

  const draftKey = tenant?.slug ? `hospital:ipd:draft::${tenant.slug}` : null;

  const [draft, setDraft, clearDraft] = useHospitalBillingDraft<IpdDraft>(
    draftKey,
    buildInitialDraft(),
  );

  // When the caller opens an existing bill for editing, replace the
  // draft with the bill's stored values. When editingBill goes back to
  // null (user cancelled), restore a fresh draft.
  useEffect(() => {
    if (!editingBill) return;
    const { years, months } = parseAge(editingBill.age ?? "");

    setDraft({
      patient: {
        name: editingBill.patient_name,
        ageYears: years,
        ageMonths: months,
        gender: editingBill.gender,
        address: editingBill.address,
        phone: editingBill.phone ?? "", // ← was ""
      } as PatientValue,
      dates: {
        from: editingBill.date_from ?? today(),
        to: editingBill.date_to ?? today(),
      },
      billNo: editingBill.bill_no,
      items: Array.isArray(editingBill.items) ? editingBill.items : [],
      advance: Number(editingBill.advance) || 0,
      isPaid: !!editingBill.is_paid,
    });
    setAdvanceInput(editingBill.advance ? String(editingBill.advance) : "");
    setDateFromManual(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingBill?.id]);

  const parseAge = (s: string): { years: string; months: string } => {
    const y = /(\d+)\s*y/i.exec(s);
    const m = /(\d+)\s*m/i.exec(s);
    return {
      years: y ? y[1] : "",
      months: m ? m[1] : "",
    };
  };

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
  const [ipdDefaults, setIpdDefaults] = useState<IpdDefaults>(DEFAULT_IPD);
  const [draftDefaults, setDraftDefaults] = useState<IpdDefaults>(DEFAULT_IPD);
  const [isDefaultsEditorOpen, setIsDefaultsEditorOpen] = useState(false);
  const [showDefaultsUnlockConfirm, setShowDefaultsUnlockConfirm] =
    useState(false);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

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
    setAdvanceInput(""); // reset the advance input string
    setDateFromManual(false); // if you added the room-rent date logic
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
        p.type === "per-day" && !prev.items.some((it) => it.type === "per-day");

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

  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;
    supabaseService
      .getHospitalIpdSettings(tenant.slug)
      .then((d) => {
        if (cancelled) return;
        setIpdDefaults(d);
        setDraftDefaults(d);
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  // Migrate old empty drafts to the seeded defaults. Runs once per
// mount, after useHospitalBillingDraft has resolved its initial
// value. Only kicks in when the loaded draft has zero items AND
// no patient was typed (i.e. the user has not started a bill yet).
const didMigrateRef = React.useRef(false);
useEffect(() => {
  if (didMigrateRef.current) return;
  didMigrateRef.current = true;
  if (editingBill) return;               // edit flow: never seed
  if (draft.items.length > 0) return;    // already has items
  if (draft.patient.name.trim()) return; // user already typed something

  // Replace the empty stored draft with the seeded default
  const seeded = buildInitialDraft();
  setDraft(seeded);
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

  const totalAmount = draft.items.reduce((s, it) => s + it.total, 0);
  const remaining = totalAmount - draft.advance;
  const hasContent = isIpdDraftNonEmpty(draft);

  /* ---------------- Save ---------------- */
  const saveBill = async () => {
    if (!tenant) return;
    setShowSaveConfirm(false);

    const finalAdvance = draft.isPaid ? totalAmount : draft.advance;
    const finalRemaining = draft.isPaid ? 0 : totalAmount - draft.advance;

    const payload = {
      patient_name: draft.patient.name,
      phone: draft.patient.phone, // ← new
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
      footer_heading: ipdDefaults.footerHeading,
      footer_info: ipdDefaults.footerInfo,
      disclaimer: ipdDefaults.disclaimer,
    };

    if (editingBill) {
      const updated = await supabaseService.updateIpdBill(
        editingBill.id,
        payload,
      );
      if (updated) {
        alert("IPD Bill updated!");
        onEditSaved?.();
      } else {
        alert("Failed to update");
      }
      return;
    }

    const ok = await supabaseService.saveIpdBill(tenant.slug, {
      bill_no: draft.billNo,
      ...payload,
    });

    if (ok) {
      alert("IPD Bill saved!");
      clearDraft();
    } else {
      alert("Failed to save");
    }
  };

  const requestDefaultsEdit = () => {
    setDraftDefaults(ipdDefaults);
    setShowDefaultsUnlockConfirm(true);
  };

  const confirmDefaultsEdit = () => {
    setShowDefaultsUnlockConfirm(false);
    setIsDefaultsEditorOpen(true);
  };

  const saveDefaults = async () => {
    if (!tenant || isSavingDefaults) return;
    setIsSavingDefaults(true);
    const ok = await supabaseService.saveHospitalIpdSettings(
      tenant.slug,
      draftDefaults,
    );
    setIsSavingDefaults(false);
    if (ok) {
      setIpdDefaults(draftDefaults);
      setIsDefaultsEditorOpen(false);
    } else {
      alert("Failed to save IPD defaults");
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
    footerHeading: ipdDefaults.footerHeading, // ← from settings
    footerInfo: ipdDefaults.footerInfo, // ← from settings
    disclaimer: ipdDefaults.disclaimer, // ← from settings
  };

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
          {!hideToolbarActions && (
            <>
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
                aria-label="Edit IPD print defaults"
                tooltip="Edit IPD print defaults"
                onClick={requestDefaultsEdit}
              >
                <EditIcon width={18} height={18} fill="#1e1e1e" />
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
            </>
          )}
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

      <div className={local.ipdActions}>
        {editingBill ? (
          <>
            <Button
              variant="ghost"
              onClick={onEditCancel}
              disabled={isSavingDefaults}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowSaveConfirm(true)}
              disabled={!draft.patient.name.trim()}
            >
              Update Bill
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
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
        title={editingBill ? "Update this IPD bill?" : "Save this IPD bill?"}
        message={
          editingBill ? (
            <>
              Update bill <strong>#{draft.billNo}</strong> for{" "}
              <strong>{draft.patient.name || "patient"}</strong>? The old
              version will be replaced.
            </>
          ) : (
            <>
              Save bill <strong>#{draft.billNo}</strong> for{" "}
              <strong>{draft.patient.name || "patient"}</strong> to history? The
              form will be cleared after saving.
            </>
          )
        }
        confirmText={editingBill ? "Yes, update" : "Yes, save & reset"}
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
      <ConfirmDialog
        isOpen={showDefaultsUnlockConfirm}
        title="Edit IPD print defaults?"
        message="These settings (footer heading, footer info, disclaimer) apply to every IPD bill. Changing them will affect all future prints. Continue?"
        confirmText="Yes, Edit"
        cancelText="Cancel"
        onConfirm={confirmDefaultsEdit}
        onCancel={() => setShowDefaultsUnlockConfirm(false)}
      />

      <Modal
        isOpen={isDefaultsEditorOpen}
        onClose={() => setIsDefaultsEditorOpen(false)}
        title="IPD Print Defaults"
        size="md"
        mobileFullScreen
        disableBackdropClose
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => setIsDefaultsEditorOpen(false)}
              disabled={isSavingDefaults}
            >
              Cancel
            </Button>
            <Button onClick={saveDefaults} loading={isSavingDefaults}>
              Save defaults
            </Button>
          </>
        }
      >
        <div style={{ display: "grid", gap: 16 }}>
          <FormField label="Footer Heading">
            <Input
              value={draftDefaults.footerHeading}
              onChange={(e) =>
                setDraftDefaults((prev) => ({
                  ...prev,
                  footerHeading: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label="Footer Info">
            <Input
              value={draftDefaults.footerInfo}
              onChange={(e) =>
                setDraftDefaults((prev) => ({
                  ...prev,
                  footerInfo: e.target.value,
                }))
              }
            />
          </FormField>

          <FormField label="Disclaimer">
            <Input
              value={draftDefaults.disclaimer}
              onChange={(e) =>
                setDraftDefaults((prev) => ({
                  ...prev,
                  disclaimer: e.target.value,
                }))
              }
            />
          </FormField>
        </div>
      </Modal>
    </>
  );
}
