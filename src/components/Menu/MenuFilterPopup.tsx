// src/components/Menu/MenuFilterPopup.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { Sheet, Button, Chip, Tabs } from '../ui';
import {
  MenuFilterState,
  MenuType,
  SortKey,
  StockFilter,
  EMPTY_FILTERS,
} from './menuFilters.types';
import local from './MenuFilterPopup.module.scss';

interface MenuFilterPopupProps {
  isOpen: boolean;
  items: MenuItem[];
  filters: MenuFilterState;
  onApply: (next: MenuFilterState) => void;
  onClose: () => void;
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'default', label: 'Recommended' },
  { key: 'priceAsc', label: 'Price: Low - High' },
  { key: 'priceDesc', label: 'Price: High - Low' },
  { key: 'ratingDesc', label: 'Rating: High - Low' },
  { key: 'ratingAsc', label: 'Rating: Low - High' },
  { key: 'healthiest', label: 'Healthiest First' },
  { key: 'discountDesc', label: 'Most Discount' },
  { key: 'discountLeast', label: 'Least Discount' },
];

const STOCK_OPTIONS: { key: StockFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'inStock', label: 'In Stock' },
  { key: 'outOfStock', label: 'Out of Stock' },
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

  const [draft, setDraft] = useState<MenuFilterState>(filters);

  useEffect(() => {
    if (isOpen) setDraft(filters);
  }, [isOpen, filters]);

  // ---------- Schema-driven badges that are actually present on items ----------
  const availableBadges = useMemo(() => {
    const badges = schema.badges ?? [];
    return badges.filter((badge) => {
      if (!badge.enabled) return false;
      // Only show the badge as a filter option if at least one item has it
      return items.some((it) => it.attributes?.[badge.key]);
    });
  }, [items, schema]);

  const hasVeg = useMemo(() => {
    if (!isFieldEnabled('isVeg')) return false;
    return items.some((it) => it.isVeg === true);
  }, [items, schema]);

  const hasNonVeg = useMemo(() => {
    if (!isFieldEnabled('isVeg')) return false;
    return items.some((it) => it.isVeg === false);
  }, [items, schema]);

  const toggleType = (t: MenuType) => {
    const next = new Set(draft.types);
    next.has(t) ? next.delete(t) : next.add(t);
    setDraft({ ...draft, types: next });
  };

  const setSort = (s: SortKey) => setDraft({ ...draft, sort: s });
  const setStock = (s: StockFilter) => setDraft({ ...draft, stock: s });
  const resetDraft = () => setDraft({ ...EMPTY_FILTERS, types: new Set() });
  const apply = () => onApply(draft);

  const hasAnyType =
    availableBadges.length > 0 || hasVeg || hasNonVeg;

  // Map badge key - Chip tone. Falls back to 'primary' for custom badges.
  const badgeTone = (
    key: string,
  ):
    | 'popular'
    | 'new'
    | 'chef'
    | 'limited'
    | 'primary' => {
    switch (key) {
      case 'isPopular':
        return 'popular';
      case 'isNew':
        return 'new';
      case 'isChefSpecial':
        return 'chef';
      case 'isLimited':
        return 'limited';
      default:
        return 'primary';
    }
  };

  return (
    <Sheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filters"
      maxHeightVh={86}
      className={local.filterFooter}
      footer={
        <>
          <Button variant="ghost" onClick={resetDraft} block>
            Reset
          </Button>
          <Button onClick={apply} block>
            Apply
          </Button>
        </>
      }
    >
      {/* --- Item Type chips (schema-driven) --- */}
      {hasAnyType && (
        <section className={local.section}>
          <h4>Item Type</h4>
          <div className={local.chipGrid}>
            {availableBadges.map((badge) => (
              <Chip
                key={badge.key}
                tone={badgeTone(badge.key)}
                active={draft.types.has(badge.key as MenuType)}
                onClick={() => toggleType(badge.key as MenuType)}
              >
                {badge.image ? (
                  <img
                    src={badge.image}
                    alt=""
                    className={local.badgeChipImg}
                  />
                ) : null}
                {badge.label}
              </Chip>
            ))}

            {hasVeg && (
              <Chip
                tone="veg"
                active={draft.types.has('veg')}
                onClick={() => toggleType('veg')}
              >
                Veg
              </Chip>
            )}
            {hasNonVeg && (
              <Chip
                tone="nonVeg"
                active={draft.types.has('nonVeg')}
                onClick={() => toggleType('nonVeg')}
              >
                Non-Veg
              </Chip>
            )}
          </div>
        </section>
      )}

      {/* --- Availability --- */}
      <section className={local.section}>
        <h4>Availability</h4>
        <Tabs
          block
          items={STOCK_OPTIONS.map((o) => ({
            key: o.key,
            label: o.label,
          }))}
          value={draft.stock}
          onChange={(k) => setStock(k as StockFilter)}
        />
      </section>

      {/* --- Sort --- */}
      <section className={local.section}>
        <h4>Sort By</h4>
        <div className={local.radioList}>
          {SORT_OPTIONS.map((o) => {
            const active = draft.sort === o.key;
            return (
              <button
                key={o.key}
                type="button"
                className={`${local.radioRow} ${
                  active ? local.radioActive : ''
                }`}
                onClick={() => setSort(o.key)}
              >
                <span
                  className={`${local.radioDot} ${
                    active ? local.radioDotActive : ''
                  }`}
                />
                <span>{o.label}</span>
              </button>
            );
          })}
        </div>
      </section>
    </Sheet>
  );
};

export default MenuFilterPopup;