// components/MainDashboard/DineinOrdersModalBody.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  EmptyState,
  Badge,
  Banner,
  Button,
  ConfirmDialog,
  Tabs,
  Accordion,
  IconButton,
} from '../ui';
import { supabaseService } from '../../services/supabase.service';
import { useTenant } from '../../contexts/TenantContext';
import { DineinOrder, DineinOrderItem } from '../../types';
import { formatRupees } from '../../utils/subscription';
import OrderDetail from './OrderDetail/OrderDetail';
import OrderHistoryModal from './OrderHistoryModal';
import { CheckIcon, ClockIcon, InfoIcon } from '../../assets/svgs';
import { InlineSection } from '../Dashboard/inline';
import local from './DineinOrdersModal.module.scss';
import MarkPaidModal from './MarkPaidModal';
import { printReceiptNode } from '../../utils/printReceipt';
import Receipt from './OrderDetail/Receipt';

type TabKey = 'new' | 'preparing' | 'served' | 'rejected';

const ACTIVE_STATUSES: DineinOrder['status'][] = [
  'placed',
  'accepted',
  'preparing',
  'served',
  'bill_requested',
  'paid',
  'cancelled',
];

const TAB_STATUSES: Record<TabKey, DineinOrder['status'][]> = {
  new: ['placed'],
  preparing: ['accepted', 'preparing'],
  served: ['served', 'bill_requested', 'paid'],
  rejected: ['cancelled'],
};

const TAB_ORDER: TabKey[] = ['new', 'preparing', 'served', 'rejected'];

const statusLabel = (status: DineinOrder['status']): string => {
  switch (status) {
    case 'placed': return 'New';
    case 'accepted': return 'Accepted';
    case 'preparing': return 'Preparing';
    case 'served': return 'Served';
    case 'bill_requested': return 'Bill requested';
    case 'cancelled': return 'Rejected';
    case 'paid': return 'Paid';
    default: return status;
  }
};

const statusTone = (
  status: DineinOrder['status'],
): 'info' | 'warning' | 'success' | 'neutral' | 'danger' => {
  switch (status) {
    case 'placed': return 'danger';
    case 'accepted': return 'info';
    case 'preparing': return 'warning';
    case 'served': return 'success';
    case 'bill_requested': return 'neutral';
    case 'cancelled': return 'danger';
    default: return 'neutral';
  }
};

const stageAction = (
  status: DineinOrder['status'],
): { label: string; target: 'accepted' | 'preparing' } | null => {
  switch (status) {
    case 'placed': return { label: 'Accept', target: 'accepted' };
    case 'accepted': return { label: 'Preparing', target: 'preparing' };
    default: return null;
  }
};

const formatElapsed = (fromIso?: string): string => {
  if (!fromIso) return '';
  const sec = Math.max(
    0,
    Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000),
  );
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
};

const stageTimerBase = (o: DineinOrder): string | undefined => {
  switch (o.status) {
    case 'placed': return o.createdAt;
    case 'accepted': return o.acceptedAt;
    case 'preparing': return o.preparingAt;
    case 'served': return o.servedAt;
    default: return undefined;
  }
};

const tabForStatus = (status: DineinOrder['status']): TabKey | null => {
  for (const key of TAB_ORDER) {
    if (TAB_STATUSES[key].includes(status)) return key;
  }
  return null;
};

const allItemsServed = (order: DineinOrder): boolean =>
  order.items.length > 0 && order.items.every((it) => it.served === true);

const servedCount = (order: DineinOrder): number =>
  order.items.reduce((n, it) => (it.served ? n + 1 : n), 0);

const tableHeading = (o: DineinOrder): string =>
  o.tableLabelKind === 'number' ? `Table ${o.tableLabel}` : o.tableLabel;

const isOrderUnseen = (o: DineinOrder): boolean =>
  o.status === 'bill_requested';

type CardTone = 'failed' | 'info' | 'served';

