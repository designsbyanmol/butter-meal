// components/Dashboard/ModalShim.tsx
import React from 'react';

interface ShimProps {
  inline: boolean;
  title?: React.ReactNode;
  onClose?: () => void;
  children: React.ReactNode;
}

const Shim: React.FC<ShimProps> = ({ inline, title, children }) => {
  if (inline) return <>{children}</>;
  return null; // unreachable in this codepath
};