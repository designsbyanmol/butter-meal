// src/components/Admin/HospitalOpdBilling.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import {
  Button,
  Input,
  FormField,
  ConfirmDialog,
  Modal,
  IconButton,
  Banner,
  Select,
} from "../ui";
import { printReceiptNode } from "../../utils/printReceipt";
import { EyeIcon, ClockIcon, EditIcon } from "../../assets/svgs";
import HospitalOpdPrintLayout from "./HospitalOpdPrintLayout";
import HospitalOpdHistory from "./HospitalOpdHistory";
import { PatientPicker, PatientValue, emptyPatient } from "./PatientPicker";
import { useHospitalBillingDraft } from "../../hooks/useHospitalBillingDraft";
import type { OpdDefaults, OpdVitals } from "../../types";

const DEFAULT_VITALS: OpdVitals = {
  BP: "",
  SpO2: "",
  Pulse: "",
  Temp: "",
  Weight: "",
};

const emptyVitals = (): OpdVitals => ({ ...DEFAULT_VITALS });
interface OpdDraft {
  patient: PatientValue;
  doctorName: string;
  department: string;   // ← new: category of the selected service
  serviceName: string;  // ← new: the service (problem / consultation)
  price: number;        // ← new: read-only mirror of the service's price
  billNo: string;
}

interface VitalRow {
  id: string;          // stable React key, never changes
  label: string;
  value: string;
}

const freshBillNo = (): string => `OPD-${Date.now().toString().slice(-6)}`;

const buildInitialDraft = (): OpdDraft => ({
  patient: emptyPatient(),
  doctorName: '',
  department: '',
  serviceName: '',
  price: 0,
  billNo: freshBillNo(),
});

const DEFAULT_OPD: OpdDefaults = {
  facilities: [],
  footerHeading: "Best Wishes",
  footerInfo: "Take healthy diet and be sure to maintain hygine.",
  disclaimer: "Prepared under the observation.",
  vitals: emptyVitals(),
};

const combineAge = (years: string, months: string): string => {
  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  return parts.join(" ");
};

const SAVE_CONFIRM_DELAY_MS = 5000;

export const isOpdDraftNonEmpty = (d: OpdDraft): boolean => {
  if (d.patient.name.trim()) return true;
  if (d.patient.phone?.trim()) return true;
  if (d.patient.address.trim()) return true;
  if (d.patient.gender.trim()) return true;
  if (d.patient.ageYears.trim()) return true;
  if (d.patient.ageMonths.trim()) return true;
  if (d.doctorName.trim()) return true;
  if (d.department.trim()) return true;      // ← new
  if (d.serviceName.trim()) return true;     // ← new
  if (d.price > 0) return true;              // ← new
  return false;
};

export default function HospitalOpdBilling() {
  const { tenant } = useTenant();

  const draftKey = tenant?.slug ? `hospital:opd:draft::${tenant.slug}` : null;

  const [draft, setDraft, clearDraft] = useHospitalBillingDraft<OpdDraft>(
    draftKey,
    buildInitialDraft(),
  );

  const [opdDefaults, setOpdDefaults] = useState<OpdDefaults>(DEFAULT_OPD);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>(
    [],
  );

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [isDefaultsEditorOpen, setIsDefaultsEditorOpen] = useState(false);
  const [showDefaultsUnlockConfirm, setShowDefaultsUnlockConfirm] =
    useState(false);
  const [draftDefaults, setDraftDefaults] = useState<OpdDefaults>(DEFAULT_OPD);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);
  const [isSavingBill, setIsSavingBill] = useState(false);
const [vitalRows, setVitalRows] = useState<VitalRow[]>([]);
  const [opdServices, setOpdServices] = useState<
  { id: string; name: string; category: string; price: number }[]
>([]);
const [doctors, setDoctors] = useState<
  { id: string; name: string; category?: string }[]
>([]);

// Unique categories from the service catalogue — the department list.
const departments = useMemo(() => {
  const set = new Set<string>();
  opdServices.forEach((s) => {
    if (s.category) set.add(s.category);
  });
  return Array.from(set).sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' }),
  );
}, [opdServices]);

