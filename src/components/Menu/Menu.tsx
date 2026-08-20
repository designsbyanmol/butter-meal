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

const Menu: React.FC<MenuProps> = ({ items, cart, onAddItem, onRemoveItem, onItemClick }) => {
  return (
    <div className={styles.menuGrid}>
      {items.map(item => {
        const cartItem = cart.find(c => c.id === item.id);
        const quantity = cartItem ? cartItem.quantity : 0;
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
    </div>
  );
};

export default Menu;