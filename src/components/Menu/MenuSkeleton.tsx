// components/Menu/MenuSkeleton.tsx
import React from 'react';
import styles from './Menu.module.scss';

interface MenuSkeletonProps {
  count?: number;
}

const SkeletonCard: React.FC = () => (
  <div className={`${styles.itemCard} ${styles.skeletonCard}`}>
    <div className={styles.imageWrapper}>
      <div className={`${styles.itemImg} ${styles.skeletonImg}`} />
    </div>

    <div className={styles.itemInfo}>
      <div className={`${styles.itemName} ${styles.skeletonLine} ${styles.skeletonName}`} />
    </div>

    <div className={styles.itemFooter}>
      <span className={`${styles.price} ${styles.skeletonLine} ${styles.skeletonPrice}`} />
      <div className={styles.actions}>
        <span className={`${styles.btnCustomize} ${styles.skeletonBtn}`} />
      </div>
    </div>
  </div>
);

const MenuSkeleton: React.FC<MenuSkeletonProps> = ({ count = 6 }) => {
  return (
    <div className={styles.menuGrid}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
};

export default MenuSkeleton;