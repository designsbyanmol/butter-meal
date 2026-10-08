// src/components/Menu/Menu.tsx
import React, { useMemo } from 'react';
import { MenuItem as MenuItemType, CartItem } from '../../types';
import { DEFAULT_FORM_SCHEMA, normalizeOptions } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { useWishlist } from '../../hooks/useWishlist';
import { getStoreLabels } from '../../utils/storeLabels';
import MenuItemComponent from './MenuItem';
import local from './Menu.module.scss';

interface MenuProps {
  items: MenuItemType[];
  cart: CartItem[];
  acceptingOrders: boolean;
  onAddItem: (item: MenuItemType) => void;
  onRemoveItem: (id: number) => void;
  onItemClick: (item: MenuItemType) => void;
}

interface CategoryGroup {
  category: string;
  items: MenuItemType[];
}

const UNCATEGORIZED = 'More';

const Menu: React.FC<MenuProps> = ({
  items,
  cart,
  onAddItem,
  onRemoveItem,
  onItemClick,
  acceptingOrders,
}) => {
  const { tenant } = useTenant();
  const { isWishlisted, toggle } = useWishlist();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
  const labels = getStoreLabels(tenant?.storeCategory);

  const categoryOrder = useMemo<string[]>(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    return normalizeOptions(catField?.options)
      .map((o) => o.name.trim())
      .filter(Boolean);
  }, [schema]);

  const schemaCategorySet = useMemo(
    () => new Set<string>(categoryOrder),
    [categoryOrder],
  );

  const groups = useMemo<CategoryGroup[]>(() => {
    const map = new Map<string, MenuItemType[]>();

    items.forEach((item) => {
      const raw = (item.category ?? '').trim();
      const key =
        raw && schemaCategorySet.has(raw) ? raw : UNCATEGORIZED;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(item);
    });

    const orderIndex = new Map<string, number>();
    categoryOrder.forEach((c, i) => orderIndex.set(c, i));
    const UNCATEGORIZED_INDEX = Number.MAX_SAFE_INTEGER;

    return Array.from(map.entries())
      .map(([category, list]) => ({ category, items: list }))
      .sort((a, b) => {
        const ai = orderIndex.get(a.category) ?? UNCATEGORIZED_INDEX;
        const bi = orderIndex.get(b.category) ?? UNCATEGORIZED_INDEX;
        return ai - bi;
      });
  }, [items, schemaCategorySet, categoryOrder]);

  if (items.length === 0) {
    return (
      <div className={local.emptyState}>
        <p>No {labels.items.toLowerCase()} available right now.</p>
      </div>
    );
  }

  return (
    <div className={local.menuWrap}>
      {groups.map((group) => (
        <section
          key={group.category}
          className={local.categorySection}
          id={`category-${slugify(group.category)}`}
        >
          <h2 className={local.categoryHeading}>
            <span className={local.categoryTitle}>{group.category}</span>
            <span className={local.categoryCount}>{group.items.length}</span>
          </h2>

          <div className={local.menuGrid}>
            {group.items.map((item) => {
              const quantity = cart
                .filter((c) => c.id === item.id)
                .reduce((sum, c) => sum + (c.quantity || 0), 0);

              return (
                <MenuItemComponent
                  key={item.id}
                  item={item}
                  quantity={quantity}
                  onAdd={onAddItem}
                  onRemove={onRemoveItem}
                  onItemClick={onItemClick}
                  isWishlisted={isWishlisted(item.id)}
                  onToggleWishlist={toggle}
                  acceptingOrders={acceptingOrders}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default Menu;