const cardTone = (o: DineinOrder): CardTone => {
  if (o.status === 'paid') return 'served';
  if (o.settledOfflineAfterFailure === true) return 'failed';
  if (o.status === 'bill_requested') return 'info';
  return 'served';
};

const checkboxModeForAdmin = (
  status: DineinOrder['status'],
): 'disabled' | 'interactive' | 'readonly' | 'hidden' => {
  if (status === 'placed' || status === 'accepted') return 'disabled';
  if (status === 'preparing') return 'interactive';
  if (
    status === 'served' ||
    status === 'bill_requested' ||
    status === 'paid'
  ) {
    return 'readonly';
  }
  return 'hidden';
};

const checkboxModeForStaff = (
  status: DineinOrder['status'],
): 'disabled' | 'interactive' | 'readonly' | 'hidden' => {
  if (status === 'preparing') return 'interactive';
  if (status === 'accepted') return 'disabled';
  if (
    status === 'served' ||
    status === 'bill_requested' ||
    status === 'paid'
  ) {
    return 'readonly';
  }
  return 'hidden';
};

interface CardHeaderProps {
  order: DineinOrder;
  servedN: number;
  totalN: number;
}

const CardHeader: React.FC<CardHeaderProps> = ({
  order,
  servedN,
  totalN,
}) => {
  const timer = stageTimerBase(order);
  return (
    <span className={local.accordionHeader}>
      <span className={local.headerLeft}>
        <span className={local.headerTable}>{tableHeading(order)}</span>
        <span className={local.headerOrderNo}>#{order.orderNo}</span>
      </span>
      <span className={local.headerRight}>
        {timer && (
          <span className={local.stageTimer}>{formatElapsed(timer)}</span>
        )}
        <span className={local.headerServed}>
          {servedN}/{totalN} served
        </span>
        <Badge tone={statusTone(order.status)} size="sm">
          {statusLabel(order.status)}
        </Badge>
      </span>
    </span>
  );
};

interface DineinOrdersModalBodyProps {
  focusOrderId?: string | null;
  mode?: 'admin' | 'staff';
  onClose?: () => void;
}

