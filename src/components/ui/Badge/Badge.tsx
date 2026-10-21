// src/components/ui/Badge/Badge.tsx
import React from 'react';
import styles from './Badge.module.scss';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'primary'
  | 'pill';

export interface BadgeProps {
  tone?: BadgeTone;
  size?: 'sm' | 'md';
  children: React.ReactNode;
  className?: string;
}

const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  size = 'md',
  className,
  children,
}) => (
  <span
    className={[styles.badge, styles[tone], styles[size], className ?? '']
      .filter(Boolean)
      .join(' ')}
  >
    {children}
  </span>
);

export default Badge;