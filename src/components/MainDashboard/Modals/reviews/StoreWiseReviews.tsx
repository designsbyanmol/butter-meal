// src/components/MainDashboard/Modals/reviews/StoreWiseReviews.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { Review, Tenant } from '../../../../types';
import { supabaseService } from '../../../../services/supabase.service';
import {
  Accordion,
  Card,
  EmptyState,
  Badge,
} from '../../../ui';
import { CloseIcon, StarIcon } from '../../../../assets/svgs';
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

/** How many recent reviews to pull per store. Bump if needed. */
const MAX_PER_STORE = 200;

// =========================================================
// Review card
// =========================================================
interface ReviewCardProps {
  review: Review;
  isDisputed: boolean;
  onRemove: (r: Review) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({
  review,
  isDisputed,
  onRemove,
}) => {
  const rounded = Math.round(review.rating);
  const when = new Date(review.createdAt).toLocaleDateString();

  return (
    <Card padding="sm" className={local.card}>
      <div className={local.cardHeader}>
        <div className={local.itemName}>{review.itemName}</div>
        <div className={local.cardHeaderRight}>
          {isDisputed && (
            <Badge tone="warning" size="sm">
              Disputed
            </Badge>
          )}
          <button
            type="button"
            className={local.removeBtn}
            onClick={() => onRemove(review)}
            aria-label="Remove review"
            title="Remove review"
          >
            <CloseIcon width={16} height={16} fill="#4d4d4d" />
          </button>
        </div>
      </div>

      {review.itemCategory && (
        <div className={local.category}>{review.itemCategory}</div>
      )}

      <div className={local.ratingRow}>
        <span className={local.starsFilled}>
          {Array.from({ length: rounded }).map((_, i) => (
            <StarIcon key={i} width={16} height={16} fill="#f5a623" />
          ))}
        </span>
        <span className={local.starsEmpty}>
          {Array.from({ length: 5 - rounded }).map((_, i) => (
            <StarIcon key={i} width={16} height={16} fill="#dcdcdc" />
          ))}
        </span>
        <span className={local.ratingNum}>{review.rating.toFixed(1)}</span>
      </div>

      {review.comment && <p className={local.comment}>"{review.comment}"</p>}

      <div className={local.footer}>
        <span className={local.customer}>
          {review.customerName || 'Customer'}
        </span>
        <span className={local.when}>{when}</span>
      </div>
    </Card>
  );
};

// =========================================================
// Per-store data shape
// =========================================================
interface StoreBucket {
  tenant: Tenant;
  reviews: Review[];
  disputes: Record<string, string>; // reviewId -> disputeId
}

// =========================================================
// Filter predicate
// =========================================================
const reviewMatchesFilters = (
  r: Review,
  filters: ReviewsFilters,
  q: string,
): boolean => {
  if (q) {
    const hay = `${r.itemName} ${r.itemCategory} ${r.comment} ${r.customerName}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  if (!isRatingInBucket(r.rating, filters.rating)) return false;
  if (!isCommentInFilter(r.comment, filters.comment)) return false;
  if (
    !isDateInRange(
      r.createdAt,
      filters.dateRange,
      filters.customFrom,
      filters.customTo,
    )
  ) {
    return false;
  }
  return true;
};

// =========================================================
// Top-level
// =========================================================
const StoreWiseReviews: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [buckets, setBuckets] = useState<StoreBucket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [filters, setFilters] = useState<ReviewsFilters>(EMPTY_REVIEWS_FILTERS);

  // ---- Load all tenants + their reviews + dispute maps ----
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      try {
                const tenantList = await supabaseService.getReviewsEligibleTenants();
        if (cancelled) return;
        setTenants(tenantList);

        const fetched: StoreBucket[] = await Promise.all(
          tenantList.map(async (t) => {
            const [reviews, disputes] = await Promise.all([
              supabaseService.getTenantReviewsPaged(
                t.slug,
                'all',
                MAX_PER_STORE,
                0,
              ),
              supabaseService.getPendingDisputesByReview(t.slug),
            ]);
            return { tenant: t, reviews, disputes };
          }),
        );

        if (cancelled) return;

        // ---- Filter out stores that have no reviews at all ----
        const withReviews = fetched.filter((b) => b.reviews.length > 0);
        setBuckets(withReviews);
      } catch (err) {
        console.warn('Failed to load store-wise reviews:', err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  // ---- Filter buckets by tenant + review filters ----
  const filteredBuckets = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    let pool = buckets;
    if (filters.tenant !== 'all') {
      pool = pool.filter((b) => b.tenant.slug === filters.tenant);
    }

    const withMatches = pool
      .map((b) => {
        const matched = b.reviews.filter((r) =>
          reviewMatchesFilters(r, filters, q),
        );
        const sorted = [...matched];
        sorted.sort((a, b) => {
          const aT = new Date(a.createdAt).getTime();
          const bT = new Date(b.createdAt).getTime();
          switch (filters.sort) {
            case 'oldest':
              return aT - bT;
            case 'ratingLow':
              return a.rating - b.rating;
            case 'ratingHigh':
              return b.rating - a.rating;
            default:
              return bT - aT;
          }
        });
        return { ...b, reviews: sorted };
      })
      // Drop stores with zero reviews that match the current filters.
      .filter((b) => b.reviews.length > 0);

    withMatches.sort((a, b) =>
      a.tenant.displayName.localeCompare(b.tenant.displayName),
    );

    return withMatches;
  }, [buckets, filters]);

  // ---- Delete handler (reloads the whole dataset) ----
  const handleRemove = async (review: Review, disputeId?: string) => {
    const isDisputed = !!disputeId;
    const msg = isDisputed
      ? `Delete this disputed ${review.rating}-star review of "${review.itemName}"?\n\nThe dispute will be marked resolved.`
      : `Delete this ${review.rating}-star review of "${review.itemName}"?\n\nThe item's average rating and review count will be updated.`;
    if (!window.confirm(msg)) return;

    const ok = await supabaseService.adminDeleteReview(review.id);
    if (!ok) return window.alert('Failed to delete review');

    if (disputeId) {
      await supabaseService.resolveDispute(disputeId, 'platform-admin');
    }

    setReloadKey((k) => k + 1);
  };

  // ---- Toolbar groups ----
  const toolbarGroups = [
    {
      title: 'Store',
      value: filters.tenant,
      onChange: (v: typeof filters.tenant) =>
        setFilters((f) => ({ ...f, tenant: v })),
      // Only offer stores that actually have reviews.
      options: [
        { key: 'all', label: 'All stores' },
        ...buckets.map((b) => ({
          key: b.tenant.slug,
          label: b.tenant.slug,
        })),
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
      title: 'Date',
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

  if (isLoading) return <EmptyState title="Loading stores..." />;

  // No store has any reviews at all.
  if (buckets.length === 0) {
    return <EmptyState title="No reviews yet across your stores." />;
  }

  return (
    <div className={local.sections}>
      <ReviewsToolbar
        search={filters.search}
        onSearchChange={(v) =>
          setFilters((f) => ({ ...f, search: v }))
        }
        searchPlaceholder="Search across items, comments, customers"
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

      {filteredBuckets.length === 0 ? (
        <EmptyState title="No stores match your filters." />
      ) : (
        filteredBuckets.map((bucket) => {
          const disputedCount = Object.keys(bucket.disputes).length;
          return (
            <Accordion
              key={bucket.tenant.id}
              title={bucket.tenant.displayName}
              meta={
                <span className={local.tenantSlug}>
                  {bucket.tenant.slug}
                  <span className={local.reviewCountBadge}>
                    {bucket.reviews.length}
                  </span>
                  {disputedCount > 0 && (
                    <Badge
                      tone="warning"
                      size="sm"
                      className={local.disputedBadge}
                    >
                      {disputedCount} disputed
                    </Badge>
                  )}
                </span>
              }
            >
              <div className={local.grid}>
                {bucket.reviews.map((r) => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    isDisputed={!!bucket.disputes[r.id]}
                    onRemove={(rev) =>
                      handleRemove(rev, bucket.disputes[rev.id])
                    }
                  />
                ))}
              </div>
            </Accordion>
          );
        })
      )}
    </div>
  );
};

export default StoreWiseReviews;