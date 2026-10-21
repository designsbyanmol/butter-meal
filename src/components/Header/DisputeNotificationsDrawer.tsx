// src/components/Header/DisputeNotificationsDrawer.tsx
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Drawer, EmptyState, ConfirmDialog } from '../ui';
import { BellIcon } from '../../assets/svgs';
import local from './DisputeNotificationsDrawer.module.scss';

export interface DisputeNotifRow {
  id: string;
  timeIso: string;
  seenAt?: string | null;
  payload: any;
}

export interface DisputeNotificationsDrawerProps {
  enabled: boolean;
  fetchRows: () => Promise<DisputeNotifRow[]>;
  markSeen: (id: string) => Promise<unknown>;
  clearAll: () => Promise<unknown>;
  onRowClick: (payload: any) => void;
  renderRowBody: (row: DisputeNotifRow) => React.ReactNode;
  renderRowMeta?: (row: DisputeNotifRow) => React.ReactNode;
  clearConfirmMessage: string;
  emptyTitle?: string;
  emptyDescription?: string;
  pollMs?: number;

  isOpen?: boolean;
  onClose?: () => void;
}

const DEFAULT_POLL_MS = 120_000;

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

  if (d >= startOfToday) return `Today · ${time}`;
  if (d >= startOfYesterday) return `Yesterday · ${time}`;

  const sameYear = d.getFullYear() === now.getFullYear();
  const dateStr = d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  return `${dateStr} · ${time}`;
};

export const DisputeNotificationsDrawer: React.FC<
  DisputeNotificationsDrawerProps
> = ({
  enabled,
  fetchRows,
  markSeen,
  clearAll,
  onRowClick,
  renderRowBody,
  renderRowMeta,
  clearConfirmMessage,
  emptyTitle = 'No notifications yet',
  emptyDescription,
  pollMs = DEFAULT_POLL_MS,
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
}) => {
  const isControlled =
    controlledIsOpen !== undefined && controlledOnClose !== undefined;

  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = isControlled ? controlledIsOpen! : internalIsOpen;
  const setIsOpen = isControlled
    ? (v: boolean) => {
        if (!v) controlledOnClose?.();
      }
    : setInternalIsOpen;

  const handleClose = () => {
    if (isControlled) {
      controlledOnClose?.();
    } else {
      setInternalIsOpen(false);
    }
  };

  const [rows, setRows] = useState<DisputeNotifRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [optimisticRead, setOptimisticRead] = useState<Set<string>>(
    new Set(),
  );

  const inFlightRef = useRef(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setIsLoading(true);
    try {
      const list = await fetchRows();
      setRows(list);
    } catch (err) {
      console.warn('[dispute-notifications] load failed:', err);
    } finally {
      inFlightRef.current = false;
      setIsLoading(false);
    }
  }, [enabled, fetchRows]);

  useEffect(() => {
    if (!enabled) return;
    setRows([]);
    setOptimisticRead(new Set());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !isOpen) return;

    let cancelled = false;
    let timer: number | null = null;

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (!(typeof document !== 'undefined' && document.hidden)) {
          await load();
        }
        schedule();
      }, pollMs);
    };

    schedule();

    const onVisibility = () => {
      if (document.hidden) return;
      if (timer !== null) window.clearTimeout(timer);
      load().finally(schedule);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isOpen, pollMs, load]);

  useEffect(() => {
    if (!enabled || isOpen) return;

    const onFocus = () => {
      if (document.hidden) return;
      load();
    };

    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, isOpen, load]);

  useEffect(() => {
    if (!isOpen) return;
    load();
  }, [isOpen, load]);

  const isSeen = useCallback(
    (r: DisputeNotifRow): boolean =>
      r.seenAt != null || optimisticRead.has(r.id),
    [optimisticRead],
  );

  const unreadCount = useMemo(
    () => rows.filter((r) => !isSeen(r)).length,
    [rows, isSeen],
  );

  const handleClick = (r: DisputeNotifRow) => {
    setOptimisticRead((prev) => {
      const next = new Set(prev);
      next.add(r.id);
      return next;
    });
    void Promise.resolve(markSeen(r.id)).catch(() => {});
    handleClose();
    onRowClick(r.payload);
  };

  const handleOpenBell = () => {
    if (!isControlled) setInternalIsOpen(true);
  };

  const requestClearAll = () => {
    if (rows.length === 0) return;
    setConfirmClearOpen(true);
  };

  const handleConfirmClearAll = async () => {
    setConfirmClearOpen(false);
    setRows([]);
    setOptimisticRead(new Set());
    try {
      await clearAll();
    } catch {
      /* best-effort */
    }
  };

  if (!enabled) return null;

  return (
    <>
      {!isControlled && (
        <button
          type="button"
          className={local.bellBtn}
          onClick={handleOpenBell}
          aria-label={
            unreadCount > 0
              ? `Notifications (${unreadCount} unread)`
              : 'Notifications'
          }
          title="Notifications"
        >
          <BellIcon width={20} height={20} fill="#1e1e1e" />
          {unreadCount > 0 && (
            <span className={local.bellBadge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
      )}

      <Drawer
        isOpen={isOpen}
        onClose={handleClose}
        side="right"
        title={
          <>
            Notifications
            {unreadCount > 0 && (
              <span className={local.titleCount}>{unreadCount} new</span>
            )}
          </>
        }
        headerActions={
          rows.length > 0 ? (
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
        {isLoading && rows.length === 0 ? (
          <EmptyState title="Loading notifications..." />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BellIcon width={36} height={36} fill="#e6ded7" />}
            title={emptyTitle}
            description={emptyDescription}
          />
        ) : (
          <ul className={local.list}>
            {rows.map((r) => {
              const seen = isSeen(r);
              return (
                <li
                  key={r.id}
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
                    onClick={() => handleClick(r)}
                  >
                    <span className={local.rowText}>
                      {renderRowBody(r)}
                    </span>
                    <span className={local.rowMeta}>
                      {renderRowMeta?.(r)}
                      <span className={local.rowTime}>
                        {formatNotifTime(r.timeIso)}
                      </span>
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
        message={clearConfirmMessage}
        confirmText="Clear all"
        variant="danger"
        overlayZIndex={1300}
        onConfirm={handleConfirmClearAll}
        onCancel={() => setConfirmClearOpen(false)}
      />
    </>
  );
};

export default DisputeNotificationsDrawer;