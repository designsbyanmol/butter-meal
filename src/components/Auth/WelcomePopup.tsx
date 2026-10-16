// components/Auth/WelcomePopup.tsx
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckIcon } from '../../assets/svgs';
import local from './Auth.module.scss';

interface WelcomePopupProps {
  isOpen: boolean;
  userName: string;
  storeName?: string;
  /** Auto-dismiss duration in ms. Default 5000. */
  durationMs?: number;
  onDismiss: () => void;
}

const WelcomePopup: React.FC<WelcomePopupProps> = ({
  isOpen,
  userName,
  storeName,
  durationMs = 5000,
  onDismiss,
}) => {
  // Drive the progress ring animation by tracking elapsed time.
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isOpen) {
      setElapsed(0);
      return;
    }

    const startedAt = Date.now();
    const tick = window.setInterval(() => {
      const now = Date.now();
      const next = now - startedAt;
      setElapsed(next);
      if (next >= durationMs) {
        window.clearInterval(tick);
        onDismiss();
      }
    }, 50);

    return () => window.clearInterval(tick);
  }, [isOpen, durationMs, onDismiss]);

  if (!isOpen) return null;

  const progress = Math.min(1, elapsed / durationMs);
  // Circumference of the ring: 2 * π * r, r = 34.
  const ringCircumference = 2 * Math.PI * 34;
  const ringOffset = ringCircumference * (1 - progress);

  const content = (
    <div className={local.welcomeOverlay} role="status" aria-live="polite">
      <div className={local.welcomeCard}>
        <div className={local.welcomeRingWrap}>
          <svg
            className={local.welcomeRingSvg}
            width="80"
            height="80"
            viewBox="0 0 80 80"
            aria-hidden
          >
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="rgba(60, 170, 70, 0.15)"
              strokeWidth="3"
            />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="#3caa46"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringOffset}
              transform="rotate(-90 40 40)"
            />
          </svg>
          <div className={local.welcomeCheck}>
            <CheckIcon width={26} height={26} fill="#1e7e34" />
          </div>
        </div>

        <h2 className={local.welcomeTitle}>
          Welcome back, {userName}!
        </h2>

        {storeName && (
          <p className={local.welcomeSubtitle}>
            You&apos;re signed in to <strong>{storeName}</strong>
          </p>
        )}

        <p className={local.welcomeHint}>Redirecting you in a moment...</p>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(content, document.body)
    : content;
};

export default WelcomePopup;