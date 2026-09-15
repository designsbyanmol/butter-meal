// components/Menu/MenuItem.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { Special, StarIcon } from '../../assets/svgs';
import WishlistButton from './WishlistButton';
import styles from './Menu.module.scss';
import NewIcon from '../../assets/svgs/NewIcon';
import PopularIcon from '../../assets/svgs/PopularIcon';
import LimitedIcon from '../../assets/svgs/LimitedIcon';

interface MenuItemProps {
  item: MenuItem;
  quantity: number;
  onAdd: (item: MenuItem) => void;
  onRemove: (id: number) => void;
  onItemClick: (item: MenuItem) => void;
  isWishlisted: boolean;
  onToggleWishlist: (item: MenuItem) => void;
}

const MenuItemComponent: React.FC<MenuItemProps> = ({
  item,
  quantity,
  onItemClick,
  isWishlisted,
  onToggleWishlist,
}) => {
  const { tenant } = useTenant();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  const isFieldEnabled = (key: string): boolean => {
    const field = schema.fields.find((f) => f.key === key);
    return field ? field.enabled : false;
  };

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
    isFieldEnabled('rating') &&
    typeof item.rating === 'number' &&
    item.rating > 0;

  const hasReviewCount =
    isFieldEnabled('reviewCount') &&
    typeof item.reviewCount === 'number' &&
    item.reviewCount > 0;

  const showVegBadge = isFieldEnabled('isVeg') && item.isVeg === true;

  // ---------- Price display ----------
  const discount = Number(item.discount ?? 0);
  const hasDiscount = discount > 0 && discount <= 100;
  const originalPrice = Number(item.price);
  const finalPrice = hasDiscount
    ? Math.round(originalPrice * (1 - discount / 100))
    : originalPrice;

  // Strikethrough: prefer costPrice when there's no discount, else original price
  const showCostPrice =
    !hasDiscount &&
    isFieldEnabled('costPrice') &&
    typeof item.costPrice === 'number' &&
    item.costPrice > 0;

  const strikethrough = hasDiscount
    ? originalPrice
    : showCostPrice
    ? item.costPrice!
    : null;

  // Custom attributes (short pills)
  const simpleCustomEntries = schema.fields
    .filter((f) => !f.builtin && f.enabled)
    .map((field) => ({ field, value: item.attributes?.[field.key] }))
    .filter(
      ({ value }) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== '' &&
        String(value).length <= 16,
    )
    .slice(0, 2);

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
        <WishlistButton
          item={item}
          isWishlisted={isWishlisted}
          onToggle={onToggleWishlist}
        />

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

          {/* Discount ribbon on the image */}
          {hasDiscount && !isOutOfStock && (
            <span className={styles.discountRibbon}>-{discount}%</span>
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
            item.attributes?.isLimited ||
            showVegBadge) && (
            <div className={styles.badgeGroup}>
              {item.attributes?.isPopular && (
                <PopularIcon width={32} height={32} />
              )}
              {item.attributes?.isNew && <NewIcon width={32} height={32} />}
              {item.attributes?.isChefSpecial && (
                <Special width={32} height={32} />
              )}
              {item.attributes?.isLimited && (
                <LimitedIcon width={32} height={32} />
              )}
              {showVegBadge && (
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

        {simpleCustomEntries.length > 0 && (
          <div className={styles.itemMeta}>
            {simpleCustomEntries.map(({ field, value }) => (
              <span key={field.key} className={styles.prepTime}>
                {field.label}:{' '}
                {typeof value === 'boolean'
                  ? value
                    ? 'Yes'
                    : 'No'
                  : String(value)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.itemFooter}>
        <span className={styles.price}>
          {strikethrough !== null && (
            <del>Rs{strikethrough}</del>
          )}
          Rs{finalPrice}
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

export default React.memo(MenuItemComponent, (prev, next) => {
  return (
    prev.item.id === next.item.id &&
    prev.item.img === next.item.img &&
    prev.item.name === next.item.name &&
    prev.item.price === next.item.price &&
    prev.item.discount === next.item.discount &&      // ← NEW
    prev.item.costPrice === next.item.costPrice &&
    prev.item.inStock === next.item.inStock &&
    prev.item.rating === next.item.rating &&
    prev.item.reviewCount === next.item.reviewCount &&
    prev.item.isVeg === next.item.isVeg &&
    prev.item.attributes?.isPopular === next.item.attributes?.isPopular &&
    prev.item.attributes?.isNew === next.item.attributes?.isNew &&
    prev.item.attributes?.isChefSpecial ===
      next.item.attributes?.isChefSpecial &&
    prev.item.attributes?.isLimited === next.item.attributes?.isLimited &&
    prev.quantity === next.quantity &&
    prev.isWishlisted === next.isWishlisted
  );
});