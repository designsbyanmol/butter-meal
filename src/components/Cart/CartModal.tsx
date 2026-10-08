// src/components/Cart/CartModal.tsx
import React from 'react';
import {
  CartItem,
  PaymentMode,
  DeliveryType,
  ScheduleData,
} from '../../types';
import { Sheet, Modal, Button, Tabs, Banner, EmptyState } from '../ui';
import { useIsMobile } from '../../hooks/useIsMobile';
import { formatRupees } from '../../utils/subscription';
import CartItemComponent from './CartItem';
import {
  CartIcon,
  WhatsAppIcon,
  ClockIcon,
  DiscountIcon,
  CheckIcon,
  PlusIcon,
} from '../../assets/svgs';
import local from './Cart.module.scss';

interface CartModalProps {
  isOpen: boolean;
  cart: CartItem[];
  paymentMode: PaymentMode;
  deliveryType: DeliveryType;
  scheduleData: ScheduleData | null;
  onClose: () => void;
  onIncrement: (id: number, customizations?: Record<string, string>) => void;
  onDecrement: (id: number, customizations?: Record<string, string>) => void;
  onPlaceOrder: () => void;
  onPaymentChange: (mode: PaymentMode) => void;
  onDeliveryChange: (type: DeliveryType) => void;
  onOpenSchedule: () => void;
  subtotal: number;
  total: number;
  discount: number;
  discountPercent: number;
  deliveryFee: number;
  totalItems: number;
  acceptingOrders?: boolean;
}

const CartModal: React.FC<CartModalProps> = ({
  isOpen,
  cart,
  paymentMode,
  deliveryType,
  scheduleData,
  onClose,
  onIncrement,
  onDecrement,
  onPlaceOrder,
  onPaymentChange,
  onDeliveryChange,
  subtotal,
  total,
  discount,
  discountPercent,
  deliveryFee,
  totalItems,
  acceptingOrders,
}) => {
  const isMobile = useIsMobile();

  React.useEffect(() => {
    if (deliveryType === 'schedule' && paymentMode !== 'Online') {
      onPaymentChange('Online');
    }
  }, [deliveryType, paymentMode, onPaymentChange]);

  if (!isOpen) return null;

  const isSchedule = deliveryType === 'schedule';
  const hasItems = cart.length > 0;

  const getItemKey = (item: CartItem): string => {
    const customStr = item.customizations
      ? JSON.stringify(item.customizations)
      : 'none';
    const messageStr = item.customMessage || 'none';
    return `${item.id}-${customStr}-${messageStr}`;
  };

  const bodyContent = !hasItems ? (
    <EmptyState
      icon={<CartIcon width={32} height={32} fill="#7d6b60" />}
      title="Your cart is empty"
      description="Add some items to get started."
    />
  ) : (
    <>
      <div className={local.itemsList}>
        {cart.map((item) => (
          <div key={getItemKey(item)} className={local.itemWrapper}>
            <CartItemComponent
              item={item}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
            {item.customMessage && item.customMessage.trim() && (
              <div className={local.customMessageDisplay}>
                <span className={local.messageText}>
                  "{item.customMessage.trim()}"
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={local.summary}>
        <div className={local.summaryRow}>
          <span>Subtotal</span>
          <span className={local.value}>
            {formatRupees(Math.round(subtotal))}
          </span>
        </div>
        <div className={local.summaryRow}>
          <span>Delivery Fee</span>
          <span className={local.value}>{formatRupees(deliveryFee)}</span>
        </div>
        {discount > 0 && (
          <div className={`${local.summaryRow} ${local.discountRow}`}>
            <span>Discount ({discountPercent}% off)</span>
            <span className={local.value}>
              -{formatRupees(discount)}
            </span>
          </div>
        )}
      </div>

      <div className={local.optionsSection}>
        <div className={local.optionGroup}>
          <label>Payment mode</label>
          <Tabs
            block
            items={[
              { key: 'COD', label: 'COD', disabled: isSchedule },
              {
                key: 'Online',
                label: (
                  <span className={local.onlineLabel}>
                    Online
                    {discountPercent > 0 && (
                      <span className={local.discountBadge}>
                        <DiscountIcon width={12} height={12} fill="#fff" />
                        {discountPercent}% off
                      </span>
                    )}
                  </span>
                ),
              },
            ]}
            value={paymentMode}
            onChange={(k) => onPaymentChange(k as PaymentMode)}
          />
        </div>

        <div className={local.optionGroup}>
          <label>Delivery type</label>
          <Tabs
            block
            items={[
              { key: 'now', label: 'Deliver Now' },
              { key: 'schedule', label: 'Schedule Later' },
            ]}
            value={deliveryType}
            onChange={(k) => onDeliveryChange(k as DeliveryType)}
          />
        </div>

        {isSchedule &&
          (scheduleData ? (
            <Banner variant="success" inline>
              <span className={local.scheduleInline}>
                <CheckIcon width={12} height={12} fill="#1e7e34" />
                Scheduled for {scheduleData.date} at {scheduleData.time}
              </span>
            </Banner>
          ) : (
            <Banner variant="warning" inline>
              <span className={local.scheduleInline}>
                <ClockIcon width={12} height={12} fill="#c0392b" />
                Scheduled orders: Prepaid only . Non-refundable . Reminder
                sent 1hr before
              </span>
            </Banner>
          ))}
      </div>

      <div className={local.totalRow}>
        <span>Total Amount</span>
        <span className={local.totalValue}>
          {paymentMode === 'Online' && discountPercent > 0 && (
            <del className={local.originalPrice}>
              {formatRupees(subtotal + deliveryFee)}
            </del>
          )}{' '}
          {formatRupees(total)}
        </span>
      </div>

      <div className={local.appliedOffer}>
        {discountPercent > 0 ? (
          paymentMode === 'Online' ? (
            <span className={local.discountText}>
              <DiscountIcon width={12} height={12} fill="#1e1e1e" />
              ({discountPercent}% off applied)
            </span>
          ) : (
            'incl. delivery'
          )
        ) : (
          'incl. delivery'
        )}
      </div>
    </>
  );

  const footerContent = (
    <>
      <Button
        variant="ghost"
        onClick={onClose}
        leftIcon={<PlusIcon width={14} height={14} fill="#1e1e1e" />}
      >
        Add Item
      </Button>
      <Button
        block
        onClick={onPlaceOrder}
        disabled={!hasItems || acceptingOrders === false}
        leftIcon={<WhatsAppIcon width={16} height={16} fill="#fff" />}
        title={
          acceptingOrders === false
            ? 'This store is not accepting orders right now'
            : undefined
        }
      >
        {acceptingOrders === false ? 'Ordering Disabled' : 'Place Order'}
      </Button>
    </>
  );

  return isMobile ? (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      className={local.cartPopup}
      title={
        <>
          Your Cart
          {hasItems && (
            <span className={local.headerCount}>{totalItems} items</span>
          )}
        </>
      }
      maxHeightVh={92}
      footer={footerContent}
    >
      {bodyContent}
    </Sheet>
  ) : (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <>
          Your Cart
          {hasItems && (
            <span className={local.headerCount}>{totalItems} items</span>
          )}
        </>
      }
      size="md"
      footer={footerContent}
    >
      {bodyContent}
    </Modal>
  );
};

export default CartModal;