// src/components/Admin/HospitalOpdBilling.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import {
  Button,
  Input,
  FormField,
  ConfirmDialog,
  Modal,
  IconButton,
  Banner,
} from '../ui';
import { printReceiptNode } from '../../utils/printReceipt';
import { EyeIcon, ClockIcon, EditIcon } from '../../assets/svgs';
import HospitalOpdPrintLayout from './HospitalOpdPrintLayout';
import HospitalOpdHistory from './HospitalOpdHistory';
import {
  PatientPicker,
  PatientValue,
  emptyPatient,
} from './PatientPicker';
import { useHospitalBillingDraft } from '../../hooks/useHospitalBillingDraft';
import type { OpdDefaults, OpdVitals } from '../../types';

interface OpdDraft {
  patient: PatientValue;
  doctorName: string;
  billNo: string;
}

const freshBillNo = (): string => `OPD-${Date.now().toString().slice(-6)}`;

const buildInitialDraft = (): OpdDraft => ({
  patient: emptyPatient(),
  doctorName: '',
  billNo: freshBillNo(),
});

const emptyVitals = (): OpdVitals => ({
  bp: '',
  spo2: '',
  pulse: '',
  temp: '',
  weight: '',
});

const DEFAULT_OPD: OpdDefaults = {
  facilities: [],
  footerHeading: 'Best Wishes',
  footerInfo: 'Take healthy diet and be sure to maintain hygine.',
  disclaimer: 'Prepared under the observation.',
  vitals: emptyVitals(),
};

const combineAge = (years: string, months: string): string => {
  const parts: string[] = [];
  if (years) parts.push(`${years}y`);
  if (months) parts.push(`${months}m`);
  return parts.join(' ');
};

const SAVE_CONFIRM_DELAY_MS = 5000;

export const isOpdDraftNonEmpty = (d: OpdDraft): boolean => {
  if (d.patient.name.trim()) return true;
  if (d.patient.address.trim()) return true;
  if (d.patient.gender.trim()) return true;
  if (d.patient.ageYears.trim()) return true;
  if (d.patient.ageMonths.trim()) return true;
  if (d.doctorName.trim()) return true;
  return false;
};

