// src/hooks/useDineinCustomer.ts
import { useCallback, useEffect, useState } from 'react';
import { useTenant } from '../contexts/TenantContext';
import { supabaseService } from '../services/supabase.service';
import { getEffectiveDeviceId } from '../utils/deviceId';
import { DineinOrder } from '../types';

interface UseDineinCustomerOptions {
  /**
   * When false, the hook does nothing — no fetch, no state updates.
   * Set to true when the caller actually needs the data.
   */
  enabled?: boolean;

  /**
   * Scope the hook to a single order. When set, `openOrders` will
   * contain at most this one order, and `requestBill` will only affect
   * it. This is the correct mode for the customer-facing bill flow —
   * it prevents the bill from sweeping up unrelated orders that happen
   * to share the same device id (e.g. two tabs of the same browser).
   *
   * When null/undefined, the hook falls back to "all open orders for
   * this device" — useful for a dashboard-style overview, not for the
   * customer bill button.
   */
  orderId?: string | null;
}

interface UseDineinCustomerResult {
  openOrders: DineinOrder[];
  loading: boolean;
  reload: () => Promise<void>;
  requestBill: (payOnline: boolean) => Promise<void>;
}

export const useDineinCustomer = (
  options: UseDineinCustomerOptions = {},
): UseDineinCustomerResult => {
  const { enabled = false, orderId = null } = options;
  const { tenant } = useTenant();

  const [deviceId] = useState<string | null>(() => getEffectiveDeviceId());

  const [openOrders, setOpenOrders] = useState<DineinOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    if (!tenant?.dineinEnabled) {
      setOpenOrders([]);
      return;
    }

    setLoading(true);
    try {
      // -----------------------------------------------------
      // Mode 1 — scoped to one specific order.
      // -----------------------------------------------------
      if (orderId) {
        const one = await supabaseService.getDineinOrderById(orderId);
        if (
          one &&
          [
            'placed',
            'accepted',
            'preparing',
            'served',
            'bill_requested',
          ].includes(one.status)
        ) {
          setOpenOrders([one]);
        } else {
          setOpenOrders([]);
        }
        return;
      }

      // -----------------------------------------------------
      // Mode 2 — all open orders for this device.
      // -----------------------------------------------------
      if (!deviceId) {
        setOpenOrders([]);
        return;
      }
      const list = await supabaseService.getDineinOrdersForDevice(
        tenant.slug,
        deviceId,
        ['placed', 'accepted', 'preparing', 'served', 'bill_requested'],
      );
      setOpenOrders(list);
    } catch (err) {
      console.warn('[useDineinCustomer] reload failed:', err);
    } finally {
      setLoading(false);
    }
  }, [tenant?.slug, tenant?.dineinEnabled, deviceId, orderId]);

  useEffect(() => {
    if (!enabled) return;
    reload();
  }, [enabled, reload]);

  const requestBill = useCallback(
    async (payOnline: boolean) => {
      if (openOrders.length === 0) return;
      for (const o of openOrders) {
        await supabaseService.requestDineinBill(o.id, payOnline);
      }
      await reload();
    },
    [openOrders, reload],
  );

  return { openOrders, loading, reload, requestBill };
};