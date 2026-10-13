// src/components/MainDashboard/ReviewsAdminModal.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Modal, EmptyState, Button, Chip, Banner, Badge } from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import { useAuth } from '../../hooks/useAuth';
import { supabaseService } from '../../services/supabase.service';
import { Review, ReviewFilter } from '../../types';
import { StarIcon } from '../../assets/svgs';
import local from './ReviewsAdminModal.module.scss';

interface FocusDispute {
  disputeId: string;
  reviewId: string;
  outcome: 'deleted' | 'rejected';
  reviewItemName: string | null;
}

interface ReviewsAdminModalProps {
  onClose: () => void;
  focusDispute?: FocusDispute | null;
}

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'lte4', label: '< 4 stars' },
  { key: 'lte3', label: '< 3 stars' },
  { key: 'lte2', label: '< 2 stars' },
  { key: 'commented', label: 'With comments' },
];

const PAGE_SIZE = 16;

type DisputeOutcome = 'pending' | 'rejected' | 'removed';

interface DisputeMeta {
  status: DisputeOutcome;
  disputeId: string;
}

interface CardItem {
  kind: 'live' | 'removed';
  id: string;
  disputeId?: string;
  itemName: string;
  itemCategory?: string;
  rating: number;
  comment?: string;
  customerName?: string;
  createdAt?: string;
  resolvedAt?: string;
  outcome?: DisputeOutcome;
}

