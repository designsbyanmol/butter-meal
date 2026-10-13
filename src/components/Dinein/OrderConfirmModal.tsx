import React from 'react';
import { Modal, Button, Banner } from '../ui';
import { formatRupees } from '../../utils/subscription';

interface Props {
  isOpen: boolean;
  tableLabel: string;
  mode: 'first' | 'append';
  itemsTotal: number;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
  error?: string;
}

const OrderConfirmModal: React.FC<Props> = ({
  isOpen, tableLabel, mode, itemsTotal, onConfirm, onCancel, busy, error,
}) => (
  <Modal
    isOpen={isOpen}
    onClose={onCancel}
    title={mode === 'first' ? 'Confirm Order' : 'Add to this table?'}
    size="sm"
    footer={
      <>
        <Button variant="ghost" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={onConfirm} loading={busy}>
          {mode === 'first' ? 'Place Order' : 'Add to Order'}
        </Button>
      </>
    }
  >
    {error && <Banner variant="error" onDismiss={() => {}}>{error}</Banner>}
    <p>
      {mode === 'first'
        ? `Placing your first order for Table ${tableLabel}. Total so far: ${formatRupees(itemsTotal)}.`
        : `This table already has an open order. Your items will be added to it.`}
    </p>
  </Modal>
);

export default OrderConfirmModal;