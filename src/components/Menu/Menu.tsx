// components/Menu/Menu.tsx
import React, { useMemo } from 'react';
import { MenuItem as MenuItemType, CartItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { useWishlist } from '../../hooks/useWishlist';
import MenuItemComponent from './MenuItem';
import styles from './Menu.module.scss';

interface MenuProps {
  items: MenuItemType[];
  cart: CartItem[];
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
}) => {
  const { tenant } = useTenant();
  const { isWishlisted, toggle } = useWishlist();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  // Schema category order
  const categoryOrder = useMemo<string[]>(() => {
    const catField = schema.fields.find((f) => f.key === 'category');
    return (catField?.options ?? []).map((s) => s.trim()).filter(Boolean);
  }, [schema]);

  const schemaCategorySet = useMemo(
    () => new Set<string>(categoryOrder),
    [categoryOrder],
  );

  // Group by category, bucket unknowns into "More", then sort by schema order
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
      <div className={styles.emptyState}>
        <p>No items available right now.</p>
      </div>
    );
  }

  return (
    <div className={styles.menuWrap}>
      {groups.map((group) => (
        <section
          key={group.category}
          className={styles.categorySection}
          id={`category-${slugify(group.category)}`}
        >
          <h2 className={styles.categoryHeading}>
            <span className={styles.categoryTitle}>{group.category}</span>
            <span className={styles.categoryCount}>{group.items.length}</span>
          </h2>

          <div className={styles.menuGrid}>
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