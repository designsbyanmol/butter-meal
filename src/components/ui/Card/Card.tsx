// src/components/ui/Card/Card.tsx
import React from 'react';
import styles from './Card.module.scss';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Adds a subtle lift on hover. */
  interactive?: boolean;
  /** Adds a soft colored background (used for highlighted/featured cards). */
  featured?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const Card: React.FC<CardProps> = ({
  interactive,
  featured,
  padding = 'md',
  className,
  children,
  ...rest
}) => (
  <div
    className={[
      styles.card,
      styles[padding],
      interactive ? styles.interactive : '',
      featured ? styles.featured : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ')}
    {...rest}
  >
    {children}
  </div>
);

export default Card;