// Services in the chosen department.
const servicesInDept = useMemo(() => {
  if (!draft.department) return opdServices;
  return opdServices.filter(
    (s) =>
      s.category.toLowerCase() === draft.department.toLowerCase(),
  );
}, [opdServices, draft.department]);

// Doctors whose `category` matches the department (fall back to all if
// none is tagged — the field stays a free-text input with a datalist).
const doctorsInDept = useMemo(() => {
  if (!draft.department) return doctors;
  const filtered = doctors.filter(
    (d: any) =>
      (d as any).category &&
      String((d as any).category).toLowerCase() ===
        draft.department.toLowerCase(),
  );
  return filtered.length > 0 ? filtered : doctors;
}, [doctors, draft.department]);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant?.slug) return;
    try {
      const key = `hospital:opd:hasContent::${tenant.slug}`;
      if (isOpdDraftNonEmpty(draft)) {
        localStorage.setItem(key, "1");
      } else {
        localStorage.removeItem(key);
      }
    } catch {
      /* ignore */
    }
  }, [tenant?.slug, draft]);

useEffect(() => {
  if (!tenant) return;
  let cancelled = false;

  (async () => {
    const [svc, docs, settings, services] = await Promise.all([
      supabaseService.getHospitalServices(tenant.slug),
      supabaseService.getHospitalDoctors(tenant.slug),
      supabaseService.getHospitalOpdSettings(tenant.slug),
      supabaseService.getHospitalServices(tenant.slug),
    ]);
    if (cancelled) return;

    setFacilities((svc || []).map((d: any) => ({ id: d.id, name: d.name })));
    setDoctors(
  (docs || []).map((d: any) => ({
    id: d.id,
    name: d.name,
    category: d.category ?? "",
  })),
);
    setOpdDefaults(settings);
    setDraftDefaults(settings);

    setOpdServices(
      (services || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        price: Number(s.price) || 0,
      })),
    );
  })();

  return () => {
    cancelled = true;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [tenant?.slug]);

  const updatePatient = (p: PatientValue) =>
    setDraft((prev) => ({ ...prev, patient: p }));

  const handlePrint = (): boolean =>
    printReceiptNode(printRef.current, {
      title: draft.billNo,
      pageSize: "A4 portrait",
    });

  const handlePrintAndSave = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const ok = handlePrint();
    setIsPrinting(false);
    if (!ok) {
      alert("Allow pop-ups to print the bill.");
      return;
    }
    window.setTimeout(() => setShowSaveConfirm(true), SAVE_CONFIRM_DELAY_MS);
  };

  const saveBill = async () => {
    if (!tenant || isSavingBill) return;

    // Guard against an empty name (the 5s print → save delay can race a
    // cleared field). Fail loudly instead of hitting a not-null violation.
    if (!draft.patient.name.trim()) {
      alert("Patient name is required to save.");
      setShowSaveConfirm(false);
      return;
    }

    setIsSavingBill(true);

    try {
      await supabaseService.upsertHospitalPatientByPhone(tenant.slug, {
        name: draft.patient.name,
        phone: draft.patient.phone,
        address: draft.patient.address,
        gender: draft.patient.gender,
      });

      const ok = await supabaseService.saveOpdBill(tenant.slug, {
  bill_no: draft.billNo,
  patient_name: draft.patient.name,
  phone: draft.patient.phone,
  age: combineAge(draft.patient.ageYears, draft.patient.ageMonths),
  gender: draft.patient.gender,
  address: draft.patient.address,
  doctor_name: draft.doctorName,
  department: draft.department,        // ← new
  service_name: draft.serviceName,     // ← new
  price: draft.price,                  // ← new
});

      // Close the dialog BEFORE alerting, so the alert is not stacked
      // on top of a still-open modal on some mobile browsers.
      setShowSaveConfirm(false);

      if (ok) {
        clearDraft();
        alert("OPD Bill saved!");
      } else {
        alert("Failed to save");
      }
    } finally {
      setIsSavingBill(false);
    }
  };

  const requestDefaultsEdit = () => {
    setDraftDefaults(opdDefaults);
    setShowDefaultsUnlockConfirm(true);
  };

  const confirmDefaultsEdit = () => {
  setShowDefaultsUnlockConfirm(false);
  setVitalRows(
    Object.entries(opdDefaults.vitals).map(([label, value], i) => ({
      id: `v_${i}_${Math.random().toString(36).slice(2, 7)}`,
      label,
      value,
    })),
  );
  setIsDefaultsEditorOpen(true);
};

  const toggleDraftFacility = (name: string) => {
    setDraftDefaults((prev) => {
      const has = prev.facilities.includes(name);
      return {
        ...prev,
        facilities: has
          ? prev.facilities.filter((f) => f !== name)
          : [...prev.facilities, name],
      };
    });
  };

  const saveDefaults = async () => {
  if (!tenant || isSavingDefaults) return;

  // Drop empty labels; trim; later entries win on duplicate labels.
  const vitals: OpdVitals = {};
  const seen = new Set<string>();
for (const row of vitalRows) {
  const label = row.label.trim();
  if (!label) continue;
  if (seen.has(label)) {
    alert(`Duplicate vital label: "${label}". Please rename one of them.`);
    return;
  }
  seen.add(label);
  vitals[label] = row.value;
}

  const payload: OpdDefaults = {
    ...draftDefaults,
    vitals,
  };

  setIsSavingDefaults(true);
  const ok = await supabaseService.saveHospitalOpdSettings(tenant.slug, payload);
  setIsSavingDefaults(false);

  if (ok) {
    setOpdDefaults(payload);
    setIsDefaultsEditorOpen(false);
  } else {
    alert('Failed to save OPD defaults');
  }
};


  const printLayoutProps = {
    tenant,
    billNo: draft.billNo,
    patient: {
      name: draft.patient.name,
      phone: draft.patient.phone,
      age: combineAge(draft.patient.ageYears, draft.patient.ageMonths),
      gender: draft.patient.gender,
      address: draft.patient.address,
    },
    doctorName: draft.doctorName,
    department: draft.department,        // ← new
  serviceName: draft.serviceName,      // ← new
  price: draft.price, 
    vitals: opdDefaults.vitals,
    facilities: opdDefaults.facilities,
    footerHeading: opdDefaults.footerHeading,
    footerInfo: opdDefaults.footerInfo,
    disclaimer: opdDefaults.disclaimer,
  } as const;

  

  return (
    <>
      {/* Patient + doctor */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr",
          gap: 15,
          marginBottom: 20,
        }}
      >
        <PatientPicker value={draft.patient} onChange={updatePatient} />

        <div
  style={{
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
    gap: 12,
  }}
