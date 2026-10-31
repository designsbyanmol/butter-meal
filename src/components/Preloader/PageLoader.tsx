// src/components/Preloader/PageLoader.tsx
import React, { useState } from 'react';
import Preloader from './Preloader';
import GlobalPreloaderOverlay from './GlobalPreloaderOverlay';
import { ToastProvider } from '../ui/Toast/Toast';

interface PageLoaderProps {
  title: string;
  children: React.ReactNode;
  minDurationMs?: number;
}

const PageLoader: React.FC<PageLoaderProps> = ({ title, children, minDurationMs }) => {
  const [ready, setReady] = useState(false);

  if (!ready) {
    return <Preloader title={title} minDurationMs={minDurationMs} onReady={() => setReady(true)} />;
  }

  return (
    <ToastProvider>
      <GlobalPreloaderOverlay />          {/* ← NEW */}
      {children}
    </ToastProvider>
  );
};

export default PageLoader;