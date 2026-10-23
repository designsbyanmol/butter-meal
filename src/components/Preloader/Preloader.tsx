// src/components/Preloader/Preloader.tsx
import React, { useEffect, useState } from 'react';
import local from './Preloader.module.scss';

const LOGO_URL =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/full-logo-white.svg';

const MIN_DISPLAY_MS = 1600;
const EXIT_MS = 350;

export interface PreloaderProps {
  /** Page title shown below the logo. */
  title?: string;
  /** Optional minimum display duration in ms. Default: 800. */
  minDurationMs?: number;
  /** Called once the preloader is ready to unmount. */
  onReady?: () => void;
}

const Preloader: React.FC<PreloaderProps> = ({
  title,
  minDurationMs = MIN_DISPLAY_MS,
  onReady,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsExiting(true);
      window.setTimeout(() => onReady?.(), EXIT_MS);
    }, minDurationMs);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minDurationMs]);

  return (
    <div className={`${local.overlay} ${isExiting ? local.exit : ''}`}>
      <div className={local.brand}>
        {title && <h2 className={local.title}>{title}</h2>}
        <img
          src={LOGO_URL}
          alt="Dozzelo"
          className={local.logo}
          draggable={false}
        />
      </div>

      <div className={local.barWrap}>
        <div className={local.barFill} />
      </div>
    </div>
  );
};

export default Preloader;