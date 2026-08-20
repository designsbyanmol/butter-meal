import React from 'react';
import { CartItem, PaymentMode, DeliveryType, ScheduleData } from '../../types';
import CartItemComponent from './CartItem';
import {
  CartIcon,
  CloseIcon,
  WhatsAppIcon,
  ClockIcon,
  DiscountIcon,
  CheckIcon,
  PlusIcon
} from '../../assets/svgs';
import styles from './Cart.module.scss';

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
  totalItems
}) => {
    // Add this useEffect
  React.useEffect(() => {
    if (deliveryType === 'schedule' && paymentMode !== 'Online') {
      onPaymentChange('Online');
    }
  }, [deliveryType, paymentMode, onPaymentChange]);
  if (!isOpen) return null;

  const isSchedule = deliveryType === 'schedule';
  const hasItems = cart.length > 0;

  // Helper to generate unique key for cart items with customizations
  const getItemKey = (item: CartItem): string => {
    const customStr = item.customizations ? JSON.stringify(item.customizations) : 'none';
    return `${item.id}-${customStr}`;
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalBoxContent}>
          <div className={styles.modalHeader}>
            <h2>
              Your Cart <span>{hasItems && `${totalItems} items`}</span>
            </h2>
            <button className={styles.closeModal} onClick={onClose}>
              <CloseIcon width={18} height={18} fill="#1e1e1e" />
            </button>
          </div>
          
          <div className={styles.modalItems}>
            {!hasItems ? (
              <div className={styles.emptyCart}>
                <span className={styles.emptyCartIcon}>
                  <CartIcon width={32} height={32} fill="#7d6b60" />
                </span>
                your cart is empty
              </div>
            ) : (
              cart.map(item => (
                <CartItemComponent
                  key={getItemKey(item)}
                  item={item}
                  onIncrement={onIncrement}
                  onDecrement={onDecrement}
                />
              ))
            )}
          </div>

          {hasItems && (
            <>
              <div className={styles.cartSummary}>
                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span className={styles.value}>Rs{Math.round(subtotal)}</span>
                </div>
                <div className={styles.summaryRow}>
                  <span>Delivery Fee</span>
                  <span className={styles.value}>Rs{deliveryFee}</span>
                </div>
                {discount > 0 && (
                  <div className={`${styles.summaryRow} ${styles.discountRow}`}>
                    <span>Discount ({discountPercent}% off)</span>
                    <span className={styles.value}>-Rs{discount}</span>
                  </div>
                )}
              </div>

              <div className={styles.optionsSection}>
                <div className={styles.optionGroup}>
                  <label>Payment mode</label>
                  <div className={styles.radioGroup}>
                    <label className={`${paymentMode === 'COD' ? styles.active : ''} ${isSchedule ? styles.disabled : ''}`}>
                      <input 
                        type="radio" 
                        name="paymentMode" 
                        value="COD" 
                        checked={paymentMode === 'COD'}
                        onChange={() => onPaymentChange('COD')}
                        disabled={isSchedule}
                      /> COD
                    </label>
                    <label className={`${styles.discountLabel} ${paymentMode === 'Online' ? styles.active : ''}`}>
                      <input 
                        type="radio" 
                        name="paymentMode" 
                        value="Online" 
                        checked={paymentMode === 'Online'}
                        onChange={() => onPaymentChange('Online')}
                      /> Online
                      {discountPercent > 0 &&(
                      <span className={styles.discountBadge}>
                        <DiscountIcon width={14} height={14} fill="#fff" />
                        {discountPercent}% off
                      </span>
                      )}
                    </label>
                  </div>
                </div>
                <div className={styles.optionGroup}>
                  <label>Delivery type</label>
                  <div className={styles.radioGroup}>
                    <label className={deliveryType === 'now' ? styles.active : ''}>
                      <input 
                        type="radio" 
                        name="deliveryType" 
                        value="now" 
                        checked={deliveryType === 'now'}
                        onChange={() => onDeliveryChange('now')}
                      /> 
                        Deliver Now
                    </label>
                    <label className={deliveryType === 'schedule' ? styles.active : ''}>
                      <input 
                        type="radio" 
                        name="deliveryType" 
                        value="schedule" 
                        checked={deliveryType === 'schedule'}
                        onChange={() => onDeliveryChange('schedule')}
                      />
                        Schedule Later
                    </label>
                  </div>
                </div>
                <div className={`${styles.scheduleNote} ${isSchedule && scheduleData ? styles.success : ''}`}>
                  {isSchedule && scheduleData ? (
                    <>
                      <CheckIcon width={12} height={12} fill="#1e7e34" />
                      <span>Scheduled for {scheduleData.date} at {scheduleData.time}</span>
                    </>
                  ) : isSchedule ? (
                    <>
                      <ClockIcon width={12} height={12} fill="#c0392b" />
                      <span>Scheduled orders: Prepaid only · Non-refundable · Reminder sent 1hr before</span>
                    </>
                  ) : null}
                </div>
              </div>
            </>
          )}

          <div className={styles.modalTotal}>
            <span>Total Amount</span>
            <span className={styles.totalValue}>
              {paymentMode === 'Online' && hasItems && discountPercent > 0 &&(
                <del className={styles.originalPrice}>Rs{subtotal + deliveryFee}</del>
              )} {hasItems ? `Rs${total}` : 0}
            </span>
          </div>
          <div className={styles.appliedOffer}>
            {hasItems ? (
              discountPercent > 0 ? (
                <>
                  <span className={styles.discountText}>
                    <DiscountIcon width={12} height={12} fill="#1e1e1e" />
                    ({discountPercent}% off applied)
                  </span>
                </>
              ) : (
                `incl. delivery`
              )
            ) : (
              'No items'
            )}
          </div>
          
          <div className={styles.modalActions}>
            <button 
              className={styles.btnAddMore} 
              onClick={onClose} 
            >
              <PlusIcon width={16} height={16} fill="#1e1e1e" />
              Add Item
            </button>
            <button 
              className={styles.btnPlaceOrder} 
              onClick={onPlaceOrder}
              disabled={!hasItems}
            >
              <WhatsAppIcon width={16} height={16} fill="white" />
              Place Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartModal;