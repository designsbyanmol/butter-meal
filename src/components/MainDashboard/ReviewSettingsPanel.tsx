// components/MainDashboard/ReviewSettingsPanel.tsx
import React, { useEffect, useState } from 'react';
import { Tenant } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import styles from './ReviewSettingsPanel.module.scss';

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
      // Skip the platform 'main' row - it *is* the global flag
      setTenants(list.filter((t) => t.slug !== 'main'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      setError(msg);
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
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
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
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setError(msg);
    } finally {
      setSavingKey(null);
    }
  };

  if (isLoading) {
    return <div className={styles.loading}>Loading review settings...</div>;
  }

  return (
    <div className={styles.settingsPanel}>
      <div className={styles.settingsHeader}>
        <div>
          <h3>Review Settings</h3>
          <p>Control whether customers can rate and comment on items.</p>
        </div>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* ---- Global toggle ---- */}
      <div className={styles.settingRow}>
        <div className={styles.settingLabel}>
          <strong>Reviews enabled globally</strong>
          <span>
            Master switch. When off, no store shows the review section.
          </span>
        </div>
        <label className={styles.switch}>
          <input
            type="checkbox"
            checked={globalEnabled}
            disabled={savingKey === '__global__'}
            onChange={(e) => handleToggleGlobal(e.target.checked)}
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      {/* ---- Per-tenant toggles ---- */}
      <div className={styles.perTenantList}>
        <div className={styles.perTenantHeader}>
          Per-store overrides
          <span className={styles.perTenantHint}>
            {globalEnabled
              ? 'Global is ON - toggle individual stores off below.'
              : 'Global is OFF - all stores are hidden. Turn the master on to enable per-store control.'}
          </span>
        </div>

        {tenants.length === 0 ? (
          <div className={styles.emptyRow}>No stores yet.</div>
        ) : (
          tenants.map((t) => {
            const effective = globalEnabled && t.reviewsEnabled !== false;
            return (
              <div key={t.id} className={styles.settingRow}>
                <div className={styles.settingLabel}>
                  <strong>{t.displayName}</strong>
                  <span className={styles.slug}>{t.slug}</span>
                  {!effective && (
                    <span className={styles.offPill}>Reviews hidden</span>
                  )}
                </div>
                <label className={styles.switch}>
                  <input
                    type="checkbox"
                    checked={t.reviewsEnabled !== false}
                    disabled={savingKey === t.slug}
                    onChange={(e) =>
                      handleToggleTenant(t.slug, e.target.checked)
                    }
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ReviewSettingsPanel;