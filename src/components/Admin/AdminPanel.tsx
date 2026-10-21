// src/components/Admin/AdminPanel.tsx
import React, { useState } from 'react';
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

  // AdminPanelBody computes its header actions (Add + settings gear)
  // and pushes them up via `onHeaderActionsChange`. We render them in
  // the modal header so mobile shows one header, not two.
  const [headerActions, setHeaderActions] = useState<React.ReactNode>(null);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={labels.adminPanelTitle}
      disableBackdropClose={true}
      headerRight={headerActions}
      mobileFullScreen
      size="xl"
    >
      <AdminPanelBody
        embedded
        onHeaderActionsChange={setHeaderActions}
      />
    </Modal>
  );
};

export default AdminPanel;