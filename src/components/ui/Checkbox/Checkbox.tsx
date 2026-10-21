// src/components/ui/Checkbox/Checkbox.tsx
import React from 'react';
import styles from './Checkbox.module.scss';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
}

const Checkbox: React.FC<CheckboxProps> = ({
  label,
  className,
  id,
  ...rest
}) => {
  const inputId = id ?? `cb-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <label htmlFor={inputId} className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')}>
      <input id={inputId} type="checkbox" className={styles.input} {...rest} />
      <span className={styles.box} aria-hidden />
      {label && <span className={styles.label}>{label}</span>}
    </label>
  );
};

export default Checkbox;