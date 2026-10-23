// src/components/ui/Toast/Toast.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { CheckIcon, CloseIcon, InfoIcon } from '../../../assets/svgs';
import local from './Toast.module.scss';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  title: string;
  message?: string;
  tone?: ToastTone;
  /** Auto-dismiss after ms. Default: 3500. Set 0 to disable. */
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
}

interface ToastContextValue {
  push: (opts: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export const useToast = (): ToastContextValue => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used inside <ToastProvider>');
  }
  return ctx;
};

const ICONS: Record<ToastTone, React.ReactNode> = {
  success: <CheckIcon width={18} height={18} fill="currentColor" />,
  error: <CloseIcon width={18} height={18} fill="currentColor" />,
  info: <InfoIcon width={18} height={18} fill="currentColor" />,
  warning: <InfoIcon width={18} height={18} fill="currentColor" />,
};

const DEFAULT_DURATION = 3500;

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timersRef = useRef<Map<string, number>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timersRef.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (opts: ToastOptions): string => {
      const id = `toast_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      const tone = opts.tone ?? 'info';
      const duration =
        opts.durationMs === undefined ? DEFAULT_DURATION : opts.durationMs;

      setToasts((prev) => [...prev, { ...opts, id, tone }]);

      if (duration > 0) {
        const timer = window.setTimeout(() => {
          timersRef.current.delete(id);
          setToasts((prev) => prev.filter((t) => t.id !== id));
        }, duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [],
  );

  // Clean up all pending timers on unmount.
  useEffect(
    () => () => {
      timersRef.current.forEach((t) => window.clearTimeout(t));
      timersRef.current.clear();
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}

      <div className={local.container} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`${local.toast} ${local[t.tone ?? 'info']}`}
            role="status"
          >
            <span className={local.icon}>{ICONS[t.tone ?? 'info']}</span>
            <div className={local.body}>
              <p className={local.title}>{t.title}</p>
              {t.message && (
                <p className={local.message}>{t.message}</p>
              )}
            </div>
            <button
              type="button"
              className={local.closeBtn}
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss"
            >
              <CloseIcon width={14} height={14} fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export default ToastProvider;