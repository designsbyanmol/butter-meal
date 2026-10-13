// src/components/MainDashboard/Modals/reviews/DisputedReviews.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseService } from '../../../../services/supabase.service';
import {
  Accordion,
  Button,
  Card,
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

interface DisputeRow {
  disputeId: string;
  reviewId: string;
  tenantSlug: string;
  tenantName: string;
  raisedBy: string;
  reason: string;
  createdAt: string;
  review: {
    itemName: string;
    itemCategory: string;
    rating: number;
    comment: string;
    customerName: string;
    createdAt: string;
  } | null;
}

interface DisputedReviewsProps {
  focusDisputeId?: string | null;
}

interface StoreGroup {
  tenantSlug: string;
  tenantName: string;
  rows: DisputeRow[];
}

const DisputedReviews: React.FC<DisputedReviewsProps> = ({
  focusDisputeId = null,
}) => {
  const [rows, setRows] = useState<DisputeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReviewsFilters>(EMPTY_REVIEWS_FILTERS);

  const scrolledForRef = useRef<string | null>(null);

    const load = async () => {
    setIsLoading(true);
    setError('');
    try {
      const [list, eligibleTenants] = await Promise.all([
        supabaseService.getDisputesWithReviews({ status: 'pending' }),
        supabaseService.getReviewsEligibleTenants(),
      ]);
      const eligibleSlugs = new Set(eligibleTenants.map((t) => t.slug));
      setRows(
        (list as DisputeRow[]).filter((r) =>
          eligibleSlugs.has(r.tenantSlug),
        ),
      );
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
    const s = new Map<string, string>(); // slug → displayName
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
    list = list.filter(
      (r) =>
        r.review &&
        isRatingInBucket(r.review.rating, filters.rating) &&
        isCommentInFilter(r.review.comment, filters.comment),
    );

    list = list.filter((r) =>
      isDateInRange(
        r.createdAt,
        filters.dateRange,
        filters.customFrom,
        filters.customTo,
      ),
    );

    const sorted = [...list];
    sorted.sort((a, b) => {
      const aT = new Date(a.createdAt).getTime();
      const bT = new Date(b.createdAt).getTime();
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

  // Group the filtered rows by store.
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

  // Scroll to + highlight the focused dispute.
  useEffect(() => {
    if (!focusDisputeId) return;
    if (scrolledForRef.current === focusDisputeId) return;

    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-dispute-id="${focusDisputeId}"]`,
      );
      if (!el) {
        if (
          countActiveFilters(filters) > 0 ||
          filters.search.trim() !== ''
        ) {
          setFilters(EMPTY_REVIEWS_FILTERS);
        }
        return;
      }

      scrolledForRef.current = focusDisputeId;

      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        el.scrollIntoView();
      }

      el.classList.add(local.disputeFocused);
      window.setTimeout(() => {
        el.classList.remove(local.disputeFocused);
      }, 2200);
    }, 300);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDisputeId, visible.length]);

  const handleDeleteReview = async (row: DisputeRow) => {
    if (!row.review) return;
    if (
      !window.confirm(
        `Delete the ${row.review.rating}-star review of "${row.review.itemName}" and resolve the dispute?`,
      )
    )
      return;

    setActing(row.disputeId);
    try {
      const ok = await supabaseService.adminDeleteReview(row.reviewId);
      if (!ok) throw new Error('Failed to delete review');
      await supabaseService.resolveDispute(row.disputeId, 'platform-admin');
      setRows((prev) => prev.filter((r) => r.disputeId !== row.disputeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setActing(null);
    }
  };

  const handleRejectDispute = async (row: DisputeRow) => {
    if (!window.confirm('Reject this dispute and keep the review?')) return;
    setActing(row.disputeId);
    try {
      const { supabase } = await import('../../../../services/supabase.client');
      if (!supabase) throw new Error('Supabase not configured');
      const { error: e } = await supabase
        .from('star_veg_review_disputes')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: 'platform-admin',
        })
        .eq('id', row.disputeId);
      if (e) throw e;
      setRows((prev) => prev.filter((r) => r.disputeId !== row.disputeId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reject');
    } finally {
      setActing(null);
    }
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
      title: 'Raised on',
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

  if (isLoading) return <EmptyState title="Loading disputes..." />;

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
        <EmptyState title="No pending disputes right now." />
      ) : groups.length === 0 ? (
        <EmptyState title="No disputes match your filters." />
      ) : (
        <div className={local.sections}>
          {groups.map((g) => (
            <Accordion
              key={g.tenantSlug}
              title={g.tenantName}
              meta={
                <span className={local.tenantSlug}>
                  {g.tenantSlug}
                  <span className={local.reviewCountBadge}>
                    {g.rows.length}
                  </span>
                </span>
              }
            >
              <div className={local.list}>
                {g.rows.map((row) => (
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
                          Raised by {row.raisedBy || 'owner'} ·{' '}
                          {new Date(row.createdAt).toLocaleString()}
                        </div>
                      </div>
                      {row.review && (
                        <Badge
                          tone={
                            row.review.rating <= 2
                              ? 'danger'
                              : row.review.rating <= 3
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {row.review.rating.toFixed(1)} ★
                        </Badge>
                      )}
                    </div>

                    {row.review && (
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
                    )}

                    <div className={local.reasonBlock}>
                      <div className={local.reasonLabel}>
                        Dispute reason
                      </div>
                      <div className={local.reasonText}>
                        {row.reason?.trim()
                          ? row.reason
                          : '— no reason provided —'}
                      </div>
                    </div>

                    <div className={local.disputeActions}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectDispute(row)}
                        loading={acting === row.disputeId}
                      >
                        Reject dispute
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteReview(row)}
                        loading={acting === row.disputeId}
                      >
                        Delete review
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </Accordion>
          ))}
        </div>
      )}
    </div>
  );
};

export default DisputedReviews;