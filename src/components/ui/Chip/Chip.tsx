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

export type ChipShape =
  | 'pill'      // fully rounded - default
  | 'rounded'   // 8px corners
  | 'soft'      // 6px corners (subtle rounding)
  | 'square';   // 0px corners

export interface ChipProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  tone?: ChipTone;
  active?: boolean;
  /** Border-radius preset. Default `pill`. */
  shape?: ChipShape;
  /** Render as a plain span instead of a button (non-clickable). */
  as?: 'button' | 'span';
}

const Chip: React.FC<ChipProps> = ({
  tone = 'neutral',
  active,
  shape = 'pill',
  as = 'button',
  className,
  children,
  ...rest
}) => {
  const classes = [
    styles.chip,
    styles[tone],
    styles[`shape_${shape}`],
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