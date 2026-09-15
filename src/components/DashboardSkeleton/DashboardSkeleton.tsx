// components/DashboardSkeleton/DashboardSkeleton.tsx
import React from 'react';
import styles from './DashboardSkeleton.module.scss';

interface DashboardSkeletonProps {
  /** Number of menu cards to render in the grid. */
  count?: number;
}

const SkeletonCard: React.FC = () => (
  <div className={styles.card}>
    <div className={styles.cardImage} />
    <div className={styles.cardBody}>
      <div className={`${styles.line} ${styles.lineWide}`} />
      <div className={`${styles.line} ${styles.lineNarrow}`} />
    </div>
    <div className={styles.cardFooter}>
      <div className={`${styles.line} ${styles.linePrice}`} />
      <div className={styles.cardBtn} />
    </div>
  </div>
);

const DashboardSkeleton: React.FC<DashboardSkeletonProps> = ({
  count = 6,
}) => {
  return (
    <div className={styles.wrap} aria-busy="true" aria-live="polite">
      {/* ---------- Header placeholder ---------- */}
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={`${styles.line} ${styles.headerBrand}`} />
          <div className={styles.headerActions}>
            <div className={styles.headerIcon} />
            <div className={styles.headerIcon} />
          </div>
        </div>
      </header>

      <main className={styles.main}>
        {/* ---------- Brand info placeholder ---------- */}
        <div className={styles.brand}>
          <div className={`${styles.line} ${styles.brandTitle}`} />
          <div className={`${styles.line} ${styles.brandSub}`} />
        </div>

        {/* ---------- Filter bar placeholder ---------- */}
        <div className={styles.filterBar}>
          <div className={styles.searchBox} />
          <div className={styles.filterBtn} />
        </div>

        <div className={styles.pillRow}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.pill} />
          ))}
        </div>

        {/* ---------- Menu grid skeleton ---------- */}
        <div className={styles.grid}>
          {Array.from({ length: count }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </main>
    </div>
  );
};

export default DashboardSkeleton;