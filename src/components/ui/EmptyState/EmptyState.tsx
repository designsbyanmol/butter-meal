// src/components/ui/EmptyState/EmptyState.tsx
import React from 'react';
import styles from './EmptyState.module.scss';

export interface EmptyStateProps {
  icon?: React.ReactNode;
  title?: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  className,
}) => (
  <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')}>
    {icon && <div className={styles.icon}>{icon}</div>}
    {title && <p className={styles.title}>{title}</p>}
    {description && <span className={styles.desc}>{description}</span>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);

export default EmptyState;