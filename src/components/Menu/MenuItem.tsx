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

  const handleClick = () => {
    onItemClick(item);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Open detail popup instead of directly adding
    onItemClick(item);
  };

  return (
    <>
    {item.inStock && (
      <div className={styles.itemCard}>
        <div 
          className={styles.imageWrapper}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          <div className={styles.itemImg}>
            <img src={item.img} alt={item.name} loading="lazy" />
          </div>
  
            {!!item.rating && item.rating > 0 &&(
              <span className={styles.rating}>
                <StarIcon width={12} height={12} fill="#085b1b"/> {item.rating}
                {item.reviewCount && (
                    <span className={styles.reviewCount}>({item.reviewCount})</span>
                  )}
              </span>
            )}

          {item.attributes?.isPopular && (
            <span className={`${styles.badge} ${styles.popular}`}>Popular</span>
          )}
          {item.attributes?.isNew && (
            <span className={`${styles.badge} ${styles.new}`}>New</span>
          )}
          {item.attributes?.isChefSpecial && (
            <span className={`${styles.badge} ${styles.chefSpecial}`}>Special</span>
          )}
          {item.isVeg && (
            <span className={`${styles.badge} ${styles.veg}`}></span>
          )}
        </div>
        
        <div 
          className={styles.itemInfo}
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        >
          <div className={styles.itemName}>{item.name}</div>
        </div>
        
        <div className={styles.itemFooter}>
          <span className={styles.price}>{!!item.costPrice && item.costPrice > 0 && (<del>Rs{item.costPrice}</del>)}Rs{item.price}</span>
          <div className={styles.actions}>
            {isAdded ? (
              // Show quantity controls when item is already in cart
                <button 
                className={styles.btnCustomize}
                onClick={handleAddClick}
              >
                {quantity} Added
              </button>
            ) : (
              // Show "Customize" button when item is not in cart
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
    )}
    </>
  );
};

export default MenuItemComponent;