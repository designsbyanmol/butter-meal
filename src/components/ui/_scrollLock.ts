// src/components/ui/_scrollLock.ts
let lockCount = 0;
let originalOverflow = '';

export const lockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
};

export const unlockBodyScroll = (): void => {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = originalOverflow;
  }
};