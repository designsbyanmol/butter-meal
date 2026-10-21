// src/components/ui/Select/Select.tsx
import React from 'react';
import styles from './Select.module.scss';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  options: SelectOption[];
  invalid?: boolean;
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  invalid,
  placeholder,
  className,
  ...rest
}) => {
  return (
    <select
      className={[styles.select, invalid ? styles.invalid : '', className ?? '']
        .filter(Boolean)
        .join(' ')}
      {...rest}
    >
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  );
};

export default Select;