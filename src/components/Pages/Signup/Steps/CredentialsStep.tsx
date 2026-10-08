// Components/Pages/Signup/Steps/CredentialsStep.tsx
import React, { useState } from 'react';
import { downloadCredentialsPdf } from '../../../../utils/credentialsPdf';
import { Card, Button } from '../../../ui';
import { DownloadIcon } from '../../../../assets/svgs';
import local from '../Signup.module.scss';

interface CredentialsStepProps {
  storeName: string;
  publicUrl: string;
  adminUrl: string;
  phone: string;
  password: string;
  planName: string;
  months: number;
  expiresAtIso: string;
  onDone?: () => void;
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
  onDone,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const expiresDisplay = new Date(expiresAtIso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      await downloadCredentialsPdf({
        storeName,
        publicUrl,
        adminUrl,
        phone,
        password,
        planName,
        months,
        expiresAt: expiresDisplay,
      });
    } catch (err) {
      console.error('[CredentialsStep] PDF generation failed:', err);
      // Non-fatal - the credentials are visible on screen anyway.
    } finally {
      setIsDownloading(false);
    }
  };

  const openUrl = (url: string) => {
    window.open(url, '_blank');
  };

  return (
    <div className={local.stepWrap}>
      <div className={local.stepHeader}>
        <h2>Hurrey! Your store is ready</h2>
        <p>Save these credentials. You won't see the password again.</p>
      </div>

      <Card padding="lg" className={local.credCard}>
        <div className={local.credRow}>
          <div className={local.credLabel}>Store Name</div>
          <div className={local.credValue}>{storeName}</div>
        </div>

        <div className={local.credRow}>
          <div className={local.credLabel}>Plan</div>
          <div className={local.credValue}>
            {planName} . {months} month{months > 1 ? 's' : ''}
          </div>
        </div>

        <div className={local.credRow}>
          <div className={local.credLabel}>Valid till</div>
          <div className={local.credValue}>{expiresDisplay}</div>
        </div>

        <div className={local.credRow}>
          <div className={local.credLabel}>Public Store URL</div>
          <div className={local.credValue}>
            <code>{publicUrl}</code>
          </div>
        </div>

        <div className={local.credRow}>
          <div className={local.credLabel}>Admin Store URL</div>
          <div className={local.credValue}>
            <code>{adminUrl}</code>
          </div>
        </div>

        <div className={local.credRow}>
          <div className={local.credLabel}>Phone</div>
          <div className={local.credValue}>{phone}</div>
        </div>

        <div className={local.credRow}>
          <div className={local.credLabel}>Password</div>
          <div className={local.credValue}>
            <span className={local.monoPassword}>{password}</span>
          </div>
        </div>
      </Card>

      <div className={local.credActions}>
        <Button
          variant="ghost"
          onClick={handleDownload}
          loading={isDownloading}
          leftIcon={<DownloadIcon width={18} height={18} fill="#4d4d4d" />}
        >
          {isDownloading ? 'Preparing PDF…' : 'Download credentials'}
        </Button>
        <Button variant="secondary" onClick={() => openUrl(publicUrl)}>
          Open Public Store
        </Button>
        <Button onClick={() => openUrl(adminUrl)}>Open Admin Store</Button>
      </div>

      {onDone && (
        <div
          className={local.credActions}
          style={{ marginTop: 12, justifyContent: 'center' }}
        >
          <Button onClick={onDone}>Done - I've saved these</Button>
        </div>
      )}
    </div>
  );
};

export default CredentialsStep;