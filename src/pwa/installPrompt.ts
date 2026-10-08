// src/pwa/installPrompt.ts

type BipEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

let deferredPrompt: BipEvent | null = null;
const installListeners = new Set<(available: boolean) => void>();
const installedListeners = new Set<() => void>();

export const initInstallPrompt = (): void => {
  if (typeof window === 'undefined') return;
  if ((window as any).__bipInit) return;
  (window as any).__bipInit = true;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BipEvent;
    installListeners.forEach((l) => l(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installListeners.forEach((l) => l(false));
    installedListeners.forEach((l) => l());
  });
};

export const isInstallAvailable = (): boolean =>
  deferredPrompt !== null;

export const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
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
  installListeners.add(fn);
  fn(isInstallAvailable());
  return () => {
    installListeners.delete(fn);
  };
};

export const subscribeAppInstalled = (fn: () => void): (() => void) => {
  installedListeners.add(fn);
  return () => {
    installedListeners.delete(fn);
  };
};

export const triggerInstall = async (): Promise<
  'accepted' | 'dismissed' | 'unavailable'
> => {
  if (!deferredPrompt) return 'unavailable';
  try {
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    deferredPrompt = null;
    installListeners.forEach((l) => l(false));
    return choice.outcome;
  } catch {
    return 'dismissed';
  }
};