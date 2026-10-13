// src/components/ui/Avatar/Avatar.tsx
import React from 'react';
import styles from './Avatar.module.scss';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  /** Optional click handler makes it a button. */
  onClick?: () => void;
  /**
   * Optional background color override. Applied as an inline style so
   * it beats the CSS-module default (`$primary-dark`). Used to
   * color-code avatars per tenant.
   */
  bgColor?: string;
  className?: string;
}

const getInitial = (name?: string): string =>
  name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : '?';

const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  size = 'md',
  onClick,
  bgColor,
  className,
}) => {
  const classes = [styles.avatar, styles[size], className ?? '']
    .filter(Boolean)
    .join(' ');

  // Inline style overrides the CSS module's background when provided.
  const style = bgColor ? { background: bgColor } : undefined;

  const inner = src ? (
    <img src={src} alt={name ?? 'Avatar'} className={styles.img} />
  ) : (
    <span className={styles.initial}>{getInitial(name)}</span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={classes}
        style={style}
        onClick={onClick}
        aria-label={name}
      >
        {inner}
      </button>
    );
  }

  return (
    <span className={classes} style={style}>
      {inner}
    </span>
  );
};

export default Avatar;