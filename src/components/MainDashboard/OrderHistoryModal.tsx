// src/components/MainDashboard/OrderHistoryModal.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Button, Chip, EmptyState, Banner } from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import { supabaseService } from '../../services/supabase.service';
import { DineinOrder } from '../../types';
import { formatRupees } from '../../utils/subscription';
import { DownloadIcon } from '../../assets/svgs';
import { downloadHistoryPdf } from '../../utils/historyPdf';
import local from './OrderHistoryModal.module.scss';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

type RangeKey = 'today' | '7d' | '30d' | '90d' | '180d' | '365d';

interface RangeOption {
  key: RangeKey;
  label: string;
  days: number;
}

const RANGE_OPTIONS: RangeOption[] = [
  { key: 'today', label: 'Today', days: 1 },
  { key: '7d', label: 'Weekly', days: 7 },
  { key: '30d', label: 'Monthly', days: 30 },
  { key: '90d', label: '3 Months', days: 90 },
  { key: '180d', label: '6 Months', days: 180 },
  { key: '365d', label: '1 Year', days: 365 },
];

const startOfDay = (d: Date): Date => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};

const rangeToFromIso = (key: RangeKey): string => {
  const now = new Date();
  switch (key) {
    case 'today':
      return startOfDay(now).toISOString();
    case '7d':
    case '30d':
    case '90d':
    case '180d':
    case '365d': {
      const opt = RANGE_OPTIONS.find((o) => o.key === key)!;
      const from = new Date(now);
      from.setDate(from.getDate() - opt.days);
      return startOfDay(from).toISOString();
    }
  }
};

const fmtDate = (iso: string): string =>
  new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

const fmtTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const paymentMode = (order: DineinOrder): string => {
  const ref = (order.paymentRef ?? '').toLowerCase();
  if (ref === 'online') return 'Online';
  if (ref === 'cash') return 'Cash';
  if (ref.startsWith('upi')) return 'Online';
  return 'Cash';
};

/**
 * Amounts displayed in order history intentionally exclude the
 * customer's staff tip. The tip is already part of `totalAmount`
 * (so the customer pays it), but it should not appear on history
 * surfaces. Subtract it wherever a total is shown.
 */
const tipExcludedTotal = (order: DineinOrder): number =>
  Number(order.totalAmount || 0) - Number(order.staffTip ?? 0);

const OrderHistoryModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const { tenant } = useTenant();
  const [range, setRange] = useState<RangeKey>('7d');
  const [orders, setOrders] = useState<DineinOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(
    async (r: RangeKey) => {
      if (!tenant) return;
      setLoading(true);
      setError('');
      try {
        const from = rangeToFromIso(r);
        const list = await supabaseService.getDineinOrderHistory(
          tenant.slug,
          from,
        );
        setOrders(list);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load');
      } finally {
        setLoading(false);
      }
    },
    [tenant?.slug],
  );

  useEffect(() => {
    if (!isOpen) return;
    load(range);
  }, [isOpen, range, load]);

  const totals = useMemo(() => {
    // `subtotal` never contains the tip, so `itemTotal` is already
    // tip-free. `totalAmount` DOES contain the tip, so we subtract it
    // per-order before summing.
    const itemTotal = orders.reduce(
      (s, o) => s + Number(o.subtotal || 0),
      0,
    );
    const totalWithTax = orders.reduce(
      (s, o) => s + tipExcludedTotal(o),
      0,
    );
    return {
      count: orders.length,
      itemTotal,
      totalWithTax,
    };
  }, [orders]);

  const rangeLabel =
    RANGE_OPTIONS.find((o) => o.key === range)?.label ?? 'Weekly';

  const handleDownload = () => {
    if (!tenant || orders.length === 0) return;
    downloadHistoryPdf({
      orders,
      tenantName: tenant.displayName,
      rangeLabel,
      totalWithoutGst: totals.itemTotal,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      mobileFullScreen
      title={
        <>
          Order History
          <span className={local.headerCount}>
            {totals.count} order{totals.count === 1 ? '' : 's'}
          </span>
        </>
      }
      size="lg"
      overlayZIndex={2000}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
          <Button
            variant="secondary"
            disabled={orders.length === 0}
            onClick={handleDownload}
            leftIcon={<DownloadIcon width={16} height={16} fill="#4d4d4d" />}
          >
            Download PDF
          </Button>
        </>
      }
    >
      {/* ---------- Filters ---------- */}
      <div className={local.filters}>
        {RANGE_OPTIONS.map((o) => (
          <Chip
            key={o.key}
            tone="primary"
            active={range === o.key}
            onClick={() => setRange(o.key)}
          >
            {o.label}
          </Chip>
        ))}
      </div>

      {/* ---------- Summary ---------- */}
      <div className={local.summary}>
        <div className={local.summaryMain}>
          <span className={local.summaryLabel}>
            Total Sale (excl. GST)
          </span>
          <span className={local.summaryValue}>
            {formatRupees(Math.round(totals.itemTotal))}
          </span>
        </div>
        <div className={local.summarySub}>
          <span>
            {totals.count} paid order{totals.count === 1 ? '' : 's'}
          </span>
          <span>
            Incl. tax: {formatRupees(Math.round(totals.totalWithTax))}
          </span>
        </div>
      </div>

      {error && (
        <Banner variant="error" onDismiss={() => setError('')}>
          {error}
        </Banner>
      )}

      {/* ---------- List ---------- */}
      {loading && orders.length === 0 ? (
        <EmptyState title="Loading orders..." />
      ) : orders.length === 0 ? (
        <EmptyState
          title="No orders in this range"
          description="Paid orders will show up here as soon as customers check out."
        />
      ) : (
        <ul className={local.list}>
          {orders.map((o, idx) => (
            <li key={o.id} className={local.row}>
              <span className={local.sn}>{idx + 1}</span>

              <span className={local.main}>
                <span className={local.topLine}>
                  <span className={local.orderNo}>#{o.orderNo}</span>
                  <span className={local.amount}>
                    {formatRupees(tipExcludedTotal(o))}
                  </span>
                </span>

                <span className={local.metaLine}>
                  <span className={local.mode}>{paymentMode(o)}</span>
                  <span className={local.dot}>.</span>
                  <span className={local.table}>
                    {o.tableLabelKind === 'number'
                      ? `Table ${o.tableLabel}`
                      : o.tableLabel}
                  </span>
                </span>

                <span className={local.dateLine}>
                  {fmtDate(o.createdAt)} . {fmtTime(o.createdAt)}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
};

export default OrderHistoryModal;