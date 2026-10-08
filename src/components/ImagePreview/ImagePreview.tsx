// components/ImagePreview/ImagePreview.tsx
import React, { useEffect, useRef, useState } from 'react';
import { IconButton } from '../ui';
import { CloseIcon } from '../../assets/svgs';
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
  const [index, setIndex] = useState(initialIndex);
  const dragStartXRef = useRef<number | null>(null);
  const dragDeltaRef = useRef(0);

  // Reset to the requested image when opening
  useEffect(() => {
    if (isOpen) {
      setIndex(
        Math.max(0, Math.min(initialIndex, Math.max(0, images.length - 1))),
      );
    }
  }, [isOpen, initialIndex, images.length]);

  // Esc + arrow keys
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && images.length > 1) {
        setIndex((i) => (i + 1) % images.length);
      }
      if (e.key === 'ArrowLeft' && images.length > 1) {
        setIndex((i) => (i - 1 + images.length) % images.length);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, images.length, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  if (!isOpen || images.length === 0) return null;

  const currentImage = images[index] ?? images[0];
  const hasMultiple = images.length > 1;

  const threshold = () => {
    const w = window.innerWidth || 320;
    return Math.max(40, w * 0.12);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartXRef.current = e.clientX;
    dragDeltaRef.current = 0;
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    dragDeltaRef.current = e.clientX - dragStartXRef.current;
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    const delta = dragDeltaRef.current;
    dragStartXRef.current = null;
    dragDeltaRef.current = 0;

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (!hasMultiple) return;

    const t = threshold();
    if (delta <= -t) setIndex((i) => (i + 1) % images.length);
    else if (delta >= t)
      setIndex((i) => (i - 1 + images.length) % images.length);
  };

  const stop = (e: React.SyntheticEvent) => e.stopPropagation();

  const goPrev = () =>
    setIndex((i) => (i - 1 + images.length) % images.length);
  const goNext = () => setIndex((i) => (i + 1) % images.length);

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

      <div
        className={local.stage}
        onClick={stop}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          cursor: hasMultiple ? 'grab' : 'default',
          touchAction: hasMultiple ? 'pan-y' : 'auto',
        }}
      >
        <img
          key={currentImage}
          src={currentImage}
          alt={`Image ${index + 1}`}
          className={local.image}
          draggable={false}
        />
      </div>

      {hasMultiple && (
        <>
          <IconButton
            variant="ghost"
            size="lg"
            shape="circle"
            className={`${local.arrow} ${local.arrowLeft}`}
            aria-label="Previous image"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
          >
            <span className={local.arrowGlyph}>‹</span>
          </IconButton>

          <IconButton
            variant="ghost"
            size="lg"
            shape="circle"
            className={`${local.arrow} ${local.arrowRight}`}
            aria-label="Next image"
            onClick={(e) => {
              e.stopPropagation();
              goNext();
            }}
          >
            <span className={local.arrowGlyph}>›</span>
          </IconButton>

          <div className={local.counter} onClick={stop}>
            {index + 1} / {images.length}
          </div>
        </>
      )}
    </div>
  );
};

export default ImagePreview;