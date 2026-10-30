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
  /** Override the modal overlay's z-index. */
  overlayZIndex?: number;
  /** Prevents closing the dialog by clicking the backdrop. */
  disableBackdropClose?: boolean;
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
  disableBackdropClose = false,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      overlayZIndex={overlayZIndex}
      disableBackdropClose={disableBackdropClose}
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