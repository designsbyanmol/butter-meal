// src/components/MainDashboard/ReviewSettingsPanel.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Tenant } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import { Toggle, Banner, Card, EmptyState, Button } from '../ui';
import ReviewsToolbar from './Modals/reviews/ReviewsToolbar';
import local from './ReviewSettingsPanel.module.scss';

type StatusFilter = 'all' | 'on' | 'off';

interface PanelState {
  globalEnabled: boolean;
  /** Map of tenantSlug → whether reviews are enabled for that store. */
  tenantReviews: Record<string, boolean>;
}

const ReviewSettingsPanel: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ---- Loaded (source of truth from DB) + draft (what the user is editing)
  const [loaded, setLoaded] = useState<PanelState>({
    globalEnabled: true,
    tenantReviews: {},
  });
  const [draft, setDraft] = useState<PanelState>({
    globalEnabled: true,
    tenantReviews: {},
  });

  // ---- Filters ----
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // ---- Load ----
  const load = async () => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
            const [global, tenantList] = await Promise.all([
        supabaseService.isGlobalReviewsEnabled(),
        supabaseService.getReviewsEligibleTenants(),
      ]);
      setTenants(tenantList);

      const tenantReviews: Record<string, boolean> = {};
      tenantList.forEach((t) => {
        tenantReviews[t.slug] = t.reviewsEnabled !== false;
      });

      const next: PanelState = {
        globalEnabled: global,
        tenantReviews,
      };
      setLoaded(next);
      setDraft(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ---- Dirty tracking ----
  const isDirty = useMemo(() => {
    if (loaded.globalEnabled !== draft.globalEnabled) return true;
    const keys = new Set([
      ...Object.keys(loaded.tenantReviews),
      ...Object.keys(draft.tenantReviews),
    ]);
    for (const k of keys) {
      if (loaded.tenantReviews[k] !== draft.tenantReviews[k]) return true;
    }
    return false;
  }, [loaded, draft]);

  // ---- Toggle handlers (draft-only) ----
  const setGlobalDraft = (next: boolean) => {
    setDraft((d) => ({ ...d, globalEnabled: next }));
    setError('');
    setSuccess('');
  };

  const setTenantDraft = (slug: string, next: boolean) => {
    setDraft((d) => ({
      ...d,
      tenantReviews: { ...d.tenantReviews, [slug]: next },
    }));
    setError('');
    setSuccess('');
  };

  // ---- Save / Cancel ----
  const handleSave = async () => {
    if (!isDirty || isSaving) return;
    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      // 1. Global switch (only if changed)
      if (loaded.globalEnabled !== draft.globalEnabled) {
        await supabaseService.setGlobalReviewsEnabled(draft.globalEnabled);
      }

      // 2. Per-tenant toggles that actually changed
      const changedSlugs = Object.keys(draft.tenantReviews).filter(
        (slug) =>
          loaded.tenantReviews[slug] !== draft.tenantReviews[slug],
      );

      for (const slug of changedSlugs) {
        await supabaseService.setTenantReviewsEnabled(
          slug,
          draft.tenantReviews[slug],
        );
      }

      // 3. Re-sync from the DB so state and reality match.
      setLoaded(draft);
      setSuccess('Settings saved');
      setTimeout(() => setSuccess(''), 1800);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(loaded);
    setError('');
    setSuccess('');
  };

  // ---- Derived ----
  const filteredTenants = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tenants.filter((t) => {
      const on = draft.tenantReviews[t.slug] !== false;
      if (statusFilter === 'on' && !on) return false;
      if (statusFilter === 'off' && on) return false;
      if (!q) return true;
      return `${t.displayName} ${t.slug}`.toLowerCase().includes(q);
    });
  }, [tenants, search, statusFilter, draft.tenantReviews]);

  const activeCount = statusFilter !== 'all' ? 1 : 0;

  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
  };

  if (isLoading) return <EmptyState title="Loading review settings..." />;

  return (
    <div className={local.wrap}>
      {/* ---- Toolbar ---- */}
      <ReviewsToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search stores by name or slug"
        activeCount={activeCount}
        onReset={resetFilters}
        groups={[
          {
            title: 'Status',
            value: statusFilter,
            onChange: (v) => setStatusFilter(v as StatusFilter),
            options: [
              { key: 'all', label: 'All' },
              { key: 'on', label: 'Reviews ON' },
              { key: 'off', label: 'Reviews OFF' },
            ],
          },
        ]}
      />

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
      {success && <Banner variant="success">{success}</Banner>}

      <Card className={local.panel}>
        <div className={local.header}>
          <div>
            <h3>Review Settings</h3>
            <p>Control whether customers can rate and comment on items.</p>
          </div>
        </div>

        {/* ---- Global toggle ---- */}
        <div className={local.row}>
          <div className={local.rowLabel}>
            <strong>Reviews enabled globally</strong>
            <span>
              Master switch. When off, no store shows the review section.
            </span>
          </div>
          <Toggle
            checked={draft.globalEnabled}
            disabled={isSaving}
            onChange={(e) => setGlobalDraft(e.target.checked)}
          />
        </div>

        {/* ---- Per-tenant overrides ---- */}
        <div className={local.perTenant}>
          <div className={local.perTenantHeader}>
            Per-store overrides
            <span className={local.perTenantHint}>
              {draft.globalEnabled
                ? 'Global is ON - toggle individual stores off below.'
                : 'Global is OFF - all stores are hidden. Turn the master on to enable per-store control.'}
            </span>
          </div>

          {tenants.length === 0 ? (
            <div className={local.empty}>No stores yet.</div>
          ) : filteredTenants.length === 0 ? (
            <div className={local.empty}>
              No stores match your filters.
            </div>
          ) : (
            filteredTenants.map((t) => {
              const effective =
                draft.globalEnabled &&
                draft.tenantReviews[t.slug] !== false;
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
                    checked={draft.tenantReviews[t.slug] !== false}
                    disabled={isSaving}
                    onChange={(e) => setTenantDraft(t.slug, e.target.checked)}
                  />
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* ---- Sticky save bar ---- */}
      <div className={local.saveBar}>
        <Button
          variant="ghost"
          onClick={handleCancel}
          disabled={isSaving || !isDirty}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          loading={isSaving}
          disabled={!isDirty}
        >
          Save changes
        </Button>
      </div>
    </div>
  );
};

export default ReviewSettingsPanel;