>
  <FormField label="Department *">
    <Select
      value={draft.department}
      onChange={(e) => {
        const nextDept = e.target.value;
        setDraft((prev) => ({
          ...prev,
          department: nextDept,
          // Reset the service when department changes so a stale
          // service from another department doesn't linger.
          serviceName: '',
          price: 0,
        }));
      }}
      options={[
        { value: '', label: 'Select department…' },
        ...departments.map((d) => ({ value: d, label: d })),
      ]}
    />
  </FormField>

  <FormField label="Service *">
    <Select
      value={draft.serviceName}
      onChange={(e) => {
        const nextName = e.target.value;
        const svc = opdServices.find(
          (s) =>
            s.name === nextName &&
            (!draft.department ||
              s.category.toLowerCase() === draft.department.toLowerCase()),
        );
        setDraft((prev) => ({
          ...prev,
          serviceName: nextName,
          price: svc ? svc.price : 0,
        }));
      }}
      options={[
        { value: '', label: 'Select service…' },
        ...servicesInDept.map((s) => ({ value: s.name, label: s.name })),
      ]}
      disabled={!draft.department}
    />
  </FormField>

  <FormField
  label="Doctor Name"
  hint={
    draft.department && doctorsInDept.length === 0
      ? `No doctors tagged for ${draft.department}. You can still type a name.`
      : undefined
  }
>
  <Input
    list="opd-doctor-list"
    value={draft.doctorName}
    onChange={(e) =>
      setDraft((prev) => ({ ...prev, doctorName: e.target.value }))
    }
    placeholder="Select or type doctor name..."
  />
  <datalist id="opd-doctor-list">
    {doctorsInDept.map((d) => (
      <option key={d.id} value={d.name} />
    ))}
  </datalist>
