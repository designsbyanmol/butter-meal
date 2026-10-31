// src/components/Pages/Signup/Steps/CredentialsStep.tsx
import React, { useState } from 'react';
import { downloadCredentialsPdf } from '../../../../utils/credentialsPdf';
import {
  downloadAdminQrPdf,
  downloadPublicQrPdf,
} from '../../../../utils/qrPdf';
import { Card, Button, Modal, IconButton } from '../../../ui';
import { DownloadIcon, CheckIcon } from '../../../../assets/svgs';
import local from '../Signup.module.scss';
import { useNavigationPreloader } from '../../../../hooks/useNavigationPreloader';

interface CredentialsStepProps {
  storeName: string;
  slug: string;
  publicUrl: string;
  adminUrl: string;
  phone: string;
  password: string;
  planName: string;
  months: number;
  expiresAtIso: string;
  onDone?: () => void;
}

type Busy = 'credentials' | 'adminQr' | 'publicQr' | null;

const CredentialsStep: React.FC<CredentialsStepProps> = ({
  storeName,
  slug,
  publicUrl,
  adminUrl,
  phone,
  password,
  planName,
  months,
  expiresAtIso,
  onDone,
}) => {
  const [busy, setBusy] = useState<Busy>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const expiresDisplay = new Date(expiresAtIso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const runTask = async (key: Busy, task: () => Promise<void>) => {
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

  const { show } = useNavigationPreloader({ title: 'Opening your admin...' });

  // "Yes, close" → redirect to the tenant admin login page.
const handleConfirmClose = () => {
  setConfirmOpen(false);
  try { onDone?.(); } catch {}
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  const url = `${window.location.origin}${dir}admin.html?t=${slug}_admin`;
  show(() => { window.location.href = url; }, 'Opening your admin...');
};

  return (
    <div className={local.stepWrap}>
      <div className={local.stepHeader}>
        <h2>Hurrey! Your Online App is ready</h2>
        <p>Save these credentials. You won't see the password again.</p>
      </div>

      <div className={local.credCardWrap}>
        {/* Top-right action cluster: credentials + QRs */}
        <div className={local.credTopActions}>
          <Button
            variant="ghost"
            size="md"
            aria-label="Download credentials PDF"
            disabled={busy === 'credentials'}
            onClick={handleDownloadCredentials}
          >
            <DownloadIcon width={16} height={16} fill="#1e1e1e" /> Credentials
          </Button>

          <Button
            size="md"
            variant="dark"
            aria-label="Download customer QR PDF"
            disabled={busy === 'publicQr'}
            onClick={handleDownloadPublicQr}
          >
            <DownloadIcon width={14} height={14} fill="#fff" /> Customer-QR
          </Button>
        </div>

        <Card padding="lg" className={local.credCard}>
          <div className={local.credRow}>
            <div className={local.credLabel}>Company Name</div>
            <div className={local.credValue}>{storeName}</div>
          </div>

          <div className={local.credRow}>
            <div className={local.credLabel}>Plan Active</div>
            <div className={local.credValue}>
              {planName} - {months} month{months > 1 ? 's' : ''}
            </div>
          </div>

          <div className={local.credRow}>
            <div className={local.credLabel}>Valid till</div>
            <div className={local.credValue}>{expiresDisplay}</div>
          </div>

          {/* Public URL row — link + open button inline */}
          <div className={local.credRow}>
            <div className={local.credLabel}>Customer Show URL</div>
            <div className={local.credUrlRow}>
              <code className={local.credUrlCode}>{publicUrl}</code>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Open customer store"
                onClick={() => openUrl(publicUrl)}
              >
                visit
              </Button>
            </div>
          </div>

          {/* Admin URL row — link + open button inline */}
          <div className={local.credRow}>
            <div className={local.credLabel}>Admin Login URL</div>
            <div className={local.credUrlRow}>
              <code className={local.credUrlCode}>{adminUrl}</code>
              <Button
                variant="ghost"
                size="sm"
                aria-label="Open admin store"
                onClick={() => openUrl(adminUrl)}
              >
                visit
              </Button>
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
      </div>

      {/* Single bottom CTA */}
      <div className={local.credDoneRow}>
        <Button
          onClick={() => setConfirmOpen(true)}
          className={local.credDoneBtn}
        >
          Save &amp; Done
        </Button>
      </div>

      {/* Confirmation modal */}
      <Modal
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Have you saved your credentials?"
        size="sm"
        disableBackdropClose={true}
        mobileFullScreen
        footer={
          <>
            <Button
              variant="ghost"
              onClick={handleDownloadCredentials}
              loading={busy === 'credentials'}
              leftIcon={<DownloadIcon width={16} height={16} fill="#4d4d4d" />}
            >
              Download
            </Button>
            <Button onClick={handleConfirmClose}>
              Yes, Close
            </Button>
          </>
        }
      >
        <p
          style={{
            margin: '0 0 10px',
            fontSize: 14,
            lineHeight: 1.55,
            color: '#4d4d4d',
          }}
        >
          If you haven't already, please download your credentials before
          closing this page. The password will not be shown again.
        </p>
        <p style={{ margin: 0, fontSize: 12, color: '#888' }}>
          Clicking <strong>Yes, Close</strong> will open the app admin
          login page.
        </p>
      </Modal>
    </div>
  );
};

export default CredentialsStep;