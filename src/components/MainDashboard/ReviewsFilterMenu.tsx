// components/MainDashboard/ReviewsFilterMenu.tsx
import React from 'react';
import {
  DropdownMenu,
  DropdownItem,
  DropdownSection,
  DropdownDivider,
  IconButton,
} from '../ui';
import { FilterIcon } from '../../assets/svgs';
import { ReviewFilter } from '../../types';

export type ReviewSortKey = 'recent' | 'oldest' | 'ratingLow' | 'ratingHigh';

interface ReviewsFilterMenuProps {
  filter: ReviewFilter;
  onFilterChange: (next: ReviewFilter) => void;
  sort: ReviewSortKey;
  onSortChange: (next: ReviewSortKey) => void;
  activeCount: number;
  onReset: () => void;
}

const FILTER_OPTIONS: { key: ReviewFilter; label: string }[] = [
  { key: 'all', label: 'All reviews' },
  { key: 'lte4', label: '< 4 stars' },
  { key: 'lte3', label: '< 3 stars' },
  { key: 'lte2', label: '< 2 stars' },
  { key: 'commented', label: 'With comments' },
];

const SORT_OPTIONS: { key: ReviewSortKey; label: string }[] = [
  { key: 'recent', label: 'Newest first' },
  { key: 'oldest', label: 'Oldest first' },
  { key: 'ratingLow', label: 'Rating: low - high' },
  { key: 'ratingHigh', label: 'Rating: high - low' },
];

const ReviewsFilterMenu: React.FC<ReviewsFilterMenuProps> = ({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  activeCount,
  onReset,
}) => (
  <DropdownMenu
    minWidth={220}
    trigger={({ toggle }) => (
      <IconButton
        variant={activeCount > 0 ? 'primary' : 'soft'}
        size="md"
        aria-label="Filter reviews"
        tooltip="Filter reviews"
        onClick={toggle}
      >
        <FilterIcon width={16} height={16} fill="currentColor" />
      </IconButton>
    )}
  >
    {({ close }) => (
      <>
        <DropdownSection label="Show">
          {FILTER_OPTIONS.map((opt) => (
            <DropdownItem
              key={opt.key}
              active={filter === opt.key}
              onClick={() => onFilterChange(opt.key)}
            >
              {opt.label}
            </DropdownItem>
          ))}
        </DropdownSection>

        <DropdownDivider />

        <DropdownSection label="Sort by">
          {SORT_OPTIONS.map((opt) => (
            <DropdownItem
              key={opt.key}
              active={sort === opt.key}
              onClick={() => onSortChange(opt.key)}
            >
              {opt.label}
            </DropdownItem>
          ))}
        </DropdownSection>

        {activeCount > 0 && (
          <>
            <DropdownDivider />
            <DropdownItem
              tone="danger"
              onClick={() => {
                onReset();
                close();
              }}
            >
              Reset filters
            </DropdownItem>
          </>
        )}
      </>
    )}
  </DropdownMenu>
);

export default ReviewsFilterMenu;