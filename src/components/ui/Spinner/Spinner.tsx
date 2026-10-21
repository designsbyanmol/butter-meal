// src/components/ui/Spinner/Spinner.tsx
import React from 'react';
import styles from './Spinner.module.scss';

export interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  /** Override the border accent color. */
  color?: string;
  className?: string;
}

const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  color,
  className,
}) => (
  <span
    className={[styles.spinner, styles[size], className ?? '']
      .filter(Boolean)
      .join(' ')}
    style={color ? { borderTopColor: color } : undefined}
    aria-label="Loading"
    role="status"
  />
);

export default Spinner;