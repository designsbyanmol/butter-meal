// src/components/Menu/MenuFilters.tsx
import React, { useMemo, useState } from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA, normalizeOptions } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { Input, IconButton, Chip, Button } from '../ui';
import { FilterIcon, SearchIcon } from '../../assets/svgs';
import MenuFilterPopup from './MenuFilterPopup';
import { MenuFilterState } from './menuFilters.types';
import { getStoreLabels } from '../../utils/storeLabels';
import local from './MenuFilters.module.scss';

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
  const labels = getStoreLabels(tenant?.storeCategory);

  const categories = useMemo(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    const options = normalizeOptions(catField?.options)
      .map((o) => o.name.trim())
      .filter(Boolean);

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
    <div className={local.wrap}>
      <div className={local.searchRow}>
        <div className={local.searchBox}>
          <Input
            placeholder={labels.searchPlaceholder}
            value={filters.search}
            onChange={(e) =>
              onChange({ ...filters, search: e.target.value })
            }
            leftIcon={
              <SearchIcon
                aria-hidden
                width={20}
                height={20}
                className={local.searchIcon}
                fill="#dcdcdc"
              />
            }
            rightIcon={
              filters.search ? (
                <IconButton
                  variant="ghost"
                  size="xs"
                  aria-label="Clear search"
                  onClick={() => onChange({ ...filters, search: '' })}
                >
                  ✕
                </IconButton>
              ) : undefined
            }
          />
        </div>

        <Button
          variant={advancedCount > 0 ? 'primary' : 'ghost'}
          onClick={() => setIsPopupOpen(true)}
          leftIcon={
            <FilterIcon width={14} height={14} fill="currentColor" />
          }
          rightIcon={
            advancedCount > 0 ? (
              <span className={local.filterCount}>{advancedCount}</span>
            ) : undefined
          }
          className={local.filterBtn}
        >
          Filters
        </Button>
      </div>

      {categories.length > 0 && (
        <div className={local.pillRow}>
          <Chip
            tone="primary"
            active={filters.category === null}
            onClick={() => onChange({ ...filters, category: null })}
          >
            All
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              tone="primary"
              active={filters.category === c}
              onClick={() =>
                onChange({
                  ...filters,
                  category: filters.category === c ? null : c,
                })
              }
            >
              {c}
            </Chip>
          ))}
        </div>
      )}

      {hasAnyFilter && categories.length > 0 && (
        <button
          type="button"
          className={local.clearAll}
          onClick={() =>
            onChange({
              search: '',
              category: null,
              types: new Set(),
              sort: 'default',
              stock: 'all',
            })
          }
        >
          Clear all
        </button>
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