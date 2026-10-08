// src/components/ui/Chip/Chip.tsx
import React from 'react';
import styles from './Chip.module.scss';

export type ChipTone =
  | 'neutral'
  | 'primary'
  | 'popular'
  | 'new'
  | 'chef'
  | 'limited'
  | 'veg'
  | 'nonVeg'
  | 'warning'
  | 'danger'
  | 'info';

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  tone?: ChipTone;
  active?: boolean;
  /** Render as a plain span instead of a button (non-clickable). */
  as?: 'button' | 'span';
}

const Chip: React.FC<ChipProps> = ({
  tone = 'neutral',
  active,
  as = 'button',
  className,
  children,
  ...rest
}) => {
  const classes = [
    styles.chip,
    styles[tone],
    active ? styles.active : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (as === 'span') {
    return <span className={classes}>{children}</span>;
  }

  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
};

export default Chip;