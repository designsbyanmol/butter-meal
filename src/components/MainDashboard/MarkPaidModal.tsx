// src/components/MainDashboard/MarkPaidModal.tsx
import React, { useEffect, useState } from 'react';
import { Modal, Button, Banner } from '../ui';
import { DineinOrder } from '../../types';
import { formatRupees } from '../../utils/subscription';
import local from './MarkPaidModal.module.scss';

export type PaymentModeChoice = 'online' | 'cash';

interface Props {
  isOpen: boolean;
  order: DineinOrder | null;
  busy?: boolean;
  error?: string;
  onConfirm: (mode: PaymentModeChoice) => void;
  onCancel: () => void;
}

const MarkPaidModal: React.FC<Props> = ({
  isOpen,
  order,
  busy,
  error,
  onConfirm,
  onCancel,
}) => {
  const [mode, setMode] = useState<PaymentModeChoice>('cash');

  // Default selection:
  //   - If the customer requested online payment, default to Online.
  //   - Otherwise default to Cash.
  useEffect(() => {
    if (!isOpen || !order) return;
    setMode(order.payOnlineRequested ? 'online' : 'cash');
  }, [isOpen, order?.id, order?.payOnlineRequested]);

  if (!order) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={busy ? () => {} : onCancel}
      title="Mark Paid"
      size="sm"
      mobileFullScreen
      overlayZIndex={3100}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={() => onConfirm(mode)}
            loading={busy}
          >
            Confirm {mode === 'online' ? 'Online' : 'Cash'}
          </Button>
        </>
      }
    >
      {error && (
        <Banner variant="error" inline onDismiss={() => {}}>
          {error}
        </Banner>
      )}

      <p className={local.lead}>
        Confirm the payment mode for order{' '}
        <strong>#{order.orderNo}</strong> -{' '}
        <strong>{formatRupees(order.totalAmount)}</strong>.
      </p>

      <div className={local.choices}>
        <button
          type="button"
          className={`${local.choice} ${local.choiceOnline} ${
            mode === 'online' ? local.choiceActive : ''
          }`}
          onClick={() => setMode('online')}
          disabled={busy}
        >
          <span className={local.choiceTitle}>Online</span>
          <span className={local.choiceSub}>
            UPI, card, or any digital payment
          </span>
        </button>

        <button
          type="button"
          className={`${local.choice} ${local.choiceCash} ${
            mode === 'cash' ? local.choiceActive : ''
          }`}
          onClick={() => setMode('cash')}
          disabled={busy}
        >
          <span className={local.choiceTitle}>Cash</span>
          <span className={local.choiceSub}>
            Paid in cash at the table or counter
          </span>
        </button>
      </div>
    </Modal>
  );
};

export default MarkPaidModal;