// hooks/useCart.ts
import { useState, useEffect, useCallback } from 'react';
import {
  CartItem,
  MenuItem,
  ScheduleData,
  PaymentMode,
  DeliveryType,
} from '../types';
import { ShopInfo } from '../config/credentials';
import { useTenant } from '../contexts/TenantContext';
import { tenantKey } from '../utils/tenantStorage';

// ---- base keys (namespaced at runtime) ----
const BASE_CART = 'restaurant_cart';
const BASE_PAYMENT = 'restaurant_payment_mode';
const BASE_DELIVERY = 'restaurant_delivery_type';
const BASE_SCHEDULE = 'restaurant_schedule_data';

export const getEffectivePrice = (item: MenuItem): number => {
  const d = Number(item.discount ?? 0);
  if (!Number.isFinite(d) || d <= 0 || d > 100) return item.price;
  return Math.round(item.price * (1 - d / 100));
};

export const useCart = () => {
  const { tenant } = useTenant();

  // ---- namespaced keys for this tenant ----
  const CART_KEY = tenantKey(BASE_CART, tenant?.slug);
  const PAYMENT_KEY = tenantKey(BASE_PAYMENT, tenant?.slug);
  const DELIVERY_KEY = tenantKey(BASE_DELIVERY, tenant?.slug);
  const SCHEDULE_KEY = tenantKey(BASE_SCHEDULE, tenant?.slug);

  const DELIVERY_FEE =
    typeof tenant?.deliveryCharge === 'number' && tenant.deliveryCharge >= 0
      ? tenant.deliveryCharge
      : ShopInfo.Delivery_charge;

  const DISCOUNT_PERCENTAGE =
    typeof tenant?.storewideDiscount === 'number' &&
    tenant.storewideDiscount >= 0 &&
    tenant.storewideDiscount <= 100
      ? tenant.storewideDiscount
      : ShopInfo.Storewide_discount;

  const RESTAURANT_PHONE =
    tenant?.whatsappPhone || ShopInfo.Store_whatsapp;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('now');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // ---------------------------------------------------------
  // Hydrate from localStorage whenever the tenant changes.
  // ---------------------------------------------------------
  useEffect(() => {
    setCart([]);
    setPaymentMode('COD');
    setDeliveryType('now');
    setScheduleData(null);
    setIsLoaded(false);

    // ---- Cart ----
    try {
      const saved = localStorage.getItem(CART_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setCart(
            parsed.filter(
              (item: any) =>
                item && typeof item === 'object' && item.id && item.quantity,
            ),
          );
        }
      }
    } catch {
      setCart([]);
    }

    // ---- Payment mode ----
    const savedPayment = localStorage.getItem(PAYMENT_KEY) as PaymentMode | null;
    if (savedPayment) setPaymentMode(savedPayment);

    // ---- Delivery type ----
    const savedDelivery = localStorage.getItem(DELIVERY_KEY) as DeliveryType | null;
    if (savedDelivery) setDeliveryType(savedDelivery);

    // ---- Schedule ----
    try {
      const savedSchedule = localStorage.getItem(SCHEDULE_KEY);
      if (savedSchedule) {
        const parsed = JSON.parse(savedSchedule);
        if (parsed && parsed.date && parsed.time) setScheduleData(parsed);
      }
    } catch {
      setScheduleData(null);
    }

    setIsLoaded(true);
  }, [CART_KEY, PAYMENT_KEY, DELIVERY_KEY, SCHEDULE_KEY]);

  // Persist cart
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
    } catch {
      /* ignore */
    }
  }, [cart, isLoaded, CART_KEY]);

  // Persist payment mode
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(PAYMENT_KEY, paymentMode);
    } catch {
      /* ignore */
    }
  }, [paymentMode, isLoaded, PAYMENT_KEY]);

  // Persist delivery type
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(DELIVERY_KEY, deliveryType);
    } catch {
      /* ignore */
    }
  }, [deliveryType, isLoaded, DELIVERY_KEY]);

  // Persist schedule
  useEffect(() => {
    if (!isLoaded) return;
    try {
      if (scheduleData) {
        localStorage.setItem(SCHEDULE_KEY, JSON.stringify(scheduleData));
      } else {
        localStorage.removeItem(SCHEDULE_KEY);
      }
    } catch {
      /* ignore */
    }
  }, [scheduleData, isLoaded, SCHEDULE_KEY]);

  // Migrate legacy cart rows: recompute basePrice for discounts
  useEffect(() => {
    if (!isLoaded) return;
    setCart((prev) => {
      let changed = false;
      const next = prev.map((c) => {
        const d = Number(c.discount ?? 0);
        if (d <= 0 || d > 100) return c;
        const expected = Math.round(c.price * (1 - d / 100));
        if (c.basePrice === expected) return c;
        changed = true;
        return { ...c, basePrice: expected };
      });
      return changed ? next : prev;
    });
  }, [isLoaded]);

  // ---------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------
  const getCustomizationPrice = (
    customizations: Record<string, string>,
  ): number => {
    let total = 0;
    Object.values(customizations).forEach((option) => {
      const match = option.match(/\+Rs(\d+)/);
      if (match) total += parseInt(match[1], 10);
    });
    return total;
  };

  const addItem = useCallback(
    (
      item: MenuItem,
      customizations?: Record<string, string>,
      customMessage?: string,
      quantityToAdd: number = 1,
    ) => {
      const qty = Math.max(1, Math.floor(quantityToAdd) || 1);

      setCart((prevCart) => {
        const addonPrice = customizations
          ? getCustomizationPrice(customizations)
          : 0;

        const discountedBase = getEffectivePrice(item);

        const existingIndex = prevCart.findIndex((c) => {
          if (c.id !== item.id) return false;
          if (!customizations && !c.customizations) return true;
          if (customizations && c.customizations) {
            return (
              JSON.stringify(customizations) === JSON.stringify(c.customizations)
            );
          }
          return false;
        });

        if (existingIndex !== -1) {
          const updatedCart = [...prevCart];
          updatedCart[existingIndex] = {
            ...updatedCart[existingIndex],
            basePrice: discountedBase,
            addonPrice,
            quantity: updatedCart[existingIndex].quantity + qty,
            customMessage:
              customMessage || updatedCart[existingIndex].customMessage,
          };
          return updatedCart;
        }

        return [
          ...prevCart,
          {
            ...item,
            quantity: qty,
            customizations: customizations || {},
            customMessage: customMessage || '',
            addonPrice,
            basePrice: discountedBase,
          },
        ];
      });
    },
    [],
  );

  /**
   * Set the cart line for this item+customizations to an exact quantity.
   * If the line doesn't exist, behaves like addItem with that quantity.
   */
  const setItemQuantity = useCallback(
    (
      item: MenuItem,
      customizations?: Record<string, string>,
      customMessage?: string,
      quantity: number = 1,
    ) => {
      const qty = Math.max(1, Math.floor(quantity) || 1);

      setCart((prevCart) => {
        const addonPrice = customizations
          ? getCustomizationPrice(customizations)
          : 0;
        const discountedBase = getEffectivePrice(item);

        const existingIndex = prevCart.findIndex((c) => {
          if (c.id !== item.id) return false;
          if (!customizations && !c.customizations) return true;
          if (customizations && c.customizations) {
            return (
              JSON.stringify(customizations) === JSON.stringify(c.customizations)
            );
          }
          return false;
        });

        if (existingIndex === -1) {
          return [
            ...prevCart,
            {
              ...item,
              quantity: qty,
              customizations: customizations || {},
              customMessage: customMessage || '',
              addonPrice,
              basePrice: discountedBase,
            },
          ];
        }

        const updatedCart = [...prevCart];
        updatedCart[existingIndex] = {
          ...updatedCart[existingIndex],
          basePrice: discountedBase,
          addonPrice,
          quantity: qty,
          customMessage:
            customMessage || updatedCart[existingIndex].customMessage,
        };
        return updatedCart;
      });
    },
    [],
  );

  const removeItem = useCallback(
    (id: number, customizations?: Record<string, string>) => {
      setCart((prevCart) => {
        const index = prevCart.findIndex((c) => {
          if (c.id !== id) return false;
          if (!customizations && !c.customizations) return true;
          if (customizations && c.customizations) {
            return (
              JSON.stringify(customizations) === JSON.stringify(c.customizations)
            );
          }
          return false;
        });

        if (index === -1) return prevCart;

        const updatedCart = [...prevCart];
        if (updatedCart[index].quantity <= 1) {
          updatedCart.splice(index, 1);
        } else {
          updatedCart[index] = {
            ...updatedCart[index],
            quantity: updatedCart[index].quantity - 1,
          };
        }
        return updatedCart;
      });
    },
    [],
  );

  const removeItemCompletely = useCallback(
    (id: number, customizations?: Record<string, string>) => {
      setCart((prevCart) =>
        prevCart.filter((c) => {
          if (c.id !== id) return true;
          if (!customizations && !c.customizations) return false;
          if (customizations && c.customizations) {
            return (
              JSON.stringify(customizations) !== JSON.stringify(c.customizations)
            );
          }
          return true;
        }),
      );
    },
    [],
  );

  const clearCart = useCallback(() => {
    setCart([]);
    setScheduleData(null);
    try {
      localStorage.removeItem(SCHEDULE_KEY);
    } catch {
      /* ignore */
    }
  }, [SCHEDULE_KEY]);

  const getTotalItems = useCallback(() => {
    return cart.reduce((sum, item) => sum + (item.quantity || 0), 0);
  }, [cart]);

  const getSubtotal = useCallback(() => {
    return cart.reduce((sum, item) => {
      const price = item.basePrice || item.price;
      const addonPrice = item.addonPrice || 0;
      return sum + (price + addonPrice) * (item.quantity || 0);
    }, 0);
  }, [cart]);

  const getDiscountPercent = useCallback(
    () => DISCOUNT_PERCENTAGE,
    [DISCOUNT_PERCENTAGE],
  );

  const getDiscountAmount = useCallback(() => {
    const subtotal = getSubtotal();
    const baseTotal = subtotal + DELIVERY_FEE;
    if (paymentMode === 'Online') {
      return Math.round(baseTotal * (DISCOUNT_PERCENTAGE / 100));
    }
    return 0;
  }, [getSubtotal, paymentMode, DELIVERY_FEE, DISCOUNT_PERCENTAGE]);

  const getTotalWithDelivery = useCallback(() => {
    const subtotal = getSubtotal();
    const baseTotal = subtotal + DELIVERY_FEE;
    const discount = getDiscountAmount();
    if (paymentMode === 'Online') {
      return Math.round(baseTotal - discount);
    }
    return Math.round(baseTotal);
  }, [getSubtotal, paymentMode, getDiscountAmount, DELIVERY_FEE]);

  const getDeliveryTime = useCallback(() => {
    const totalItems = getTotalItems();
    const extraMinutes = Math.max(0, (totalItems - 1) * 3);
    const totalDeliveryMinutes = 30 + extraMinutes;
    const now = new Date();
    const deliveryTime = new Date(
      now.getTime() + totalDeliveryMinutes * 60 * 1000,
    );

    let hours = deliveryTime.getHours();
    const mins = String(deliveryTime.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours}:${mins} ${ampm}`;
  }, [getTotalItems]);

  const generateOrderNumber = useCallback(() => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const hours = String(now.getHours()).padStart(2, '0');
    const mins = String(now.getMinutes()).padStart(2, '0');
    return `${day}${month}${hours}${mins}`;
  }, []);

  return {
    cart,
    paymentMode,
    setPaymentMode,
    deliveryType,
    setDeliveryType,
    scheduleData,
    setScheduleData,
    addItem,
    setItemQuantity,
    removeItem,
    removeItemCompletely,
    clearCart,
    getTotalItems,
    getSubtotal,
    getTotalWithDiscount: getTotalWithDelivery,
    getTotalWithDelivery,
    getDiscountPercent,
    getDiscountAmount,
    getDeliveryTime,
    generateOrderNumber,
    DELIVERY_FEE,
    RESTAURANT_PHONE,
    isLoaded,
  };
};