// components/MainDashboard/ReviewsAdminModalBody.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { EmptyState, Button, Chip, Banner, Badge } from "../ui";
import { useTenant } from "../../contexts/TenantContext";
import { useAuth } from "../../hooks/useAuth";
import { supabaseService } from "../../services/supabase.service";
import { Review, ReviewFilter } from "../../types";
import { StarIcon } from "../../assets/svgs";
import { InlineSection } from "../Dashboard/inline";
import ReviewsFilterMenu, {
  ReviewSortKey,
} from './ReviewsFilterMenu';
import local from "./ReviewsAdminModal.module.scss";

interface FocusDispute {
  disputeId: string;
  reviewId: string;
  outcome: "deleted" | "rejected";
  reviewItemName: string | null;
}

interface ReviewsAdminModalBodyProps {
  focusDispute?: FocusDispute | null;
  onClose?: () => void;
  embedded?: boolean;
  onHeaderActionsChange?: (actions: React.ReactNode) => void;
}

const FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "lte4", label: "< 4 stars" },
  { key: "lte3", label: "< 3 stars" },
  { key: "lte2", label: "< 2 stars" },
  { key: "commented", label: "With comments" },
];

const PAGE_SIZE = 16;

type DisputeOutcome = "pending" | "rejected" | "removed";

interface DisputeMeta {
  status: DisputeOutcome;
  disputeId: string;
}

interface CardItem {
  kind: "live" | "removed";
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

const ReviewsAdminModalBody: React.FC<ReviewsAdminModalBodyProps> = ({
  focusDispute = null,
  onClose: _onClose,
  embedded = false,
  onHeaderActionsChange,
}) => {
  const { tenant } = useTenant();
  const { user } = useAuth();

  const [reviews, setReviews] = useState<Review[]>([]);
  const [removedStubs, setRemovedStubs] = useState<CardItem[]>([]);
  const [disputeMeta, setDisputeMeta] = useState<Record<string, DisputeMeta>>(
    {},
  );
  const [filter, setFilter] = useState<ReviewFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [disputingId, setDisputingId] = useState<string | null>(null);

  const scrolledForRef = useRef<string | null>(null);

  const loadFirstPage = async (f: ReviewFilter) => {
  if (!tenant) return;
  setIsLoading(true);
  setError('');
  try {
    const bundle = await supabaseService.getReviewsAdminBundle(
      tenant.slug,
      f,
      PAGE_SIZE,
      0,
    );

    setReviews(bundle.reviews);

    const meta: Record<string, DisputeMeta> = {};
    Object.entries(bundle.pending).forEach(([reviewId, disputeId]) => {
      meta[reviewId] = { status: 'pending', disputeId };
    });

    const stubs: CardItem[] = [];
    const currentReviewIds = new Set(bundle.reviews.map((r) => r.id));
    bundle.resolved.forEach((d) => {
      if (d.outcome === 'rejected') {
        if (!meta[d.reviewId]) {
          meta[d.reviewId] = { status: 'rejected', disputeId: d.disputeId };
        }
      } else if (!currentReviewIds.has(d.reviewId)) {
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
    });

    setDisputeMeta(meta);
    setRemovedStubs(stubs);
    setHasMore(bundle.reviews.length === PAGE_SIZE);
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
        el.scrollIntoView({ behavior: "smooth", block: "center" });
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
      console.warn("Show more failed:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const handleRaiseDispute = async (review: Review) => {
    if (!tenant || disputeMeta[review.id]?.status === "pending") return;

    const reason =
      window.prompt(
        `Raise a dispute for this ${review.rating}-star review of "${review.itemName}"?\n\nAdd a short reason (optional):`,
        "",
      ) ?? "";

    setDisputingId(review.id);
    setError("");
    setSuccess("");
    try {
      const res = await supabaseService.raiseReviewDispute({
        reviewId: review.id,
        tenantSlug: tenant.slug,
        raisedBy: user?.name ?? user?.phone ?? "",
        reason,
      });
      if (!res) throw new Error("Failed to raise dispute");

      setDisputeMeta((prev) => ({
        ...prev,
        [review.id]: { status: "pending", disputeId: res.id },
      }));
      setSuccess("Dispute raised - our team will review it.");
      window.setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to raise dispute");
    } finally {
      setDisputingId(null);
    }
  };
  const [sort, setSort] = useState<ReviewSortKey>('recent');

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

  const combined = [...live, ...stubs];

  combined.sort((a, b) => {
    const aT = a.createdAt
      ? new Date(a.createdAt).getTime()
      : a.resolvedAt
        ? new Date(a.resolvedAt).getTime()
        : 0;
    const bT = b.createdAt
      ? new Date(b.createdAt).getTime()
      : b.resolvedAt
        ? new Date(b.resolvedAt).getTime()
        : 0;

    switch (sort) {
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

  return combined;
}, [reviews, disputeMeta, removedStubs, sort]);

  const filterLabel = FILTERS.find((f) => f.key === filter)?.label ?? "All";


const activeFilterCount = useMemo(() => {
  let n = 0;
  if (filter !== 'all') n += 1;
  if (sort !== 'recent') n += 1;
  return n;
}, [filter, sort]);

const headerActions = (
    <ReviewsFilterMenu
      filter={filter}
      onFilterChange={setFilter}
      sort={sort}
      onSortChange={setSort}
      activeCount={activeFilterCount}
      onReset={() => {
        setFilter('all');
        setSort('recent');
      }}
    />
  );

  useEffect(() => {
    if (onHeaderActionsChange) onHeaderActionsChange(headerActions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, sort, activeFilterCount, onHeaderActionsChange]);

  return (
    <InlineSection
  title="Review Management"
  actions={headerActions}
      embedded={embedded}
>
      {error && (
        <Banner variant="error" onDismiss={() => setError("")}>
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
              const isRemoved = c.kind === "removed";
              const isRejected = c.outcome === "rejected";
              const isPending = c.outcome === "pending";

              return (
                <div
                  key={c.id}
                  data-dispute-id={c.disputeId}
                  className={[
                    local.card,
                    isRemoved ? local.stubCard : "",
                    isRejected ? local.cardMuted : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
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
                          const review = reviews.find((r) => r.id === c.id);
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
                      <StarIcon key={i} width={14} height={14} fill="#f5a623" />
                    ))}
                    {Array.from({ length: 5 - rounded }).map((_, i) => (
                      <StarIcon key={i} width={14} height={14} fill="#dcdcdc" />
                    ))}
                    <span className={local.ratingNum}>
                      {c.rating.toFixed(1)}
                    </span>
                  </div>

                  {c.comment && <p className={local.comment}>"{c.comment}"</p>}

                  {isRemoved && (
                    <p className={local.stubMessage}>
                      This review was removed by the platform admin.
                    </p>
                  )}

                  <div className={local.footer}>
                    <span>
                      {c.kind === "live"
                        ? c.customerName || "Customer"
                        : "Platform"}
                    </span>
                    <span>
                      {c.kind === "live" && c.createdAt
                        ? new Date(c.createdAt).toLocaleDateString()
                        : c.resolvedAt
                          ? new Date(c.resolvedAt).toLocaleDateString()
                          : ""}
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
                display: "flex",
                marginInline: "auto",
              }}
            >
              Show more
            </Button>
          )}
        </>
      )}
    </InlineSection>
  );
};

export default ReviewsAdminModalBody;
