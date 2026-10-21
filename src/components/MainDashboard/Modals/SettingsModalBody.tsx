// components/MainDashboard/Modals/SettingsModalBody.tsx
import React, { useEffect, useState } from 'react';
import { supabaseService } from '../../../services/supabase.service';
import { invalidatePlatformTax } from '../../../hooks/usePlatformTax';
import {
  Toggle,
  Banner,
  EmptyState,
  Button,
  FormField,
  Input,
} from '../../ui';
import { InlineSection } from '../../Dashboard/inline';
import local from './Modals.module.scss';

interface SettingsDraft {
  reviewsEnabled: boolean;
  taxPercent: number;
}

const SettingsModalBody: React.FC = () => {
  const [loaded, setLoaded] = useState<SettingsDraft>({
    reviewsEnabled: true,
    taxPercent: 0,
  });
  const [draft, setDraft] = useState<SettingsDraft>({
    reviewsEnabled: true,
    taxPercent: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    setError('');
    setSuccess('');

    Promise.all([
      supabaseService.isGlobalReviewsEnabled(),
      supabaseService.getPlatformTaxPercent(),
    ])
      .then(([reviewsEnabled, taxPercent]) => {
        if (cancelled) return;
        const next: SettingsDraft = { reviewsEnabled, taxPercent };
        setLoaded(next);
        setDraft(next);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const isDirty =
    draft.reviewsEnabled !== loaded.reviewsEnabled ||
    draft.taxPercent !== loaded.taxPercent;

  const handleSave = async () => {
    setIsSaving(true);
    setError('');
    setSuccess('');
    try {
      if (draft.reviewsEnabled !== loaded.reviewsEnabled) {
        await supabaseService.setGlobalReviewsEnabled(draft.reviewsEnabled);
      }
      if (draft.taxPercent !== loaded.taxPercent) {
        await supabaseService.setPlatformTaxPercent(draft.taxPercent);
        invalidatePlatformTax();
      }
      setLoaded(draft);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDiscard = () => {
    setDraft(loaded);
    setError('');
    setSuccess('');
  };

  return (
    <InlineSection
      title="Global Settings"
      actions={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDiscard}
            disabled={isSaving || !isDirty}
          >
            Discard
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            loading={isSaving}
            disabled={!isDirty}
          >
            Save
          </Button>
        </>
      }
    >
      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}
      {success && <Banner variant="success">{success}</Banner>}

      {isLoading ? (
        <EmptyState title="Loading settings..." />
      ) : (
        <div className={local.rows}>
          <div className={local.row}>
            <div className={local.rowText}>
              <strong>Reviews enabled globally</strong>
              <span className={local.rowDesc}>
                Master switch. When off, no store will show the review
                section to customers, regardless of each store's own setting.
              </span>
            </div>
            <Toggle
              checked={draft.reviewsEnabled}
              disabled={isSaving}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  reviewsEnabled: e.target.checked,
                }))
              }
            />
          </div>

          <div className={local.row}>
            <div className={local.rowText}>
              <strong>Tax on subscription (GST)</strong>
              <span className={local.rowDesc}>
                Applied on top of every plan purchase, plan change, and
                renewal. Calculated on the discounted subtotal. Set to 0 to
                disable.
              </span>
            </div>
            <div className={local.taxInputWrap}>
              <FormField label="Percent">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step={0.01}
                  value={String(draft.taxPercent)}
                  onChange={(e) => {
                    const raw = parseFloat(e.target.value);
                    const v = Number.isFinite(raw) ? raw : 0;
                    setDraft((d) => ({
                      ...d,
                      taxPercent: Math.max(0, Math.min(v, 100)),
                    }));
                  }}
                  disabled={isSaving}
                  inputSize="sm"
                />
              </FormField>
            </div>
          </div>
        </div>
      )}
    </InlineSection>
  );
};

export default SettingsModalBody;