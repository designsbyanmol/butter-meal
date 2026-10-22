// src/components/ui/Slider/Slider.tsx
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import local from './Slider.module.scss';

export interface SliderProps {
  items: React.ReactNode[];
  index?: number;
  onIndexChange?: (next: number) => void;
  initialIndex?: number;
  loop?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
  showCounter?: boolean;
  autoPlayMs?: number;
  pauseOnHover?: boolean;
  gap?: number;
  className?: string;
  ariaLabel?: string;
  prevIcon?: React.ReactNode;
  nextIcon?: React.ReactNode;
  itemsPerView?:
    | number
    | { mobile?: number; tablet?: number; desktop?: number };
  mobilePeek?: number;
}

const BREAKPOINTS = { mobile: 640, tablet: 900 };
type Viewport = 'mobile' | 'tablet' | 'desktop';

const computePadCopies = (count: number, visibleCount: number): number => {
  if (count <= 0) return 0;
  const neededPerSide = Math.ceil(visibleCount) + 1;
  return Math.max(3, Math.ceil(neededPerSide / count) + 1);
};

const Slider: React.FC<SliderProps> = ({
  items,
  index: controlledIndex,
  onIndexChange,
  initialIndex = 0,
  loop = true,
  showArrows = true,
  showDots = true,
  showCounter = false,
  autoPlayMs,
  pauseOnHover = true,
  gap = 16,
  className,
  ariaLabel,
  prevIcon,
  nextIcon,
  itemsPerView = 1,
  mobilePeek,
}) => {
  const count = items.length;
  const trackRef = useRef<HTMLDivElement>(null);

  const [viewport, setViewport] = useState<Viewport>(() => {
    if (typeof window === 'undefined') return 'desktop';
    const w = window.innerWidth;
    if (w <= BREAKPOINTS.mobile) return 'mobile';
    if (w <= BREAKPOINTS.tablet) return 'tablet';
    return 'desktop';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onResize = () => {
      const w = window.innerWidth;
      if (w <= BREAKPOINTS.mobile) setViewport('mobile');
      else if (w <= BREAKPOINTS.tablet) setViewport('tablet');
      else setViewport('desktop');
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const resolveVisible = (): number => {
    if (viewport === 'mobile' && mobilePeek) return mobilePeek;
    if (typeof itemsPerView === 'number') return itemsPerView;
    return itemsPerView[viewport] ?? 1;
  };
  const visibleCount = Math.max(0.5, resolveVisible());
  const slidesVisible = Math.floor(visibleCount);

  const fitsInView = count > 0 && visibleCount >= count;
  const canSlide = count > 1 && !fitsInView;

  const isFractional = visibleCount !== Math.floor(visibleCount);
  const maxLogicalIndex = Math.max(
    0,
    count - (isFractional ? 1 : Math.ceil(visibleCount)),
  );

  const padCopies =
    loop && canSlide ? computePadCopies(count, visibleCount) : 0;
  const padLength = padCopies * count;

  const [currentIndex, setCurrentIndex] = useState(() =>
    Math.max(0, Math.min(initialIndex, Math.max(0, count - 1))),
  );
  const isControlled =
    typeof controlledIndex === 'number' &&
    typeof onIndexChange === 'function';
  const rawLogicalIndex = isControlled
    ? Math.max(0, Math.min(controlledIndex, Math.max(0, count - 1)))
    : currentIndex;
  const logicalIndex = Math.min(rawLogicalIndex, maxLogicalIndex);

  // ✅ FIX: seed physicalShift with `logicalIndex`, not `initialIndex`.
  const initialPhysical = padLength + logicalIndex;
  const [physicalShift, setPhysicalShift] = useState(initialPhysical);

  const logicalIndexRef = useRef(logicalIndex);
  const physicalShiftRef = useRef(physicalShift);
  const isDraggingRef = useRef(false);
  const isHoverPausedRef = useRef(false);
  const isControlledRef = useRef(isControlled);
  const onIndexChangeRef = useRef(onIndexChange);
  const padLengthRef = useRef(padLength);
  const countRef = useRef(count);
  const visibleCountRef = useRef(visibleCount);

  logicalIndexRef.current = logicalIndex;
  physicalShiftRef.current = physicalShift;
  isControlledRef.current = isControlled;
  onIndexChangeRef.current = onIndexChange;
  padLengthRef.current = padLength;
  countRef.current = count;
  visibleCountRef.current = visibleCount;

  useLayoutEffect(() => {
    const target = padLength + logicalIndexRef.current;
    setPhysicalShift(target);
    physicalShiftRef.current = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [padLength]);

  // ── NEW: keep physicalShift in sync when the caller changes
  // `index` while mounted. Fixes the "second open shows correct"
  // bug and any external programmatic navigation.
  useLayoutEffect(() => {
    if (!isControlled) return;
    const target = padLength + logicalIndex;
    if (physicalShiftRef.current === target) return;
    setPhysicalShift(target);
    physicalShiftRef.current = target;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logicalIndex, padLength, isControlled]);

  const reanchorIfNeeded = (proposed: number): number => {
    if (!loop) return proposed;
    const pad = padLengthRef.current;
    const n = countRef.current;
    const fullLen = pad * 2 + n;
    if (proposed < n) return proposed + pad;
    if (proposed >= fullLen - n) return proposed - pad;
    return proposed;
  };

  const step = useCallback(
    (direction: 1 | -1) => {
      if (!canSlide) return;
      if (count <= 0) return;

      const curPhysical = physicalShiftRef.current;
      const curLogical = logicalIndexRef.current;
      const maxIdx = Math.max(
        0,
        count - (isFractional ? 1 : Math.ceil(visibleCount)),
      );

      if (!loop) {
        if (direction > 0 && curLogical >= maxIdx) return;
        if (direction < 0 && curLogical <= 0) return;
      }

      const rawNext = curPhysical + direction;
      const target = reanchorIfNeeded(rawNext);
      const silent = target !== rawNext;

      if (silent) {
        const el = trackRef.current;
        if (el) el.style.transition = 'none';
        setPhysicalShift(target);
        physicalShiftRef.current = target;
        if (el) {
          void el.offsetWidth;
          el.style.transition = '';
        }
      } else {
        setPhysicalShift(target);
        physicalShiftRef.current = target;
      }

      let nextLogical: number;
      if (loop) {
        const pad = padLengthRef.current;
        nextLogical = (((target - pad) % count) + count) % count;
      } else {
        const pad = padLengthRef.current;
        nextLogical = Math.max(0, Math.min(target - pad, count - 1));
      }
      nextLogical = Math.min(nextLogical, maxIdx);

      logicalIndexRef.current = nextLogical;
      if (isControlledRef.current) {
        onIndexChangeRef.current?.(nextLogical);
      } else {
        setCurrentIndex(nextLogical);
      }
    },
    [canSlide, count, loop, visibleCount, isFractional],
  );

  const stepRef = useRef(step);
  stepRef.current = step;

  useEffect(() => {
    if (!canSlide) return;
    if (!autoPlayMs || count <= 1) return;
    const id = window.setInterval(() => {
      if (isDraggingRef.current) return;
      if (isHoverPausedRef.current) return;
      stepRef.current(1);
    }, autoPlayMs);
    return () => window.clearInterval(id);
  }, [canSlide, autoPlayMs, count]);

  const threshold = () => {
    const w = trackRef.current?.offsetWidth ?? window.innerWidth ?? 320;
    const slideW = w / visibleCount;
    return Math.max(40, slideW * 0.35);
  };

  const dragStartX = useRef<number | null>(null);
  const dragDelta = useRef(0);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  isDraggingRef.current = isDragging;

  const [isHoverPaused, setIsHoverPaused] = useState(false);
  isHoverPausedRef.current = isHoverPaused;

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!canSlide) return;
    dragStartX.current = e.clientX;
    dragDelta.current = 0;
    setDragOffset(0);
    setIsDragging(true);
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const raw = e.clientX - dragStartX.current;
    let delta = raw;

    if (!loop) {
      const idx = logicalIndexRef.current;
      const vc = visibleCountRef.current;
      const frac = vc !== Math.floor(vc);
      const maxIdx = Math.max(
        0,
        countRef.current - (frac ? 1 : Math.ceil(vc)),
      );
      if (idx <= 0 && delta > 0) delta = 0;
      if (idx >= maxIdx && delta < 0) delta = 0;
    }

    dragDelta.current = delta;
    setDragOffset(delta);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartX.current === null) return;
    const delta = dragDelta.current;
    dragStartX.current = null;
    dragDelta.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (!canSlide) return;
    const t = threshold();
    if (delta <= -t) step(1);
    else if (delta >= t) step(-1);
  };

  const onPointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartX.current = null;
    dragDelta.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!canSlide) return;
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      step(1);
    }
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      step(-1);
    }
  };

  const isFullWidth = visibleCount === 1;
  const slideBasisPct = isFullWidth ? 100 : 100 / visibleCount;
  const perSlideGap =
    slidesVisible > 1 ? (gap * (slidesVisible - 1)) / slidesVisible : 0;

  const isAtLast =
    canSlide &&
    !loop &&
    visibleCount > 1 &&
    count > 1 &&
    logicalIndex === maxLogicalIndex;

  const leftPeekSlideUnits =
    isAtLast && isFractional && visibleCount > 1
      ? visibleCount - 1
      : 0;

  const effectiveShift = Math.max(0, physicalShift - leftPeekSlideUnits);

  const translatePct = effectiveShift * slideBasisPct;
  const translateGapPx = (effectiveShift * gap) / visibleCount;

  const activeDotIndex = isFractional
    ? Math.min(count - 1, logicalIndex)
    : Math.min(
        count - 1,
        Math.max(
          0,
          logicalIndex + Math.max(0, Math.ceil(visibleCount) - 1),
        ),
      );

  if (count === 0) return null;

  if (fitsInView) {
    return (
      <div
        className={[local.wrap, local.staticWrap, className ?? '']
          .filter(Boolean)
          .join(' ')}
        aria-label={ariaLabel}
        role="group"
      >
        <div
          className={local.staticRow}
          style={{
            gap: `${gap}px`,
            gridTemplateColumns: `repeat(${count}, minmax(0, 1fr))`,
          }}
        >
          {items.map((item, i) => (
            <div key={i} className={local.staticSlide}>
              {item}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasMultiple = count > 1;
  const showArrowsResolved = showArrows && hasMultiple && canSlide;
  const showDotsResolved = showDots && hasMultiple && canSlide;
  const showCounterResolved = showCounter && hasMultiple && canSlide;
  const canPrev = loop || logicalIndex > 0;
  const canNext = loop || logicalIndex < maxLogicalIndex;

  const renderSlides: React.ReactNode[] = [];

  for (let i = 0; i < padLength; i++) {
    const src = ((count - padLength + i) % count + count) % count;
    renderSlides.push(
      <React.Fragment key={`lead-${i}`}>{items[src]}</React.Fragment>,
    );
  }

  items.forEach((item, i) => {
    renderSlides.push(
      <React.Fragment key={`real-${i}`}>{item}</React.Fragment>,
    );
  });

  for (let i = 0; i < padLength; i++) {
    const src = i % count;
    renderSlides.push(
      <React.Fragment key={`trail-${i}`}>{items[src]}</React.Fragment>,
    );
  }

  return (
    <div
      className={[local.wrap, className ?? ''].filter(Boolean).join(' ')}
      aria-label={ariaLabel}
      aria-roledescription="carousel"
      role="region"
      onPointerEnter={
        pauseOnHover ? () => setIsHoverPaused(true) : undefined
      }
      onPointerLeave={
        pauseOnHover ? () => setIsHoverPaused(false) : undefined
      }
    >
      <div
        ref={trackRef}
        className={local.viewport}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onKeyDown={onKeyDown}
        tabIndex={0}
        style={{
          cursor: hasMultiple ? 'grab' : 'default',
          touchAction: hasMultiple ? 'pan-y' : 'auto',
        }}
      >
        <div
          className={local.track}
          style={{
            gap: `${gap}px`,
            transform: `translateX(calc(-${translatePct}% - ${translateGapPx}px + ${dragOffset}px))`,
            transition: isDragging ? 'none' : undefined,
          }}
        >
          {renderSlides.map((item, i) => (
            <div
              key={i}
              className={local.slide}
              style={{
                flexBasis: isFullWidth
                  ? '100%'
                  : `calc(${slideBasisPct}% - ${perSlideGap}px)`,
                flexShrink: 0,
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>

      {showArrowsResolved && (
        <>
          <button
            type="button"
            className={`${local.arrow} ${local.arrowLeft}`}
            aria-label="Previous slide"
            onClick={() => step(-1)}
            disabled={!canPrev}
          >
            {prevIcon ?? <span className={local.arrowGlyph}>‹</span>}
          </button>

          <button
            type="button"
            className={`${local.arrow} ${local.arrowRight}`}
            aria-label="Next slide"
            onClick={() => step(1)}
            disabled={!canNext}
          >
            {nextIcon ?? <span className={local.arrowGlyph}>›</span>}
          </button>
        </>
      )}

      {showDotsResolved && (
        <div className={local.dots}>
          {Array.from({ length: count }).map((_, dotIndex) => (
            <button
              key={dotIndex}
              type="button"
              className={`${local.dot} ${
                dotIndex === activeDotIndex ? local.dotActive : ''
              }`}
              onClick={() => {
                const clamped = Math.min(dotIndex, maxLogicalIndex);
                const pad = padLengthRef.current;
                const target = pad + clamped;
                setPhysicalShift(target);
                physicalShiftRef.current = target;
                logicalIndexRef.current = clamped;
                if (isControlledRef.current) {
                  onIndexChangeRef.current?.(clamped);
                } else {
                  setCurrentIndex(clamped);
                }
              }}
              aria-label={`Go to slide ${dotIndex + 1}`}
              aria-current={
                dotIndex === activeDotIndex ? 'true' : undefined
              }
            />
          ))}
        </div>
      )}

      {showCounterResolved && (
        <div className={local.counter}>
          {logicalIndex + 1} / {count}
        </div>
      )}
    </div>
  );
};

export default Slider;