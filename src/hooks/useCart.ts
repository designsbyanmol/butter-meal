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

const DELIVERY_FEE = ShopInfo.Delivery_fee;
const DISCOUNT_PERCENTAGE = ShopInfo.Discount_percentage;
const FALLBACK_PHONE = ShopInfo.Restaurant_message;

export const useCart = () => {
  const { tenant } = useTenant();

  // ✅ Per-tenant WhatsApp order phone, with a fallback for the main host
  const RESTAURANT_PHONE = tenant?.whatsappPhone || FALLBACK_PHONE;

  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('COD');
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('now');
  const [scheduleData, setScheduleData] = useState<ScheduleData | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart + preferences from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('restaurant_cart');
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          setCart(
            parsed.filter(
              (item: any) =>
                item && typeof item === 'object' && item.id && item.quantity,
            ),
          );
        } else {
          setCart([]);
        }
      } catch {
        setCart([]);
      }
    }

    const savedPaymentMode = localStorage.getItem(
      'restaurant_payment_mode',
    ) as PaymentMode;
    if (savedPaymentMode) setPaymentMode(savedPaymentMode);

    const savedDeliveryType = localStorage.getItem(
      'restaurant_delivery_type',
    ) as DeliveryType;
    if (savedDeliveryType) setDeliveryType(savedDeliveryType);

    const savedScheduleData = localStorage.getItem('restaurant_schedule_data');
    if (savedScheduleData) {
      try {
        const parsed = JSON.parse(savedScheduleData);
        if (parsed && parsed.date && parsed.time) setScheduleData(parsed);
      } catch {
        setScheduleData(null);
      }
    }

    setIsLoaded(true);
  }, []);

  // Persist cart
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('restaurant_cart', JSON.stringify(cart));
    }
  }, [cart, isLoaded]);

  // Persist payment mode
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('restaurant_payment_mode', paymentMode);
    }
  }, [paymentMode, isLoaded]);

  // Persist delivery type
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('restaurant_delivery_type', deliveryType);
    }
  }, [deliveryType, isLoaded]);

  // Persist schedule data
  useEffect(() => {
    if (isLoaded) {
      if (scheduleData) {
        localStorage.setItem(
          'restaurant_schedule_data',
          JSON.stringify(scheduleData),
        );
      } else {
        localStorage.removeItem('restaurant_schedule_data');
      }
    }
  }, [scheduleData, isLoaded]);

  // Parse add-on prices out of customization display strings
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
    ) => {
      setCart((prevCart) => {
        const addonPrice = customizations
          ? getCustomizationPrice(customizations)
          : 0;

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
            quantity: updatedCart[existingIndex].quantity + 1,
            customMessage:
              customMessage || updatedCart[existingIndex].customMessage,
          };
          return updatedCart;
        }

        return [
          ...prevCart,
          {
            ...item,
            quantity: 1,
            customizations: customizations || {},
            customMessage: customMessage || '',
            addonPrice,
            basePrice: item.price,
          },
        ];
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
    localStorage.removeItem('restaurant_schedule_data');
  }, []);

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

  const getDiscountPercent = useCallback(() => {
    return DISCOUNT_PERCENTAGE;
  }, []);

  const getDiscountAmount = useCallback(() => {
    const subtotal = getSubtotal();
    const discountPercent = getDiscountPercent();
    const baseTotal = subtotal + DELIVERY_FEE;
    if (paymentMode === 'Online') {
      return Math.round(baseTotal * (discountPercent / 100));
    }
    return 0;
  }, [getSubtotal, paymentMode, getDiscountPercent]);

  const getTotalWithDelivery = useCallback(() => {
    const subtotal = getSubtotal();
    const baseTotal = subtotal + DELIVERY_FEE;
    const discount = getDiscountAmount();
    if (paymentMode === 'Online') {
      return Math.round(baseTotal - discount);
    }
    return Math.round(baseTotal);
  }, [getSubtotal, paymentMode, getDiscountAmount]);

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
    removeItem,
    removeItemCompletely,
    clearCart,
    getTotalItems,
    getSubtotal,
    getTotalWithDiscount: getTotalWithDelivery, // alias for backwards compat
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