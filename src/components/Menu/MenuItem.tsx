// components/Menu/MenuItem.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { usePlan } from '../../hooks/usePlan';
import { Special, StarIcon } from '../../assets/svgs';
import WishlistButton from './WishlistButton';
import { formatCount } from '../../utils/formatCount';
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
  acceptingOrders: boolean;
  onToggleWishlist: (item: MenuItem) => void;
}

const MenuItemComponent: React.FC<MenuItemProps> = ({
  item,
  quantity,
  onItemClick,
  isWishlisted,
  acceptingOrders,
  onToggleWishlist,
}) => {
  const { tenant } = useTenant();
  const plan = usePlan();
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

  // ---- Reviews are hidden when the tenant flag is off OR plan excludes reviews ----
  const reviewsEnabled = tenant?.reviewsEnabled !== false;
  const hasReviews =
    plan.canReview &&
    reviewsEnabled &&
    typeof item.reviewCount === 'number' &&
    item.reviewCount > 0 &&
    typeof item.rating === 'number' &&
    item.rating > 0;

  const showVegBadge = isFieldEnabled('isVeg') && item.isVeg === true;

  // ---------- Price display ----------
  const discount = Number(item.discount ?? 0);
  const hasDiscount = discount > 0 && discount <= 100;
  const originalPrice = Number(item.price);
  const finalPrice = hasDiscount
    ? Math.round(originalPrice * (1 - discount / 100))
    : originalPrice;

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
        {plan.canWishlist && (
          <WishlistButton
            item={item}
            isWishlisted={isWishlisted}
            onToggle={onToggleWishlist}
          />
        )}

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

          {hasDiscount && !isOutOfStock && (
            <span className={styles.discountRibbon}>-{discount}%</span>
          )}
        </div>

        {!isOutOfStock && hasReviews && (
          <span className={styles.rating}>
            <StarIcon width={12} height={12} fill="#085b1b" /> {item.rating}
            <span className={styles.reviewCount}>
              ({formatCount(item.reviewCount)})
            </span>
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
          {strikethrough !== null && <del>Rs{strikethrough}</del>}
          Rs{finalPrice}
        </span>
        <div className={styles.actions}>
          {!plan.canOrder ? (
            <button className={styles.btnCustomize} onClick={handleAddClick}>
              View
            </button>
          ) : !acceptingOrders ? (
            <button className={styles.btnCustomize} onClick={handleAddClick}>
              Preview
            </button>
          ) : isOutOfStock ? (
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

// Plain shallow memo - plan flags flow through props so we don't need
// a custom comparator. Simpler and always correct.
export default React.memo(MenuItemComponent);