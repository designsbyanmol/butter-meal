// src/components/Header/CustomerRequestBillButton.tsx
import React, { useState, useEffect } from 'react';
import { Button, Modal, Banner } from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import { useDineinCustomer } from '../../hooks/useDineinCustomer';
import local from './CustomerRequestBillButton.module.scss';

type PayChoice = 'online' | 'offline';

interface Props {
  /**
   * The specific order this button should request a bill for. Always
   * required - never derive it from "the latest order for this device",
   * because that would pull in unrelated orders.
   */
  orderId: string;

  /**
   * When true, the button is always rendered (used inside the order
   * status popup after the tenant marks the order as served). The
   * component still hides itself after a successful request.
   */
  forceVisible?: boolean;
}

const CustomerRequestBillButton: React.FC<Props> = ({
  orderId,
  forceVisible = false,
}) => {
  const { tenant } = useTenant();

  const [hasOpened, setHasOpened] = useState(false);
  const { openOrders, loading, reload, requestBill } = useDineinCustomer({
    enabled: hasOpened,
    orderId,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [requested, setRequested] = useState(false);

  if (!tenant || tenant.dineinEnabled !== true) return null;

  const eligible = openOrders.filter((o) => !o.billRequested);

  if (requested) {
    return (
      <Button size="sm" variant="ghost" disabled>
        Bill Requested...
      </Button>
    );
  }

  // Only hide ourselves once a fetch has completed at least once.
  // Before that we render the button so the user can click it.
  const shouldHide =
    hasOpened &&
    !loading &&
    eligible.length === 0 &&
    !isModalOpen &&
    !confirmOpen;

  if (shouldHide && !forceVisible) return null;
  if (shouldHide && forceVisible) return null;

  const handleOpenConfirm = () => {
    setHasOpened(true);
    setError('');
    setSuccess('');
    setConfirmOpen(true);
  };

  const handleConfirmYes = () => {
    setConfirmOpen(false);
    setIsModalOpen(true);
  };

  const handleConfirmNo = () => {
    setConfirmOpen(false);
  };

  const handleChoose = async (choice: PayChoice) => {
    setIsSending(true);
    setError('');
    setSuccess('');
    try {
      await requestBill(choice === 'online');
      setRequested(true);
      setSuccess(
        choice === 'online'
          ? 'Bill requested - the staff will confirm shortly.'
          : 'Bill requested - the waiter will bring the bill to your table.',
      );
      setTimeout(() => {
        setSuccess('');
        setIsModalOpen(false);
      }, 1600);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="secondary"
        disabled={loading && hasOpened}
        onClick={handleOpenConfirm}
      >
        Request Bill
      </Button>

      {/* ---- Step 1: confirmation ---- */}
      <Modal
        isOpen={confirmOpen}
        onClose={handleConfirmNo}
        title="Request Bill?"
        size="sm"
        disableBackdropClose={true}
        overlayZIndex={3000}
        footer={
          <>
            <Button variant="ghost" onClick={handleConfirmNo}>
              Cancel
            </Button>
            <Button onClick={handleConfirmYes}>
              Yes, Request
            </Button>
          </>
        }
      >
        <p className={local.lead}>
          Do you want to request the bill for this order?
        </p>
        {eligible.length > 0 && (
          <p className={local.hint}>
            Order #{eligible[0].orderNo} will be included.
          </p>
        )}
      </Modal>

      {/* ---- Step 2: payment mode ---- */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          if (isSending) return;
          setIsModalOpen(false);
        }}
        title="Request Bill"
        disableBackdropClose={true}
        size="sm"
        overlayZIndex={3000}
        footer={
          <Button
            variant="ghost"
            onClick={() => setIsModalOpen(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}
        {success && <Banner variant="success">{success}</Banner>}

        {!success && (
          <>
            <p className={local.lead}>
              Do you want to pay online or offline?
            </p>

            <div className={local.choices}>
              <button
                type="button"
                className={`${local.choice} ${local.choiceOffline}`}
                onClick={() => handleChoose('offline')}
                disabled={isSending}
              >
                <span className={local.choiceTitle}>Pay Offline</span>
                <span className={local.choiceSub}>
                  The waiter will bring the bill to your table.
                </span>
              </button>

              <button
                type="button"
                className={`${local.choice} ${local.choiceOnline}`}
                onClick={() => handleChoose('online')}
                disabled={isSending}
              >
                <span className={local.choiceTitle}>Pay Online</span>
                <span className={local.choiceSub}>
                  We'll send you a secure pay link.
                </span>
              </button>
            </div>

            {eligible.length > 0 && (
              <p className={local.hint}>
                Order #{eligible[0].orderNo} - total{' '}
                {eligible[0].totalAmount.toLocaleString('en-IN', {
                  style: 'currency',
                  currency: 'INR',
                  maximumFractionDigits: 0,
                })}
              </p>
            )}
          </>
        )}
      </Modal>
    </>
  );
};

export default CustomerRequestBillButton;