// src/components/Preloader/Preloader.tsx
import React, { useEffect, useState } from 'react';

const LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/full-logo-white.svg';

interface PreloaderProps {
  /** Called once the minimum display time has elapsed. The parent
   *  decides whether to unmount (app ready) or keep showing (app
   *  still loading). */
  onReady: () => void;
  /** Minimum visible time in ms. Default 2000. */
  minDurationMs?: number;
}

/**
 * Full-screen preloader.
 *
 * Shows for at least `minDurationMs`, then invokes `onReady()`.
 * The parent is responsible for unmounting once the app is also
 * ready — this component only guarantees a minimum display time.
 *
 * Markup is intentionally inline-styled so it works before the
 * rest of the app's CSS has loaded (which matters for the customer
 * page that boots over a slow network).
 */
const Preloader: React.FC<PreloaderProps> = ({
  onReady,
  minDurationMs = 2000,
}) => {
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 640px)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)');
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(onReady, minDurationMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDurationMs]);

  return (
    <div
      className="dozzelo-preloader"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0F172A',
        color: '#fff',
        gap: 0,
        pointerEvents: 'none',
      }}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <img
        src={LOGO_URL}
        alt="Dozzelo"
        draggable={false}
        style={{
          display: 'block',
          width: isMobile ? 160 : 260,
          maxWidth: isMobile ? 160 : 260,
          height: 'auto',
          animation: 'dozzeloPreloaderPulse 1.4s ease-in-out infinite',
          userSelect: 'none',
          // Match the tagline spacing exactly.
          marginBottom: 0,
        }}
      />

      <div
        style={{
          fontSize: isMobile ? 10 : 14,
          fontWeight: 200,
          letterSpacing: 1,
          color: 'rgba(255, 255, 255, 0.64)',
          textAlign: 'center',
          padding: '0 24px',
          lineHeight: 1.5,
          position: 'absolute',
          bottom: 20,
        }}
      >
        Easy way to take your store online
      </div>

      {/* Keyframe definition — inline so the pulse animation works
          even before the main CSS bundle is parsed. */}
      <style>{`
        @keyframes dozzeloPreloaderPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%      { opacity: 0.65; transform: scale(1.04); }
        }
      `}</style>
    </div>
  );
};

export default Preloader;