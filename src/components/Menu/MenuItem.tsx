import React from 'react';
import { MenuItem } from '../../types';
import { StarIcon } from '../../assets/svgs';
import styles from './Menu.module.scss';

interface MenuItemProps {
  item: MenuItem;
  quantity: number;
  onAdd: (item: MenuItem) => void;
  onRemove: (id: number) => void;
  onItemClick: (item: MenuItem) => void;
}

const MenuItemComponent: React.FC<MenuItemProps> = ({ 
  item, 
  quantity, 
  onItemClick 
}) => {
  const isAdded = quantity > 0;
  const isOutOfStock = !item.inStock;

  const handleClick = () => {
    // Don't allow click if out of stock
    if (isOutOfStock) return;
    onItemClick(item);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Don't allow add if out of stock
    if (isOutOfStock) return;
    // Open detail popup instead of directly adding
    onItemClick(item);
  };

  return (
    <div className={`${styles.itemCard} ${isOutOfStock ? styles.outOfStock : ''}`}>
      <div 
        className={styles.imageWrapper}
        onClick={handleClick}
        role="button"
        tabIndex={isOutOfStock ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
      >
        <div className={styles.itemImg}>
          <img src={item.img} alt={item.name} loading="lazy" />
          {/* Out of Stock Overlay */}
          {isOutOfStock && (
            <div className={styles.outOfStockOverlay}>
              <span className={styles.outOfStockBadge}>Out of Stock</span>
            </div>
          )}
        </div>

        {!isOutOfStock && !!item.rating && item.rating > 0 && (
          <span className={styles.rating}>
            <StarIcon width={12} height={12} fill="#085b1b"/> {item.rating}
            {item.reviewCount && (
                <span className={styles.reviewCount}>({item.reviewCount})</span>
              )}
          </span>
        )}

        {!isOutOfStock && item.attributes?.isPopular && (
          <span className={`${styles.badge} ${styles.popular}`}>Popular</span>
        )}
        {!isOutOfStock && item.attributes?.isNew && (
          <span className={`${styles.badge} ${styles.new}`}>New</span>
        )}
        {!isOutOfStock && item.attributes?.isChefSpecial && (
          <span className={`${styles.badge} ${styles.chefSpecial}`}>Special</span>
        )}
        {!isOutOfStock && item.isVeg && (
          <span className={`${styles.badge} ${styles.veg}`}></span>
        )}
      </div>
      
      <div 
        className={styles.itemInfo}
        onClick={handleClick}
        role="button"
        tabIndex={isOutOfStock ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
      >
        <div className={styles.itemName}>{item.name}</div>
      </div>
      
      <div className={styles.itemFooter}>
        <span className={styles.price}>
          {!!item.costPrice && item.costPrice > 0 && (<del>Rs{item.costPrice}</del>)}
          Rs{item.price}
        </span>
        <div className={styles.actions}>
          {isOutOfStock ? (
            <button 
              className={`${styles.btnCustomize} ${styles.btnOutOfStock}`}
              disabled
            >
              Out of Stock
            </button>
          ) : isAdded ? (
            <button 
              className={styles.btnCustomize}
              onClick={handleAddClick}
            >
              {quantity} Added
            </button>
          ) : (
            <button 
              className={styles.btnCustomize}
              onClick={handleAddClick}
            >
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MenuItemComponent;