export default function HospitalOpdBilling() {
  const { tenant } = useTenant();

  const draftKey = tenant?.slug
    ? `hospital:opd:draft::${tenant.slug}`
    : null;

  const [draft, setDraft, clearDraft] =
    useHospitalBillingDraft<OpdDraft>(draftKey, buildInitialDraft());

  const [opdDefaults, setOpdDefaults] = useState<OpdDefaults>(DEFAULT_OPD);
  const [facilities, setFacilities] = useState<{ id: string; name: string }[]>(
    [],
  );
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showSaveConfirm, setShowSaveConfirm] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);

  const [isDefaultsEditorOpen, setIsDefaultsEditorOpen] = useState(false);
  const [showDefaultsUnlockConfirm, setShowDefaultsUnlockConfirm] =
    useState(false);
  const [draftDefaults, setDraftDefaults] = useState<OpdDefaults>(DEFAULT_OPD);
  const [isSavingDefaults, setIsSavingDefaults] = useState(false);

  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!tenant?.slug) return;
    try {
      const key = `hospital:opd:hasContent::${tenant.slug}`;
      if (isOpdDraftNonEmpty(draft)) {
        localStorage.setItem(key, '1');
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
      const [svc, docs, settings] = await Promise.all([
        supabaseService.getHospitalServices(tenant.slug),
        supabaseService.getHospitalDoctors(tenant.slug),
        supabaseService.getHospitalOpdSettings(tenant.slug),
      ]);
      if (cancelled) return;

      setFacilities(
        (svc || []).map((d: any) => ({ id: d.id, name: d.name })),
      );
      setDoctors(
        (docs || []).map((d: any) => ({ id: d.id, name: d.name })),
      );
      setOpdDefaults(settings);
      setDraftDefaults(settings);
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
      pageSize: 'A4 portrait',
    });

  const handlePrintAndSave = () => {
    if (isPrinting) return;
    setIsPrinting(true);
    const ok = handlePrint();
    setIsPrinting(false);
    if (!ok) {
      alert('Allow pop-ups to print the bill.');
      return;
    }
    window.setTimeout(
      () => setShowSaveConfirm(true),
      SAVE_CONFIRM_DELAY_MS,
    );
  };

  const saveBill = async () => {
    if (!tenant) return;
    const { patient, doctorName } = draft;

    await supabaseService.upsertHospitalPatientByPhone(tenant.slug, {
      name: patient.name,
      phone: '',
      address: patient.address,
      gender: patient.gender,
    });

    const ok = await supabaseService.saveOpdBill(tenant.slug, {
      bill_no: draft.billNo,
      patient_name: patient.name,
      age: combineAge(patient.ageYears, patient.ageMonths),
      gender: patient.gender,
      address: patient.address,
      doctor_name: doctorName,
    });

    if (ok) {
      alert('OPD Bill saved!');
      setShowSaveConfirm(false);
      clearDraft();
    } else {
      alert('Failed to save');
    }
  };

  const requestDefaultsEdit = () => {
    setDraftDefaults(opdDefaults);
    setShowDefaultsUnlockConfirm(true);
  };

  const confirmDefaultsEdit = () => {
    setShowDefaultsUnlockConfirm(false);
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

  const updateDraftVital = (key: keyof OpdVitals, value: string) => {
    setDraftDefaults((prev) => ({
      ...prev,
      vitals: { ...prev.vitals, [key]: value },
    }));
  };

  const saveDefaults = async () => {
    if (!tenant || isSavingDefaults) return;
    setIsSavingDefaults(true);
    const ok = await supabaseService.saveHospitalOpdSettings(
      tenant.slug,
      draftDefaults,
    );
    setIsSavingDefaults(false);
    if (ok) {
      setOpdDefaults(draftDefaults);
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
      age: combineAge(draft.patient.ageYears, draft.patient.ageMonths),
      gender: draft.patient.gender,
      address: draft.patient.address,
    },
    doctorName: draft.doctorName,
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
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 15,
          marginBottom: 20,
        }}
      >
        <PatientPicker value={draft.patient} onChange={updatePatient} />

        <FormField label="Doctor Name">
          <Input
            list="opd-doctor-list"
            value={draft.doctorName}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                doctorName: e.target.value,
              }))
            }
            placeholder="Select or type doctor name..."
          />
          <datalist id="opd-doctor-list">
            {doctors.map((d) => (
              <option key={d.id} value={d.name} />
            ))}
          </datalist>
        </FormField>
      </div>

      {/* Info banner */}
      <Banner variant="info" inline>
        Facilities, vitals, footer heading, footer info and disclaimer
        are shared across all OPD bills. Use the{' '}
        <strong>Edit</strong> button in the toolbar to change them.
      </Banner>
      {/* Toolbar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <IconButton
          variant="ghost"
          size="md"
          aria-label={showPreview ? 'Hide preview' : 'Show preview'}
          tooltip={showPreview ? 'Hide preview' : 'Show preview'}
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
          position: 'absolute',
          left: -9999,
          top: 0,
          pointerEvents: 'none',
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
            display: 'flex',
            justifyContent: 'center',
            padding: 8,
            height: '100vh',
          }}
        >
          <div
            style={{
              transform: 'scale(0.72)',
              transformOrigin: 'top center',
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
        size="md"
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
        <div style={{ display: 'grid', gap: 16 }}>
          <div>
            <h4 style={{ margin: '0 0 10px' }}>
              Available Facilities (select to print)
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {facilities.map((f) => {
                const active = draftDefaults.facilities.includes(f.name);
                return (
                  <Button
                    key={f.id}
                    size="sm"
                    variant={active ? 'primary' : 'secondary'}
                    onClick={() => toggleDraftFacility(f.name)}
                  >
                    {active ? '✓ ' : '+ '} {f.name}
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 style={{ margin: '0 0 10px' }}>Vitals</h4>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 10,
              }}
            >
              {(
                [
                  ['bp', 'BP'],
                  ['spo2', 'SpO2'],
                  ['pulse', 'Pulse'],
                  ['temp', 'Temp'],
                  ['weight', 'Weight'],
                ] as const
              ).map(([key, label]) => (
                <FormField key={key} label={label}>
                  <Input
                    value={draftDefaults.vitals[key]}
                    onChange={(e) =>
                      updateDraftVital(key, e.target.value)
                    }
                  />
                </FormField>
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
        onCancel={() => setShowSaveConfirm(false)}
      />

      <HospitalOpdHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  );
}