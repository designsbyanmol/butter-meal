// src/components/ui/Skeleton/Skeleton.tsx
import React from 'react';
import styles from './Skeleton.module.scss';

export interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  /** Circle variant (avatars). */
  circle?: boolean;
  radius?: 'sm' | 'md' | 'lg' | 'pill';
  className?: string;
}

const toCss = (v?: string | number): string | undefined => {
  if (v === undefined) return undefined;
  return typeof v === 'number' ? `${v}px` : v;
};

const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle,
  radius = 'sm',
  className,
}) => (
  <span
    className={[
      styles.skeleton,
      circle ? styles.circle : styles[radius],
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
    style={{ width: toCss(width), height: toCss(height) }}
    aria-hidden
  />
);

export default Skeleton;