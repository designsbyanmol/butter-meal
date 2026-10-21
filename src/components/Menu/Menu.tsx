// components/Menu/Menu.tsx
import React from 'react';
import { MenuItem as MenuItemType, CartItem } from '../../types';
import MenuItemComponent from './MenuItem';
import styles from './Menu.module.scss';

interface MenuProps {
  items: MenuItemType[];
  cart: CartItem[];
  onAddItem: (item: MenuItemType) => void;
  onRemoveItem: (id: number) => void;
  onItemClick: (item: MenuItemType) => void;
}

const Menu: React.FC<MenuProps> = ({
  items,
  cart,
  onAddItem,
  onRemoveItem,
  onItemClick,
}) => {
  return (
    <div className={styles.menuGrid}>
      {items.map((item) => {
        // Aggregate quantity across all cart entries for this menu item
        // (an item may appear multiple times with different customizations)
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
          />
        );
      })}

      {items.length === 0 && (
        <div className={styles.emptyState}>
          <p>No items available right now.</p>
        </div>
      )}
    </div>
  );
};

export default Menu;