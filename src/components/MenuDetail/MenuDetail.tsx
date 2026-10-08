// src/components/MenuDetail/MenuDetail.tsx
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MenuItem, CartItem, BadgeDefinition } from '../../types';
import { DEFAULT_FORM_SCHEMA, normalizeOptions } from '../../types';
import { useTenant } from '../../contexts/TenantContext';
import { usePlan } from '../../hooks/usePlan';
import {
  MinusIcon,
  CheckIcon,
  ClockIcon,
  UtensilsIcon,
  StarIcon,
  PlusIcon,
  Special,
} from '../../assets/svgs';
import { formatRupees } from '../../utils/subscription';
import { Sheet, Modal, Button, IconButton, Chip } from '../ui';
import { useIsMobile } from '../../hooks/useIsMobile';
import PopularIcon from '../../assets/svgs/PopularIcon';
import NewIcon from '../../assets/svgs/NewIcon';
import LimitedIcon from '../../assets/svgs/LimitedIcon';
import ExpandIcon from '../../assets/svgs/ExpandIcon';
import ImagePreview from '../ImagePreview/ImagePreview';
import ReviewSection from '../Reviews/ReviewSection';
import { formatCount } from '../../utils/formatCount';
import local from './MenuDetail.module.scss';

interface MenuDetailProps {
  isOpen: boolean;
  item: MenuItem | null;
  onClose: () => void;
  /**
   * Adds the picked quantity to the cart (or to the matching cart line).
   */
  onAddToCart: (
    item: MenuItem,
    customizations?: Record<string, string>,
    customMessage?: string,
    quantity?: number,
  ) => void;
  /**
   * Sets the matching cart line to exactly the picked quantity.
   * Used when a matching line already exists.
   */
  onUpdateCart?: (
    item: MenuItem,
    customizations?: Record<string, string>,
    customMessage?: string,
    quantity?: number,
  ) => void;
  acceptingOrders?: boolean;
  /**
   * The full cart. Used to find the matching line (same item id + same
   * customizations) so the stepper can seed from it and the CTA can
   * toggle between Add and Update.
   */
  cart?: CartItem[];
}

/**
 * Fallback SVG per built-in badge key.
 */
const BUILTIN_BADGE_ICONS: Record<
  string,
  React.FC<{ width: number; height: number }>
> = {
  isPopular: (props) => <PopularIcon {...props} />,
  isNew: (props) => <NewIcon {...props} />,
  isChefSpecial: (props) => <Special {...props} />,
  isLimited: (props) => <LimitedIcon {...props} />,
};

/** Deep-equal for customization records (order-independent). */
const sameCustomizations = (
  a?: Record<string, string>,
  b?: Record<string, string>,
): boolean => {
  const aEmpty = !a || Object.keys(a).length === 0;
  const bEmpty = !b || Object.keys(b).length === 0;
  if (aEmpty && bEmpty) return true;
  if (aEmpty !== bEmpty) return false;
  return JSON.stringify(a) === JSON.stringify(b);
};

