// src/components/ImagePreview/ImagePreview.tsx
import React, { useCallback, useEffect, useState } from 'react';
import { IconButton, Slider } from '../ui';
import { CloseIcon, LeftArrowIcon, RightArrow } from '../../assets/svgs';
import local from './ImagePreview.module.scss';

interface ImagePreviewProps {
  isOpen: boolean;
  images: string[];
  initialIndex?: number;
  onClose: () => void;
}

const ImagePreview: React.FC<ImagePreviewProps> = ({
  isOpen,
  images,
  initialIndex = 0,
  onClose,
}) => {
  const safeInitial = Math.max(
    0,
    Math.min(initialIndex, Math.max(0, images.length - 1)),
  );

  const [index, setIndex] = useState(safeInitial);
  const [openKey, setOpenKey] = useState(0);

  // Reset the preview's index AND force a Slider remount on every open.
  // A fresh `key` guarantees the Slider re-initialises its internals.
  useEffect(() => {
    if (!isOpen) return;
    setIndex(safeInitial);
    setOpenKey((k) => k + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Detect "just opened" — on that render, prefer `safeInitial` over
  // the (possibly stale) `index` state so the very first frame
  // shows the correct image.
  const justOpened = isOpen && index !== safeInitial && openKey === 0;

  const effectiveIndex = openKey === 0 ? safeInitial : index;

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onKey]);

  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const slides = images.map((src, i) => (
    <img
      key={`${src}-${i}`}
      src={src}
      alt={`Image ${i + 1}`}
      className={local.image}
      draggable={false}
    />
  ));

  return (
    <div
      className={local.overlay}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <IconButton
        variant="ghost"
        size="md"
        shape="circle"
        className={local.closeBtn}
        aria-label="Close preview"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <CloseIcon width={22} height={22} fill="#fff" />
      </IconButton>

      <div className={local.stage} onClick={(e) => e.stopPropagation()}>
        <Slider
          key={`img-preview-${openKey}`}
          items={slides}
          index={effectiveIndex}
          onIndexChange={(next) => {
            setIndex(next);
            // Once the user interacts, `openKey` no longer needs to
            // pin the index — future renders rely on `index`.
            if (openKey === 0) setOpenKey(1);
          }}
          loop
          showArrows={images.length > 1}
          showDots={false}
          showCounter={images.length > 1}
          ariaLabel="Image gallery"
          prevIcon={
            <span className={local.arrowGlyph}>
              <LeftArrowIcon width={20} height={20} fill="#fff" />
            </span>
          }
          nextIcon={
            <span className={local.arrowGlyph}>
              <RightArrow width={20} height={20} fill="#fff" />
            </span>
          }
        />
      </div>
    </div>
  );
};

export default ImagePreview;