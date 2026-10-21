// src/components/MainDashboard/ReviewsOverview.tsx
import React, { useEffect, useState } from 'react';
import { Review, ReviewFilter, Tenant } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import { supabase } from '../../services/supabase.client';
import ReviewSettingsPanel from './ReviewSettingsPanel';
import {
  Accordion,
  Button,
  Chip,
  Card,
  EmptyState,
  Badge,
} from '../ui';
import { CloseIcon, StarIcon } from '../../assets/svgs';
import local from './ReviewsOverview.module.scss';

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lte4', label: '< 4 stars' },
  { key: 'lte3', label: '< 3 stars' },
  { key: 'lte2', label: '< 2 stars' },
  { key: 'commented', label: 'With comments' },
];

const PAGE_SIZE = 16;

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

      {review.comment && (
        <p className={local.comment}>"{review.comment}"</p>
      )}

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
// Per-tenant section
// =========================================================
interface TenantSectionProps {
  tenant: Tenant;
  refreshTick: number;
}

const TenantSection: React.FC<TenantSectionProps> = ({
  tenant,
  refreshTick,
}) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [disputes, setDisputes] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const loadFirstPage = async (f: ReviewFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const [list, disputeMap] = await Promise.all([
        supabaseService.getTenantReviewsPaged(
          tenant.slug,
          f,
          PAGE_SIZE,
          0,
        ),
        supabaseService.getPendingDisputesByReview(tenant.slug),
      ]);
      setReviews(list);
      setDisputes(disputeMap);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load';
      console.error('[Reviews] load failed:', err);
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFirstPage(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant.slug, refreshTick]);

  const handleFilterChange = (f: ReviewFilter) => {
    setFilter(f);
    setReviews([]);
    setHasMore(true);
    loadFirstPage(f);
  };

  const handleShowMore = async () => {
    if (!hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const next = await supabaseService.getTenantReviewsPaged(
        tenant.slug,
        filter,
        PAGE_SIZE,
        reviews.length,
      );
      setReviews((prev) => [...prev, ...next]);
      setHasMore(next.length === PAGE_SIZE);
    } catch (err) {
      console.warn('Show more failed:', err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRemove = async (review: Review) => {
    const isDisputed = !!disputes[review.id];
    const confirmMsg = isDisputed
      ? `Delete this disputed ${review.rating}-star review of "${review.itemName}"?\n\nThe dispute will be marked resolved.`
      : `Delete this ${review.rating}-star review of "${review.itemName}"?\n\nThe item's average rating and review count will be updated.`;

    if (!window.confirm(confirmMsg)) return;

    // 1. Delete the review (also recomputes the item rating server-side).
    const ok = await supabaseService.adminDeleteReview(review.id);
    if (!ok) {
      window.alert('Failed to delete review');
      return;
    }

    // 2. Resolve any pending dispute on the same review (best-effort).
    const disputeId = disputes[review.id];
    if (disputeId && supabase) {
      try {
        await supabase
          .from('star_veg_review_disputes')
          .update({
            status: 'resolved',
            resolved_at: new Date().toISOString(),
            resolved_by: 'platform-admin',
          })
          .eq('id', disputeId);
      } catch (err) {
        console.warn('Failed to mark dispute resolved:', err);
      }
    }

    // 3. Update local state.
    setReviews((prev) => prev.filter((r) => r.id !== review.id));
    setDisputes((prev) => {
      const next = { ...prev };
      delete next[review.id];
      return next;
    });
  };

  const filterLabel =
    FILTERS.find((f) => f.key === filter)?.label ?? 'All';
  const disputedCount = Object.keys(disputes).length;

  return (
    <Accordion
      title={tenant.displayName}
      meta={
        <span className={local.tenantSlug}>
          {tenant.slug}
          {disputedCount > 0 && (
            <Badge tone="warning" size="sm" className={local.disputedBadge}>
              {disputedCount} disputed
            </Badge>
          )}
        </span>
      }
      className={local.tenantSection}
    >
      <div className={local.filterRow}>
        <span className={local.filterLabel}>Filter:</span>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            tone="neutral"
            active={filter === f.key}
            onClick={() => handleFilterChange(f.key)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {error && <div className={local.error}>{error}</div>}

      {isLoading ? (
        <div className={local.emptyRow}>Loading...</div>
      ) : reviews.length === 0 ? (
        <div className={local.emptyRow}>
          No reviews match "{filterLabel}".
        </div>
      ) : (
        <>
          <div className={local.grid}>
            {reviews.map((r) => (
              <ReviewCard
                key={r.id}
                review={r}
                isDisputed={!!disputes[r.id]}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {hasMore && (
            <Button
              variant="secondary"
              onClick={handleShowMore}
              loading={isLoadingMore}
              className={local.showMoreBtn}
            >
              Show more
            </Button>
          )}
        </>
      )}
    </Accordion>
  );
};

// =========================================================
// Top-level
// =========================================================
const ReviewsOverview: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
              const list = await supabaseService.getReviewsEligibleTenants();
      setTenants(list);
      } catch (err) {
        console.warn('Failed to load tenants:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshKey]);

  const Header = (
    <div className={local.header}>
      <div>
        <h2>Reviews Overview</h2>
        <p>All customer reviews across your stores.</p>
      </div>
      <Button
        variant="secondary"
        onClick={() => setRefreshKey((k) => k + 1)}
      >
        Refresh
      </Button>
    </div>
  );

  if (isLoading) {
    return (
      <div className={local.wrap}>
        {Header}
        <EmptyState title="Loading stores..." />
      </div>
    );
  }

  if (tenants.length === 0) {
    return (
      <div className={local.wrap}>
        {Header}
        <ReviewSettingsPanel />
        <EmptyState title="No stores yet." />
      </div>
    );
  }

  return (
    <div className={local.wrap}>
      {Header}
      <ReviewSettingsPanel />
      <div className={local.sections}>
        {tenants.map((t) => (
          <TenantSection key={t.id} tenant={t} refreshTick={refreshKey} />
        ))}
      </div>
    </div>
  );
};

export default ReviewsOverview;