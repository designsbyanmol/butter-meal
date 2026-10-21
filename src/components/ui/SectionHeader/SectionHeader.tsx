// src/components/ui/SectionHeader/SectionHeader.tsx
import React from 'react';
import styles from './SectionHeader.module.scss';

export interface SectionHeaderProps {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({
  title,
  subtitle,
  actions,
  className,
}) => (
  <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')}>
    <div className={styles.text}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </div>
    {actions && <div className={styles.actions}>{actions}</div>}
  </div>
);

export default SectionHeader;