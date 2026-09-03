import React from 'react';
import { LocationIcon } from '../../assets/svgs';
import styles from './LocationModal.module.scss';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({ isOpen, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.iconWrapper}>
          <LocationIcon width={56} height={56} fill="#25D366" />
        </div>
        <h2>Share Your Current Location</h2>
        <p className={styles.msgEn}>
          Please share your current location on WhatsApp after placing the order.
        </p>
        <button className={styles.btnOk} onClick={onConfirm}>Ok Sharing!</button>
      </div>
    </div>
  );
};

export default LocationModal;