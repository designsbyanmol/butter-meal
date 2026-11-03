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
import { TrashIcon, EditIcon, LeftArrowIcon } from '../../assets/svgs';

export default function HospitalBillingBody() {
  const { tenant } = useTenant();
  const [mode, setMode] = useState<'ipd' | 'opd' | null>(() => {
  if (typeof window === 'undefined' || !tenant?.slug) return null;
  try {
    if (localStorage.getItem(`hospital:ipd:hasContent::${tenant.slug}`) === '1') {
      return 'ipd';
    }
    if (localStorage.getItem(`hospital:opd:hasContent::${tenant.slug}`) === '1') {
      return 'opd';
    }
  } catch {
    /* ignore */
  }
  return null;
});
  const [confirmLeave, setConfirmLeave] = useState(false);

  const [particulars, setParticulars] = useState<HospitalParticular[]>([]);
  const [isParticularsOpen, setIsParticularsOpen] = useState(false);
  const [draft, setDraft] = useState<Partial<HospitalParticular>>({
    name: '',
    type: 'per-day',
    charge: 0,
  });
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadParticulars = async () => {
    if (!tenant) return;
    const list = await supabaseService.getHospitalParticulars(tenant.slug);

    if (list.length === 0) {
      // First-time seed so IPD billing has something to pick from.
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

    // Prevent duplicates (case-insensitive) within the same tenant.
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

  const requestBackToTypes = () => {
    // Always confirm - the draft may or may not be dirty, but it is
    // cheap to confirm and expensive to lose a bill in progress.
    setConfirmLeave(true);
  };

  if (!mode) {
    return (
      <InlineSection title="Hospital Billing">
        <div
          style={{
            display: 'flex',
            gap: 20,
            justifyContent: 'center',
            marginTop: 40,
            flexWrap: 'wrap',
          }}
        >
          <Card
            interactive
            padding="lg"
            onClick={() => setMode('ipd')}
            style={{ flex: 1, maxWidth: 300, textAlign: 'center' }}
          >
            <h2 style={{ color: '#1e7e34', marginBottom: 10 }}>
              IPD Billing
            </h2>
            <p style={{ color: '#64748b' }}>
              Create In-Patient Department bills with room rent, nursing,
              etc.
            </p>
          </Card>
          <Card
            interactive
            padding="lg"
            onClick={() => setMode('opd')}
            style={{ flex: 1, maxWidth: 300, textAlign: 'center' }}
          >
            <h2 style={{ color: '#1e7e34', marginBottom: 10 }}>
              OPD Billing
            </h2>
            <p style={{ color: '#64748b' }}>
              Create Out-Patient Department prescriptions and bills.
            </p>
          </Card>
        </div>
      </InlineSection>
    );
  }

  return (
    <InlineSection
      title={mode === 'ipd' ? 'IPD Billing' : 'OPD Billing'}
      actions={
        <div style={{ display: 'flex', gap: 10 }}>
          <Button variant="ghost" onClick={requestBackToTypes}>
            <LeftArrowIcon width={18} height={18} fill="#1e1e1e" /> Back
          </Button>
          {mode === 'ipd' && (
            <Button
              variant="secondary"
              onClick={() => setIsParticularsOpen(true)}
            >
              Manage Particulars
            </Button>
          )}
        </div>
      }
    >
      {mode === 'ipd' ? (
        <HospitalIpdBilling particulars={particulars} />
      ) : (
        <HospitalOpdBilling />
      )}

      {/* Leave confirmation */}
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
        <div
          style={{
            display: 'flex',
            gap: 10,
            alignItems: 'flex-end',
            marginBottom: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ flex: 1, minWidth: 180 }}>
            <FormField label="Name">
              <Input
                value={draft.name ?? ''}
                onChange={(e) =>
                  setDraft({ ...draft, name: e.target.value })
                }
                placeholder="e.g., Registration, Room Rent"
              />
            </FormField>
          </div>
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
          {editingId && (
            <Button
              variant="ghost"
              onClick={() => {
                setEditingId(null);
                setDraft({ name: '', type: 'per-day', charge: 0 });
              }}
            >
              Cancel
            </Button>
          )}
        </div>

        <div
          style={{ display: 'flex', flexDirection: 'column', gap: 10 }}
        >
          {particulars.map((p) => (
            <div
              key={p.id}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: 10,
                background: '#f8fafc',
                borderRadius: 6,
              }}
            >
              <div>
                <strong>{p.name}</strong> - ₹{p.charge} (
                {p.type === 'per-day' ? 'Per Day' : 'One Time'})
              </div>
              <div style={{ display: 'flex', gap: 5 }}>
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
      </Modal>
    </InlineSection>
  );
}