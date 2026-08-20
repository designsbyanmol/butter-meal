import React, { useState, useEffect } from 'react';
import { MenuItem } from '../../types';
import {
  MinusIcon,
  CheckIcon,
  ClockIcon,
  UtensilsIcon,
  StarIcon,
  PlusIcon
} from '../../assets/svgs';
import styles from './MenuDetail.module.scss';

interface MenuDetailProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  onAddToCart: (item: MenuItem, customizations?: Record<string, string>) => void;
}

const MenuDetail: React.FC<MenuDetailProps> = ({ isOpen, item, onClose, onAddToCart }) => {
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);

  // Reset state when item changes
  useEffect(() => {
    if (item) {
      setQuantity(1);
      // Initialize with default values
      const defaults: Record<string, string> = {};
      item.customizationOptions?.forEach(option => {
        if (option.default) {
          defaults[option.name] = option.default;
        }
      });
      setSelectedCustomizations(defaults);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleCustomizationChange = (optionName: string, value: string) => {
    setSelectedCustomizations(prev => ({
      ...prev,
      [optionName]: value
    }));
  };

  const handleAddToCart = () => {
    // Pass customizations to the cart
    onAddToCart(item, selectedCustomizations);
    onClose();
  };

  const getAddonPrice = (): number => {
    let total = 0;
    Object.values(selectedCustomizations).forEach(option => {
      const match = option.match(/\+Rs(\d+)/);
      if (match) {
        total += parseInt(match[1]);
      }
    });
    return total;
  };

  const getTotalPrice = () => {
    const basePrice = item.price;
    const addonPrice = getAddonPrice();
    return (basePrice + addonPrice) * quantity;
  };

  const getCustomizationSummary = (): string => {
    const selected = Object.entries(selectedCustomizations)
      .filter(([_, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    return selected.length > 0 ? selected.join(' | ') : 'No customizations';
  };
  const badgeClass = `${styles.badge} ${styles.popular}`;
console.log('Badge classes:', badgeClass);
console.log('styles.badge:', styles.badge);
console.log('styles.popular:', styles.popular);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>

        {/* Image */}
        <div className={styles.imageWrapper}>
          <img src={item.img} alt={item.name} />
          {item.attributes?.isPopular && (
            <span className={`${styles.badge} ${styles.popular}`}>Popular</span>
          )}
          {item.attributes?.isNew && (
            <span className={`${styles.badge} ${styles.new}`}>New</span>
          )}
          {item.attributes?.isChefSpecial && (
            <span className={`${styles.badge} ${styles.chefSpecial}`}>Chef's Special</span>
          )}
          {item.attributes?.isLimited && (
            <span className={`${styles.badge} ${styles.limited}`}>Limited</span>
          )}
          {item.isVeg && (
            <span className={`${styles.badge} ${styles.veg}`}>Veg</span>
          )}
        </div>

        {/* Content */}
        <div className={styles.content}>
          {/* Header */}
          <div className={styles.header}>
            <h2>{item.name}</h2>
            {!!item.rating && item.rating > 0 && (
              <div className={styles.rating}>
                <span className={styles.stars}><StarIcon width={14} height={14} fill="#3caa46"/></span>
                <span>{item.rating}</span>
                {item.reviewCount && (
                  <span className={styles.reviewCount}>({item.reviewCount})</span>
                )}
              </div>
            )}
          </div>

          {/* Description */}
          <p className={styles.description}>{item.desc}</p>

          {/* Tags */}
          <div className={styles.tags}>
            {item.category && (
              <span className={styles.tag}>
                <UtensilsIcon width={14} height={14} fill="#1e1e1e" />
                {item.category}
              </span>
            )}
            {item.isSpicy && (
              <span className={styles.tag}>Spicy</span>
            )}
            {item.isGlutenFree && (
              <span className={styles.tag}>Gluten-Free</span>
            )}
            {item.preparationTime && (
              <span className={styles.tag}>
                <ClockIcon width={14} height={14} fill="#1e1e1e" />
                {item.preparationTime}
              </span>
            )}
            {!!item.calories && item.calories > 0 &&(
              <span className={styles.tag}>
                <PlusIcon width={14} height={14} fill="#1e1e1e" />
                {item.calories} kcal
              </span>
            )}
          </div>

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

          {/* Nutritional Info */}
          {!!item.nutritionalInfo && Object.values(item.nutritionalInfo).some(value => value !== undefined && value === "") && (
            <div className={styles.section}>
              <h4>Nutritional Information</h4>
              <div className={styles.nutritionalInfo}>
                {item.nutritionalInfo.protein && (
                  <div className={styles.nutritionItem}>
                    <span>Protein</span>
                    <span>{item.nutritionalInfo.protein}g</span>
                  </div>
                )}
                {item.nutritionalInfo.carbs && (
                  <div className={styles.nutritionItem}>
                    <span>Carbs</span>
                    <span>{item.nutritionalInfo.carbs}g</span>
                  </div>
                )}
                {item.nutritionalInfo.fat && (
                  <div className={styles.nutritionItem}>
                    <span>Fat</span>
                    <span>{item.nutritionalInfo.fat}g</span>
                  </div>
                )}
                {item.nutritionalInfo.fiber && (
                  <div className={styles.nutritionItem}>
                    <span>Fiber</span>
                    <span>{item.nutritionalInfo.fiber}g</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Customizations */}
          {item.customizationOptions && item.customizationOptions.length > 0 && (
            <div className={styles.section}>
              <h4>Customize Your Order</h4>
              {item.customizationOptions.map((option) => (
                <div key={option.name} className={styles.customizationGroup}>
                  <label className={styles.customizationLabel}>{option.name}</label>
                  <div className={styles.customizationOptions}>
                    {option.options.map((opt) => (
                      <label key={opt} className={styles.customizationOption} data-active={selectedCustomizations[option.name] === opt}>
                        <input
                          type="radio"
                          name={option.name}
                          value={opt}
                          checked={
                            selectedCustomizations[option.name] === opt
                          }
                          onChange={() => handleCustomizationChange(option.name, opt)}
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customization Summary */}
          {Object.keys(selectedCustomizations).length > 0 && (
            <div className={styles.customizationSummary}>
              <span className={styles.summaryLabel}>Selected Customizations:</span>
              <span className={styles.summaryValue}>{getCustomizationSummary()}</span>
              {getAddonPrice() > 0 && (
                <span className={styles.addonPrice}>+Rs{getAddonPrice()} add-ons</span>
              )}
            </div>
          )}

          {/* Footer - Price & Add to Cart */}
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
                >
                  <MinusIcon width={16} height={16} fill="#1e1e1e" />
                </button>
                <span className={styles.qtyNum}>{quantity}</span>
                <button 
                  onClick={() => setQuantity(quantity + 1)}
                  className={styles.qtyBtn}
                >
                  <PlusIcon width={16} height={16} fill="#1e1e1e" />
                </button>
              </div>
            </div>
            <div className={styles.btnWrap}>
              <button className={styles.closeBtn} onClick={onClose}>
                Close
              </button>
              <button className={styles.addToCartBtn} onClick={handleAddToCart}>
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