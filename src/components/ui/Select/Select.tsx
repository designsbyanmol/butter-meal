// src/components/ui/Select/Select.tsx
import React, { useEffect, useRef, useState } from 'react';
import styles from './Select.module.scss';
import { DownArrowIcon } from '../../../assets/svgs';

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
  onFocus,
  onBlur,
  onChange,
  disabled,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const cancelClose = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) {
        cancelClose();
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
    };
  }, [open]);

  const handleFocus = (e: React.FocusEvent<HTMLSelectElement>) => {
    cancelClose();
    setOpen(true);
    onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLSelectElement>) => {
    cancelClose();
    setOpen(false);
    onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange?.(e);
    cancelClose();
    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;
      setOpen(false);
    }, 120);
  };

  const wrapClasses = [
    styles.wrap,
    invalid ? styles.invalid : '',
    disabled ? styles.disabled : '',
    open ? styles.open : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={wrapClasses} ref={wrapRef}>
      <select
        className={styles.select}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onChange={handleChange}
        disabled={disabled}
        {...rest}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value} disabled={o.disabled}>
            {o.label}
          </option>
        ))}
      </select>

      <span className={styles.chevron} aria-hidden>
        <DownArrowIcon width={16} height={16} fill="currentColor" />
      </span>
    </div>
  );
};

export default Select;