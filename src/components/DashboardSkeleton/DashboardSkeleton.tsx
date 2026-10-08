// components/DashboardSkeleton/DashboardSkeleton.tsx
import React from 'react';
import { Skeleton } from '../ui';
import local from './DashboardSkeleton.module.scss';

interface DashboardSkeletonProps {
  /** Number of menu cards to render in the grid. */
  count?: number;
}

const SkeletonCard: React.FC = () => (
  <div className={local.card}>
    <Skeleton height="100%" radius="sm" className={local.cardImage} />
    <div className={local.cardBody}>
      <Skeleton width="80%" height={12} />
      <Skeleton width="50%" height={10} />
    </div>
    <div className={local.cardFooter}>
      <Skeleton width={60} height={16} />
      <Skeleton width={72} height={32} radius="md" />
    </div>
  </div>
);

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  count = 6,
}) => {
  return (
    <div className={local.wrap} aria-busy="true" aria-live="polite">
      {/* ---------- Header ---------- */}
      <header className={local.header}>
        <div className={local.headerInner}>
          <Skeleton width={100} height={20} />
          <div className={local.headerActions}>
            <Skeleton circle width={24} height={24} />
            <Skeleton circle width={24} height={24} />
            <Skeleton circle width={24} height={24} />
            <Skeleton width={60} height={24} />
          </div>
        </div>
      </header>

      <main className={local.main}>
        {/* ---------- Brand ---------- */}
        <div className={local.brand}>
          <Skeleton width={220} height={26} />
          <Skeleton width={160} height={14} />
        </div>

        {/* ---------- Filter bar ---------- */}
        <div className={local.filterBar}>
          <Skeleton height={44} radius="md" className={local.searchBox} />
          <Skeleton width={110} height={44} radius="md" />
        </div>

        {/* ---------- Pills ---------- */}
        <div className={local.pillRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              width={84}
              height={30}
              radius="pill"
              className={local.pill}
            />
          ))}
        </div>

        {/* ---------- Menu grid ---------- */}
        <div className={local.grid}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardSkeleton;