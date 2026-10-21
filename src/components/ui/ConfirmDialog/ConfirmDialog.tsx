// src/components/ui/ConfirmDialog/ConfirmDialog.tsx
import React from 'react';
import Modal from '../Modal/Modal';
import Button, { ButtonVariant } from '../Button/Button';
import local from './ConfirmDialog.module.scss';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'warning' | 'info';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /**
   * Override the modal overlay's z-index. Use this when the dialog
   * is opened from a component that already sits at a high z-index
   * (e.g. a Drawer at $z-drawer=1200). The dialog must render above
   * that container or it will appear behind it.
   */
  overlayZIndex?: number;
}

const variantToButton: Record<
  NonNullable<ConfirmDialogProps['variant']>,
  ButtonVariant
> = {
  primary: 'primary',
  danger: 'danger',
  warning: 'warning',
  info: 'primary',
};

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  loading,
  onConfirm,
  onCancel,
  overlayZIndex,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      disableBackdropClose={true}
      overlayZIndex={overlayZIndex}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button
            variant={variantToButton[variant]}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className={local.message}>{message}</div>
    </Modal>
  );
};

export default ConfirmDialog;