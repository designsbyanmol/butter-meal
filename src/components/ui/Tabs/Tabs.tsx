// src/components/ui/Tabs/Tabs.tsx
import React from 'react';
import styles from './Tabs.module.scss';

export interface TabItem<T extends string = string> {
  key: T;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps<T extends string = string> {
  items: TabItem<T>[];
  value: T;
  onChange: (key: T) => void;
  /** Full-width equal segments. */
  block?: boolean;
  className?: string;
}

const Tabs = <T extends string>({
  items,
  value,
  onChange,
  block,
  className,
}: TabsProps<T>) => (
  <div
    className={[styles.wrap, block ? styles.block : '', className ?? '']
      .filter(Boolean)
      .join(' ')}
  >
    {items.map((item) => (
      <button
        key={item.key}
        type="button"
        disabled={item.disabled}
        className={`${styles.tab} ${
          value === item.key ? styles.active : ''
        }`}
        onClick={() => !item.disabled && onChange(item.key)}
      >
        {item.label}
      </button>
    ))}
  </div>
);

export default Tabs;