const ReviewsAdminModal: React.FC<ReviewsAdminModalProps> = ({
  onClose,
  focusDispute = null,
}) => {
  const { tenant } = useTenant();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [removedStubs, setRemovedStubs] = useState<CardItem[]>([]);
  const [disputeMeta, setDisputeMeta] = useState<
    Record<string, DisputeMeta>
  >({});
  const [filter, setFilter] = useState<ReviewFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [disputingId, setDisputingId] = useState<string | null>(null);

  const scrolledForRef = useRef<string | null>(null);

  // Stable key that changes whenever the live review set changes.
  // Used to re-run the resolved-stubs loader even when the list is empty.
  const reviewIdsKey = useMemo(
    () => reviews.map((r) => r.id).join(','),
    [reviews],
  );

  // ---------------------------------------------------------
  // Load reviews + their dispute metadata
  // ---------------------------------------------------------
  const loadFirstPage = async (f: ReviewFilter) => {
    if (!tenant) return;
    setIsLoading(true);
    setError('');
    try {
      const [list, pending, resolved] = await Promise.all([
        supabaseService.getTenantReviewsPaged(tenant.slug, f, PAGE_SIZE, 0),
        supabaseService.getPendingDisputesByReview(tenant.slug),
        supabaseService.getResolvedDisputesForTenant(tenant.slug),
      ]);

      setReviews(list);

      // Build the meta map: reviewId → { status, disputeId }
      const meta: Record<string, DisputeMeta> = {};

      Object.entries(pending).forEach(([reviewId, disputeId]) => {
        meta[reviewId] = { status: 'pending', disputeId };
      });

      const stubs: CardItem[] = [];
      const currentReviewIds = new Set(list.map((r) => r.id));

      resolved.forEach((d) => {
        if (d.outcome === 'rejected') {
          // Live review, muted with a badge.
          if (!meta[d.reviewId]) {
            meta[d.reviewId] = {
              status: 'rejected',
              disputeId: d.disputeId,
            };
          }
        } else {
          // Review was removed. Add a stub if it's not on the current page.
          if (!currentReviewIds.has(d.reviewId)) {
            stubs.push({
              kind: 'removed',
              id: d.disputeId,
              disputeId: d.disputeId,
              itemName: d.review?.itemName ?? 'Review',
              rating: d.review?.rating ?? 0,
              resolvedAt: d.resolvedAt,
              outcome: 'removed',
            });
          }
        }
      });

      setDisputeMeta(meta);
      setRemovedStubs(stubs);
      setHasMore(list.length === PAGE_SIZE);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFirstPage(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, filter]);

  // ---------------------------------------------------------
  // Refresh the resolved-stubs list whenever the live set changes.
  // (Depends on the id key so it re-runs even if reviews.length stays 0.)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!tenant) return;
    let cancelled = false;

    (async () => {
      try {
        const list = await supabaseService.getResolvedDisputesForTenant(
          tenant.slug,
        );
        if (cancelled) return;
        const currentReviewIds = new Set(reviews.map((r) => r.id));
        const stubs: CardItem[] = list
          .filter(
            (d) =>
              d.outcome === 'deleted' && !currentReviewIds.has(d.reviewId),
          )
          .map((d) => ({
            kind: 'removed',
            id: d.disputeId,
            disputeId: d.disputeId,
            itemName: d.review?.itemName ?? 'Review',
            rating: d.review?.rating ?? 0,
            resolvedAt: d.resolvedAt,
            outcome: 'removed',
          }));
        setRemovedStubs(stubs);
      } catch (err) {
        console.warn('[tenant reviews] resolved stubs failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, reviewIdsKey]);

  // ---------------------------------------------------------
  // Scroll to focused dispute when opened from the bell
  // ---------------------------------------------------------
  useEffect(() => {
    if (!focusDispute) return;
    if (scrolledForRef.current === focusDispute.disputeId) return;

    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-dispute-id="${focusDispute.disputeId}"]`,
      );
      if (!el) return;

      scrolledForRef.current = focusDispute.disputeId;

      try {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch {
        el.scrollIntoView();
      }

      el.classList.add(local.disputeFocused);
      window.setTimeout(() => {
        el.classList.remove(local.disputeFocused);
      }, 2200);
    }, 350);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusDispute?.disputeId, reviews.length, removedStubs.length]);

  const handleShowMore = async () => {
    if (!tenant || !hasMore || isLoadingMore) return;
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

  const handleRaiseDispute = async (review: Review) => {
    if (!tenant || disputeMeta[review.id]?.status === 'pending') return;

    const reason =
      window.prompt(
        `Raise a dispute for this ${review.rating}-star review of "${review.itemName}"?\n\nAdd a short reason (optional):`,
        '',
      ) ?? '';

    setDisputingId(review.id);
    setError('');
    setSuccess('');
    try {
      const res = await supabaseService.raiseReviewDispute({
        reviewId: review.id,
        tenantSlug: tenant.slug,
        raisedBy: user?.name ?? user?.phone ?? '',
        reason,
      });
      if (!res) throw new Error('Failed to raise dispute');

      setDisputeMeta((prev) => ({
        ...prev,
        [review.id]: { status: 'pending', disputeId: res.id },
      }));
      setSuccess('Dispute raised — our team will review it.');
      window.setTimeout(() => setSuccess(''), 2500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to raise dispute',
      );
    } finally {
      setDisputingId(null);
    }
  };

  // ---------------------------------------------------------
  // Merge live reviews and removed stubs into one list.
  // Live reviews keep server order; stubs are appended, newest first.
  // ---------------------------------------------------------
  const cards: CardItem[] = useMemo(() => {
    const live: CardItem[] = reviews.map((r) => ({
      kind: 'live',
      id: r.id,
      disputeId: disputeMeta[r.id]?.disputeId,
      itemName: r.itemName,
      itemCategory: r.itemCategory,
      rating: r.rating,
      comment: r.comment,
      customerName: r.customerName,
      createdAt: r.createdAt,
      outcome: disputeMeta[r.id]?.status,
    }));

    const stubs = [...removedStubs];
    stubs.sort((a, b) => {
      const aT = a.resolvedAt ? new Date(a.resolvedAt).getTime() : 0;
      const bT = b.resolvedAt ? new Date(b.resolvedAt).getTime() : 0;
      return bT - aT;
    });

    return [...live, ...stubs];
  }, [reviews, disputeMeta, removedStubs]);

  const filterLabel =
    FILTERS.find((f) => f.key === filter)?.label ?? 'All';

  return (
    <Modal isOpen={true} onClose={onClose} title="Reviews" size="xl">
      <div className={local.filterRow}>
        <span className={local.filterLabel}>Filter:</span>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            tone="neutral"
            active={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </Chip>
        ))}
      </div>

      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}
      {success && <Banner variant="success">{success}</Banner>}

      {isLoading ? (
        <EmptyState title="Loading reviews..." />
      ) : cards.length === 0 ? (
        <EmptyState title={`No reviews match "${filterLabel}"`} />
      ) : (
        <>
          <div className={local.grid}>
            {cards.map((c) => {
              const rounded = Math.round(c.rating);
              const isRemoved = c.kind === 'removed';
              const isRejected = c.outcome === 'rejected';
              const isPending = c.outcome === 'pending';

              return (
                <div
                  key={c.id}
                  data-dispute-id={c.disputeId}
                  className={[
                    local.card,
                    isRemoved ? local.stubCard : '',
                    isRejected ? local.cardMuted : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <div className={local.cardHeader}>
                    <div className={local.itemName}>{c.itemName}</div>

                    {isRemoved ? (
                      <Badge tone="danger" size="sm">
                        Removed
                      </Badge>
                    ) : isRejected ? (
                      <Badge tone="warning" size="sm">
                        Dispute rejected
                      </Badge>
                    ) : isPending ? (
                      <Badge tone="warning" size="sm">
                        Disputed
                      </Badge>
                    ) : (
                      <Button
                        size="xs"
                        variant="ghost"
                        onClick={() => {
                          const review = reviews.find(
                            (r) => r.id === c.id,
                          );
                          if (review) handleRaiseDispute(review);
                        }}
                        loading={disputingId === c.id}
                        title="Raise a dispute for this review"
                      >
                        Raise dispute
                      </Button>
                    )}
                  </div>

                  {c.itemCategory && (
                    <div className={local.category}>{c.itemCategory}</div>
                  )}

                  <div className={local.stars}>
                    {Array.from({ length: rounded }).map((_, i) => (
                      <StarIcon
                        key={i}
                        width={14}
                        height={14}
                        fill="#f5a623"
                      />
                    ))}
                    {Array.from({ length: 5 - rounded }).map((_, i) => (
                      <StarIcon
                        key={i}
                        width={14}
                        height={14}
                        fill="#dcdcdc"
                      />
                    ))}
                    <span className={local.ratingNum}>
                      {c.rating.toFixed(1)}
                    </span>
                  </div>

                  {c.comment && (
                    <p className={local.comment}>"{c.comment}"</p>
                  )}

                  {isRemoved && (
                    <p className={local.stubMessage}>
                      This review was removed by the platform admin.
                    </p>
                  )}

                  <div className={local.footer}>
                    <span>
                      {c.kind === 'live'
                        ? c.customerName || 'Customer'
                        : 'Platform'}
                    </span>
                    <span>
                      {c.kind === 'live' && c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString()
                        : c.resolvedAt
                        ? new Date(c.resolvedAt).toLocaleDateString()
                        : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {hasMore && (
            <Button
              variant="secondary"
              onClick={handleShowMore}
              loading={isLoadingMore}
              style={{
                marginTop: 16,
                display: 'flex',
                marginInline: 'auto',
              }}
            >
              Show more
            </Button>
          )}
        </>
      )}
    </Modal>
  );
};

export default ReviewsAdminModal;