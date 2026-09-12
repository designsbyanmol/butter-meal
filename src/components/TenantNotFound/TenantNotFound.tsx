// components/TenantNotFound/TenantNotFound.tsx
import React from 'react';
import styles from './TenantNotFound.module.scss';

const TenantNotFound: React.FC = () => {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <div className={styles.icon}>🔍</div>
        <h1 className={styles.title}>URL does not exist</h1>
        <p className={styles.subtitle}>
          This store link is invalid or has been removed.
        </p>
        <p className={styles.hint}>
          If you followed a link from someone, ask them to send you an
          up-to-date URL. If you are the store owner, please contact the
          platform administrator.
        </p>
      </div>
    </div>
  );
};

export default TenantNotFound;