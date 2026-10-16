// src/components/Header/DineinNotificationsDrawer.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Drawer, EmptyState, ConfirmDialog } from '../ui';
import { supabaseService } from '../../services/supabase.service';
import { useTenant } from '../../contexts/TenantContext';
import { MenuIcon } from '../../assets/svgs';
import { DineinEvent } from '../../types';
import local from './DineinNotificationsDrawer.module.scss';

interface Props {
  onOpenOrder: (orderId: string) => void;
}

const ACTIVE_POLL_MS = 30_000;
const IDLE_POLL_MS = 60_000;
const IDLE_AFTER_POLLS = 4;
const MAX_KEPT = 40;

const formatNotifTime = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const time = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

  if (d >= startOfToday) return `Today . ${time}`;
  if (d >= startOfYesterday) return `Yesterday . ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateStr} . ${time}`;
};

const DineinNotificationsDrawer: React.FC<Props> = ({ onOpenOrder }) => {
  const { tenant } = useTenant();
  const [isOpen, setIsOpen] = useState(false);
  const [items, setItems] = useState<DineinEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  /**
   * Optimistic overlay of just-clicked event IDs. These grey out
   * instantly without waiting for the next poll. Server's `readAt`
   * becomes the source of truth on the next fetch.
   */
  const [optimisticRead, setOptimisticRead] = useState<Set<string>>(
    new Set(),
  );

  const inFlightRef = useRef(false);
  const newestSeenRef = useRef<string | null>(null);
  const currentSlugRef = useRef<string | null>(tenant?.slug ?? null);

  const load = useCallback(async () => {
    if (!tenant?.slug) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      const list = await supabaseService.getDineinEventsSince(
        tenant.slug,
        newestSeenRef.current,
      );

      if (list.length > 0) {
        setItems((prev) => {
          const byId = new Map(prev.map((e) => [e.id, e]));
          list.forEach((e) => byId.set(e.id, e));
          const merged = Array.from(byId.values())
            .sort(
              (a, b) =>
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime(),
            )
            .slice(0, MAX_KEPT);
          return merged;
        });

        const newest = list.reduce<string | null>((acc, e) => {
          if (!acc) return e.createdAt;
          return new Date(e.createdAt) > new Date(acc) ? e.createdAt : acc;
        }, newestSeenRef.current);
        newestSeenRef.current = newest;
      }
    } catch (err) {
      console.warn('[dinein-notifications] load failed:', err);
    } finally {
      inFlightRef.current = false;
    }
  }, [tenant?.slug]);

  // Reset on tenant change.
  useEffect(() => {
    const slug = tenant?.slug ?? null;
    if (currentSlugRef.current === slug) return;
    currentSlugRef.current = slug;
    setItems([]);
    setOptimisticRead(new Set());
    newestSeenRef.current = null;
  }, [tenant?.slug]);

  // Always-on poll with idle backoff and hidden-tab pause.
  useEffect(() => {
    if (!tenant?.slug) return;

    let cancelled = false;
    let idleStreak = 0;
    let timer: number | null = null;
    let lastCount = -1;

    const schedule = (ms: number) => {
      if (cancelled) return;
      timer = window.setTimeout(tick, ms);
    };

    const tick = async () => {
      if (cancelled) return;

      if (typeof document !== 'undefined' && document.hidden) {
        schedule(IDLE_POLL_MS);
        return;
      }

      await load();

      const nowCount = items.length;
      if (nowCount === lastCount) idleStreak += 1;
      else idleStreak = 0;
      lastCount = nowCount;

      const next =
        idleStreak >= IDLE_AFTER_POLLS ? IDLE_POLL_MS : ACTIVE_POLL_MS;
      schedule(next);
    };

    tick();

    const onVisibility = () => {
      if (document.hidden) return;
      idleStreak = 0;
      if (timer !== null) window.clearTimeout(timer);
      tick();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, load]);

  // Immediate refresh when the drawer is opened.
  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen, load]);

  const isSeen = useCallback(
    (ev: DineinEvent): boolean =>
      ev.readAt != null || optimisticRead.has(ev.id),
    [optimisticRead],
  );

  const unreadCount = useMemo(
    () => items.filter((i) => !isSeen(i)).length,
    [items, isSeen],
  );

  const handleClick = (ev: DineinEvent) => {
    // Instant UI feedback.
    setOptimisticRead((prev) => {
      const next = new Set(prev);
      next.add(ev.id);
      return next;
    });
    // Persist to the server. Any admin of this tenant sees the event
    // as read on the next poll, on any device.
    if (tenant?.slug) {
      supabaseService.markDineinEventRead(ev.id).catch(() => {
        /* best-effort */
      });
    }
    setIsOpen(false);
    onOpenOrder(ev.orderId);
  };

  const handleOpenBell = () => {
    setIsOpen(true);
  };

  const requestClearAll = () => {
    if (items.length === 0) return;
    setConfirmClearOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setConfirmClearOpen(false);
    setItems([]);
    setOptimisticRead(new Set());
    newestSeenRef.current = new Date().toISOString();
    if (tenant?.slug) {
      // Advance the tenant's cleared-before cursor. Every device
      // will stop showing these events after their next fetch.
      supabaseService.clearDineinEvents(tenant.slug).catch(() => {
        /* best-effort */
      });
    }
  };

  const renderCopy = (ev: DineinEvent) => {
    const payload = ev.payload ?? {};
    const name = (payload as any).customerName || 'Guest';
    switch (ev.kind) {
      case 'order': {
        const count = (payload as any).itemCount ?? 0;
        return (
          <>
            Order placed from <strong>Table {ev.tableLabel}</strong> - {name}{' '}
            placed {count} item{count === 1 ? '' : 's'}
          </>
        );
      }
      case 'bill_request':
        return (
          <>
            Customer of <strong>Table {ev.tableLabel}</strong> asked for bill
            {payload.payOnline ? ' (pay online)' : ' (pay offline)'}
          </>
        );
      case 'rating':
        return (
          <>
            Customer of <strong>Table {ev.tableLabel}</strong> rated you{' '}
            {(payload as any).stars ?? 0}★
          </>
        );
      default:
        return <>New event on Table {ev.tableLabel}</>;
    }
  };

  return (
    <>
      <button
        type="button"
        className={local.iconBtn}
        onClick={handleOpenBell}
        aria-label={
          unreadCount > 0
            ? `Dine-in notifications (${unreadCount} unread)`
            : 'Dine-in notifications'
        }
        title="Dine-in notifications"
      >
        <MenuIcon width={20} height={20} color="#1e1e1e" />
        {unreadCount > 0 && (
          <span className={local.badge}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        side="right"
        title={
          <>
            Dine-in
            {unreadCount > 0 && (
              <span className={local.titleCount}>{unreadCount} new</span>
            )}
          </>
        }
        headerActions={
          items.length > 0 ? (
            <button
              type="button"
              className={local.clearBtn}
              onClick={requestClearAll}
            >
              Clear all
            </button>
          ) : undefined
        }
      >
        {isLoading && items.length === 0 ? (
          <EmptyState title="Loading notifications..." />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<MenuIcon width={36} height={36} color="#e6ded7" />}
            title="No notifications yet"
            description="New orders, bill requests, and ratings will show up here."
          />
        ) : (
          <ul className={local.list}>
            {items.map((ev) => {
              const seen = isSeen(ev);
              return (
                <li
                  key={ev.id}
                  className={[
                    local.row,
                    seen ? local.rowRead : local.rowUnread,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className={local.rowBtn}
                    onClick={() => handleClick(ev)}
                  >
                    <span className={local.rowText}>{renderCopy(ev)}</span>
                    <span className={local.rowTime}>
                      {formatNotifTime(ev.createdAt)}
                    </span>
                  </button>
                  {!seen && <span className={local.unreadDot} />}
                </li>
              );
            })}
          </ul>
        )}
      </Drawer>

      <ConfirmDialog
        isOpen={confirmClearOpen}
        title="Clear all notifications?"
        message="This removes every dine-in notification from this list on every device. New orders, bill requests, and ratings will still appear as they come in."
        confirmText="Clear all"
        variant="danger"
        overlayZIndex={1300}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </>
  );
};

export default DineinNotificationsDrawer;