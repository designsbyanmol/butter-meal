// src/pwa/installPrompt.ts

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BipEvent | null = null;
const listeners = new Set<(available: boolean) => void>();

export const initInstallPrompt = (): void => {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar and stash the event for later.
    e.preventDefault();
    deferredPrompt = e as BipEvent;
    listeners.forEach((l) => l(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
  });
};

export const isInstallAvailable = (): boolean => deferredPrompt !== null;

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  // iOS Safari uses navigator.standalone
  const navStandalone =
    (window.navigator as unknown as { standalone?: boolean }).standalone ===
    true;
  return (
    navStandalone ||
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches
  );
};

export const subscribeInstallAvailability = (
  fn: (available: boolean) => void,
): (() => void) => {
  listeners.add(fn);
  fn(isInstallAvailable());
  return () => listeners.delete(fn);
};

/** Trigger the native install prompt. Returns the user's choice. */
export const triggerInstall = async (): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> => {
  if (!deferredPrompt) return 'unavailable';
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    listeners.forEach((l) => l(false));
    return choice.outcome;
  } catch {
    return 'dismissed';
  }
};