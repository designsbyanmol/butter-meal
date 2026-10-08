// components/Location/LocationModal.tsx
import React from 'react';
import { Sheet, Button } from '../ui';
import { LocationIcon } from '../../assets/svgs';
import local from './LocationModal.module.scss';

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LocationModal: React.FC<LocationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Confirm Location"
      maxHeightVh={60}
      footer={
        <Button block onClick={onConfirm}>
          Ok Sharing!
        </Button>
      }
    >
      <div className={local.content}>
        <div className={local.iconWrapper}>
          <LocationIcon width={56} height={56} fill="#25D366" />
        </div>
        <h2 className={local.title}>Share Your Current Location</h2>
        <p className={local.message}>
          Please share your current location on WhatsApp after placing the
          order.
        </p>
      </div>
    </Sheet>
  );
};

export default LocationModal;