const DineinOrdersModalBody: React.FC<DineinOrdersModalBodyProps> = ({
  focusOrderId = null,
  mode = 'admin',
  onClose: _onClose,
}) => {
  const { tenant } = useTenant();
  const isStaff = mode === 'staff';

  const [orders, setOrders] = useState<DineinOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<DineinOrder | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<DineinOrder | null>(null);
  const [confirmServed, setConfirmServed] = useState<DineinOrder | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>(
    isStaff ? 'preparing' : 'new',
  );
  const [, setTick] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [markPaidFor, setMarkPaidFor] = useState<DineinOrder | null>(null);
  const [markPaidBusy, setMarkPaidBusy] = useState(false);
  const [markPaidError, setMarkPaidError] = useState('');
  const [printOrder, setPrintOrder] = useState<DineinOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const scrolledForRef = useRef<string | null>(null);

  // ---------------------------------------------------------
  // Local-state helpers
  //
  // Every mutation returns the updated order. We splice it back into
  // `orders` instead of refetching the whole list - that halves the
  // API calls for every admin action.
  // ---------------------------------------------------------
  const applyOrderUpdate = (updated: DineinOrder) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === updated.id ? updated : o)),
    );
  };

  const removeOrder = (orderId: string) => {
    setOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  // ---------------------------------------------------------
  // Load - only called on mount, on manual refresh, and when the
  // order set fundamentally changes (e.g. after a poll timer).
  // ---------------------------------------------------------
  const load = async () => {
    if (!tenant) return;
    setIsLoading(true);
    setError('');
    try {
      const list = await supabaseService.getDineinOrders(
        tenant.slug,
        ACTIVE_STATUSES,
      );
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isStaff) setActiveTab('preparing');
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, isStaff]);

  // Refresh every 60s while visible; pause when hidden.
  useEffect(() => {
    let cancelled = false;
    let timer: number | null = null;

    const REFRESH_MS = 60_000;

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (!(typeof document !== 'undefined' && document.hidden)) {
          await load();
        }
        schedule();
      }, REFRESH_MS);
    };

    schedule();

    const ticker = window.setInterval(() => setTick((t) => t + 1), 1000);

    const onVisibility = () => {
      if (document.hidden) return;
      if (timer !== null) window.clearTimeout(timer);
      load().finally(schedule);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      window.clearInterval(ticker);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  // Focus-scroll
  useEffect(() => {
    if (!focusOrderId) return;
    if (scrolledForRef.current === focusOrderId) return;

    const target = orders.find((o) => o.id === focusOrderId);
    if (!target) return;

    const tab = tabForStatus(target.status);
    if (tab && tab !== activeTab && !isStaff) setActiveTab(tab);

    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-order-id="${focusOrderId}"]`,
      );
      if (!el) return;
      scrolledForRef.current = focusOrderId;
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      el.classList.add(local.focused);
      window.setTimeout(() => el.classList.remove(local.focused), 2200);
    }, 350);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOrderId, orders.length, activeTab, isStaff]);

  // Bucketing
  const byTab = useMemo(() => {
    const bucket: Record<TabKey, DineinOrder[]> = {
      new: [],
      preparing: [],
      served: [],
      rejected: [],
    };
    orders.forEach((o) => {
      const tab = tabForStatus(o.status);
      if (tab) bucket[tab].push(o);
    });

    const rank = (status: DineinOrder['status']): number => {
      if (status === 'placed') return 0;
      if (status === 'bill_requested') return 1;
      if (status === 'accepted') return 2;
      if (status === 'preparing') return 3;
      if (status === 'served') return 4;
      if (status === 'paid') return 5;
      if (status === 'cancelled') return 6;
      return 7;
    };
    Object.keys(bucket).forEach((k) => {
      const key = k as TabKey;
      bucket[key].sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });
    return bucket;
  }, [orders]);

  const visibleOrders = isStaff ? byTab.preparing : byTab[activeTab];

  // Print effect
  useEffect(() => {
    if (!printOrder) return;
    const ok = printReceiptNode(printRef.current);
    if (!ok) setError('Allow pop-ups to print the bill.');
    setPrintOrder(null);
  }, [printOrder]);

  // ---------------------------------------------------------
  // Actions - each one updates local state from the returned row
  // instead of triggering a full refetch.
  // ---------------------------------------------------------
  const handleGenerateBill = (order: DineinOrder) => {
    setPrintOrder(order);
  };

  const handleAdvance = async (
    order: DineinOrder,
    target: 'accepted' | 'preparing',
  ) => {
    setActingId(order.id);
    setError('');
    try {
      const updated = await supabaseService.setDineinOrderStatus(
        order.id,
        target,
      );
      if (!updated) throw new Error('Failed to update status');
      applyOrderUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setActingId(null);
    }
  };

  const handleSendPayLink = async (order: DineinOrder) => {
    if (!tenant?.upiId) {
      setError(
        'Set your UPI ID in Store Information before sending a pay link.',
      );
      return;
    }
    setActingId(order.id);
    setError('');
    try {
      const updated = await supabaseService.setDineinPayOnline(order.id, true);
      if (!updated) throw new Error('Failed to send pay link');
      applyOrderUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send pay link');
    } finally {
      setActingId(null);
    }
  };

  const handleConfirmPaymentReceived = async (order: DineinOrder) => {
    setActingId(order.id);
    setError('');
    try {
      const updated = await supabaseService.confirmDineinPayment(
        order.id,
        'online',
      );
      if (!updated) throw new Error('Failed to confirm payment');
      applyOrderUpdate(updated);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to confirm payment',
      );
    } finally {
      setActingId(null);
    }
  };

  const handleToggleItemServed = async (
    order: DineinOrder,
    itemIndex: number,
    next: boolean,
  ) => {
    // Optimistic update first.
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        const items = o.items.map((it, i) =>
          i === itemIndex ? { ...it, served: next } : it,
        );
        return { ...o, items };
      }),
    );

    const updated = await supabaseService.setDineinOrderItemsServed(
      order.id,
      [itemIndex],
      next,
    );
    if (!updated) {
      setError('Failed to update item state');
      applyOrderUpdate(order);
      return;
    }
    applyOrderUpdate(updated);
  };

  const requestMarkServed = (order: DineinOrder) => {
    if (!allItemsServed(order)) return;
    setConfirmServed(order);
  };

  const handleConfirmServed = async () => {
    if (!confirmServed) return;
    const target = confirmServed;
    setConfirmServed(null);
    setActingId(target.id);
    setError('');
    try {
      const updated = await supabaseService.setDineinOrderStatus(
        target.id,
        'served',
      );
      if (!updated) throw new Error('Failed to mark served');
      applyOrderUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to mark served');
    } finally {
      setActingId(null);
    }
  };

  const handleMarkPaidConfirm = async (m: 'online' | 'cash') => {
    if (!markPaidFor) return;
    setMarkPaidBusy(true);
    setMarkPaidError('');
    try {
      const ok = await supabaseService.markDineinOrderPaid(
        markPaidFor.id,
        m,
      );
      if (!ok) throw new Error('Failed to mark paid');

      // `markDineinOrderPaid` returns a boolean, not the updated row,
      // so patch the local row with the fields we know changed.
      setOrders((prev) =>
        prev.map((o) =>
          o.id === markPaidFor.id
            ? {
                ...o,
                status: 'paid',
                paidAt: new Date().toISOString(),
                paymentRef: m,
              }
            : o,
        ),
      );
      setMarkPaidFor(null);
    } catch (err) {
      setMarkPaidError(
        err instanceof Error ? err.message : 'Failed to mark paid',
      );
    } finally {
      setMarkPaidBusy(false);
    }
  };

  const handleReject = async () => {
    if (!confirmReject) return;
    const target = confirmReject;
    setConfirmReject(null);
    setActingId(target.id);
    setError('');
    try {
      const updated = await supabaseService.cancelDineinOrder(
        target.id,
        'Rejected by store',
      );
      if (!updated) throw new Error('Failed to cancel');
      applyOrderUpdate(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setActingId(null);
    }
  };

  // Tabs config
  const tabs = useMemo(
    () =>
      TAB_ORDER.map((key) => ({
        key,
        label: (
          <span className={local.tabLabel}>
            {key === 'new'
              ? 'New Orders'
              : key === 'preparing'
                ? 'Preparing'
                : key === 'served'
                  ? 'Served'
                  : 'Rejected'}
            {byTab[key].length > 0 && (
              <span
                className={`${local.tabCount} ${
                  key === activeTab ? local.tabCountActive : ''
                }`}
              >
                {byTab[key].length}
              </span>
            )}
          </span>
        ),
      })),
    [byTab, activeTab],
  );

  const emptyTitle = isStaff
    ? 'No orders in preparation.'
    : activeTab === 'new'
      ? 'No new orders right now.'
      : activeTab === 'preparing'
        ? 'No orders in preparation.'
        : activeTab === 'served'
          ? 'No served orders waiting on payment.'
          : 'No rejected orders.';

  return (
    <>
      <InlineSection
        title={isStaff ? 'Active Orders' : 'Order Placed'}
        actions={
          !isStaff ? (
            <IconButton
              variant="soft"
              size="md"
              aria-label="Order history"
              tooltip="Order history"
              onClick={() => setHistoryOpen(true)}
            >
              <ClockIcon width={18} height={18} fill="#1e1e1e" />
            </IconButton>
          ) : undefined
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError('')}>
            {error}
          </Banner>
        )}

        {!isStaff && (
          <div className={local.tabsRow}>
            <Tabs<TabKey>
              items={tabs}
              value={activeTab}
              onChange={setActiveTab}
              block
            />
          </div>
        )}

        {isLoading && orders.length === 0 ? (
          <EmptyState title="Loading orders..." />
        ) : visibleOrders.length === 0 ? (
          <EmptyState title={emptyTitle} />
        ) : (
          <div className={local.grid}>
            {visibleOrders.map((o) => {
              const stage = stageAction(o.status);
              const isActing = actingId === o.id;
              const showReject = !isStaff && o.status === 'placed';
              const mode0 = isStaff
                ? checkboxModeForStaff(o.status)
                : checkboxModeForAdmin(o.status);
              const servedN = servedCount(o);
              const totalN = o.items.length;
              const canServe = mode0 === 'interactive' && allItemsServed(o);
              const tone = cardTone(o);
              const unseen = isOrderUnseen(o);

              return (
                <div
                  key={o.id}
                  data-order-id={o.id}
                  className={[
                    local.cardWrap,
                    tone === 'failed' ? local.cardPaymentFailed : '',
                    tone === 'info' ? local.cardBillRequested : '',
                    tone === 'served' ? local.cardServed : '',
                    unseen ? local.cardUnseen : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <Accordion
                    hideChevron
                    title={
                      <CardHeader
                        order={o}
                        servedN={servedN}
                        totalN={totalN}
                      />
                    }
                  >
                    <div className={local.items}>
                      {mode0 !== 'hidden' && (
                        <div className={local.itemsHeader}>
                          <span className={local.itemsHeaderLabel}>Items</span>
                          <span className={local.itemsHeaderCount}>
                            {servedN}/{totalN} served
                          </span>
                        </div>
                      )}

                      {o.items.map((it: DineinOrderItem, i) => {
                        const hasCustomizations =
                          it.customizations &&
                          Object.keys(it.customizations).length > 0;
                        const hasNote =
                          !!it.customMessage &&
                          it.customMessage.trim() !== '';

                        const rowContent = (
                          <span className={local.itemRowContent}>
                            <span className={local.itemLine}>
                              {it.name} x {it.quantity}
                            </span>

                            {hasCustomizations && (
                              <span className={local.itemCustom}>
                                {Object.entries(it.customizations!)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(' . ')}
                              </span>
                            )}

                            {hasNote && (
                              <span className={local.itemNote}>
                                Note: {it.customMessage!.trim()}
                              </span>
                            )}
                          </span>
                        );

                        if (mode0 === 'interactive') {
                          return (
                            <div key={i} className={local.itemRow}>
                              <label className={local.itemRowLabel}>
                                <input
                                  type="checkbox"
                                  className={local.itemCheckbox}
                                  checked={it.served === true}
                                  onChange={(e) =>
                                    handleToggleItemServed(
                                      o,
                                      i,
                                      e.target.checked,
                                    )
                                  }
                                />
                                <span
                                  className={local.itemCheckboxBox}
                                  aria-hidden
                                />
                                {rowContent}
                              </label>
                            </div>
                          );
                        }

                        if (mode0 === 'disabled') {
                          return (
                            <div key={i} className={local.itemRow}>
                              <label className={local.itemRowLabel}>
                                <input
                                  type="checkbox"
                                  className={local.itemCheckbox}
                                  checked={it.served === true}
                                  disabled
                                  onChange={() => {}}
                                />
                                <span
                                  className={local.itemCheckboxBox}
                                  aria-hidden
                                />
                                {rowContent}
                              </label>
                            </div>
                          );
                        }

                        if (mode0 === 'readonly') {
                          return (
                            <div key={i} className={local.itemRow}>
                              <div className={local.itemRowLabel}>
                                <span
                                  className={
                                    it.served
                                      ? local.checkmarkStatic
                                      : local.checkmarkStaticEmpty
                                  }
                                  aria-hidden
                                >
                                  <CheckIcon
                                    width={14}
                                    height={14}
                                    fill="#fff"
                                  />
                                </span>
                                {rowContent}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })}

                      {isStaff && o.status === 'preparing' && (
                        <Banner variant="success" inline>
                          Now start preparing - tick items as they're
                          served.
                        </Banner>
                      )}

                      {mode0 === 'disabled' && (
                        <div className={local.checkboxHint}>
                          {o.status === 'placed'
                            ? 'Accept the order to start marking items served.'
                            : o.status === 'accepted'
                              ? isStaff
                                ? 'Waiting for the kitchen to start preparing...'
                                : 'Tap "Preparing" to start marking items served.'
                              : null}
                        </div>
                      )}
                    </div>

                    {(o.staffTip ?? 0) > 0 && (
                      <div className={local.tipLine}>
                        Staff tip: {formatRupees(o.staffTip ?? 0)}
                      </div>
                    )}

                    {!isStaff && (
                      <div className={local.cardFooter}>
                        <span className={local.totalLabel}>Current total</span>
                        <span className={local.totalValue}>
                          {formatRupees(o.totalAmount)}
                        </span>
                      </div>
                    )}

                    {!isStaff && o.status === 'paid' && (
                      <div className={local.billLine}>
                        Paid via{' '}
                        {(() => {
                          const ref = (o.paymentRef ?? '').toLowerCase();
                          if (ref === 'online' || ref.startsWith('upi'))
                            return 'Online (UPI)';
                          if (ref === 'cash') return 'Cash';
                          return o.paymentRef || '-';
                        })()}
                      </div>
                    )}

                    {!isStaff && o.status === 'bill_requested' && (
                      <>
                        {o.settledOfflineAfterFailure && (
                          <div className={local.failureNotice}>
                            <InfoIcon width={22} height={22} fill="currentColor" /> Online payment failed - please settle offline
                          </div>
                        )}
                        <div className={local.billLine}>
                          {o.payOnline && o.customerPaidClaimed
                            ? `Customer has paid ${formatRupees(
                                o.totalAmount,
                              )} - please confirm`
                            : o.payOnline
                              ? 'Online payment approved . waiting for customer'
                              : o.payOnlineRequested
                                ? 'Customer chose online . tap Send Pay Link'
                                : o.settledOfflineAfterFailure
                                  ? 'Customer will pay offline - collect at the table'
                                  : 'Offline bill . customer will pay at the table'}
                        </div>
                      </>
                    )}

                    {!isStaff && o.status === 'served' && !o.billRequested && (
                      <div className={local.servedActions}>
                        <Button
                          size="xs"
                          variant="secondary"
                          disabled={isActing}
                          onClick={() => handleGenerateBill(o)}
                        >
                          Generate Bill
                        </Button>
                        <Button
                          size="xs"
                          variant="success"
                          disabled={isActing}
                          onClick={() => {
                            setMarkPaidError('');
                            setMarkPaidFor(o);
                          }}
                        >
                          Mark Paid
                        </Button>
                      </div>
                    )}

                    {!isStaff &&
                      (stage ||
                        showReject ||
                        mode0 === 'interactive' ||
                        o.status === 'bill_requested') && (
                        <div className={local.cardActions}>
                          {stage && (
                            <Button
                              size="xs"
                              variant="primary"
                              loading={isActing}
                              onClick={() => handleAdvance(o, stage.target)}
                            >
                              {stage.label}
                            </Button>
                          )}

                          {mode0 === 'interactive' && (
                            <Button
                              size="xs"
                              variant="success"
                              disabled={!canServe || isActing}
                              title={
                                canServe
                                  ? undefined
                                  : 'Mark every item as served first'
                              }
                              onClick={() => requestMarkServed(o)}
                            >
                              Mark Served
                            </Button>
                          )}

                          {o.status === 'bill_requested' && (
                            <>
                              {o.payOnlineRequested === true &&
                                !o.payOnline && (
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    loading={isActing}
                                    disabled={!tenant?.upiId}
                                    title={
                                      !tenant?.upiId
                                        ? 'Set your UPI ID in Store Information first'
                                        : undefined
                                    }
                                    onClick={() => handleSendPayLink(o)}
                                  >
                                    Send Pay Link
                                  </Button>
                                )}

                              {o.payOnline && !o.customerPaidClaimed && (
                                <Button size="xs" variant="ghost" disabled>
                                  Waiting for customer...
                                </Button>
                              )}

                              {o.payOnline && o.customerPaidClaimed && (
                                <Button
                                  size="xs"
                                  variant="success"
                                  loading={isActing}
                                  onClick={() =>
                                    handleConfirmPaymentReceived(o)
                                  }
                                >
                                  Confirm Payment
                                </Button>
                              )}

                              {o.payOnlineRequested !== true &&
                                !o.settledOfflineAfterFailure && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    disabled={isActing}
                                    onClick={() => {
                                      setMarkPaidError('');
                                      setMarkPaidFor(o);
                                    }}
                                    title="Mark as paid when the customer pays cash"
                                  >
                                    Mark Paid
                                  </Button>
                                )}

                              {o.settledOfflineAfterFailure && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() => {
                                    setMarkPaidError('');
                                    setMarkPaidFor(o);
                                  }}
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </>
                          )}

                          {showReject && (
                            <Button
                              size="xs"
                              variant="danger"
                              disabled={isActing}
                              onClick={() => setConfirmReject(o)}
                            >
                              Reject
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelected(o)}
                            style={{ marginLeft: 'auto' }}
                          >
                            Open details
                          </Button>
                        </div>
                      )}

                    {!isStaff &&
                      mode0 === 'interactive' &&
                      !canServe && (
                        <div className={local.serveGate}>
                          {totalN - servedN} item
                          {totalN - servedN === 1 ? '' : 's'} pending before
                          served
                        </div>
                      )}
                  </Accordion>
                </div>
              );
            })}
          </div>
        )}
      </InlineSection>

      {!isStaff && (
        <>
          {selected && (
            <OrderDetail
              isOpen={true}
              order={selected}
              onClose={() => {
                setSelected(null);
              }}
              onRefresh={() => {
                // OrderDetail only opens modals for atomic actions.
                // If it calls back, do a single refresh.
                load();
              }}
            />
          )}

          <ConfirmDialog
            isOpen={!!confirmReject}
            title="Reject order?"
            message={
              confirmReject
                ? `Reject the order #${confirmReject.orderNo} from ${
                    confirmReject.tableLabelKind === 'number'
                      ? `Table ${confirmReject.tableLabel}`
                      : confirmReject.tableLabel
                  }? The customer will be notified.`
                : ''
            }
            confirmText="Yes, Reject"
            variant="danger"
            onConfirm={handleReject}
            onCancel={() => setConfirmReject(null)}
          />

          <ConfirmDialog
            isOpen={!!confirmServed}
            title="Mark order as served?"
            message={
              confirmServed ? (
                <>
                  Are all items in order{' '}
                  <strong>#{confirmServed.orderNo}</strong> at{' '}
                  <strong>
                    {confirmServed.tableLabelKind === 'number'
                      ? `Table ${confirmServed.tableLabel}`
                      : confirmServed.tableLabel}
                  </strong>{' '}
                  served to the table? This will move the order to the Served
                  tab and free the table for new orders.
                </>
              ) : (
                ''
              )
            }
            confirmText="Yes, all served"
            variant="primary"
            loading={actingId === confirmServed?.id}
            onConfirm={handleConfirmServed}
            onCancel={() => setConfirmServed(null)}
          />

          <MarkPaidModal
            isOpen={!!markPaidFor}
            order={markPaidFor}
            busy={markPaidBusy}
            error={markPaidError}
            onConfirm={handleMarkPaidConfirm}
            onCancel={() => {
              if (markPaidBusy) return;
              setMarkPaidFor(null);
              setMarkPaidError('');
            }}
          />

          <OrderHistoryModal
            isOpen={historyOpen}
            onClose={() => setHistoryOpen(false)}
          />

          <div
            ref={printRef}
            aria-hidden
            style={{
              position: 'absolute',
              left: '-9999px',
              top: 0,
              width: '80mm',
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
          >
            {printOrder && <Receipt order={printOrder} />}
          </div>
        </>
      )}
    </>
  );
};

export default DineinOrdersModalBody;