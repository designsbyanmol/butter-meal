// src/components/Preloader/GlobalPreloaderOverlay.tsx
import React, { useEffect, useState } from 'react';
import Preloader from './Preloader';
import { preloaderBus } from './preloaderBus';

const GlobalPreloaderOverlay: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [title, setTitle] = useState<string | undefined>(undefined);

  useEffect(() => {
    return preloaderBus.subscribe((v, t) => {
      setVisible(v);
      if (t !== undefined) setTitle(t);
    });
  }, []);

  if (!visible) return null;

  // The imperative overlay never has an `onReady`, because we want
  // it to stay up until the next page replaces this document.
  // `minDurationMs` is set very high so the internal timer never
  // fires and it never auto-dismisses.
  return <Preloader title={title} persistent />;
};

export default GlobalPreloaderOverlay;