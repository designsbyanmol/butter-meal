// components/Menu/MenuFilters.tsx
import React, { useMemo, useState } from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { CloseIcon } from '../../assets/svgs';
import FilterIcon from '../../assets/svgs/FilterIcon';
import MenuFilterPopup from './MenuFilterPopup';
import {
  MenuFilterState,
  EMPTY_FILTERS,
} from './menuFilters.types';
import styles from './MenuFilters.module.scss';

interface MenuFiltersProps {
  items: MenuItem[];
  filters: MenuFilterState;
  onChange: (next: MenuFilterState) => void;
}

const MenuFilters: React.FC<MenuFiltersProps> = ({
  items,
  filters,
  onChange,
}) => {
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const { tenant } = useTenant();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  // Schema category order — pills follow this exactly
  const categories = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    const options = (catField?.options ?? [])
      .map((s) => s.trim())
      .filter(Boolean);

    // Only show categories that are actually used by at least one item
    const usedInItems = new Set<string>();
    items.forEach((it) => {
      const c = (it.category ?? '').trim();
      if (c) usedInItems.add(c);
    });

    return options.filter((c) => usedInItems.has(c));
  }, [items, schema]);

  const advancedCount =
    filters.types.size +
    (filters.sort !== 'default' ? 1 : 0) +
    (filters.stock !== 'all' ? 1 : 0);

  const hasAnyFilter =
    filters.search.trim() !== '' ||
    filters.category !== null ||
    advancedCount > 0;

  return (
    <div className={styles.wrap}>
      {/* Search + Filter button */}
      <div className={styles.searchRow}>
        <div className={styles.searchBox}>
          <span className={styles.searchIcon} aria-hidden>🔍</span>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search dishes, categories…"
            value={filters.search}
            onChange={(e) =>
              onChange({ ...filters, search: e.target.value })
            }
          />
          {filters.search && (
            <button
              type="button"
              className={styles.clearSearch}
              onClick={() => onChange({ ...filters, search: '' })}
              aria-label="Clear search"
            >
              <CloseIcon width={14} height={14} fill="#7d6b60" />
            </button>
          )}
        </div>

        <button
          type="button"
          className={`${styles.filterBtn} ${
            advancedCount > 0 ? styles.filterBtnActive : ''
          }`}
          onClick={() => setIsPopupOpen(true)}
        >
          <FilterIcon width={16} height={16} fill="currentColor" />
          <span>Filters</span>
          {advancedCount > 0 && (
            <span className={styles.filterCount}>{advancedCount}</span>
          )}
        </button>
      </div>

      {/* Category pills — ordered by schema */}
      {categories.length > 0 && (
        <div className={styles.pillRow}>
          <button
            type="button"
            className={`${styles.pill} ${
              filters.category === null ? styles.pillActive : ''
            }`}
            onClick={() => onChange({ ...filters, category: null })}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.pill} ${
                filters.category === c ? styles.pillActive : ''
              }`}
              onClick={() =>
                onChange({
                  ...filters,
                  category: filters.category === c ? null : c,
                })
              }
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <MenuFilterPopup
        isOpen={isPopupOpen}
        items={items}
        filters={filters}
        onApply={(next) => {
          onChange(next);
          setIsPopupOpen(false);
        }}
        onClose={() => setIsPopupOpen(false)}
      />
    </div>
  );
};

export default MenuFilters;