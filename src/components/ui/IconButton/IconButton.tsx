// src/components/ui/IconButton/IconButton.tsx
import React from 'react';
import styles from './IconButton.module.scss';

export type IconButtonVariant =
  | 'default'
  | 'primary'
  | 'danger'
  | 'ghost'
  | 'soft';

export type IconButtonSize = 'xs' | 'sm' | 'md' | 'lg';

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Accessible label - required for icon-only buttons. */
  'aria-label': string;
  /** Optional visible tooltip via `title`. */
  tooltip?: string;
  /** Render as a circle (default) or a rounded square. */
  shape?: 'circle' | 'square';
}

const IconButton: React.FC<IconButtonProps> = ({
  variant = 'default',
  size = 'md',
  shape = 'circle',
  tooltip,
  className,
  children,
  type = 'button',
  ...rest
}) => {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    styles[shape],
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button type={type} className={classes} title={tooltip} {...rest}>
      {children}
    </button>
  );
};

export default IconButton;