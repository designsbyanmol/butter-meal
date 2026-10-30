// src/components/Order/OrderCheckoutModal.tsx
import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Button,
  Banner,
  IconButton,
} from '../ui';
import { LeftArrowIcon, CloseIcon, DownloadIcon, CheckIcon } from '../../assets/svgs';
import { CartItem, PaymentMode, ScheduleData, DeliveryType } from '../../types';
import { buildOrderBillFile, OrderBillPayload } from '../../utils/orderBillPdf';
import { downloadFile } from '../../utils/shareOrderBill';
import { formatRupees } from '../../utils/subscription';
import local from './OrderCheckoutModal.module.scss';

type Step = 'pay' | 'send' | 'success';

interface OrderCheckoutModalProps {
  isOpen: boolean;
  customerName: string;
  cart: CartItem[];
  paymentMode: PaymentMode;
  deliveryType: DeliveryType;
  scheduleData: ScheduleData | null;
  tenant: {
    displayName: string;
    storeTagline?: string;
    storeAddress?: string;
    gstNo?: string;
    whatsappPhone?: string;
    upiId?: string;
    gstPercent?: number;
  };
  orderNo: string;
  subtotal: number;
  gstAmount: number;
  discountAmount: number;
  discountPercent: number;
  deliveryFee: number;
  packingCharge: number;
  total: number;
  deliveryTime: string;
  /** Phone number to send the WhatsApp message to. */
  whatsappPhone: string;
  /** Called on close (X / backdrop). Clears cart on success path only. */
  onClose: (opts: { orderPlaced: boolean }) => void;
  onReorder: (snapshot: {
  cart: CartItem[];
  paymentMode: PaymentMode;
  deliveryType: DeliveryType;
  scheduleData: ScheduleData | null;
}) => void;
}

