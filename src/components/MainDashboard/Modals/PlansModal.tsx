// src/components/MainDashboard/Modals/PlansModal.tsx
import React, { useEffect, useState } from 'react';
import { Plan } from '../../../types';
import { planService } from '../../../services/plan.service';
import {
  Modal,
  Toggle,
  Badge,
  Banner,
  EmptyState,
  Button,
} from '../../ui';
import { formatRupees } from '../../../utils/subscription';
import local from './Modals.module.scss';

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PlansModal: React.FC<PlansModalProps> = ({ isOpen, onClose }) => {
  const [loaded, setLoaded] = useState<Plan[]>([]);
  const [draft, setDraft] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [success, setSuccess] = useState('');

  // ---- Load helper ----
  const loadPlans = async () => {
    setIsLoading(true);
    setLoadError('');
    try {
      const list = await planService.getAllPlans({ includeInactive: true });
      setLoaded(list);
      setDraft(list);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load plans');
    } finally {
      setIsLoading(false);
    }
  };

  // ---- Load on open ----
  useEffect(() => {
    if (!isOpen) return;
    loadPlans();
    setSaveError('');
    setSuccess('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---- Subscribe to plan changes while open ----
  // If the admin (or another tab) toggles a plan elsewhere, reload our
  // list so the modal reflects the fresh data. We only do this when the
  // modal isn't dirty, to avoid clobbering unsaved toggles.
  useEffect(() => {
    if (!isOpen) return;
    const unsubscribe = planService.subscribeToPlanChanges(() => {
      setLoaded((prevLoaded) => {
        // If the user has unsaved changes, leave `draft` alone.
        setDraft((prevDraft) => {
          const dirty =
            prevDraft.length !== prevLoaded.length ||
            prevDraft.some((p, i) => {
              const l = prevLoaded[i];
              return !l || l.id !== p.id || l.isActive !== p.isActive;
            });
          if (dirty) return prevDraft;
          return prevLoaded;
        });
        return prevLoaded;
      });
      // Also pull the latest list from the server.
      loadPlans();
    });
    return unsubscribe;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ---- Dirty tracking ----
  const isDirty =
    draft.length !== loaded.length ||
    draft.some((p, i) => {
      const l = loaded[i];
      return !l || l.id !== p.id || l.isActive !== p.isActive;
    });

  const toggleDraft = (planId: string, next: boolean) => {
    setDraft((prev) =>
      prev.map((p) => (p.id === planId ? { ...p, isActive: next } : p)),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError('');
    setSuccess('');
    try {
      const toUpdate = draft.filter((p) => {
        const l = loaded.find((x) => x.id === p.id);
        return l && l.isActive !== p.isActive;
      });

      for (const plan of toUpdate) {
        await planService.setPlanActive(plan.id, plan.isActive);
      }

      setLoaded(draft);
      setSuccess('Plans updated');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(loaded);
    setSaveError('');
    setSuccess('');
  };

  const footerContent = (
    <>
      <Button
        variant="ghost"
        onClick={handleDiscard}
        disabled={isSaving || !isDirty}
        style={{ marginRight: 'auto' }}
      >
        Discard
      </Button>
      <Button variant="ghost" onClick={onClose} disabled={isSaving}>
        Close
      </Button>
      <Button onClick={handleSave} loading={isSaving} disabled={!isDirty}>
        Save
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Subscription Plans"
      size="lg"
      footer={footerContent}
    >
      {loadError && (
        <Banner variant="error" onDismiss={() => setLoadError('')}>
          {loadError}
        </Banner>
      )}
      {saveError && (
        <Banner variant="error" onDismiss={() => setSaveError('')}>
          {saveError}
        </Banner>
      )}
      {success && <Banner variant="success">{success}</Banner>}

      {isLoading && draft.length === 0 ? (
        <EmptyState title="Loading plans..." />
      ) : draft.length === 0 ? (
        <EmptyState
          title="No plans configured"
          description="Add plans in the database to see them here."
          action={
            <Button variant="secondary" onClick={loadPlans}>
              Retry
            </Button>
          }
        />
      ) : (
        <div className={local.rows}>
          {draft.map((p) => {
            const original = loaded.find((x) => x.id === p.id);
            const changed = original && original.isActive !== p.isActive;

            return (
              <div
                key={p.id}
                className={`${local.row} ${changed ? local.rowChanged : ''}`}
              >
                <div className={local.rowText}>
                  <div className={local.rowTitle}>
                    <strong>{p.name}</strong>
                    <Badge
                      tone={p.isActive ? 'success' : 'danger'}
                      size="sm"
                    >
                      {p.isActive ? 'Active' : 'Disabled'}
                    </Badge>
                    <span className={local.price}>
                      {formatRupees(p.monthlyPrice)}/mo
                    </span>
                  </div>
                  {p.description && <span>{p.description}</span>}
                </div>
                <Toggle
                  checked={p.isActive}
                  disabled={isSaving}
                  onChange={(e) => toggleDraft(p.id, e.target.checked)}
                />
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};

export default PlansModal;