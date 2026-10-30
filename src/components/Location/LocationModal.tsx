import React from 'react';
import { LocationIcon } from '../../assets/svgs';
import styles from './LocationModal.module.scss';

interface LocationModalProps {
  isOpen: boolean;
  /** Called when the customer closes via backdrop or Cancel. */
  onClose: () => void;
  /**
   * Called when the customer confirms they will share their location.
   * The actual WhatsApp / PDF flow runs after this.
   */
  onConfirm: () => void;
  /**
   * Called when the customer wants to proceed WITHOUT sharing their
   * location. Same downstream flow as `onConfirm`, but the caller
   * can choose to alter the message (e.g. omit the location prompt).
   */
  onSkip?: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  onSkip,
}) => {
  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalBox}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.iconWrapper}>
          <LocationIcon width={56} height={56} fill="#25D366" />
        </div>
        <h2>Share Your Current Location</h2>
        <p className={styles.msgEn}>
          Please share your current location on WhatsApp after placing the
          order.
        </p>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.btnCancel}
            onClick={onClose}
          >
            Cancel
          </button>
          {/* {onSkip && (
            <button
              type="button"
              className={styles.btnSkip}
              onClick={onSkip}
            >
              Skip
            </button>
          )} */}
          <button
            type="button"
            className={styles.btnOk}
            onClick={onConfirm}
          >
            Ok Sharing!
          </button>
        </div>
      </div>
    </div>
  );
};

export default LocationModal;