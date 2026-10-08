// src/components/ui/Toggle/Toggle.tsx
import React from 'react';
import styles from './Toggle.module.scss';

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  /** Position of the label relative to the switch. */
  labelPosition?: 'left' | 'right';
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  labelPosition = 'right',
  className,
  id,
  ...rest
}) => {
  const inputId = id ?? `tg-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <label
      htmlFor={inputId}
      className={[
        styles.wrap,
        labelPosition === 'left' ? styles.labelLeft : '',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {label && labelPosition === 'left' && (
        <span className={styles.label}>{label}</span>
      )}
      <span className={styles.switch}>
        <input id={inputId} type="checkbox" className={styles.input} {...rest} />
        <span className={styles.slider} aria-hidden />
      </span>
      {label && labelPosition === 'right' && (
        <span className={styles.label}>{label}</span>
      )}
    </label>
  );
};

export default Toggle;