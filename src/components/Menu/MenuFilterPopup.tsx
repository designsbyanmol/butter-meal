// components/Menu/MenuFilterPopup.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { CloseIcon } from '../../assets/svgs';
import {
  MenuFilterState,
  MenuType,
  SortKey,
  StockFilter,
  EMPTY_FILTERS,
} from './menuFilters.types';
import styles from './MenuFilterPopup.module.scss';

interface MenuFilterPopupProps {
  isOpen: boolean;
  items: MenuItem[];
  filters: MenuFilterState;
  onApply: (next: MenuFilterState) => void;
  onClose: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default',       label: 'Recommended' },
  { key: 'priceAsc',      label: 'Price: Low → High' },
  { key: 'priceDesc',     label: 'Price: High → Low' },
  { key: 'ratingDesc',    label: 'Rating: High → Low' },
  { key: 'ratingAsc',     label: 'Rating: Low → High' },
  { key: 'healthiest',    label: 'Healthiest First' },
  { key: 'discountDesc',  label: 'Most Discount' },
  { key: 'discountLeast', label: 'Least Discount' },
];

const STOCK_OPTIONS: { key: StockFilter; label: string }[] = [
  { key: 'all',         label: 'All' },
  { key: 'inStock',     label: 'In Stock' },
  { key: 'outOfStock',  label: 'Out of Stock' },
];

const MenuFilterPopup: React.FC<MenuFilterPopupProps> = ({
  isOpen,
  items,
  filters,
  onApply,
  onClose,
}) => {
  const { tenant } = useTenant();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  const isFieldEnabled = (key: string): boolean => {
    const f = schema.fields.find((x) => x.key === key);
    return f ? f.enabled : false;
  };

  // Local draft — user edits this, then taps "Apply"
  const [draft, setDraft] = useState<MenuFilterState>(filters);

  // Reset draft every time popup opens
  useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [isOpen, filters]);

  // Lock body scroll while open
  useEffect(() => {
    if (!isOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  // Which type pills should be shown? (only if at least one item has it)
  const available = useMemo(() => {
    const has = {
      popular: false, new: false, chefSpecial: false,
      limited: false, veg: false, nonVeg: false,
    };
    items.forEach((it) => {
      if (it.attributes?.isPopular) has.popular = true;
      if (it.attributes?.isNew) has.new = true;
      if (it.attributes?.isChefSpecial) has.chefSpecial = true;
      if (it.attributes?.isLimited) has.limited = true;
      if (isFieldEnabled('isVeg')) {
        if (it.isVeg === true) has.veg = true;
        if (it.isVeg === false) has.nonVeg = true;
      }
    });
    return has;
  }, [items, schema]);

  if (!isOpen) return null;

  const toggleType = (t: MenuType) => {
    const next = new Set(draft.types);
    next.has(t) ? next.delete(t) : next.add(t);
    setDraft({ ...draft, types: next });
  };

  const setSort = (s: SortKey) =>
    setDraft({ ...draft, sort: s });

  const setStock = (s: StockFilter) =>
    setDraft({ ...draft, stock: s });

  const resetDraft = () =>
    setDraft({ ...EMPTY_FILTERS, types: new Set() });

  const apply = () => onApply(draft);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div
        className={styles.sheet}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Advanced filters"
      >
        {/* Header */}
        <div className={styles.header}>
          <h3>Filters</h3>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close"
          >
            <CloseIcon width={18} height={18} fill="#4d4d4d" />
          </button>
        </div>

        {/* Body */}
        <div className={styles.body}>
          {/* --- Type badges --- */}
          {(available.popular ||
            available.new ||
            available.chefSpecial ||
            available.limited ||
            available.veg ||
            available.nonVeg) && (
            <section className={styles.section}>
              <h4>Item Type</h4>
              <div className={styles.chipGrid}>
                {available.popular && (
                  <Chip
                    label="Popular"
                    active={draft.types.has('popular')}
                    onClick={() => toggleType('popular')}
                    tone="popular"
                  />
                )}
                {available.new && (
                  <Chip
                    label="New"
                    active={draft.types.has('new')}
                    onClick={() => toggleType('new')}
                    tone="new"
                  />
                )}
                {available.chefSpecial && (
                  <Chip
                    label="Chef's Special"
                    active={draft.types.has('chefSpecial')}
                    onClick={() => toggleType('chefSpecial')}
                    tone="chef"
                  />
                )}
                {available.limited && (
                  <Chip
                    label="Limited"
                    active={draft.types.has('limited')}
                    onClick={() => toggleType('limited')}
                    tone="limited"
                  />
                )}
                {available.veg && (
                  <Chip
                    label="Veg"
                    active={draft.types.has('veg')}
                    onClick={() => toggleType('veg')}
                    tone="veg"
                  />
                )}
                {available.nonVeg && (
                  <Chip
                    label="Non-Veg"
                    active={draft.types.has('nonVeg')}
                    onClick={() => toggleType('nonVeg')}
                    tone="nonVeg"
                  />
                )}
              </div>
            </section>
          )}

          {/* --- Stock --- */}
          <section className={styles.section}>
            <h4>Availability</h4>
            <div className={styles.segmented}>
              {STOCK_OPTIONS.map((o) => (
                <button
                  key={o.key}
                  type="button"
                  className={`${styles.segment} ${
                    draft.stock === o.key ? styles.segmentActive : ''
                  }`}
                  onClick={() => setStock(o.key)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </section>

          {/* --- Sort --- */}
          <section className={styles.section}>
            <h4>Sort By</h4>
            <div className={styles.radioList}>
              {SORT_OPTIONS.map((o) => (
                <label
                  key={o.key}
                  className={`${styles.radioRow} ${
                    draft.sort === o.key ? styles.radioActive : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="sort"
                    value={o.key}
                    checked={draft.sort === o.key}
                    onChange={() => setSort(o.key)}
                  />
                  <span>{o.label}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.resetBtn}
            onClick={resetDraft}
          >
            Reset
          </button>
          <button
            type="button"
            className={styles.applyBtn}
            onClick={apply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

// ---- Chip -------------------------------------------------------------
const Chip: React.FC<{
  label: string;
  active: boolean;
  onClick: () => void;
  tone: 'popular' | 'new' | 'chef' | 'limited' | 'veg' | 'nonVeg';
}> = ({ label, active, onClick, tone }) => (
  <button
    type="button"
    className={`${styles.chip} ${styles[`tone_${tone}`]} ${
      active ? styles.chipActive : ''
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

export default MenuFilterPopup;