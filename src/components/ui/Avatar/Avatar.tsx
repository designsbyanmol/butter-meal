// src/components/ui/Avatar/Avatar.tsx
import React from 'react';
import styles from './Avatar.module.scss';

export type AvatarSize = 'sm' | 'md' | 'lg';
export type AvatarRole = 'admin' | 'staff';

export interface AvatarProps {
  name?: string;
  src?: string;
  size?: AvatarSize;
  /**
   * Role-based default image. When neither `src` nor `role` resolve to
   * an image, the avatar falls back to the name initial.
   *
   * `admin` → avatar.png
   * `staff` → staff.png
   */
  role?: AvatarRole;
  /** Optional click handler makes it a button. */
  onClick?: () => void;
  /**
   * Optional background color override. Applied as an inline style so
   * it beats the CSS-module default (`$primary-dark`). Only used when
   * the avatar renders the name initial — an image is never tinted.
   */
  bgColor?: string;
  className?: string;
}

/**
 * Role-based default images. Served from jsDelivr, same base as the
 * project logo. Kept as module constants so every consumer shares the
 * exact same URLs.
 */
export const ROLE_AVATAR_URL: Record<AvatarRole, string> = {
  admin:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/avatar/avatar.png',
  staff:
    'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/avatar/staff.png',
};

const getInitial = (name?: string): string =>
  name && name.trim().length > 0 ? name.trim().charAt(0).toUpperCase() : '?';

const Avatar: React.FC<AvatarProps> = ({
  name,
  src,
  role,
  size = 'md',
  onClick,
  bgColor,
  className,
}) => {
  const classes = [styles.avatar, styles[size], className ?? '']
    .filter(Boolean)
    .join(' ');

  // Resolution order:
  //   1. explicit `src` (a stored upload)
  //   2. role default (admin.png / staff.png)
  //   3. name initial
  const resolvedSrc = src || (role ? ROLE_AVATAR_URL[role] : undefined);

  // Tint only applies when we render the initial. Images sit on a plain
  // circle so their own background reads through.
  const style =
    bgColor && !resolvedSrc ? { background: bgColor } : undefined;

  const inner = resolvedSrc ? (
    <img
      src={resolvedSrc}
      alt={name ?? 'Avatar'}
      className={styles.img}
      draggable={false}
      onError={(e) => {
        // If the stored upload 404s, fall back to the role image so
        // the avatar never renders broken.
        const fallback = role ? ROLE_AVATAR_URL[role] : undefined;
        if (fallback && e.currentTarget.src !== fallback) {
          e.currentTarget.src = fallback;
        }
      }}
    />
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