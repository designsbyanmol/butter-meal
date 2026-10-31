// src/components/Preloader/preloaderBus.ts
type Listener = (visible: boolean, title?: string) => void;

let listeners = new Set<Listener>();

export const preloaderBus = {
  subscribe(fn: Listener) {
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  },
  show(title?: string) {
    listeners.forEach((l) => l(true, title));
  },
  hide() {
    listeners.forEach((l) => l(false));
  },
};