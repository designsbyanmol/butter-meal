// src/components/MainDashboard/Modals/reviews/ReviewsFilterSheet.tsx
import React from 'react';
import { Sheet, Button, Chip, FormField, Input } from '../../../ui';
import local from './ReviewsList.module.scss';

export interface FilterOption<T extends string = string> {
  key: T;
  label: string;
}

export interface CustomRangeRow {
  triggerKey: string;
  fromValue: string;
  toValue: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  fromLabel?: string;
  toLabel?: string;
}

/**
 * A generic filter group. `T` is the union of keys (e.g. the tab's
 * filter value union). Defaults to `string` so callers that don't care
 * can ignore the generic.
 */
export interface FilterGroup<T extends string = string> {
  title: string;
  options: FilterOption<T>[];
  value: T;
  onChange: (key: T) => void;
}

export interface ReviewsFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onReset: () => void;
  /**
   * Heterogeneous groups (each one may have a different `T`). The
   * sheet itself doesn't care about the value's type - it just calls
   * `onChange` with the clicked chip's key.
   */
  groups: FilterGroup<any>[];
  customRange?: CustomRangeRow;
}

const ReviewsFilterSheet: React.FC<ReviewsFilterSheetProps> = ({
  isOpen,
  onClose,
  onReset,
  groups,
  customRange,
}) => {
  const handleReset = () => {
    onReset();
    onClose();
  };

  const showCustomRange =
    !!customRange &&
    groups.some((g) => g.value === customRange.triggerKey);

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      mobileFullScreen
      title="Filters"
      maxHeightVh={86}
      className={local.filterFooter}
      footer={
        <>
          <Button variant="ghost" onClick={handleReset} block>
            Reset
          </Button>
          <Button onClick={onClose} block>
            Apply
          </Button>
        </>
      }
    >
      {groups.map((g) => (
        <section key={g.title} className={local.filterSection}>
          <h4>{g.title}</h4>
          <div className={local.chipGrid}>
            {g.options.map((o) => (
              <Chip
                key={o.key}
                tone="primary"
                active={g.value === o.key}
                onClick={() => g.onChange(o.key)}
              >
                {o.label}
              </Chip>
            ))}
          </div>

          {showCustomRange &&
            customRange &&
            g.value === customRange.triggerKey && (
              <div className={local.dateRangeRow}>
                <FormField label={customRange.fromLabel ?? 'From'}>
                  <Input
                    type="date"
                    value={customRange.fromValue}
                    onChange={(e) =>
                      customRange.onFromChange(e.target.value)
                    }
                  />
                </FormField>
                <FormField label={customRange.toLabel ?? 'To'}>
                  <Input
                    type="date"
                    value={customRange.toValue}
                    onChange={(e) =>
                      customRange.onToChange(e.target.value)
                    }
                  />
                </FormField>
              </div>
            )}
        </section>
      ))}
    </Sheet>
  );
};

export default ReviewsFilterSheet;