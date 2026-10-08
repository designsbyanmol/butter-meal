// src/components/ui/ProgressBar/ProgressBar.tsx
import React from 'react';
import styles from './ProgressBar.module.scss';

export interface ProgressBarProps {
  /** 0–100 */
  value: number;
  size?: 'sm' | 'md' | 'lg';
  /** Optional text right below the bar. */
  label?: React.ReactNode;
  /** Full-width block (default: 100%). */
  block?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  size = 'md',
  label,
  block = true,
  className,
}) => {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      className={[styles.wrap, block ? styles.block : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={`${styles.track} ${styles[size]}`}>
        <div
          className={styles.fill}
          style={{ width: `${clamped}%` }}
          role="progressbar"
          aria-valuenow={clamped}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      {label && <div className={styles.label}>{label}</div>}
    </div>
  );
};

export default ProgressBar;