import React from 'react';
import { CartItem as CartItemType } from '../../types';
import { PlusIcon, MinusIcon } from '../../assets/svgs';
import styles from './Cart.module.scss';

interface CartItemProps {
  item: CartItemType;
  onIncrement: (id: number, customizations?: Record<string, string>) => void;
  onDecrement: (id: number, customizations?: Record<string, string>) => void;
}

const CartItem: React.FC<CartItemProps> = ({ item, onIncrement, onDecrement }) => {
  const basePrice = item.basePrice || item.price;
  const addonPrice = item.addonPrice || 0;
  const pricePerItem = basePrice + addonPrice;
  const total = pricePerItem * item.quantity;

  const getCustomizationSummary = (): string => {
    if (!item.customizations || Object.keys(item.customizations).length === 0) return '';
    return Object.entries(item.customizations)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  };

  const hasCustomizations = item.customizations && Object.keys(item.customizations).length > 0;
  const hasAddons = addonPrice > 0;

  return (
    <div className={styles.cartItem}>
      <div className={styles.itemInfo}>
        <div className={styles.itemDetails}>
          <span className={styles.itemName}>{item.name}</span>
          {hasCustomizations && (
            <div className={styles.customizationSummary}>
              {getCustomizationSummary()}
            </div>
          )}
          {hasAddons && (
            <div className={styles.addonInfo}>
              +Rs{addonPrice} add-ons
            </div>
          )}
          <div className={styles.itemPriceBreakdown}>
            <span className={styles.pricePerUnit}>
              Rs{basePrice}
              {hasAddons && ` + Rs${addonPrice}`}
            </span>
          </div>
        </div>
        <div className={styles.qtyBox}>
          <div  className={styles.qtyControls}>
            <button onClick={() => onDecrement(item.id, item.customizations)}>
              <MinusIcon width={14} height={14} fill="#3caa46" />
            </button>
            <span className={styles.qtyNum}>{item.quantity}</span>
            <button onClick={() => onIncrement(item.id, item.customizations)}>
              <PlusIcon width={14} height={14} fill="#3caa46" />
            </button>
          </div>
          <div className={styles.itemRight}>
            <span className={styles.itemPrice}>Rs{total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;