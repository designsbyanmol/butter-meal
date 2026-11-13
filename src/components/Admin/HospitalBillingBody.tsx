// src/components/Admin/HospitalBillingBody.tsx
import React, { useEffect, useState } from 'react';
import { InlineSection } from '../Dashboard/inline';
import {
  Button,
  Modal,
  Card,
  FormField,
  Input,
  Select,
  ConfirmDialog,
} from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { HospitalParticular } from '../../types';
import { DEFAULT_HOSPITAL_PARTICULARS } from '../../data/hospitalParticulars';
import HospitalIpdBilling from './HospitalIpdBilling';
import HospitalOpdBilling from './HospitalOpdBilling';
import {
  TrashIcon,
  EditIcon,
  LeftArrowIcon,
  RecieptIcon,
  ClockIcon,
} from '../../assets/svgs';
import local from './HospitalBillingBody.module.scss';

type BillingMode = 'ipd' | 'opd';

const MODE_QUERY_KEY = 'tab';

/** Read ?tab=ipd / ?tab=opd. Anything else → null (picker). */
const readModeFromUrl = (): BillingMode | null => {
  try {
    const url = new URL(window.location.href);
    const v = (url.searchParams.get(MODE_QUERY_KEY) || '').toLowerCase();
    return v === 'ipd' || v === 'opd' ? v : null;
  } catch {
    return null;
  }
};

const writeModeToUrl = (mode: BillingMode | null) => {
  try {
    const url = new URL(window.location.href);
    if (mode) url.searchParams.set(MODE_QUERY_KEY, mode);
    else url.searchParams.delete(MODE_QUERY_KEY);
    window.history.replaceState({}, '', url.toString());
  } catch {
    /* ignore */
  }
};

