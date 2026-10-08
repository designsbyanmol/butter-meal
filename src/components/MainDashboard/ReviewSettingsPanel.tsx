// components/MainDashboard/ReviewSettingsPanel.tsx
import React, { useEffect, useState } from 'react';
import { Tenant } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import { Toggle, Banner, Card, EmptyState } from '../ui';
import local from './ReviewSettingsPanel.module.scss';

const ReviewSettingsPanel: React.FC = () => {
  const [globalEnabled, setGlobalEnabled] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [global, list] = await Promise.all([
        supabaseService.isGlobalReviewsEnabled(),
        supabaseService.getAllTenants(),
      ]);
      setGlobalEnabled(global);
      setTenants(list.filter((t) => t.slug !== 'main'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleToggleGlobal = async (next: boolean) => {
    setSavingKey('__global__');
    setError('');
    try {
      await supabaseService.setGlobalReviewsEnabled(next);
      setGlobalEnabled(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingKey(null);
    }
  };

  const handleToggleTenant = async (slug: string, next: boolean) => {
    setSavingKey(slug);
    setError('');
    try {
      await supabaseService.setTenantReviewsEnabled(slug, next);
      setTenants((prev) =>
        prev.map((t) =>
          t.slug === slug ? { ...t, reviewsEnabled: next } : t,
        ),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return (
      <Card className={local.panel}>
        <EmptyState title="Loading review settings..." />
      </Card>
    );
  }

  return (
    <Card className={local.panel}>
      <div className={local.header}>
        <div>
          <h3>Review Settings</h3>
          <p>Control whether customers can rate and comment on items.</p>
        </div>
      </div>

      {error && (
        <Banner
          variant="error"
          inline
          onDismiss={() => setError('')}
          className={local.errorBanner}
        >
          {error}
        </Banner>
      )}

      {/* ---- Global toggle ---- */}
      <div className={local.row}>
        <div className={local.rowLabel}>
          <strong>Reviews enabled globally</strong>
          <span>
            Master switch. When off, no store shows the review section.
          </span>
        </div>
        <Toggle
          checked={globalEnabled}
          disabled={savingKey === '__global__'}
          onChange={(e) => handleToggleGlobal(e.target.checked)}
        />
      </div>

      {/* ---- Per-tenant overrides ---- */}
      <div className={local.perTenant}>
        <div className={local.perTenantHeader}>
          Per-store overrides
          <span className={local.perTenantHint}>
            {globalEnabled
              ? 'Global is ON - toggle individual stores off below.'
              : 'Global is OFF - all stores are hidden. Turn the master on to enable per-store control.'}
          </span>
        </div>

        {tenants.length === 0 ? (
          <div className={local.empty}>No stores yet.</div>
        ) : (
          tenants.map((t) => {
            const effective = globalEnabled && t.reviewsEnabled !== false;
            return (
              <div key={t.id} className={local.row}>
                <div className={local.rowLabel}>
                  <strong>{t.displayName}</strong>
                  <span className={local.slug}>{t.slug}</span>
                  {!effective && (
                    <span className={local.offPill}>Reviews hidden</span>
                  )}
                </div>
                <Toggle
                  checked={t.reviewsEnabled !== false}
                  disabled={savingKey === t.slug}
                  onChange={(e) =>
                    handleToggleTenant(t.slug, e.target.checked)
                  }
                />
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
};

export default ReviewSettingsPanel;