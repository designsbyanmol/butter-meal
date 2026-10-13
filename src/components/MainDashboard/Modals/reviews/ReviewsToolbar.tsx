// src/components/MainDashboard/Modals/reviews/ReviewsToolbar.tsx
import React, { useState } from 'react';
import { Input, Button, IconButton } from '../../../ui';
import { SearchIcon, FilterIcon } from '../../../../assets/svgs';
import ReviewsFilterSheet, {
  FilterGroup,
  CustomRangeRow,
} from './ReviewsFilterSheet';
import local from './ReviewsList.module.scss';

interface ReviewsToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder?: string;
  activeCount: number;
  onReset: () => void;
  /**
   * Groups of mixed value types. Each group is `FilterGroup<T>` for its
   * own `T`; the toolbar treats them as opaque objects.
   */
  groups: FilterGroup<any>[];
  customRange?: CustomRangeRow;
}

const ReviewsToolbar: React.FC<ReviewsToolbarProps> = ({
  search,
  onSearchChange,
  searchPlaceholder = 'Search…',
  activeCount,
  onReset,
  groups,
  customRange,
}) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  return (
    <>
      <div className={local.searchRow}>
        <div className={local.searchBox}>
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            leftIcon={
              <SearchIcon width={16} height={16} fill="#dcdcdc" aria-hidden />
            }
            rightIcon={
              search ? (
                <IconButton
                  variant="ghost"
                  size="xs"
                  aria-label="Clear search"
                  onClick={() => onSearchChange('')}
                >
                  ✕
                </IconButton>
              ) : undefined
            }
          />
        </div>

        <Button
          variant={activeCount > 0 ? 'primary' : 'ghost'}
          onClick={() => setIsFilterOpen(true)}
          leftIcon={
            <FilterIcon width={14} height={14} fill="currentColor" />
          }
          rightIcon={
            activeCount > 0 ? (
              <span className={local.filterCount}>{activeCount}</span>
            ) : undefined
          }
          className={local.filterBtn}
        >
          Filters
        </Button>
      </div>

      <ReviewsFilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onReset={onReset}
        groups={groups}
        customRange={customRange}
      />
    </>
  );
};

export default ReviewsToolbar;