export default function HospitalBillingBody() {
  const { tenant } = useTenant();

  const [mode, setMode] = useState<BillingMode | null>(() =>
    readModeFromUrl(),
  );
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);

  const [particulars, setParticulars] = useState<HospitalParticular[]>([]);
  const [isParticularsOpen, setIsParticularsOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<HospitalParticular>>({
    name: '',
    type: 'per-day',
    charge: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const hasIpdDraftOnDisk = (): boolean => {
    if (!tenant?.slug) return false;
    try {
      return (
        localStorage.getItem(`hospital:ipd:hasContent::${tenant.slug}`) === '1'
      );
    } catch {
      return false;
    }
  };

  // ---- Browser back / forward ----
  useEffect(() => {
    const onPop = () => setMode(readModeFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ---- Sync ?tab= with mode ----
  useEffect(() => {
    writeModeToUrl(mode);
  }, [mode]);

  // ---- Particulars (unchanged data flow) ----
  const loadParticulars = async () => {
    if (!tenant) return;
    const list = await supabaseService.getHospitalParticulars(tenant.slug);

    if (list.length === 0) {
      for (const p of DEFAULT_HOSPITAL_PARTICULARS) {
        await supabaseService.addHospitalParticular(
          tenant.slug,
          p as HospitalParticular,
        );
      }
      const seeded = await supabaseService.getHospitalParticulars(
        tenant.slug,
      );
      setParticulars(seeded);
      return;
    }

    setParticulars(list);
  };

  useEffect(() => {
    void loadParticulars();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  const handleSaveParticular = async () => {
    if (!tenant || !draft.name) return;
    const name = draft.name.trim();
    if (!name) return;

    const duplicate = particulars.some(
      (p) =>
        p.id !== editingId &&
        p.name.trim().toLowerCase() === name.toLowerCase(),
    );
    if (duplicate) {
      alert(`"${name}" already exists in particulars.`);
      return;
    }

    if (editingId) {
      await supabaseService.updateHospitalParticular(editingId, {
        ...draft,
        name,
      });
    } else {
      await supabaseService.addHospitalParticular(tenant.slug, {
        ...(draft as HospitalParticular),
        name,
      });
    }
    setDraft({ name: '', type: 'per-day', charge: 0 });
    setEditingId(null);
    void loadParticulars();
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Delete this particular?')) return;
    await supabaseService.deleteHospitalParticular(id);
    void loadParticulars();
  };

  const requestBackToTypes = () => setConfirmLeave(true);

  // =========================================================
  // RENDER: picker
  // =========================================================
  if (!mode) {
    return (
      <InlineSection title="Hospital Billing">
        <div className={local.pickerWrap}>
          <Card
            interactive
            padding="lg"
            onClick={() => setMode('ipd')}
            className={local.pickerCard}
          >
            <span className={local.pickerIcon}>
              <RecieptIcon width={24} height={24} fill="currentColor" />
            </span>
            <h2 className={local.pickerTitle}>IPD Billing</h2>
            <p className={local.pickerDesc}>
              Create In-Patient Department bills with room rent, nursing,
              procedures and daily charges.
            </p>
            <span className={local.pickerCta}>Start IPD bill →</span>
          </Card>

          <Card
            interactive
            padding="lg"
            onClick={() => setMode('opd')}
            className={local.pickerCard}
          >
            <span className={`${local.pickerIcon} ${local.pickerIconAlt}`}>
              <ClockIcon width={24} height={24} fill="currentColor" />
            </span>
            <h2 className={local.pickerTitle}>OPD Billing</h2>
            <p className={local.pickerDesc}>
              Create Out-Patient Department prescriptions and bills with
              vitals, facilities and doctor details.
            </p>
            <span className={local.pickerCta}>Start OPD bill →</span>
          </Card>
        </div>
      </InlineSection>
    );
  }

  // =========================================================
  // RENDER: active form
  // =========================================================
  return (
    <InlineSection
      title={mode === 'ipd' ? 'IPD Billing' : 'OPD Billing'}
      actions={
        <div className={local.toolbar}>
          <Button
            variant="ghost"
            onClick={requestBackToTypes}
            className={local.toolbarBack}
          >
            <LeftArrowIcon width={18} height={18} fill="#1e1e1e" /> Back
          </Button>

          {mode === 'ipd' && (
            <>
              <Button
                variant="ghost"
                onClick={() => setConfirmReset(true)}
                disabled={!hasIpdDraftOnDisk()}
                className={local.toolbarReset}
              >
                Reset
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsParticularsOpen(true)}
              >
                Manage Particulars
              </Button>
            </>
          )}
        </div>
      }
    >
      {mode === 'ipd' ? (
        <HospitalIpdBilling
          particulars={particulars}
          resetSignal={resetSignal}
        />
      ) : (
        <HospitalOpdBilling />
      )}

      {/* Reset confirm */}
      <ConfirmDialog
        isOpen={confirmReset}
        title="Reset this bill?"
        message="This will clear all patient details, dates, items and footer fields on the IPD form. Saved bills in history are not affected."
        confirmText="Yes, reset"
        variant="danger"
        onConfirm={() => {
          setConfirmReset(false);
          setResetSignal((n) => n + 1);
          if (tenant?.slug) {
            try {
              localStorage.removeItem(
                `hospital:ipd:hasContent::${tenant.slug}`,
              );
            } catch {
              /* ignore */
            }
          }
        }}
        onCancel={() => setConfirmReset(false)}
      />

      {/* Leave confirm */}
      <ConfirmDialog
        isOpen={confirmLeave}
        title="Leave billing?"
        message="Any unsaved bill data will be preserved as a draft. You can safely come back - but if you want to start fresh, clear the draft after saving."
        confirmText="Go back"
        cancelText="Stay"
        onConfirm={() => {
          setConfirmLeave(false);
          setMode(null);
        }}
        onCancel={() => setConfirmLeave(false)}
      />

      {/* Particulars modal */}
      <Modal
        isOpen={isParticularsOpen}
        onClose={() => setIsParticularsOpen(false)}
        title="Manage Particulars"
        size="md"
        mobileFullScreen
      >
        <div className={local.particularsForm}>
          <FormField label="Name">
            <Input
              value={draft.name ?? ''}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="e.g., Registration, Room Rent"
            />
          </FormField>

          <FormField label="Type">
            <Select
              value={draft.type ?? 'per-day'}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  type: e.target.value as HospitalParticular['type'],
                })
              }
              options={[
                { value: 'per-day', label: 'Per Day' },
                { value: 'one-time', label: 'One Time' },
              ]}
            />
          </FormField>

          <FormField label="Charge (₹)">
            <Input
              type="number"
              value={draft.charge ?? 0}
              onChange={(e) =>
                setDraft({ ...draft, charge: Number(e.target.value) })
              }
            />
          </FormField>

          <Button onClick={handleSaveParticular}>
            {editingId ? 'Update' : 'Add'}
          </Button>
        </div>

        {editingId && (
          <div style={{ marginBottom: 12 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingId(null);
                setDraft({ name: '', type: 'per-day', charge: 0 });
              }}
            >
              Cancel edit
            </Button>
          </div>
        )}

        {particulars.length === 0 ? (
          <div className={local.particularsEmpty}>
            No particulars yet. Add one above to get started.
          </div>
        ) : (
          <div className={local.particularsList}>
            {particulars.map((p) => (
              <div key={p.id} className={local.particularsRow}>
                <div className={local.particularsInfo}>
                  <span className={local.particularsName}>{p.name}</span>
                  <span className={local.particularsMeta}>
                    ₹{p.charge} ·{' '}
                    {p.type === 'per-day' ? 'Per Day' : 'One Time'}
                  </span>
                </div>
                <div className={local.particularsActions}>
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => {
                      setDraft(p);
                      setEditingId(p.id);
                    }}
                  >
                    <EditIcon width={14} height={14} />
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    onClick={() => handleDelete(p.id)}
                  >
                    <TrashIcon width={14} height={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </InlineSection>
  );
}