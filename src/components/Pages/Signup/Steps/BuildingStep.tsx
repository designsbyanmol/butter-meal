// pages/Signup/Steps/BuildingStep.tsx
import React, { useEffect, useState } from 'react';
import styles from '../Signup.module.scss';

interface BuildingStepProps {
  storeName: string;
  onComplete: () => void;
  /** Seconds countdown, default 10. */
  seconds?: number;
}

const BuildingStep: React.FC<BuildingStepProps> = ({
  storeName,
  onComplete,
  seconds = 10,
}) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (elapsed >= seconds) {
      onComplete();
      return;
    }
    const t = setTimeout(() => setElapsed((e) => e + 1), 1000);
    return () => clearTimeout(t);
  }, [elapsed, seconds, onComplete]);

  const pct = Math.min(100, Math.round((elapsed / seconds) * 100));

  return (
    <div className={styles.buildingWrap}>
      <div className={styles.buildingCard}>
        <div className={styles.successIcon}>✅</div>
        <h2>Congratulations!</h2>
        <p className={styles.buildingLead}>
          Your store <strong>{storeName}</strong> is being created.
        </p>
        <p className={styles.buildingSub}>
          We're setting up your menu, settings, and dashboard. This will only
          take a few seconds.
        </p>

        <div className={styles.progressTrack}>
          <div
            className={styles.progressBar}
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className={styles.progressLabel}>
          {pct}% - {Math.max(0, seconds - elapsed)}s remaining
        </div>
      </div>
    </div>
  );
};

export default BuildingStep;