// src/components/Pages/Signup/Steps/CredentialsStep.tsx
import React, { useState } from 'react';
import { downloadCredentialsPdf } from '../../../../utils/credentialsPdf';
import {
  downloadAdminQrPdf,
  downloadPublicQrPdf,
} from '../../../../utils/qrPdf';
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
  const [busy, setBusy] = useState<
    'credentials' | 'adminQr' | 'publicQr' | null
  >(null);

  const expiresDisplay = new Date(expiresAtIso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const runTask = async (
    key: 'credentials' | 'adminQr' | 'publicQr',
    task: () => Promise<void>,
  ) => {
    if (busy) return;
    setBusy(key);
    try {
      await task();
    } catch (err) {
      console.error(`[CredentialsStep] ${key} PDF failed:`, err);
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadCredentials = () =>
    runTask('credentials', () =>
      downloadCredentialsPdf({
        storeName,
        publicUrl,
        adminUrl,
        phone,
        password,
        planName,
        months,
        expiresAt: expiresDisplay,
      }),
    );

  const handleDownloadAdminQr = () =>
    runTask('adminQr', () => downloadAdminQrPdf({ storeName, url: adminUrl }));

  const handleDownloadPublicQr = () =>
    runTask('publicQr', () =>
      downloadPublicQrPdf({ storeName, url: publicUrl }),
    );

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
            {planName} - {months} month{months > 1 ? 's' : ''}
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
          onClick={handleDownloadCredentials}
          loading={busy === 'credentials'}
          disabled={busy !== null && busy !== 'credentials'}
          leftIcon={<DownloadIcon width={18} height={18} fill="#4d4d4d" />}
        >
          {busy === 'credentials'
            ? 'Preparing PDF...'
            : 'Download credentials'}
        </Button>

        <Button
          variant="ghost"
          onClick={handleDownloadAdminQr}
          loading={busy === 'adminQr'}
          disabled={busy !== null && busy !== 'adminQr'}
          leftIcon={<DownloadIcon width={18} height={18} fill="#4d4d4d" />}
        >
          {busy === 'adminQr' ? 'Preparing...' : 'Admin QR (PDF)'}
        </Button>

        <Button
          variant="ghost"
          onClick={handleDownloadPublicQr}
          loading={busy === 'publicQr'}
          disabled={busy !== null && busy !== 'publicQr'}
          leftIcon={<DownloadIcon width={18} height={18} fill="#4d4d4d" />}
        >
          {busy === 'publicQr' ? 'Preparing...' : 'Public QR (PDF)'}
        </Button>
      </div>

      <div className={local.credActions}>
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