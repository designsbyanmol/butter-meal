// src/components/ui/Banner/Banner.tsx
import React from 'react';
import { CloseIcon } from '../../../assets/svgs';
import styles from './Banner.module.scss';

export type BannerVariant = 'error' | 'success' | 'warning' | 'info';

export interface BannerProps {
  variant?: BannerVariant;
  children: React.ReactNode;
  /** Optional icon slot before the message. */
  icon?: React.ReactNode;
  /** Show a dismiss button when `onDismiss` is provided. */
  onDismiss?: () => void;
  /** Render inline (flow) instead of the default block styling. */
  inline?: boolean;
  className?: string;
}

const Banner: React.FC<BannerProps> = ({
  variant = 'info',
  children,
  icon,
  onDismiss,
  inline,
  className,
}) => {
  const classes = [
    styles.banner,
    styles[variant],
    inline ? styles.inline : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classes} role={variant === 'error' ? 'alert' : 'status'}>
      {icon && <span className={styles.icon}>{icon}</span>}
      <div className={styles.message}>{children}</div>
      {onDismiss && (
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onDismiss}
          aria-label="Dismiss"
        >
          <CloseIcon width={14} height={14} fill="currentColor" />
        </button>
      )}
    </div>
  );
};

export default Banner;