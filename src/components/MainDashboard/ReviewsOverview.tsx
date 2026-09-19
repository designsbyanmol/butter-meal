// components/MainDashboard/ReviewsOverview.tsx
import React, { useEffect, useState } from 'react';
import { Review, ReviewFilter, Tenant } from '../../types';
import { supabaseService } from '../../services/supabase.service';
import ReviewSettingsPanel from './ReviewSettingsPanel';
import styles from './ReviewsOverview.module.scss';
import { CloseIcon, StarIcon, RightArrow } from '../../assets/svgs';

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lte4', label: '<= 4 stars' },
  { key: 'lte3', label: '<= 3 stars' },
  { key: 'lte2', label: '<= 2 stars' },
  { key: 'commented', label: 'With comments' },
];

const PAGE_SIZE = 16;

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
  const [isOpen, setIsOpen] = useState(false);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');

  const loadFirstPage = async (f: ReviewFilter) => {
    setIsLoading(true);
    setError('');
    try {
      const list = await supabaseService.getTenantReviewsPaged(
        tenant.slug,
        f,
        PAGE_SIZE,
        0,
      );
      setReviews(list);
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
    if (!isOpen) return;
    loadFirstPage(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant.slug, refreshTick]);

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
    if (
      !window.confirm(
        `Delete this ${review.rating}-star review of "${review.itemName}"?\n\nThe item's average rating and review count will be updated.`,
      )
    )
      return;

    const ok = await supabaseService.adminDeleteReview(review.id);
    if (ok) {
      setReviews((prev) => prev.filter((r) => r.id !== review.id));
    } else {
      window.alert('Failed to delete review');
    }
  };

  const filterLabel =
    FILTERS.find((f) => f.key === filter)?.label ?? 'All';

  return (
    <div className={styles.tenantSection}>
      <button
        type="button"
        className={styles.tenantHeader}
        onClick={() => setIsOpen((s) => !s)}
        aria-expanded={isOpen}
      >
        <span
          className={`${styles.chevron} ${
            isOpen ? styles.chevronOpen : ''
          }`}
        >
          <RightArrow width={16} height={16} fill="#4d4d4d" />
        </span>
        <span className={styles.tenantName}>{tenant.displayName}</span>
        <span className={styles.tenantSlug}>{tenant.slug}</span>
      </button>

      {isOpen && (
        <div className={styles.tenantBody}>
          <div className={styles.filterRow}>
            <span className={styles.filterLabel}>Filter:</span>
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={`${styles.filterPill} ${
                  filter === f.key ? styles.filterPillActive : ''
                }`}
                onClick={() => handleFilterChange(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {error && <div className={styles.error}>{error}</div>}

          {isLoading ? (
            <div className={styles.emptyRow}>Loading...</div>
          ) : reviews.length === 0 ? (
            <div className={styles.emptyRow}>
              No reviews match "{filterLabel}".
            </div>
          ) : (
            <>
              <div className={styles.grid}>
                {reviews.map((r) => (
                  <ReviewCard key={r.id} review={r} onRemove={handleRemove} />
                ))}
              </div>

              {hasMore && (
                <button
                  type="button"
                  className={styles.showMoreBtn}
                  onClick={handleShowMore}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? 'Loading...' : 'Show more'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

// =========================================================
// Single review card
// =========================================================
interface ReviewCardProps {
  review: Review;
  onRemove: (r: Review) => void;
}

const ReviewCard: React.FC<ReviewCardProps> = ({ review, onRemove }) => {
  const rounded = Math.round(review.rating);
  const when = new Date(review.createdAt).toLocaleDateString();

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <div className={styles.itemName}>{review.itemName}</div>
        <button
          type="button"
          className={styles.removeBtn}
          onClick={() => onRemove(review)}
          aria-label="Remove review"
          title="Remove review"
        >
          <CloseIcon width={16} height={16} fill="#4d4d4d" />
        </button>
      </div>

      {review.itemCategory && (
        <div className={styles.category}>{review.itemCategory}</div>
      )}

      <div className={styles.ratingRow}>
        <span className={styles.starsFilled}>
          {Array.from({ length: rounded }).map((_, i) => (
            <StarIcon key={i} width={16} height={16} fill="#f5a623" />
          ))}
        </span>
        <span className={styles.starsEmpty}>
          {Array.from({ length: 5 - rounded }).map((_, i) => (
            <StarIcon key={i} width={16} height={16} fill="#dcdcdc" />
          ))}
        </span>
        <span className={styles.ratingNum}>{review.rating.toFixed(1)}</span>
      </div>

      {review.comment && (
        <p className={styles.comment}>"{review.comment}"</p>
      )}

      <div className={styles.footer}>
        <span className={styles.customer}>
          {review.customerName || 'Customer'}
        </span>
        <span className={styles.when}>{when}</span>
      </div>
    </div>
  );
};

// =========================================================
// Top-level section
// =========================================================
const ReviewsOverview: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const list = await supabaseService.getAllTenants();
        // Exclude the platform 'main' row from the per-store list
        setTenants(list.filter((t) => t.slug !== 'main'));
      } catch (err) {
        console.warn('Failed to load tenants:', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [refreshKey]);

  if (isLoading) {
    return <div className={styles.loading}>Loading stores...</div>;
  }

  if (tenants.length === 0) {
    return (
      <div className={styles.wrap}>
        <div className={styles.header}>
          <div>
            <h2>Reviews Overview</h2>
            <p>All customer reviews across your stores.</p>
          </div>
          <button
            type="button"
            className={styles.refreshBtn}
            onClick={() => setRefreshKey((k) => k + 1)}
          >
            Refresh
          </button>
        </div>

        <ReviewSettingsPanel />

        <div className={styles.loading}>No stores yet.</div>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <div>
          <h2>Reviews Overview</h2>
          <p>All customer reviews across your stores.</p>
        </div>
        <button
          type="button"
          className={styles.refreshBtn}
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          Refresh
        </button>
      </div>

      <ReviewSettingsPanel />

      <div className={styles.sections}>
        {tenants.map((t) => (
          <TenantSection
            key={t.id}
            tenant={t}
            refreshTick={refreshKey}
          />
        ))}
      </div>
    </div>
  );
};

export default ReviewsOverview;