// src/components/ui/Button/Button.tsx
import React from 'react';
import styles from './Button.module.scss';

export type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'ghost'
  | 'danger'
  | 'success'
  | 'warning'
  | 'info'
  | 'link';

export type ButtonSize = 'xs' | 's' | 'sm' | 'md' | 'lg';

/** Rounded rectangle (default) or fully-pill (border-radius: 999px). */
export type ButtonShape = 'rounded' | 'pill';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** `rounded` (default) or `pill`. */
  shape?: ButtonShape;
  /** Show a spinner and disable interaction. */
  loading?: boolean;
  /** Full-width block button. */
  block?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  shape = 'rounded',
  loading = false,
  block = false,
  leftIcon,
  rightIcon,
  className,
  children,
  disabled,
  type = 'button',
  ...rest
}) => {
  const classes = [
    styles.btn,
    styles[variant],
    styles[size],
    styles[shape],
    block ? styles.block : '',
    loading ? styles.loading : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={type}
      className={classes}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <span className={styles.spinner} aria-hidden />}
      {!loading && leftIcon && (
        <span className={styles.icon}>{leftIcon}</span>
      )}
      {children && <span className={styles.label}>{children}</span>}
      {!loading && rightIcon && (
        <span className={styles.icon}>{rightIcon}</span>
      )}
    </button>
  );
};

export default Button;