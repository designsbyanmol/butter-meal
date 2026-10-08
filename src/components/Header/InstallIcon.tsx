// src/components/Header/InstallIcon.tsx
import React, { useEffect, useState } from 'react';
import { IconButton, Modal, Button } from '../ui';
import { DownloadIcon } from '../../assets/svgs';
import { useTenant } from '../../contexts/TenantContext';
import { hasHubStore, addHubStore } from '../../pwa/hubStorage';
import {
  isInstallAvailable,
  isStandalone,
  subscribeInstallAvailability,
  triggerInstall,
} from '../../pwa/installPrompt';
import { HUB_ICON_URL, HUB_APP_NAME } from '../../pwa/manifest';
import local from './InstallIcon.module.scss';

type ModalState = 'closed' | 'waiting' | 'ready' | 'manual';

const InstallIcon: React.FC = () => {
  const { tenant } = useTenant();
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [modal, setModal] = useState<ModalState>('closed');

  // Visibility: hide if in hub or standalone.
  useEffect(() => {
    const compute = () => {
      if (!tenant) return setVisible(false);
      const hide = hasHubStore(tenant.slug) || isStandalone() || installed;
      setVisible(!hide);
    };
    compute();
    const unsub = subscribeInstallAvailability(() => compute());
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'butter_hub:stores:v1') compute();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      unsub();
      window.removeEventListener('storage', onStorage);
    };
  }, [tenant?.slug, installed]);

  // If we're waiting for the prompt and it arrives, promote to 'ready'.
  useEffect(() => {
    const unsub = subscribeInstallAvailability((available) => {
      setModal((m) => {
        if (m === 'waiting' && available) return 'ready';
        return m;
      });
    });
    return unsub;
  }, []);

  if (!visible || !tenant) return null;

  const storeUrl = `${window.location.origin}${window.location.pathname}?t=${tenant.slug}`;

  const handleIconClick = () => {
    if (!hasHubStore(tenant.slug)) {
      addHubStore({
        slug: tenant.slug,
        displayName: tenant.displayName,
        url: storeUrl,
        iconUrl: HUB_ICON_URL,
        addedAt: new Date().toISOString(),
      });
    }

    if (isInstallAvailable()) {
      setModal('ready');
      return;
    }

    // Give the browser a few seconds to fire beforeinstallprompt.
    setModal('waiting');
    window.setTimeout(() => {
      setModal((m) => (m === 'waiting' ? 'manual' : m));
    }, 3000);
  };

  const handleInstallClick = async () => {
    const outcome = await triggerInstall();
    if (outcome === 'accepted') {
      setInstalled(true);
      setModal('closed');
    } else {
      setModal('manual');
    }
  };

  const handleClose = () => setModal('closed');

  const isReady = modal === 'ready';
  const isWaiting = modal === 'waiting';

  const footer = (
    <>
      <Button variant="ghost" onClick={handleClose}>
        Not now
      </Button>
      {isReady ? (
        <Button onClick={handleInstallClick}>Install Hub App</Button>
      ) : isWaiting ? (
        <Button loading disabled>
          Preparing…
        </Button>
      ) : (
        <Button onClick={handleClose}>Got it</Button>
      )}
    </>
  );

  return (
    <>
      <IconButton
        variant="primary"
        size="md"
        aria-label="Save to your store hub"
        tooltip="Save to hub"
        className={local.icon}
        onClick={handleIconClick}
      >
        <DownloadIcon width={18} height={18} fill="#1e7e34" />
      </IconButton>

      <Modal
        isOpen={modal !== 'closed'}
        onClose={handleClose}
        title={isReady ? `Install ${HUB_APP_NAME}` : `Add to ${HUB_APP_NAME}`}
        size="sm"
        footer={footer}
      >
        <div className={local.help}>
          <img src={HUB_ICON_URL} alt="" className={local.helpIcon} />

          <p className={local.helpText}>
            <strong>{tenant.displayName}</strong> has been added to{' '}
            <strong>{HUB_APP_NAME}</strong>.
          </p>

          {isReady && (
            <p className={local.helpText}>
              Tap <strong>Install Hub App</strong> to add it to your home
              screen. It will list every store you've saved.
            </p>
          )}

          {isWaiting && (
            <p className={local.helpText}>
              Checking install options…
            </p>
          )}

          {modal === 'manual' && (
            <>
              <p className={local.helpText}>
                Your browser hasn't offered one-tap install here. Add the
                app to your home screen from the browser menu:
              </p>
              <ul className={local.helpList}>
                <li>
                  <strong>Chrome / Edge:</strong> browser menu →{' '}
                  <em>Install app</em> or <em>Add to Home Screen</em>.
                </li>
                <li>
                  <strong>Safari (iOS):</strong> Share icon →{' '}
                  <em>Add to Home Screen</em>.
                </li>
              </ul>
            </>
          )}
        </div>
      </Modal>
    </>
  );
};

export default InstallIcon;