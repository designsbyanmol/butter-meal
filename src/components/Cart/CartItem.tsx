// src/components/Cart/CartItem.tsx
import React from 'react';
import { CartItem as CartItemType } from '../../types';
import { IconButton } from '../ui';
import { PlusIcon, MinusIcon } from '../../assets/svgs';
import { formatRupees } from '../../utils/subscription';
import local from './Cart.module.scss';

interface CartItemProps {
  item: CartItemType;
  onIncrement: (id: number, customizations?: Record<string, string>) => void;
  onDecrement: (id: number, customizations?: Record<string, string>) => void;
}

const CartItem: React.FC<CartItemProps> = ({
  item,
  onIncrement,
  onDecrement,
}) => {
  const basePrice = item.basePrice || item.price;
  const addonPrice = item.addonPrice || 0;
  const pricePerItem = basePrice + addonPrice;
  const total = pricePerItem * item.quantity;

  const getCustomizationSummary = (): string => {
    if (!item.customizations || Object.keys(item.customizations).length === 0)
      return '';
    return Object.entries(item.customizations)
      .map(([key, value]) => `${key}: ${value}`)
      .join(' | ');
  };

  const hasCustomizations =
    item.customizations && Object.keys(item.customizations).length > 0;
  const hasAddons = addonPrice > 0;

  return (
    <div className={local.cartItem}>
      <div className={local.itemInfo}>
        <div className={local.itemDetails}>
          <span className={local.itemName}>{item.name}</span>

          {hasCustomizations && (
            <div className={local.customizationSummary}>
              {getCustomizationSummary()}
            </div>
          )}

          {hasAddons && (
            <div className={local.addonInfo}>
              +{formatRupees(addonPrice)} add-ons
            </div>
          )}

          <div className={local.itemPriceBreakdown}>
            <span className={local.pricePerUnit}>
              {formatRupees(basePrice)}
              {hasAddons && ` + ${formatRupees(addonPrice)}`}
            </span>
          </div>
        </div>

        <div className={local.qtyBox}>
          <div className={local.qtyControls}>
            <IconButton
              variant="ghost"
              size="xs"
              shape="square"
              aria-label="Decrease quantity"
              onClick={() => onDecrement(item.id, item.customizations)}
            >
              <MinusIcon width={12} height={12} fill="#3caa46" />
            </IconButton>
            <span className={local.qtyNum}>{item.quantity}</span>
            <IconButton
              variant="ghost"
              size="sm"
              shape="square"
              aria-label="Increase quantity"
              onClick={() => onIncrement(item.id, item.customizations)}
            >
              <PlusIcon width={14} height={14} fill="#3caa46" />
            </IconButton>
          </div>
          <div className={local.itemRight}>
            <span className={local.itemPrice}>{formatRupees(total)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CartItem;