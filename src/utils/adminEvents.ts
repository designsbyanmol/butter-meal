// utils/adminEvents.ts
export type AdminAction =
  | 'open-menu-panel'
  | 'open-store-settings'
  | 'open-user-management'
  | 'open-info-popup'
  | 'open-tenant-manager';

export const dispatchAdminAction = (action: AdminAction) => {
  window.dispatchEvent(new CustomEvent('admin:action', { detail: action }));
};

export const subscribeAdminAction = (
  handler: (action: AdminAction) => void,
): (() => void) => {
  const listener = (e: Event) => {
    const detail = (e as CustomEvent).detail as AdminAction;
    handler(detail);
  };
  window.addEventListener('admin:action', listener);
  return () => window.removeEventListener('admin:action', listener);
};