const OrderCheckoutModal: React.FC<OrderCheckoutModalProps> = ({
  isOpen,
  customerName,
  cart,
  paymentMode,
  deliveryType,
  scheduleData,
  tenant,
  orderNo,
  subtotal,
  gstAmount,
  discountAmount,
  discountPercent,
  deliveryFee,
  packingCharge,
  total,
  deliveryTime,
  whatsappPhone,
  onClose,
  onReorder,
}) => {
  const [step, setStep] = useState<Step>('pay');
  const [paidConfirmed, setPaidConfirmed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  const originalCartRef = useRef<CartItem[]>([]);
const originalPaymentRef = useRef<PaymentMode>('COD');
const originalDeliveryRef = useRef<DeliveryType>('now');
const originalScheduleRef = useRef<ScheduleData | null>(null);
  // Reset each time the modal is opened fresh.
useEffect(() => {
  if (isOpen) {
    setStep('pay');
    setPaidConfirmed(false);
    setGenerateError('');

    // Snapshot the cart & checkout state so "Reorder" can restore them.
    originalCartRef.current = [...cart];
    originalPaymentRef.current = paymentMode;
    originalDeliveryRef.current = deliveryType;
    originalScheduleRef.current = scheduleData;
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen]);

  const payload: OrderBillPayload = useMemo(
    () => ({
      tenant: {
        displayName: tenant.displayName,
        storeTagline: tenant.storeTagline,
        gstPercent: tenant.gstPercent,
        storeAddress: tenant.storeAddress,
        whatsappPhone: tenant.whatsappPhone,
        gstNo: tenant.gstNo,
        upiId: tenant.upiId,
      },
      orderNo,
      customerName,
      paymentMode,
      deliveryType,
      scheduleData,
      cart,
      subtotal,
      gstAmount,
      discountAmount,
      discountPercent,
      deliveryFee,
      packingCharge,
      total,
      deliveryTime,
    }),
    [
      tenant,
      orderNo,
      customerName,
      paymentMode,
      deliveryType,
      scheduleData,
      cart,
      subtotal,
      gstAmount,
      discountAmount,
      discountPercent,
      deliveryFee,
      packingCharge,
      total,
      deliveryTime,
    ],
  );

  // ---------- Step 1: Pay ----------
const handlePayNow = () => {
  if (!tenant.upiId) {
    alert(
      'This store has not set up a UPI ID yet. Please pay the staff at the counter.',
    );
    return;
  }

  const upiUri =
    `upi://pay?pa=${encodeURIComponent(tenant.upiId)}` +
    `&pn=${encodeURIComponent(tenant.displayName)}` +
    `&am=${Number(total).toFixed(2)}` +
    `&cu=INR` +
    `&tn=${encodeURIComponent('Order ' + orderNo)}`;

  try {
    window.location.href = upiUri;
  } catch {
    /* fall through */
  }

  window.setTimeout(() => {
    const ok = window.confirm(
      'Did the UPI payment go through? Tap OK if you have paid the exact amount.',
    );
    if (ok) {
      setPaidConfirmed(true);
      setStep('send');
    }
  }, 800);
};

// COD flow: no UPI payment, just advance to the send step.
const handleProceedCOD = () => {
  setPaidConfirmed(false);
  setStep('send');
};

  // ---------- Step 2: Send ----------
  const handleDownloadBill = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setGenerateError('');
    try {
      const file = buildOrderBillFile(payload);
      downloadFile(file);
    } catch (err) {
      console.error('[OrderCheckoutModal] bill generate failed:', err);
      setGenerateError(
        'Could not generate the bill. Please try again or ask the store for a copy.',
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSendToWhatsApp = async () => {
    // Ensure the bill is at least downloaded once.
    try {
      const file = buildOrderBillFile(payload);
      downloadFile(file);
    } catch {
      /* continue anyway - the user can still message the store */
    }

    // Focused WhatsApp message for the store.
    const text = [
      `Order No: ${orderNo}`,
      `Customer: ${customerName || 'Guest'}`,
      ``,
      `Please find attached:`,
      `- Bill PDF`,
      `- Payment proof (screenshot)`,
      `- Current location`,
    ].join('\n');

    const url = `https://wa.me/${whatsappPhone}?text=${encodeURIComponent(
      text,
    )}`;

    // Open WhatsApp in a new tab so the current page is preserved.
    window.open(url, '_blank');

    setStep('success');
  };

  // ---------- Header actions per step ----------
  const handleClose = () => {
    onClose({ orderPlaced: step === 'success' });
  };

  const handleBack = () => {
    if (step === 'send') {
      setStep('pay');
      setPaidConfirmed(false);
      return;
    }
    if (step === 'success') {
      // Success has no back; the user must Close or Reorder.
      return;
    }
  };

  const headerLeft =
  step === 'pay' ? (
    <IconButton
      variant="ghost"
      size="md"
      shape="square"
      aria-label="Close"
      onClick={handleClose}
    >
      <CloseIcon width={18} height={18} fill="#1e1e1e" />
    </IconButton>
  ) : step === 'send' ? (
    <IconButton
      variant="ghost"
      size="md"
      shape="square"
      aria-label="Back to payment step"
      onClick={handleBack}
    >
      <LeftArrowIcon width={18} height={18} fill="#1e1e1e" />
    </IconButton>
  ) : null;

  const isCOD = paymentMode === 'COD';

const footer =
  step === 'pay' ? (
    <>
      <Button variant="ghost" onClick={handleClose}>
        Close
      </Button>
      {isCOD ? (
        <Button onClick={handleProceedCOD}>Proceed</Button>
      ) : (
        <Button onClick={handlePayNow}>Pay {formatRupees(total)}</Button>
      )}
    </>
  ) : step === 'send' ? (
    <>
      <Button
        variant="ghost"
        onClick={handleDownloadBill}
        loading={isGenerating}
        leftIcon={<DownloadIcon width={16} height={16} fill="#4d4d4d" />}
      >
        Download bill
      </Button>
      <Button onClick={handleSendToWhatsApp}>Send to store</Button>
    </>
  ) : (
    <>
      <Button
  variant="ghost"
  onClick={() =>
    onReorder({
      cart: originalCartRef.current,
      paymentMode: originalPaymentRef.current,
      deliveryType: originalDeliveryRef.current,
      scheduleData: originalScheduleRef.current,
    })
  }
>
  Reorder
</Button>
      <Button onClick={handleClose}>Close</Button>
    </>
  );

  const title =
  step === 'pay'
    ? isCOD
      ? 'Review your order'
      : `Pay ${formatRupees(total)}`
    : step === 'send'
      ? 'Send order to store'
      : 'Order placed successfully';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      headerRight={headerLeft}
      hideCloseButton
      mobileFullScreen
      disableBackdropClose
      size="md"
      footer={footer}
    >
      {/* ---------- Step 1: Pay ---------- */}
      {step === 'pay' && (
        <div className={local.stepBody}>
          <div className={local.billCard}>
            <div className={local.billHeader}>
              <div className={local.billRow}>
                <span className={local.billLabel}>Order No</span>
                <span className={local.billValue}>{orderNo}</span>
              </div>
              <div className={local.billRow}>
                <span className={local.billLabel}>Customer</span>
                <span className={local.billValue}>{customerName}</span>
              </div>
              <div className={local.billRow}>
                <span className={local.billLabel}>Payment</span>
                <span className={local.billValue}>{paymentMode}</span>
              </div>
            </div>

            <div className={local.itemsList}>
              {cart.map((it, i) => (
                <div key={i} className={local.itemRow}>
                  <span className={local.itemName}>
                    {it.name} x {it.quantity}
                  </span>
                  <span className={local.itemPrice}>
                    {formatRupees(
                      ((it.basePrice ?? it.price) + (it.addonPrice ?? 0)) *
                        it.quantity,
                    )}
                  </span>
                </div>
              ))}
            </div>

            <div className={local.totals}>
              <div className={local.totalRow}>
                <span>Subtotal</span>
                <span>{formatRupees(subtotal)}</span>
              </div>
              {packingCharge > 0 && (
                <div className={local.totalRow}>
                  <span>Packing</span>
                  <span>{formatRupees(packingCharge)}</span>
                </div>
              )}
              {gstAmount > 0 && (
                <div className={local.totalRow}>
                  <span>GST</span>
                  <span>{formatRupees(gstAmount)}</span>
                </div>
              )}
              {deliveryFee > 0 && (
                <div className={local.totalRow}>
                  <span>Delivery</span>
                  <span>{formatRupees(deliveryFee)}</span>
                </div>
              )}
              {discountAmount > 0 && (
                <div className={`${local.totalRow} ${local.discountRow}`}>
                  <span>Discount ({discountPercent}%)</span>
                  <span>-{formatRupees(discountAmount)}</span>
                </div>
              )}
              <div className={`${local.totalRow} ${local.grandTotal}`}>
                <span>Total</span>
                <span>{formatRupees(total)}</span>
              </div>
            </div>
          </div>

          {isCOD ? (
  <Banner variant="info" inline>
    Please keep <strong>{formatRupees(total)}</strong> cash ready. Tap{' '}
    <strong>Proceed</strong> to continue to the bill and delivery
    instructions.
  </Banner>
) : (
  <Banner variant="info" inline>
    Tap <strong>Pay</strong> to open your UPI app with the exact amount
    pre-filled. After paying, confirm on the next prompt.
  </Banner>
)}
        </div>
      )}

      {/* ---------- Step 2: Send ---------- */}
      {step === 'send' && (
        <div className={local.stepBody}>
          {generateError && (
            <Banner variant="error" onDismiss={() => setGenerateError('')}>
              {generateError}
            </Banner>
          )}

          <div className={local.sendInstructions}>
            <h4 className={local.sendTitle}>Send these to the store</h4>
            <ol className={local.sendSteps}>
              <li>
                <strong>Bill PDF</strong> - download it below.
              </li>
              <li>
                <strong>Payment proof</strong> - a screenshot of your UPI
                payment.
              </li>
              <li>
                <strong>Current location</strong> - so the store can deliver.
              </li>
            </ol>
            <p className={local.sendNote}>
              WhatsApp will open with <strong>Order No</strong> and{' '}
              <strong>Customer name</strong> pre-filled. Please attach the
              files above in the chat before sending.
            </p>
          </div>

          {paymentMode === 'Online' && paidConfirmed && (
  <div className={local.paidBadge}>
    Payment marked as paid - {formatRupees(total)}
  </div>
)}

{paymentMode === 'COD' && (
  <div className={local.paidBadge}>
    Please keep {formatRupees(total)} cash ready for delivery.
  </div>
)}
        </div>
      )}

      {/* ---------- Success ---------- */}
      {step === 'success' && (
        <div className={local.stepBody}>
          <div className={local.successBlock}>
            <div className={local.successIcon}>
          <CheckIcon width={32} height={32} fill="#1e7e34" />
        </div>
            <h3 className={local.successTitle}>Order placed successfully</h3>
            <p className={local.successText}>
              Thank you, {customerName}! Please remember to attach the bill
              PDF, payment proof, and your location in the WhatsApp chat with
              the store.
            </p>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default OrderCheckoutModal;