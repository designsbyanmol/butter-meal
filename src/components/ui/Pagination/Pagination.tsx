// components/ui/Pagination/Pagination.tsx
import React from 'react';
import local from './Pagination.module.scss';
import { LeftArrowIcon, RightArrow } from '../../../assets/svgs';

export interface PaginationProps {
  /** Current page, 1-indexed. */
  page: number;
  /** Total number of pages (>= 1). */
  totalPages: number;
  /** Optional total item count for the "Showing X-Y of Z" label. */
  totalItems?: number;
  /** Items per page - required for the "Showing" label. */
  pageSize?: number;
  onChange: (page: number) => void;
  /** Optional className applied to the wrapper. */
  className?: string;
}

/**
 * Numbered pagination bar with prev/next buttons and ellipsis
 * compression when there are many pages.
 */
const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalItems,
  pageSize,
  onChange,
  className,
}) => {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  const push = (v: number | '...') => {
    if (pages[pages.length - 1] !== v) pages.push(v);
  };

  push(1);
  const windowStart = Math.max(2, page - 1);
  const windowEnd = Math.min(totalPages - 1, page + 1);

  if (windowStart > 2) push('...');
  for (let i = windowStart; i <= windowEnd; i++) push(i);
  if (windowEnd < totalPages - 1) push('...');
  if (totalPages > 1) push(totalPages);

  const showRange =
    typeof totalItems === 'number' && typeof pageSize === 'number';
  const from = showRange ? (page - 1) * pageSize! + 1 : 0;
  const to = showRange ? Math.min(totalItems!, page * pageSize!) : 0;

  return (
    <div className={[local.wrap, className ?? ''].filter(Boolean).join(' ')}>
      {showRange && (
        <span className={local.range}>
          Showing {from}-{to} of {totalItems}
        </span>
      )}

      <div className={local.controls}>
        <button
          type="button"
          className={local.navBtn}
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
        >
          <LeftArrowIcon width={14} height={14} fill="#1e1e1e"/>
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`gap-${i}`} className={local.ellipsis}>
              ...
            </span>
          ) : (
            <button
              key={p}
              type="button"
              className={`${local.pageBtn} ${
                p === page ? local.pageBtnActive : ''
              }`}
              onClick={() => onChange(p)}
              aria-current={p === page ? 'page' : undefined}
            >
              {p}
            </button>
          ),
        )}

        <button
          type="button"
          className={local.navBtn}
          onClick={() => onChange(page + 1)}
          disabled={page >= totalPages}
          aria-label="Next page"
        >
          <RightArrow width={14} height={14} fill="#1e1e1e" />
        </button>
      </div>
    </div>
  );
};

export default Pagination;