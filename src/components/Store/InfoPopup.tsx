// components/Store/InfoPopup.tsx
import React from 'react';
import { Modal } from '../ui';
import InfoPopupBody from './InfoPopupBody';

interface InfoPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

const InfoPopup: React.FC<InfoPopupProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Informations"
    disableBackdropClose={true}
    size="md"
    mobileFullScreen
  >
    <InfoPopupBody onClose={onClose} />
  </Modal>
);

export default InfoPopup;