// src/components/Menu/MenuItem.tsx
import React from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { usePlan } from '../../hooks/usePlan';
import { Badge } from '../ui';
import { Special, StarIcon } from '../../assets/svgs';
import WishlistButton from './WishlistButton';
import { formatCount } from '../../utils/formatCount';
import { formatRupees } from '../../utils/subscription';
import NewIcon from '../../assets/svgs/NewIcon';
import PopularIcon from '../../assets/svgs/PopularIcon';
import LimitedIcon from '../../assets/svgs/LimitedIcon';
import local from './Menu.module.scss';

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

const BUILTIN_BADGE_ICONS: Record<
  string,
  React.FC<{ width: number; height: number }>
> = {
  isPopular: (props) => <PopularIcon {...props} />,
  isNew: (props) => <NewIcon {...props} />,
  isChefSpecial: (props) => <Special {...props} />,
  isLimited: (props) => <LimitedIcon {...props} />,
};

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

  const reviewsEnabled = tenant?.reviewsEnabled !== false;
  const hasReviews =
    plan.canReview &&
    reviewsEnabled &&
    typeof item.reviewCount === 'number' &&
    item.reviewCount > 0 &&
    typeof item.rating === 'number' &&
    item.rating > 0;

  const showVegBadge = isFieldEnabled('isVeg') && item.isVeg === true;

  const activeBadges = (schema.badges ?? []).filter(
    (b) => b.enabled && item.attributes?.[b.key],
  );
  const hasBadgeGroup = activeBadges.length > 0 || showVegBadge;

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

  return (
    <div
      className={`${local.itemCard} ${
        isOutOfStock ? local.outOfStock : ''
      }`}
    >
      <div
        className={local.imageWrapper}
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

        <div className={local.itemImg}>
          <img
            src={item.img}
            alt={item.name}
            loading="lazy"
            decoding="async"
            width={320}
            height={240}
          />
          {isOutOfStock && (
            <div className={local.outOfStockOverlay}>
              <span className={local.outOfStockBadge}>Out of Stock</span>
            </div>
          )}

          {hasDiscount && !isOutOfStock && (
            <Badge tone="danger" size="sm" className={local.discountRibbon}>
              -{discount}%
            </Badge>
          )}
        </div>

        {!isOutOfStock && hasReviews && (
          <span className={local.rating}>
            <StarIcon width={12} height={12} fill="#085b1b" /> {item.rating}
            <span className={local.reviewCount}>
              ({formatCount(item.reviewCount)})
            </span>
          </span>
        )}

        {!isOutOfStock && hasBadgeGroup && (
          <div className={local.badgeGroup}>
            {activeBadges.map((badge) => {
              if (badge.image) {
                return (
                  <img
                    key={badge.key}
                    src={badge.image}
                    alt={badge.label}
                    className={local.badgeImg}
                    title={badge.label}
                  />
                );
              }
              const FallbackIcon = BUILTIN_BADGE_ICONS[badge.key];
              if (FallbackIcon) {
                return (
                  <span
                    key={badge.key}
                    className={local.badgeSvgWrap}
                    title={badge.label}
                  >
                    <FallbackIcon width={24} height={24} />
                  </span>
                );
              }
              return (
                <span
                  key={badge.key}
                  className={local.badgeTextChip}
                  title={badge.label}
                >
                  {badge.label}
                </span>
              );
            })}

            {showVegBadge && (
              <span className={`${local.badge} ${local.veg}`} />
            )}
          </div>
        )}
      </div>

      <div
        className={local.itemInfo}
        onClick={handleClick}
        role="button"
        tabIndex={isOutOfStock ? -1 : 0}
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
        style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
      >
        <div className={local.itemName}>{item.name}</div>
      </div>

      <div className={local.itemFooter}>
        <span className={local.price}>
          {strikethrough !== null && (
            <del>{formatRupees(strikethrough)}</del>
          )}
          {formatRupees(finalPrice)}
        </span>
        <div className={local.actions}>
          {!plan.canOrder ? (
            <button className={local.btnCustomize} onClick={handleAddClick}>
              View
            </button>
          ) : !acceptingOrders ? (
            <button className={local.btnCustomize} onClick={handleAddClick}>
              Preview
            </button>
          ) : isOutOfStock ? (
            <button
              className={`${local.btnCustomize} ${local.btnOutOfStock}`}
              disabled
            >
              Out of Stock
            </button>
          ) : isAdded ? (
            <button className={local.btnCustomize} onClick={handleAddClick}>
              {quantity} Added
            </button>
          ) : (
            <button className={local.btnCustomize} onClick={handleAddClick}>
              Add
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default React.memo(MenuItemComponent);