const MenuDetail: React.FC<MenuDetailProps> = ({
  isOpen,
  item,
  onClose,
  onAddToCart,
  onUpdateCart,
  acceptingOrders = true,
  cart = [],
}) => {
  const { tenant } = useTenant();
  const plan = usePlan();
  const schema = tenant?.formSchema ?? DEFAULT_FORM_SCHEMA;
  const isMobile = useIsMobile();

  const [selectedCustomizations, setSelectedCustomizations] = useState<
    Record<string, string>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [customMessage, setCustomMessage] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Slider state
  const [slideIndex, setSlideIndex] = useState(0);
  const [prevIndex, setPrevIndex] = useState<number | null>(null);
  const dragStartXRef = useRef<number | null>(null);
  const dragDeltaRef = useRef<number>(0);
  const sliderRef = useRef<HTMLDivElement>(null);
  const fadeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const itemId = item?.id;

  // ---------------------------------------------------------
  // Reset state when the item changes or the modal opens.
  // (Quantity is seeded below, once customizations are resolved.)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!item) return;

    setCustomMessage('');
    setSlideIndex(0);
    setPrevIndex(null);
    dragStartXRef.current = null;
    dragDeltaRef.current = 0;

    const defaults: Record<string, string> = {};
    item.customizationOptions?.forEach((option) => {
      if (!option || !Array.isArray(option.choices)) return;
      if (option.default) {
        const trimmedDefault = String(option.default).trim();
        const choice = option.choices.find(
          (c) =>
            c &&
            typeof c.name === 'string' &&
            c.name.trim() === trimmedDefault,
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

    return () => {
      if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, isOpen]);

  // ---------------------------------------------------------
  // Find the matching cart line for the CURRENT selection.
  // Recomputes whenever customizations change, so:
  //   - Default selection matches a cart line - show that line's qty, CTA = Update
  //   - User picks a different addon - no match - qty = 1, CTA = Add to Cart
  // ---------------------------------------------------------
  const matchedLine = useMemo(() => {
    if (!item) return undefined;
    return cart.find(
      (c) => c.id === item.id && sameCustomizations(c.customizations, selectedCustomizations),
    );
  }, [cart, item, selectedCustomizations]);

  const matchedQuantity = matchedLine?.quantity ?? 0;
  const isInCart = matchedQuantity > 0;

  // ---------------------------------------------------------
  // Seed the stepper.
  // Runs when:
  //   - the modal opens for a new item (matchedLine undetermined at reset)
  //   - the current selection's match changes (addon added/removed)
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isOpen || !item) return;
    setQuantity(matchedQuantity > 0 ? matchedQuantity : 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedQuantity, itemId, isOpen]);

  if (!isOpen || !item) return null;

  const isFieldEnabled = (key: string): boolean => {
    const field = schema.fields.find((f) => f.key === key);
    return field ? field.enabled : false;
  };

  // ---------- Discount + price ----------
  const discount = Number(item.discount ?? 0);
  const hasDiscount = discount > 0 && discount <= 100;
  const effectiveUnitPrice = hasDiscount
    ? Math.round(item.price * (1 - discount / 100))
    : item.price;

  // ---------- Gallery ----------
  const galleryImages: string[] =
    item.gallery && item.gallery.length > 0
      ? item.gallery
      : item.img
      ? [item.img]
      : [];
  const hasMultipleImages = galleryImages.length > 1;
  const currentImage = galleryImages[slideIndex] ?? item.img ?? '';

  const swipeThreshold = () => {
    const w = sliderRef.current?.offsetWidth ?? 320;
    return Math.max(40, w * 0.12);
  };

  const goToSlide = (nextIndex: number) => {
    if (nextIndex === slideIndex) return;
    if (nextIndex < 0 || nextIndex >= galleryImages.length) return;
    if (fadeTimeoutRef.current) clearTimeout(fadeTimeoutRef.current);

    setPrevIndex(slideIndex);
    setSlideIndex(nextIndex);

    fadeTimeoutRef.current = setTimeout(() => {
      setPrevIndex(null);
      fadeTimeoutRef.current = null;
    }, 260);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasMultipleImages) return;
    const target = e.target as HTMLElement;
    if (target.closest('[data-slider-dot]')) return;
    if (target.closest('[data-slider-icon]')) return;

    dragStartXRef.current = e.clientX;
    dragDeltaRef.current = 0;
    try {
      (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    dragDeltaRef.current = e.clientX - dragStartXRef.current;
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartXRef.current === null) return;
    const delta = dragDeltaRef.current;
    const threshold = swipeThreshold();
    dragStartXRef.current = null;
    dragDeltaRef.current = 0;

    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    if (delta <= -threshold && slideIndex < galleryImages.length - 1) {
      goToSlide(slideIndex + 1);
    } else if (delta >= threshold && slideIndex > 0) {
      goToSlide(slideIndex - 1);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    dragStartXRef.current = null;
    dragDeltaRef.current = 0;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const handleCustomizationChange = (optionName: string, value: string) => {
    setSelectedCustomizations((prev) => ({
      ...prev,
      [optionName]: value,
    }));
  };

  const handleSubmit = () => {
    if (!plan.canOrder || !acceptingOrders) return;

    if (isInCart && onUpdateCart) {
      onUpdateCart(item, selectedCustomizations, customMessage, quantity);
    } else {
      onAddToCart(item, selectedCustomizations, customMessage, quantity);
    }
    onClose();
  };

  const getAddonPrice = (): number => {
    let total = 0;
    Object.values(selectedCustomizations).forEach((option) => {
      const match = option.match(/\+Rs(\d+)/);
      if (match) total += parseInt(match[1], 10);
    });
    return total;
  };

  const getTotalPrice = (): number =>
    (effectiveUnitPrice + getAddonPrice()) * quantity;

  const getCustomizationSummary = (): string => {
    const selected = Object.entries(selectedCustomizations)
      .filter(([, value]) => value)
      .map(([key, value]) => `${key}: ${value}`);
    return selected.length > 0 ? selected.join(' | ') : 'No customizations';
  };

  // ---------- Field presence flags ----------
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

  const reviewsEnabled = tenant?.reviewsEnabled !== false;
  const hasReviews =
    plan.canReview &&
    reviewsEnabled &&
    typeof item.reviewCount === 'number' &&
    item.reviewCount > 0 &&
    typeof item.rating === 'number' &&
    item.rating > 0;

  const showSpicy = isFieldEnabled('isSpicy') && item.isSpicy === true;
  const showGlutenFree =
    isFieldEnabled('isGlutenFree') && item.isGlutenFree === true;

  const hasAnyTag =
    hasCategory || showSpicy || showGlutenFree || hasPrepTime || hasCalories;

  const nutritionEntries =
    item.nutritionalInfo && typeof item.nutritionalInfo === 'object'
      ? Object.entries(item.nutritionalInfo).filter(
          ([, v]) =>
            v !== undefined && v !== null && String(v).trim() !== '',
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

  // ---------- Custom (owner-defined) fields ----------
  const customFields = schema.fields
    .filter((f) => !f.builtin && f.enabled)
    .map((field) => ({ field, value: item.attributes?.[field.key] }))
    .filter(
      ({ value }) =>
        value !== undefined &&
        value !== null &&
        String(value).trim() !== '',
    );

  const customTags = customFields.filter(
    ({ field, value }) =>
      field.type === 'checkbox' ||
      (field.type === 'text' && String(value).length <= 24),
  );

  const customLongText = customFields.filter(
    ({ field, value }) =>
      field.type === 'textarea' ||
      (field.type === 'text' && String(value).length > 24),
  );

  const customNumbers = customFields.filter(
    ({ field, value }) =>
      field.type === 'number' && String(value).trim() !== '',
  );

  const customSelects = customFields.filter(
    ({ field }) => field.type === 'select',
  );

  // ---------- Badges ----------
  const activeBadges: BadgeDefinition[] = (schema.badges ?? [])
    .filter((b) => b.enabled && item.attributes?.[b.key])
    .slice();

  const renderBadge = (badge: BadgeDefinition) => {
    if (badge.image) {
      return (
        <img
          key={badge.key}
          src={badge.image}
          alt={badge.label}
          className={local.badgeImage}
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
          <FallbackIcon width={32} height={32} />
        </span>
      );
    }
    return (
      <span key={badge.key} className={local.badgeTextChip}>
        {badge.label}
      </span>
    );
  };

  const hasBadges = activeBadges.length > 0;
  const showVegBadge = isFieldEnabled('isVeg') && item.isVeg;

  // ---------------------------------------------------------
  // Shared body content
  // ---------------------------------------------------------
  const bodyContent = (
    <>
      {/* ============ Image / Cross-fade Slider ============ */}
      <div
        className={local.imageWrapper}
        ref={sliderRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endDrag}
        onPointerCancel={handlePointerCancel}
        style={{
          cursor: hasMultipleImages ? 'grab' : 'default',
          touchAction: hasMultipleImages ? 'pan-y' : 'auto',
        }}
      >
        {prevIndex !== null && (
          <img
            key={`prev-${prevIndex}`}
            src={galleryImages[prevIndex]}
            alt=""
            className={`${local.sliderLayer} ${local.sliderPrev}`}
            draggable={false}
          />
        )}

        <img
          key={`curr-${slideIndex}`}
          src={currentImage}
          alt={item.name}
          className={`${local.sliderLayer} ${
            prevIndex !== null ? local.sliderCurrIn : local.sliderCurrIdle
          }`}
          draggable={false}
          style={{ pointerEvents: 'auto' }}
        />

        {hasMultipleImages && (
          <div className={local.sliderDots}>
            {galleryImages.map((_, i) => (
              <button
                key={i}
                type="button"
                data-slider-dot
                className={`${local.sliderDot} ${
                  i === slideIndex ? local.sliderDotActive : ''
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  goToSlide(i);
                }}
                aria-label={`Go to image ${i + 1}`}
              />
            ))}
          </div>
        )}

        {hasMultipleImages && (
          <div className={local.swipeHint}>‹ Swipe to see more ›</div>
        )}

        {hasDiscount && (
          <span className={local.discountRibbon}>{discount}% OFF</span>
        )}

        {(hasBadges || showVegBadge) && (
          <div className={local.badgesWrapper}>
            {activeBadges.map(renderBadge)}
            {showVegBadge && (
              <span className={`${local.vegBadge}`}>Veg</span>
            )}
          </div>
        )}

        <IconButton
          variant="ghost"
          size="md"
          shape="circle"
          className={local.expandBtn}
          data-slider-icon
          aria-label="Preview image"
          tooltip="Preview image"
          onClick={(e) => {
            e.stopPropagation();
            setIsPreviewOpen(true);
          }}
        >
          <ExpandIcon width={16} height={16} fill="#fff" />
        </IconButton>
      </div>

      {/* ============ Content ============ */}
      <div className={local.content}>
        <div className={local.header}>
          {hasReviews && (
            <div className={local.rating}>
              <span className={local.stars}>
                <StarIcon width={14} height={14} fill="#3caa46" />
              </span>
              <span>{item.rating}</span>
              <span className={local.reviewCount}>
                ({formatCount(item.reviewCount)})
              </span>
            </div>
          )}
        </div>

        {hasDiscount && (
          <div className={local.discountLine}>
            <del>{formatRupees(item.price)}</del>
            <span className={local.price}>
              {' '}
              {formatRupees(effectiveUnitPrice)}
            </span>
          </div>
        )}

        {hasDesc && <p className={local.description}>{item.desc}</p>}

        {customLongText.map(({ field, value }) => (
          <p key={field.key} className={local.description}>
            {String(value)}
          </p>
        ))}

        {(hasAnyTag ||
          customTags.length > 0 ||
          customSelects.length > 0) && (
          <div className={local.tags}>
            {hasCategory && (
              <span className={local.tag}>
                <UtensilsIcon width={14} height={14} fill="#1e1e1e" />
                {item.category}
              </span>
            )}
            {showSpicy && <span className={local.tag}>Spicy</span>}
            {showGlutenFree && (
              <span className={local.tag}>Gluten-Free</span>
            )}
            {hasPrepTime && (
              <span className={local.tag}>
                <ClockIcon width={14} height={14} fill="#1e1e1e" />
                {item.preparationTime}
              </span>
            )}
            {hasCalories && (
              <span className={local.tag}>
                <PlusIcon width={14} height={14} fill="#1e1e1e" />
                {item.calories} kcal
              </span>
            )}

            {customSelects.map(({ field, value }) => (
              <span key={field.key} className={local.tag}>
                <strong className={local.tagLabel}>{field.label}:</strong>
                <span className={local.tagValue}>{String(value)}</span>
              </span>
            ))}

            {customTags
              .filter(({ field }) => field.type === 'text')
              .map(({ field, value }) => (
                <span key={field.key} className={local.tag}>
                  <strong className={local.tagLabel}>{field.label}:</strong>
                  <span className={local.tagValue}>{String(value)}</span>
                </span>
              ))}

            {customTags
              .filter(({ field }) => field.type === 'checkbox')
              .map(({ field }) => (
                <span key={field.key} className={local.tag}>
                  {field.label}
                </span>
              ))}
          </div>
        )}

        {customNumbers.length > 0 && (
          <div className={local.numberRow}>
            {customNumbers.map(({ field, value }) => (
              <div key={field.key} className={local.numberItem}>
                <span className={local.numberLabel}>{field.label}</span>
                <span className={local.numberValue}>{String(value)}</span>
              </div>
            ))}
          </div>
        )}

        {hasIngredients && (
          <div className={local.section}>
            <h4>Ingredients</h4>
            <div className={local.ingredients}>
              {item.ingredients!.map((ingredient, index) => (
                <span key={index} className={local.ingredient}>
                  <CheckIcon width={12} height={12} fill="#3CAA46" />
                  {ingredient}
                </span>
              ))}
            </div>
          </div>
        )}

        {hasNutrition && (
          <div className={local.section}>
            <h4>Nutritional Information</h4>
            <div className={local.nutritionalInfo}>
              {nutritionEntries.map(([key, value]) => {
                const nutField = schema.fields.find(
                  (f) => f.key === 'nutritionalInfo',
                );
                const nutOption = normalizeOptions(nutField?.options).find(
                  (o) => o.name.toLowerCase() === key.toLowerCase(),
                );
                return (
                  <div key={key} className={local.nutritionItem}>
                    <span>
                      {nutOption?.name ??
                        key.charAt(0).toUpperCase() + key.slice(1)}
                    </span>
                    <span>{value}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {hasCustomizations && (
          <div className={local.section}>
            <h4>Customize Your Order</h4>
            {item.customizationOptions!.map((option) => (
              <div key={option.name} className={local.customizationGroup}>
                <label className={local.customizationLabel}>
                  {option.name}
                </label>
                <div className={local.customizationOptions}>
                  {option.choices.map((choice) => {
                    const displayValue =
                      choice.price > 0
                        ? `${choice.name} +Rs${choice.price}`
                        : choice.name;
                    const isActive =
                      selectedCustomizations[option.name] === displayValue;
                    return (
                      <Chip
                        key={choice.name}
                        tone="primary"
                        active={isActive}
                        onClick={() =>
                          handleCustomizationChange(
                            option.name,
                            displayValue,
                          )
                        }
                        aria-pressed={isActive}
                      >
                        {choice.name}
                        {choice.price > 0 && (
                          <em className={local.choicePrice}>
                            {formatRupees(choice.price)}
                          </em>
                        )}
                      </Chip>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {hasAnyCustomizationSelected && (
          <div className={local.customizationSummary}>
            <span className={local.summaryLabel}>
              Selected Customizations:
            </span>
            <span className={local.summaryValue}>
              {getCustomizationSummary()}
            </span>
            {getAddonPrice() > 0 && (
              <span className={local.addonPrice}>
                +{formatRupees(getAddonPrice())} add-ons
              </span>
            )}
          </div>
        )}

        {plan.canAddCustomMessage && (
          <div className={local.section}>
            <h4>Add Customized Message</h4>
            <div className={local.customMessageWrapper}>
              <textarea
                className={local.customMessageInput}
                placeholder="Add any special instructions for the restaurant (e.g., extra sauce, less spice, etc.)"
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                maxLength={500}
              />
              {customMessage && (
                <div className={local.messageCharCount}>
                  {customMessage.length}/500
                </div>
              )}
            </div>
          </div>
        )}

        {plan.canReview && reviewsEnabled && <ReviewSection item={item} />}
      </div>
    </>
  );

  // ---------------------------------------------------------
  // Footer content
  // ---------------------------------------------------------
  const footerContent = (
    <>
      <div className={local.priceSection}>
        <div>
          <div className={local.price}>
            {formatRupees(getTotalPrice())}
            {quantity > 1 && (
              <span className={local.pricePerItem}>
                ({formatRupees(effectiveUnitPrice + getAddonPrice())} x{' '}
                {quantity})
              </span>
            )}
          </div>
          {getAddonPrice() > 0 && (
            <div className={local.basePrice}>
              Base: {formatRupees(effectiveUnitPrice)} + Add-ons:{' '}
              {formatRupees(getAddonPrice())}
            </div>
          )}
        </div>
        {plan.canOrder && acceptingOrders && (
          <div className={local.quantityControls}>
            <IconButton
              variant="ghost"
              size="sm"
              shape="square"
              aria-label="Decrease quantity"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
            >
              <MinusIcon width={16} height={16} fill="#1e1e1e" />
            </IconButton>
            <span className={local.qtyNum}>{quantity}</span>
            <IconButton
              variant="ghost"
              size="sm"
              shape="square"
              aria-label="Increase quantity"
              onClick={() => setQuantity(quantity + 1)}
            >
              <PlusIcon width={16} height={16} fill="#1e1e1e" />
            </IconButton>
          </div>
        )}
      </div>

      <div className={local.btnWrap}>
        {plan.canOrder && acceptingOrders && (
          <Button onClick={handleSubmit}>
            {isInCart ? 'Update Cart' : 'Add to Cart'}
          </Button>
        )}
      </div>
    </>
  );

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <>
      {isMobile ? (
        <Sheet
          isOpen={isOpen}
          onClose={onClose}
          title={item.name}
          maxHeightVh={85}
          footer={footerContent}
        >
          {bodyContent}
        </Sheet>
      ) : (
        <Modal
          isOpen={isOpen}
          onClose={onClose}
          title={item.name}
          size="lg"
          footer={footerContent}
        >
          {bodyContent}
        </Modal>
      )}

      <ImagePreview
        isOpen={isPreviewOpen}
        images={galleryImages}
        initialIndex={slideIndex}
        onClose={() => setIsPreviewOpen(false)}
      />
    </>
  );
};

export default MenuDetail;