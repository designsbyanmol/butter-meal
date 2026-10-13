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

/**
 * Normalized notification row the drawer renders. Concrete drawers
 * map their own data shape into this.
 */
export interface DisputeNotifRow {
  /** Stable ID used as the React key and passed to markSeen. */
  id: string;
  /** ISO timestamp used for the row's time label. */
  timeIso: string;
  /** Server-side read marker. Non-null means the row renders as read. */
  seenAt?: string | null;
  /** Arbitrary payload forwarded to `onRowClick` and the render props. */
  payload: any;
}

export interface DisputeNotificationsDrawerProps {
  /** Whether the drawer should be mounted at all (permission gate). */
  enabled: boolean;
  /** Fetch the current list of notifications. Called on poll and on open. */
  fetchRows: () => Promise<DisputeNotifRow[]>;
  /** Mark a single row as read on the server. */
  markSeen: (id: string) => Promise<unknown>;
  /** Clear-all handler. Persists the cursor on the server. */
  clearAll: () => Promise<unknown>;
  /** Called when the user clicks a row. Receives `row.payload`. */
  onRowClick: (payload: any) => void;
  /** Renders the primary text body of a row. */
  renderRowBody: (row: DisputeNotifRow) => React.ReactNode;
  /**
   * Optional second-line meta renderer. Rendered next to the time
   * label (e.g. an outcome badge). Admin wrapper omits it.
   */
  renderRowMeta?: (row: DisputeNotifRow) => React.ReactNode;
  /** Copy for the Clear-all confirm dialog. */
  clearConfirmMessage: string;
  /** Optional copy for the empty state. */
  emptyTitle?: string;
  emptyDescription?: string;
  /** Cadence for the always-on poll, in ms. Default 60_000. */
  pollMs?: number;
}

const DEFAULT_POLL_MS = 60_000;

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
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [rows, setRows] = useState<DisputeNotifRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  // Optimistic overlay for just-clicked rows; server's seenAt becomes
  // the source of truth on the next fetch.
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

  // Reset when `enabled` flips (e.g. tenant switch).
  useEffect(() => {
    if (!enabled) return;
    setRows([]);
    setOptimisticRead(new Set());
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Always-on poll with hidden-tab pause.
  useEffect(() => {
    if (!enabled) return;

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
  }, [enabled, pollMs, load]);

  // Immediate refresh when the drawer opens.
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
    void Promise.resolve(markSeen(r.id)).catch(() => {
      /* best-effort */
    });
    setIsOpen(false);
    onRowClick(r.payload);
  };

  const handleOpenBell = () => {
    setIsOpen(true);
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

      <Drawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
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