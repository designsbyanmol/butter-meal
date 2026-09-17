// components/Reviews/ReviewSection.tsx
import React, { useEffect, useState } from 'react';
import { MenuItem } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { menuService } from '../../services/menu.service';
import { useCustomerName } from '../../hooks/useCustomerName';
import {
  getEffectiveDeviceId,
  getDeviceFingerprint,
} from '../../utils/deviceId';
import {
  hasReviewedLocally,
  markReviewedLocally,
} from '../../utils/reviewHistory';
import { StarIcon } from '../../assets/svgs';
import styles from './ReviewSection.module.scss';

interface ReviewSectionProps {
  item: MenuItem;
}

const REVIEW_REFRESH_DELAY_MS = 20_000; // 20 seconds
const SUCCESS_MESSAGE_MS = 2_000;       // 2 seconds

const ReviewSection: React.FC<ReviewSectionProps> = ({ item }) => {
  const { tenant } = useTenant();
  const customerName = useCustomerName();

  const [deviceId, setDeviceId] = useState<string>('');
  const [fingerprint, setFingerprint] = useState<string>('');
  const [hasReviewed, setHasReviewed] = useState(false);
  const [checking, setChecking] = useState(true);
  const [draftRating, setDraftRating] = useState(0);
  const [draftComment, setDraftComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Refs to clean up pending timers on unmount
  const successTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const refreshTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    };
  }, []);

  // ---- Detect device + prior review ----
  useEffect(() => {
    const slug = tenant?.slug ?? null;
    const id = getEffectiveDeviceId();
    const fp = getDeviceFingerprint();
    setDeviceId(id);
    setFingerprint(fp);

    if (hasReviewedLocally(slug, item.id)) {
      setHasReviewed(true);
      setChecking(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const reviews = await supabaseService.getItemReviews(item.id);
        if (cancelled) return;

        const mine = reviews.some(
          (r) =>
            r.deviceId === id ||
            (fp && (r as any).deviceFingerprint === fp),
        );
        setHasReviewed(mine);
        if (mine) markReviewedLocally(slug, item.id);
      } catch (err) {
        console.warn('Failed to check prior review:', err);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id, tenant?.slug]);

  if (!tenant) return null;
  if (checking) return null;
  if (hasReviewed) return null;
  if (!customerName || customerName.trim().length === 0) return null;

  const handleStarClick = (n: number) => {
    setDraftRating(n);
    setError('');
  };

  const handleSubmit = async () => {
    if (draftRating < 1 || draftRating > 5) {
      setError('Please select a rating');
      return;
    }
    setIsSubmitting(true);
    setError('');
    setSuccessMsg('');

    try {
      await supabaseService.submitReview(
        tenant.slug,
        item.id,
        deviceId,
        fingerprint,
        customerName || 'Customer',
        draftRating,
        draftComment.trim(),
      );

      // Remember locally so the form stays hidden from now on
      markReviewedLocally(tenant.slug, item.id);

      // Show success message immediately
      setSuccessMsg('Your review submitted successfully!');
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setSuccessMsg('');
        successTimerRef.current = null;
      }, SUCCESS_MESSAGE_MS);

      // Hide the form after a brief moment (so the message is visible)
      setTimeout(() => {
        setHasReviewed(true);
      }, SUCCESS_MESSAGE_MS);

      // Delay the menu refetch by 20s so the customer doesn't see their
      // own rating reflected on the item instantly.
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = setTimeout(() => {
        menuService.refresh().catch(() => {
          /* ignore */
        });
        refreshTimerRef.current = null;
      }, REVIEW_REFRESH_DELAY_MS);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to submit';
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.section}>
      <h4>Rate this item</h4>

      <div className={styles.stars}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`${styles.starBtn} ${
              n <= draftRating ? styles.starActive : ''
            }`}
            onClick={() => handleStarClick(n)}
            disabled={isSubmitting}
            aria-label={`Rate ${n} star${n > 1 ? 's' : ''}`}
          >
            <StarIcon
              width={28}
              height={28}
              fill={n <= draftRating ? '#f5a623' : '#d5cdc5'}
            />
          </button>
        ))}
      </div>

      <textarea
        className={styles.commentInput}
        placeholder="Add a comment (optional)"
        value={draftComment}
        onChange={(e) => setDraftComment(e.target.value)}
        rows={3}
        maxLength={300}
        disabled={isSubmitting}
      />

      {error && <div className={styles.error}>{error}</div>}
      {successMsg && (
        <div className={styles.successBanner}>{successMsg}</div>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.submitBtn}
          onClick={handleSubmit}
          disabled={isSubmitting || draftRating < 1}
        >
          {isSubmitting ? 'Saving…' : 'Submit Review'}
        </button>
      </div>
    </div>
  );
};

export default ReviewSection;