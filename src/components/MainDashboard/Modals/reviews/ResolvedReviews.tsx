// src/components/MainDashboard/Modals/reviews/ResolvedReviews.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabaseService } from '../../../../services/supabase.service';
import {
  Accordion,
  Card,
  Chip,
  EmptyState,
  Badge,
  Banner,
} from '../../../ui';
import ReviewsToolbar from './ReviewsToolbar';
import {
  ReviewsFilters,
  EMPTY_REVIEWS_FILTERS,
  RATING_OPTIONS,
  COMMENT_OPTIONS,
  SORT_OPTIONS,
  DATE_RANGE_OPTIONS,
  isRatingInBucket,
  isCommentInFilter,
  isDateInRange,
  countActiveFilters,
} from './reviewsFilters.types';
import local from './ReviewsList.module.scss';

type Outcome = 'rejected' | 'deleted';

interface ResolvedRow {
  disputeId: string;
  reviewId: string;
  tenantSlug: string;
  tenantName: string;
  raisedBy: string;
  reason: string;
  status: string;
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  review: {
    itemName: string;
    itemCategory: string;
    rating: number;
    comment: string;
    customerName: string;
    createdAt: string;
  } | null;
  /** Derived: 'deleted' when the review no longer exists, else 'rejected'. */
  outcome: Outcome;
}

interface StoreGroup {
  tenantSlug: string;
  tenantName: string;
  rows: ResolvedRow[];
}

