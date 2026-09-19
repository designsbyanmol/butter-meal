// pages/Signup/Steps/CredentialsStep.tsx
import React from 'react';
import { downloadCredentials } from '../../../../utils/credentialsDownload';
import styles from '../Signup.module.scss';
import { DownloadIcon } from '../../../../assets/svgs';

interface CredentialsStepProps {
  storeName: string;
  publicUrl: string;
  adminUrl: string;
  phone: string;
  password: string;
  planName: string;
  months: number;
  expiresAtIso: string;
}

const CredentialsStep: React.FC<CredentialsStepProps> = ({
  storeName,
  publicUrl,
  adminUrl,
  phone,
  password,
  planName,
  months,
  expiresAtIso,
}) => {
  const expiresDisplay = new Date(expiresAtIso).toLocaleDateString();

  const handleDownload = () => {
    downloadCredentials({
      storeName,
      publicUrl,
      adminUrl,
      phone,
      password,
      planName,
      months,
      expiresAt: expiresDisplay,
    });
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className={styles.stepWrap}>
      <div className={styles.stepHeader}>
        <h2>Your store is ready 🎉</h2>
        <p>Save these credentials. You won't see the password again.</p>
      </div>

      <div className={styles.credCard}>
        <div className={styles.credRow}>
          <div className={styles.credLabel}>Store Name</div>
          <div className={styles.credValue}>{storeName}</div>
        </div>

        <div className={styles.credRow}>
          <div className={styles.credLabel}>Plan</div>
          <div className={styles.credValue}>
            {planName} . {months} month{months > 1 ? 's' : ''}
          </div>
        </div>

        <div className={styles.credRow}>
          <div className={styles.credLabel}>Valid till</div>
          <div className={styles.credValue}>{expiresDisplay}</div>
        </div>

        <div className={styles.credRow}>
          <div className={styles.credLabel}>Public Store URL</div>
          <div className={styles.credValue}>
            <code>{publicUrl}</code>
          </div>
        </div>

        <div className={styles.credRow}>
          <div className={styles.credLabel}>Admin Store URL</div>
          <div className={styles.credValue}>
            <code>{adminUrl}</code>
          </div>
        </div>

        <div className={styles.credRow}>
          <div className={styles.credLabel}>Phone</div>
          <div className={styles.credValue}>{phone}</div>
        </div>

        <div className={styles.credRow}>
          <div className={styles.credLabel}>Password</div>
          <div className={styles.credValue}>
            <span className={styles.monoPassword}>{password}</span>
          </div>
        </div>
      </div>

      <div className={styles.credActions}>
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={handleDownload}
        >
          <DownloadIcon width={18} height={18} fill="#4d4d4d" /> Download credentials
        </button>
        <button
          type="button"
          className={styles.secondaryBtn}
          onClick={() => openUrl(publicUrl)}
        >
          Open Public Store
        </button>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={() => openUrl(adminUrl)}
        >
          Open Admin Store
        </button>
      </div>
    </div>
  );
};

export default CredentialsStep;