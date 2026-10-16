// components/Admin/AdminPanel.tsx
import React from 'react';
import { Modal } from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import { getStoreLabels } from '../../utils/storeLabels';
import AdminPanelBody from './AdminPanelBody';

interface AdminPanelProps {
  onClose: () => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const { tenant } = useTenant();
  const labels = getStoreLabels(tenant?.storeCategory);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={labels.adminPanelTitle}
      mobileFullScreen
      size="xl"
    >
      <AdminPanelBody />
    </Modal>
  );
};

export default AdminPanel;