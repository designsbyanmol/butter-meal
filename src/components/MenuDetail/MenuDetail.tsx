// components/MenuDetail/MenuDetail.tsx
import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
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
  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [customMessage, setCustomMessage] = useState('');

// This keeps user selections stable across polls.
const itemId = item?.id;
useEffect(() => {
  if (!item) return;

  setQuantity(1);
  setCustomMessage('');

  const defaults: Record<string, string> = {};
  item.customizationOptions?.forEach((option) => {
    // Defensive: skip malformed groups
    if (!option || !Array.isArray(option.choices)) return;

    if (option.default) {
      const trimmedDefault = String(option.default).trim();
      const choice = option.choices.find(
        (c) => c && typeof c.name === 'string' && c.name.trim() === trimmedDefault,
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

  // ============ HANDLERS ============

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
    return (item.price + getAddonPrice()) * quantity;
  };

  const getCustomizationSummary = (): string => {
    const selected = Object.entries(selectedCustomizations)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    return selected.length > 0 ? selected.join(' | ') : 'No customizations';
  };

  // ============ FIELD PRESENCE FLAGS ============

  const hasDesc = !!item.desc && item.desc.trim() !== '';
  const hasCategory = !!item.category && item.category.trim() !== '';
  const hasPrepTime =
    !!item.preparationTime && item.preparationTime.trim() !== '';
  const hasCalories =
    typeof item.calories === 'number' && item.calories > 0;
  const hasRating = typeof item.rating === 'number' && item.rating > 0;
  const hasReviewCount =
    typeof item.reviewCount === 'number' && item.reviewCount > 0;

  const hasAnyTag =
    hasCategory ||
    item.isSpicy === true ||
    item.isGlutenFree === true ||
    hasPrepTime ||
    hasCalories;

  const nutritionEntries =
    item.nutritionalInfo && typeof item.nutritionalInfo === 'object'
      ? Object.entries(item.nutritionalInfo).filter(
          ([_, v]) =>
            v !== undefined && v !== null && String(v).trim() !== '',
        )
      : [];
  const hasNutrition = nutritionEntries.length > 0;

  const hasCustomizations =
    Array.isArray(item.customizationOptions) &&
    item.customizationOptions.length > 0;

  const hasAnyCustomizationSelected =
    Object.keys(selectedCustomizations).length > 0;

  // ============ RENDER ============

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
        {/* Image */}
        <div className={styles.imageWrapper}>
          <img src={item.img} alt={item.name} />
          {(item.attributes?.isPopular ||
            item.attributes?.isNew ||
            item.attributes?.isChefSpecial ||
            item.attributes?.isLimited ||
            item?.isVeg) && (
            <div className={styles.badgesWrapper}>
              {item.attributes?.isPopular && (
                <PopularIcon width={32} height={32}/>
              )}
              {item.attributes?.isNew && (
                <NewIcon width={32} height={32}/>
              )}
              {item.attributes?.isChefSpecial && (
                <Special width={32} height={32}/>
              )}
              {item.attributes?.isLimited && (
                <LimitedIcon width={32} height={32}/>
              )}
              {item.isVeg && (
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

          {/* Description — only if non-empty */}
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
              {item.isSpicy && <span className={styles.tag}>Spicy</span>}
              {item.isGlutenFree && (
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

          {/* Ingredients */}
          {item.ingredients && item.ingredients.length > 0 && (
            <div className={styles.section}>
              <h4>Ingredients</h4>
              <div className={styles.ingredients}>
                {item.ingredients.map((ingredient, index) => (
                  <span key={index} className={styles.ingredient}>
                    <CheckIcon width={12} height={12} fill="#3CAA46" />
                    {ingredient}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nutritional Info — only if at least one value exists */}
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

          {/* Customizations — new shape with per-choice pricing */}
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
                      (Rs{item.price + getAddonPrice()} × {quantity})
                    </span>
                  )}
                </div>
                {getAddonPrice() > 0 && (
                  <div className={styles.basePrice}>
                    Base: Rs{item.price} + Add-ons: Rs{getAddonPrice()}
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