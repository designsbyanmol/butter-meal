// components/MainDashboard/Modals/SettingsModal.tsx
import React from 'react';
import { Modal } from '../../ui';
import SettingsModalBody from './SettingsModalBody';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => (
  <Modal
    isOpen={isOpen}
    onClose={onClose}
    title="Global Settings"
    mobileFullScreen
    size="md"
  >
    <SettingsModalBody />
  </Modal>
);

export default SettingsModal;