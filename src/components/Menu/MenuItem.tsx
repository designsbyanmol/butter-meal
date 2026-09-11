// components/Menu/MenuItem.tsx
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
  onItemClick,
}) => {
  const isAdded = quantity > 0;
  const isOutOfStock = !item.inStock;

  const handleClick = () => {
    if (isOutOfStock) return;
    onItemClick(item);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    onItemClick(item);
  };

  const hasRating =
    typeof item.rating === 'number' && item.rating > 0;
  const hasReviewCount =
    typeof item.reviewCount === 'number' && item.reviewCount > 0;

  return (
    <div
      className={`${styles.itemCard} ${
        isOutOfStock ? styles.outOfStock : ''
      }`}
    >
      <div
        className={styles.imageWrapper}
        onClick={handleClick}
        role="button"
        tabIndex={isOutOfStock ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
      >
        <div className={styles.itemImg}>
          <img
            src={item.img}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width={320}
            height={240}
          />
          {isOutOfStock && (
            <div className={styles.outOfStockOverlay}>
              <span className={styles.outOfStockBadge}>Out of Stock</span>
            </div>
          )}
        </div>

        {!isOutOfStock && hasRating && (
          <span className={styles.rating}>
            <StarIcon width={12} height={12} fill="#085b1b" /> {item.rating}
            {hasReviewCount && (
              <span className={styles.reviewCount}>
                ({item.reviewCount})
              </span>
            )}
          </span>
        )}
        

        {!isOutOfStock &&
          (item.attributes?.isPopular ||
            item.attributes?.isNew ||
            item.attributes?.isChefSpecial ||
            item.isVeg) && (
            <div className={styles.badgeGroup}>
              {item.attributes?.isPopular && (
                <span className={`${styles.badge} ${styles.popular}`}>Popular</span>
              )}
              {item.attributes?.isNew && (
                <span className={`${styles.badge} ${styles.new}`}>New</span>
              )}
              {item.attributes?.isChefSpecial && (
                <span className={`${styles.badge} ${styles.chefSpecial}`}>
                  Special
                </span>
              )}
              {item.isVeg && (
                <span className={`${styles.badge} ${styles.veg}`} />
              )}
            </div>
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
          {!!item.costPrice && item.costPrice > 0 && (
            <del>Rs{item.costPrice}</del>
          )}
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
            <button className={styles.btnCustomize} onClick={handleAddClick}>
              {quantity} Added
            </button>
          ) : (
            <button className={styles.btnCustomize} onClick={handleAddClick}>
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ✅ Memoized so identical poll results don't re-render — saves image revalidation
export default React.memo(MenuItemComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.img === next.item.img &&
    prev.item.name === next.item.name &&
    prev.item.price === next.item.price &&
    prev.item.costPrice === next.item.costPrice &&
    prev.item.inStock === next.item.inStock &&
    prev.item.rating === next.item.rating &&
    prev.item.reviewCount === next.item.reviewCount &&
    prev.item.isVeg === next.item.isVeg &&
    prev.item.attributes?.isPopular === next.item.attributes?.isPopular &&
    prev.item.attributes?.isNew === next.item.attributes?.isNew &&
    prev.item.attributes?.isChefSpecial ===
      next.item.attributes?.isChefSpecial &&
    prev.quantity === next.quantity
  );
});