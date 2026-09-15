// components/MenuDetail/MenuDetail.tsx
import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import { DEFAULT_FORM_SCHEMA } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import {
  MinusIcon,
  CheckIcon,
  ClockIcon,
  UtensilsIcon,
  StarIcon,
  PlusIcon,
  Special,
} from '../../assets/svgs';
import styles from './MenuDetail.module.scss';
import PopularIcon from '../../assets/svgs/PopularIcon';
import NewIcon from '../../assets/svgs/NewIcon';
import LimitedIcon from '../../assets/svgs/LimitedIcon';

interface MenuDetailProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (
    item: MenuItem,
    customizations?: Record<string, string>,
    customMessage?: string,
  ) => void;
}

const MenuDetail: React.FC<MenuDetailProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
}) => {
  const { tenant } = useTenant();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;

  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [customMessage, setCustomMessage] = useState('');

  const itemId = item?.id;

  useEffect(() => {
    if (!item) return;

    setQuantity(1);
    setCustomMessage('');

    const defaults: Record<string, string> = {};
    item.customizationOptions?.forEach((option) => {
      if (!option || !Array.isArray(option.choices)) return;

      if (option.default) {
        const trimmedDefault = String(option.default).trim();
        const choice = option.choices.find(
          (c) =>
            c && typeof c.name === 'string' && c.name.trim() === trimmedDefault,
        );
        if (choice) {
          defaults[option.name] =
            choice.price > 0
              ? `${choice.name} +Rs${choice.price}`
              : choice.name;
        }
      }
    });
    setSelectedCustomizations(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId]);

  if (!isOpen || !item) return null;

  // ============ SCHEMA HELPERS ============

  const isFieldEnabled = (key: string): boolean => {
    const field = schema.fields.find((f) => f.key === key);
    return field ? field.enabled : false;
  };

  // ============ DISCOUNT + PRICE ============

  const discount = Number(item.discount ?? 0);
  const hasDiscount = discount > 0 && discount <= 100;
  const effectiveUnitPrice = hasDiscount
    ? Math.round(item.price * (1 - discount / 100))
    : item.price;

  const handleCustomizationChange = (optionName: string, value: string) => {
    setSelectedCustomizations((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const handleAddToCart = () => {
    onAddToCart(item, selectedCustomizations, customMessage);
    onClose();
  };

  // ============ DERIVED VALUES ============

  const getAddonPrice = (): number => {
    let total = 0;
    Object.values(selectedCustomizations).forEach((option) => {
      const match = option.match(/\+Rs(\d+)/);
      if (match) total += parseInt(match[1], 10);
    });
    return total;
  };

  const getTotalPrice = (): number => {
    return (effectiveUnitPrice + getAddonPrice()) * quantity;
  };

  const getCustomizationSummary = (): string => {
    const selected = Object.entries(selectedCustomizations)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    return selected.length > 0 ? selected.join(' | ') : 'No customizations';
  };

  // ============ FIELD PRESENCE FLAGS (schema-aware) ============

  const hasDesc =
    isFieldEnabled('desc') && !!item.desc && item.desc.trim() !== '';

  const hasCategory =
    isFieldEnabled('category') &&
    !!item.category &&
    item.category.trim() !== '';

  const hasPrepTime =
    isFieldEnabled('preparationTime') &&
    !!item.preparationTime &&
    item.preparationTime.trim() !== '';

  const hasCalories =
    isFieldEnabled('calories') &&
    typeof item.calories === 'number' &&
    item.calories > 0;

  const hasRating =
    isFieldEnabled('rating') &&
    typeof item.rating === 'number' &&
    item.rating > 0;

  const hasReviewCount =
    isFieldEnabled('reviewCount') &&
    typeof item.reviewCount === 'number' &&
    item.reviewCount > 0;

  const showSpicy = isFieldEnabled('isSpicy') && item.isSpicy === true;
  const showGlutenFree =
    isFieldEnabled('isGlutenFree') && item.isGlutenFree === true;

  const hasAnyTag =
    hasCategory || showSpicy || showGlutenFree || hasPrepTime || hasCalories;

  const nutritionEntries =
    item.nutritionalInfo && typeof item.nutritionalInfo === 'object'
      ? Object.entries(item.nutritionalInfo).filter(
          ([_, v]) => v !== undefined && v !== null && String(v).trim() !== '',
        )
      : [];
  const hasNutrition = nutritionEntries.length > 0;

  const hasIngredients =
    isFieldEnabled('ingredients') &&
    Array.isArray(item.ingredients) &&
    item.ingredients.length > 0;

  const hasCustomizations =
    Array.isArray(item.customizationOptions) &&
    item.customizationOptions.length > 0;

  const hasAnyCustomizationSelected =
    Object.keys(selectedCustomizations).length > 0;

  const customFieldEntries = schema.fields
    .filter((f) => !f.builtin && f.enabled)
    .map((field) => {
      const value = item.attributes?.[field.key];
      return { field, value };
    })
    .filter(
      ({ value }) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== '',
    );

  // ============ RENDER ============

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className={styles.imageWrapper}>
          <img src={item.img} alt={item.name} />

          {/* Discount ribbon */}
          {hasDiscount && (
            <span className={styles.discountRibbon}>-{discount}%</span>
          )}

          {(item.attributes?.isPopular ||
            item.attributes?.isNew ||
            item.attributes?.isChefSpecial ||
            item.attributes?.isLimited ||
            (isFieldEnabled('isVeg') && item?.isVeg)) && (
            <div className={styles.badgesWrapper}>
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
              {isFieldEnabled('isVeg') && item.isVeg && (
                <span className={`${styles.badge} ${styles.veg}`}>Veg</span>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <h2>{item.name}</h2>
            {hasRating && (
              <div className={styles.rating}>
                <span className={styles.stars}>
                  <StarIcon width={14} height={14} fill="#3caa46" />
                </span>
                <span>{item.rating}</span>
                {hasReviewCount && (
                  <span className={styles.reviewCount}>
                    ({item.reviewCount})
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Discount line */}
          {hasDiscount && (
            <div className={styles.discountLine}>
              <del>Rs{item.price}</del>
              <span className={styles.discountTag}>{discount}% off</span>
            </div>
          )}

          {/* Description */}
          {hasDesc && <p className={styles.description}>{item.desc}</p>}

          {/* Tags */}
          {hasAnyTag && (
            <div className={styles.tags}>
              {hasCategory && (
                <span className={styles.tag}>
                  <UtensilsIcon width={14} height={14} fill="#1e1e1e" />
                  {item.category}
                </span>
              )}
              {showSpicy && <span className={styles.tag}>Spicy</span>}
              {showGlutenFree && (
                <span className={styles.tag}>Gluten-Free</span>
              )}
              {hasPrepTime && (
                <span className={styles.tag}>
                  <ClockIcon width={14} height={14} fill="#1e1e1e" />
                  {item.preparationTime}
                </span>
              )}
              {hasCalories && (
                <span className={styles.tag}>
                  <PlusIcon width={14} height={14} fill="#1e1e1e" />
                  {item.calories} kcal
                </span>
              )}
            </div>
          )}

          {/* Custom fields */}
          {customFieldEntries.length > 0 && (
            <div className={styles.section}>
              <h4>Additional Information</h4>
              <div className={styles.nutritionalInfo}>
                {customFieldEntries.map(({ field, value }) => (
                  <div key={field.key} className={styles.nutritionItem}>
                    <span>{field.label}</span>
                    <span>
                      {typeof value === 'boolean'
                        ? value
                          ? 'Yes'
                          : 'No'
                        : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Ingredients */}
          {hasIngredients && (
            <div className={styles.section}>
              <h4>Ingredients</h4>
              <div className={styles.ingredients}>
                {item.ingredients!.map((ingredient, index) => (
                  <span key={index} className={styles.ingredient}>
                    <CheckIcon width={12} height={12} fill="#3CAA46" />
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nutritional Info */}
          {hasNutrition && (
            <div className={styles.section}>
              <h4>Nutritional Information</h4>
              <div className={styles.nutritionalInfo}>
                {nutritionEntries.map(([key, value]) => (
                  <div key={key} className={styles.nutritionItem}>
                    <span>
                      {key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span>{value}g</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Customizations */}
          {hasCustomizations && (
            <div className={styles.section}>
              <h4>Customize Your Order</h4>
              {item.customizationOptions!.map((option) => (
                <div key={option.name} className={styles.customizationGroup}>
                  <label className={styles.customizationLabel}>
                    {option.name}
                  </label>
                  <div className={styles.customizationOptions}>
                    {option.choices.map((choice) => {
                      const displayValue =
                        choice.price > 0
                          ? `${choice.name} +Rs${choice.price}`
                          : choice.name;
                      const isActive =
                        selectedCustomizations[option.name] === displayValue;
                      return (
                        <label
                          key={choice.name}
                          className={styles.customizationOption}
                          data-active={isActive}
                        >
                          <input
                            type="radio"
                            name={option.name}
                            value={displayValue}
                            checked={isActive}
                            onChange={() =>
                              handleCustomizationChange(
                                option.name,
                                displayValue,
                              )
                            }
                          />
                          <span>
                            {choice.name}
                            {choice.price > 0 && (
                              <em className={styles.choicePrice}>
                                {' '}
                                +Rs{choice.price}
                              </em>
                            )}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customization Summary */}
          {hasAnyCustomizationSelected && (
            <div className={styles.customizationSummary}>
              <span className={styles.summaryLabel}>
                Selected Customizations:
              </span>
              <span className={styles.summaryValue}>
                {getCustomizationSummary()}
              </span>
              {getAddonPrice() > 0 && (
                <span className={styles.addonPrice}>
                  +Rs{getAddonPrice()} add-ons
                </span>
              )}
            </div>
          )}

          {/* Special Instructions */}
          <div className={styles.section}>
            <h4>Special Instructions</h4>
            <div className={styles.customMessageWrapper}>
              <textarea
                className={styles.customMessageInput}
                placeholder="Add any special instructions for the restaurant (e.g., extra sauce, less spice, etc.)"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              {customMessage && (
                <div className={styles.messageCharCount}>
                  {customMessage.length}/500
                </div>
              )}
            </div>
          </div>

          {/* Footer — Price & Add to Cart */}
          <div className={styles.footer}>
            <div className={styles.priceSection}>
              <div>
                <div className={styles.price}>
                  Rs{getTotalPrice()}
                  {quantity > 1 && (
                    <span className={styles.pricePerItem}>
                      (Rs{effectiveUnitPrice + getAddonPrice()} × {quantity})
                    </span>
                  )}
                </div>
                {getAddonPrice() > 0 && (
                  <div className={styles.basePrice}>
                    Base: Rs{effectiveUnitPrice} + Add-ons: Rs
                    {getAddonPrice()}
                  </div>
                )}
              </div>
              <div className={styles.quantityControls}>
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className={styles.qtyBtn}
                  aria-label="Decrease quantity"
                >
                  <MinusIcon width={16} height={16} fill="#1e1e1e" />
                </button>
                <span className={styles.qtyNum}>{quantity}</span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className={styles.qtyBtn}
                  aria-label="Increase quantity"
                >
                  <PlusIcon width={16} height={16} fill="#1e1e1e" />
                </button>
              </div>
            </div>
            <div className={styles.btnWrap}>
              <button className={styles.closeBtn} onClick={onClose}>
                Close
              </button>
              <button
                className={styles.addToCartBtn}
                onClick={handleAddToCart}
              >
                Add to Cart
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuDetail;