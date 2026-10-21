// src/components/ui/FormField/FormField.tsx
import React from 'react';
import styles from './FormField.module.scss';

export interface FormFieldProps {
  label?: string;
  htmlFor?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  /** Optional element aligned to the right of the label (e.g. counter). */
  labelEnd?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({
  label,
  htmlFor,
  required,
  error,
  hint,
  labelEnd,
  className,
  children,
}) => {
  return (
    <div className={[styles.field, className ?? ''].filter(Boolean).join(' ')}>
      {(label || labelEnd) && (
        <div className={styles.labelRow}>
          {label && (
            <label htmlFor={htmlFor} className={styles.label}>
              {label}
              {required && <span className={styles.required}> *</span>}
            </label>
          )}
          {labelEnd && <span className={styles.labelEnd}>{labelEnd}</span>}
        </div>
      )}
      {children}
      {error ? (
        <span className={styles.error}>{error}</span>
      ) : hint ? (
        <small className={styles.hint}>{hint}</small>
      ) : null}
    </div>
  );
};

export default FormField;