</FormField>

  <FormField label="Price (₹)">
    <Input
      readOnly
      value={draft.price ? String(draft.price) : ''}
      placeholder="Auto-filled from service"
    />
  </FormField>
</div>
      </div>

      {/* Info banner */}
      <Banner variant="info" inline>
        Facilities, vitals, footer heading, footer info and disclaimer are
        shared across all OPD bills. Use the <strong>Edit</strong> button in the
        toolbar to change them.
      </Banner>
      {/* Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 6,
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
          aria-label="Edit OPD print defaults"
          tooltip="Edit OPD print defaults"
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
      </div>

      <Button
        style={{ marginTop: 20 }}
        block
        onClick={handlePrintAndSave}
        loading={isPrinting}
      >
        Print &amp; Save OPD Bill
      </Button>

      {/* Hidden print layout */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -9999,
          top: 0,
          pointerEvents: "none",
        }}
      >
        <HospitalOpdPrintLayout ref={printRef} {...printLayoutProps} />
      </div>

      {/* Preview modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title={`OPD Bill Preview - ${draft.billNo}`}
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
            height: "100vh",
          }}
        >
          <div
            style={{
              transform: "scale(0.72)",
              transformOrigin: "top center",
            }}
          >
            <HospitalOpdPrintLayout {...printLayoutProps} />
          </div>
        </div>
      </Modal>

      {/* Confirm unlock */}
      <ConfirmDialog
        isOpen={showDefaultsUnlockConfirm}
        title="Edit OPD print defaults?"
        message="These settings (facilities, vitals, footer, disclaimer) apply to every OPD bill. Changing them will affect all future prints. Continue?"
        confirmText="Yes, Edit"
        cancelText="Cancel"
        onConfirm={confirmDefaultsEdit}
        onCancel={() => setShowDefaultsUnlockConfirm(false)}
      />

      {/* Editor modal */}
      <Modal
        isOpen={isDefaultsEditorOpen}
        onClose={() => setIsDefaultsEditorOpen(false)}
        title="OPD Print Defaults"
        size="lg"
        disableBackdropClose={true}
        mobileFullScreen
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
          <div>
            <h4 style={{ margin: "0 0 10px" }}>
              Available Facilities (select to print)
            </h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {facilities.map((f) => {
                const active = draftDefaults.facilities.includes(f.name);
                return (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={active ? "primary" : "secondary"}
                    onClick={() => toggleDraftFacility(f.name)}
                  >
                    {active ? "✓ " : "+ "} {f.name}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <h4 style={{ margin: 0 }}>Vitals</h4>
                <Button
  size="sm"
  variant="secondary"
  onClick={() =>
    setVitalRows((prev) => [
      ...prev,
      {
        id: `v_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        label: `Vital ${prev.length + 1}`,
        value: '',
      },
    ])
  }
>
  + Add vital
</Button>
              </div>

              {vitalRows.map((row, i) => (
  <div key={row.id} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
    <FormField label="Label">
      <Input
        value={row.label}
        onChange={(e) => {
          const next = e.target.value;
          setVitalRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, label: next } : r,
            ),
          );
        }}
        placeholder="e.g. Blood Pressure"
      />
    </FormField>

    <FormField label="Default value (optional)">
      <Input
        value={row.value}
        onChange={(e) => {
          const next = e.target.value;
          setVitalRows((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, value: next } : r,
            ),
          );
        }}
        placeholder="e.g. 120/80"
      />
    </FormField>

    <Button
      size="sm"
      variant="danger"
      onClick={() =>
        setVitalRows((prev) => prev.filter((_, idx) => idx !== i))
      }
    >
      Remove
    </Button>
  </div>
))}
            </div>
          </div>

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

      <ConfirmDialog
        isOpen={showSaveConfirm}
        title="Save OPD Bill?"
        message="Bill printed successfully? Save it to history now."
        confirmText="Yes, Save"
        onConfirm={saveBill}
        onCancel={() => {
          if (isSavingBill) return; // ignore cancel while the write is running
          setShowSaveConfirm(false);
        }}
        loading={isSavingBill} // disables both buttons + shows spinner
      />

      <HospitalOpdHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  );
}
