// components/Store/StoreBanner.tsx
import React from 'react';
import { useStore } from '../../contexts/StoreContext';
import local from './Store.module.scss';

interface StoreBannerProps {
  className?: string;
}

const StoreBanner: React.FC<StoreBannerProps> = ({ className }) => {
  const { storeSettings, isStoreOpen } = useStore();

  // Don't render anything if store is open
  if (isStoreOpen) return null;

  let message = 'Store is currently closed';
  let subMessage = "We'll be opening soon!";

  if (storeSettings.closedMessage && storeSettings.closedMessage.trim() !== '') {
    message = storeSettings.closedMessage;
  }

  // Expected open date/time display
  let dateDisplay = null;
  if (storeSettings.expectedOpenDate && storeSettings.expectedOpenTime) {
    dateDisplay = (
      <>
        Expected to open on{' '}
        <div>
          <span>{storeSettings.expectedOpenDate}</span> at{' '}
          <span>{storeSettings.expectedOpenTime}</span>
        </div>
      </>
    );
  } else if (storeSettings.expectedOpenDate) {
    dateDisplay = (
      <>
        Expected to open on <span>{storeSettings.expectedOpenDate}</span>
      </>
    );
  } else if (storeSettings.expectedOpenTime) {
    dateDisplay = (
      <>
        Expected to open on <span>{storeSettings.expectedOpenTime}</span>
      </>
    );
  }

  return (
    <div
      className={[local.storeBanner, className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <div className={local.bannerContent}>
        <div className={local.bannerIcon}>Sorry!</div>
        <p className={local.tagLine}>
          We are close right now. Opening Soon...
        </p>
        <div className={local.bannerText}>
          <div className={local.heading}>Reason:</div>
          <h3>{message}</h3>
          <div className={local.p}>{dateDisplay || subMessage}</div>
        </div>
      </div>
    </div>
  );
};

export default StoreBanner;