const ResolvedReviews: React.FC = () => {
  const [rows, setRows] = useState<ResolvedRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<ReviewsFilters>(EMPTY_REVIEWS_FILTERS);

  /** Per-store outcome filter: slug → 'rejected' | 'deleted' | null. */
  const [storeOutcome, setStoreOutcome] = useState<
    Record<string, Outcome | null>
  >({});

  const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [resolved, rejected, eligibleTenants] = await Promise.all([
        supabaseService.getDisputesWithReviews({ status: 'resolved' }),
        supabaseService.getDisputesWithReviews({ status: 'rejected' }),
        supabaseService.getReviewsEligibleTenants(),
      ]);
      const eligibleSlugs = new Set(eligibleTenants.map((t) => t.slug));
      const list = [...resolved, ...rejected]
        .filter((r) => eligibleSlugs.has(r.tenantSlug))
        .map((r) => ({
          ...r,
          // 'deleted' when the review no longer exists; otherwise the
          // dispute was rejected and the review is still live.
          outcome: (r.review === null ? 'deleted' : 'rejected') as Outcome,
        }))
        .sort((a, b) => {
          const aT = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
          const bT = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
          return bT - aT;
        });
      setRows(list as ResolvedRow[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const tenants = useMemo(() => {
    const s = new Map<string, string>();
    rows.forEach((r) => {
      if (!s.has(r.tenantSlug)) s.set(r.tenantSlug, r.tenantName);
    });
    return Array.from(s.entries())
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [rows]);

  const visible = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    let list = rows;
    if (filters.tenant !== 'all') {
      list = list.filter((r) => r.tenantSlug === filters.tenant);
    }
    if (q) {
      list = list.filter((r) =>
        `${r.tenantName} ${r.tenantSlug} ${r.review?.itemName ?? ''} ${
          r.review?.comment ?? ''
        } ${r.reason} ${r.raisedBy}`
          .toLowerCase()
          .includes(q),
      );
    }
    list = list.filter((r) => {
      if (!r.review) {
        return filters.rating === 'all' && filters.comment === 'all';
      }
      return (
        isRatingInBucket(r.review.rating, filters.rating) &&
        isCommentInFilter(r.review.comment, filters.comment)
      );
    });

    list = list.filter((r) =>
      isDateInRange(
        r.resolvedAt ?? r.createdAt,
        filters.dateRange,
        filters.customFrom,
        filters.customTo,
      ),
    );

    const sorted = [...list];
    sorted.sort((a, b) => {
      const aT = a.resolvedAt
        ? new Date(a.resolvedAt).getTime()
        : new Date(a.createdAt).getTime();
      const bT = b.resolvedAt
        ? new Date(b.resolvedAt).getTime()
        : new Date(b.createdAt).getTime();
      switch (filters.sort) {
        case 'oldest':
          return aT - bT;
        case 'ratingLow':
          return (a.review?.rating ?? 0) - (b.review?.rating ?? 0);
        case 'ratingHigh':
          return (b.review?.rating ?? 0) - (a.review?.rating ?? 0);
        default:
          return bT - aT;
      }
    });
    return sorted;
  }, [rows, filters]);

  const groups: StoreGroup[] = useMemo(() => {
    const bySlug = new Map<string, StoreGroup>();
    visible.forEach((r) => {
      if (!bySlug.has(r.tenantSlug)) {
        bySlug.set(r.tenantSlug, {
          tenantSlug: r.tenantSlug,
          tenantName: r.tenantName,
          rows: [],
        });
      }
      bySlug.get(r.tenantSlug)!.rows.push(r);
    });
    return Array.from(bySlug.values()).sort((a, b) =>
      a.tenantName.localeCompare(b.tenantName),
    );
  }, [visible]);

  const toggleStoreOutcome = (slug: string, next: Outcome) => {
    setStoreOutcome((prev) => ({
      ...prev,
      [slug]: prev[slug] === next ? null : next,
    }));
  };

  const toolbarGroups = [
    {
      title: 'Store',
      value: filters.tenant,
      onChange: (v: typeof filters.tenant) =>
        setFilters((f) => ({ ...f, tenant: v })),
      options: [
        { key: 'all', label: 'All stores' },
        ...tenants.map((t) => ({ key: t.slug, label: t.slug })),
      ],
    },
    {
      title: 'Rating',
      value: filters.rating,
      onChange: (v: typeof filters.rating) =>
        setFilters((f) => ({ ...f, rating: v })),
      options: RATING_OPTIONS,
    },
    {
      title: 'Comment',
      value: filters.comment,
      onChange: (v: typeof filters.comment) =>
        setFilters((f) => ({ ...f, comment: v })),
      options: COMMENT_OPTIONS,
    },
    {
      title: 'Resolved on',
      value: filters.dateRange,
      onChange: (v: typeof filters.dateRange) =>
        setFilters((f) => ({ ...f, dateRange: v })),
      options: DATE_RANGE_OPTIONS,
    },
    {
      title: 'Sort',
      value: filters.sort,
      onChange: (v: typeof filters.sort) =>
        setFilters((f) => ({ ...f, sort: v })),
      options: SORT_OPTIONS,
    },
  ];

  if (isLoading) return <EmptyState title="Loading resolved disputes..." />;

  return (
    <div className={local.wrap}>
      <ReviewsToolbar
        search={filters.search}
        onSearchChange={(v) =>
          setFilters((f) => ({ ...f, search: v }))
        }
        searchPlaceholder="Search by store, item, customer, or reason"
        activeCount={countActiveFilters(filters)}
        onReset={() => setFilters(EMPTY_REVIEWS_FILTERS)}
        groups={toolbarGroups}
        customRange={{
          triggerKey: 'custom',
          fromValue: filters.customFrom,
          toValue: filters.customTo,
          onFromChange: (v) =>
            setFilters((f) => ({ ...f, customFrom: v })),
          onToChange: (v) => setFilters((f) => ({ ...f, customTo: v })),
        }}
      />

      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      {rows.length === 0 ? (
        <EmptyState title="No resolved disputes yet." />
      ) : groups.length === 0 ? (
        <EmptyState title="No resolved disputes match your filters." />
      ) : (
        <div className={local.sections}>
          {groups.map((g) => {
            const active = storeOutcome[g.tenantSlug] ?? null;

            // Counts for the two capsules
            const rejectedCount = g.rows.filter(
              (r) => r.outcome === 'rejected',
            ).length;
            const deletedCount = g.rows.filter(
              (r) => r.outcome === 'deleted',
            ).length;

            // Apply the per-store outcome filter
            const shownRows =
              active === null
                ? g.rows
                : g.rows.filter((r) => r.outcome === active);

            return (
              <Accordion
                key={g.tenantSlug}
                title={g.tenantName}
                meta={
                  <span className={local.tenantSlug}>
                    {g.tenantSlug}
                    <span className={local.reviewCountBadge}>
                      {shownRows.length}
                      {active !== null && ` / ${g.rows.length}`}
                    </span>
                  </span>
                }
              >
                {/* Per-store outcome capsules */}
                <div className={local.storeCapsuleRow}>
                  <Chip
                    tone="warning"
                    active={active === 'rejected'}
                    onClick={() =>
                      toggleStoreOutcome(g.tenantSlug, 'rejected')
                    }
                  >
                    Rejected
                    <span className={local.capsuleCount}>
                      {rejectedCount}
                    </span>
                  </Chip>
                  <Chip
                    tone="danger"
                    active={active === 'deleted'}
                    onClick={() =>
                      toggleStoreOutcome(g.tenantSlug, 'deleted')
                    }
                  >
                    Deleted
                    <span className={local.capsuleCount}>
                      {deletedCount}
                    </span>
                  </Chip>
                </div>

                {shownRows.length === 0 ? (
                  <div className={local.emptyRow}>
                    No {active} disputes for this store.
                  </div>
                ) : (
                  <div className={local.list}>
                    {shownRows.map((row) => (
                      <Card
                        key={row.disputeId}
                        padding="md"
                        className={local.disputeCard}
                        data-dispute-id={row.disputeId}
                      >
                        <div className={local.disputeHeader}>
                          <div>
                            <div className={local.disputeStore}>
                              <Badge tone="info" size="sm">
                                {row.tenantSlug}
                              </Badge>
                              <strong>{row.tenantName}</strong>
                            </div>
                            <div className={local.disputeMeta}>
                              Resolved by {row.resolvedBy || 'admin'} ·{' '}
                              {row.resolvedAt
                                ? new Date(
                                    row.resolvedAt,
                                  ).toLocaleString()
                                : '—'}
                            </div>
                          </div>
                          {row.outcome === 'deleted' ? (
                            <Badge tone="danger" size="sm">
                              Review deleted
                            </Badge>
                          ) : row.review ? (
                            <Badge tone="neutral" size="sm">
                              {row.review.rating.toFixed(1)} ★
                            </Badge>
                          ) : null}
                        </div>

                        {row.review ? (
                          <div className={local.reviewBlock}>
                            <div className={local.reviewItem}>
                              {row.review.itemName}
                              {row.review.itemCategory && (
                                <span className={local.reviewCat}>
                                  {' '}
                                  · {row.review.itemCategory}
                                </span>
                              )}
                            </div>
                            {row.review.comment && (
                              <div className={local.reviewComment}>
                                "{row.review.comment}"
                              </div>
                            )}
                            <div className={local.reviewFooter}>
                              <span>
                                {row.review.customerName || 'Customer'}
                              </span>
                              <span>
                                {new Date(
                                  row.review.createdAt,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className={local.reviewBlock}>
                            <div className={local.reviewItem}>
                              Review deleted by platform admin
                            </div>
                            <div className={local.reviewComment}>
                              The original review was removed and cannot be
                              displayed.
                            </div>
                          </div>
                        )}

                        <div className={local.reasonBlock}>
                          <div className={local.reasonLabel}>
                            {row.status === 'rejected'
                              ? 'Dispute rejected — tenant reason'
                              : 'Dispute reason'}
                          </div>
                          <div className={local.reasonText}>
                            {row.reason?.trim()
                              ? row.reason
                              : '— no reason provided —'}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </Accordion>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ResolvedReviews;