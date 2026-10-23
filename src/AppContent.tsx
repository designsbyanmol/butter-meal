// src/AppContent.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMenu } from "./hooks/useMenu";
import { supabaseService } from "./services/supabase.service";
import { useStore } from "./contexts/StoreContext";
import { useTenant } from "./contexts/TenantContext";
import { useCart } from "./hooks/useCart";
import Menu from "./components/Menu/Menu";
import BrandInfo from "./components/BrandInfo/BrandInfo";
import CartModal from "./components/Cart/CartModal";
import FloatingCart from "./components/FloatingCart/FloatingCart";
import ScheduleModal from "./components/Schedule/ScheduleModal";
import LocationModal from "./components/Location/LocationModal";
import MenuDetail from "./components/MenuDetail/MenuDetail";
import StoreBanner from "./components/Store/StoreBanner";
import StoreDeactivated from "./components/Store/StoreDeactivated";
import { ShopInfo } from "./config/credentials";
import MenuFilters from "./components/Menu/MenuFilters";
import WishlistPanel from "./components/Menu/WishlistPanel";
import { usePlan } from "./hooks/usePlan";
import {
  MenuFilterState,
  createEmptyFilters,
} from "./components/Menu/menuFilters.types";
import DashboardSkeleton from "./components/DashboardSkeleton/DashboardSkeleton";
import CustomerNameModal from "./components/Cart/CustomerNameModal";
import CustomerOrderStatus from "./components/Dinein/CustomerOrderStatus";
import { getCustomerName } from "./utils/customerName";
import { getStoreLabels } from "./utils/storeLabels";
import { DEFAULT_MESSAGE_TEMPLATE, MenuItem } from "./types";
import {
  getAllPendingItems,
  dropCommittedPendingItem,
} from "./utils/dineinPendingItems";
import styles from "./App.module.scss";

const FILTER_LOADER_MS = 2000;

const AppContent: React.FC = () => {
  const { tenant, isDeactivated } = useTenant();

  // ← Pull isLoading from the store context so we can gate rendering
  //   until the open/closed state is known.
  const {
    isStoreOpen,
    isAcceptingOrders,
    isLoading: storeLoading,
  } = useStore();

  const { visibleItems, items: allItems, loading: menuLoading } = useMenu();
  const plan = usePlan();

  const labels = getStoreLabels(tenant?.storeCategory);

  const {
    cart,
    paymentMode,
    setPaymentMode,
    deliveryType,
    setDeliveryType,
    scheduleData,
    setScheduleData,
    addItem,
    setItemQuantity,
    removeItem,
    getDiscountPercent,
    getTotalItems,
    getSubtotal,
    getGstAmount,
    getTotalWithDelivery,
    getDiscountAmount,
    getDeliveryTime,
    generateOrderNumber,
    DELIVERY_FEE,
    PACKING_CHARGE,
    GST_PERCENT,
    RESTAURANT_PHONE,
    isLoaded: cartLoaded,
    clearCart,
  } = useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string>(() =>
    getCustomerName(),
  );

  const [filters, setFilters] = useState<MenuFilterState>(() =>
    createEmptyFilters(),
  );

  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [showFilterLoader, setShowFilterLoader] = useState(false);
  const filterLoaderTimerRef = useRef<number | null>(null);

  const menuTopRef = useRef<HTMLDivElement | null>(null);
  const isFirstFilterRenderRef = useRef(true);

  // ---------------------------------------------------------
  // Filter loading indicator
  // ---------------------------------------------------------
  useEffect(() => {
    const isFiltering =
      filters.search.trim() !== "" ||
      filters.category !== null ||
      filters.types.size > 0 ||
      filters.sort !== "default" ||
      filters.stock !== "all";

    if (!isFiltering) {
      setShowFilterLoader(false);
      if (filterLoaderTimerRef.current !== null) {
        window.clearTimeout(filterLoaderTimerRef.current);
        filterLoaderTimerRef.current = null;
      }
      return;
    }

    setShowFilterLoader(true);
    if (filterLoaderTimerRef.current !== null) {
      window.clearTimeout(filterLoaderTimerRef.current);
    }
    filterLoaderTimerRef.current = window.setTimeout(() => {
      setShowFilterLoader(false);
      filterLoaderTimerRef.current = null;
    }, FILTER_LOADER_MS);

    return () => {
      if (filterLoaderTimerRef.current !== null) {
        window.clearTimeout(filterLoaderTimerRef.current);
        filterLoaderTimerRef.current = null;
      }
    };
  }, [
    filters.search,
    filters.category,
    filters.types,
    filters.sort,
    filters.stock,
  ]);

  const isFiltering =
    filters.search.trim() !== "" ||
    filters.category !== null ||
    filters.types.size > 0 ||
    filters.sort !== "default" ||
    filters.stock !== "all";

  // ---------------------------------------------------------
  // Scroll to menu top when a filter changes
  // ---------------------------------------------------------
  useEffect(() => {
    if (isFirstFilterRenderRef.current) {
      isFirstFilterRenderRef.current = false;
      return;
    }
    if (!isFiltering) return;

    const el = menuTopRef.current;
    if (!el) return;
    try {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch {
      el.scrollIntoView();
    }
  }, [
    filters.search,
    filters.category,
    filters.types,
    filters.sort,
    filters.stock,
    isFiltering,
  ]);

  const resetFilters = () => setFilters(createEmptyFilters());

  // ---------------------------------------------------------
  // Dine-in pending item flush
  // ---------------------------------------------------------
  useEffect(() => {
    if (!tenant) return;

    let cancelled = false;
    let flushing = false;

    const tick = async () => {
      if (cancelled) return;
      if (flushing) return;
      if (typeof document !== "undefined" && document.hidden) return;

      const all = getAllPendingItems();
      if (all.length === 0) return;

      const now = Date.now();
      const expired = all.filter((p) => p.addedAt + 60_000 <= now);
      if (expired.length === 0) return;

      flushing = true;
      try {
        const byOrder = new Map<string, typeof expired>();
        expired.forEach((p) => {
          const list = byOrder.get(p.orderId) ?? [];
          list.push(p);
          byOrder.set(p.orderId, list);
        });

        for (const [orderId, items] of byOrder) {
          const updated = await supabaseService.appendDineinOrderItems(
            orderId,
            items.map((p) => p.item),
          );
          if (updated) {
            items.forEach((p) => dropCommittedPendingItem(p.pendingId));
          }
        }
      } catch (err) {
        console.warn("[pending-items] flush failed:", err);
      } finally {
        flushing = false;
      }
    };

    const timer = window.setInterval(tick, 2000);
    void tick();

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug]);

  // ---------------------------------------------------------
  // Page title
  // ---------------------------------------------------------
  useEffect(() => {
    document.title = tenant
      ? `${tenant.displayName} - ${labels.menu}`
      : "Menu Display by Teckut";
  }, [tenant?.displayName, labels.menu]);

  // ---------------------------------------------------------
  // Keep selectedItem in sync with fresh menu data
  // ---------------------------------------------------------
  useEffect(() => {
    if (!selectedItem) return;
    const latest = allItems.find((it) => it.id === selectedItem.id);
    if (latest && latest !== selectedItem) {
      setSelectedItem(latest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, selectedItem?.id]);

  // ---------------------------------------------------------
  // Dine-in: drop the delivery cart
  // ---------------------------------------------------------
  useEffect(() => {
    if (tenant?.dineinEnabled === true && getTotalItems() > 0) {
      clearCart();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.dineinEnabled]);

  useEffect(() => {
    if (tenant?.dineinEnabled === true && isCartOpen) {
      setIsCartOpen(false);
    }
  }, [tenant?.dineinEnabled, isCartOpen]);

  // ---------------------------------------------------------
  // Filtered item list
  // ---------------------------------------------------------
  const filteredItems = useMemo(() => {
    const q = filters.search.trim().toLowerCase();
    const badgeDefs = tenant?.formSchema?.badges ?? [];

    const list = visibleItems.filter((item) => {
      if (q) {
        const hay =
          `${item.name} ${item.desc ?? ""} ${item.category ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (filters.category && item.category !== filters.category) return false;
      if (filters.stock === "inStock" && !item.inStock) return false;
      if (filters.stock === "outOfStock" && item.inStock) return false;

      if (filters.types.size > 0) {
        const match = Array.from(filters.types).some((key) => {
          if (key === "veg") return item.isVeg === true;
          if (key === "nonVeg") return item.isVeg === false;

          const badge = badgeDefs.find((b) => b.key === key);
          if (badge && !badge.enabled) return false;
          return !!item.attributes?.[key];
        });
        if (!match) return false;
      }
      return true;
    });

    const priceOf = (it: MenuItem) =>
      it.costPrice && it.costPrice > 0 ? it.costPrice : it.price;

    const healthScore = (it: MenuItem) => {
      const n = it.nutritionalInfo;
      return (
        Number(n?.protein ?? 0) * 2 -
        Number(n?.fat ?? 0) -
        Number(n?.carbs ?? 0) * 0.5
      );
    };

    const discountOf = (it: MenuItem) => {
      const base = Number(it.costPrice ?? 0);
      const sell = Number(it.price ?? 0);
      if (base <= 0 || sell <= 0 || base <= sell) return 0;
      return (base - sell) / base;
    };

    const sorted = [...list];
    switch (filters.sort) {
      case "priceAsc":
        sorted.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case "priceDesc":
        sorted.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case "ratingDesc":
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case "ratingAsc":
        sorted.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
        break;
      case "healthiest":
        sorted.sort((a, b) => healthScore(b) - healthScore(a));
        break;
      case "discountDesc":
        sorted.sort((a, b) => discountOf(b) - discountOf(a));
        break;
      case "discountLeast":
        sorted.sort((a, b) => discountOf(a) - discountOf(b));
        break;
      default:
        break;
    }
    return sorted;
  }, [visibleItems, filters, tenant?.formSchema?.badges]);

  // ← Include storeLoading in the app loading gate. This ensures the
  //   menu doesn't render before we know whether the store is open.
  const isAppLoading = !cartLoaded || menuLoading || storeLoading;

  // ---------------------------------------------------------
  // Item handlers
  // ---------------------------------------------------------
  const handleItemClick = (item: MenuItem) => {
    if (!isStoreOpen) return;
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleAddToCartFromDetail = (
    item: MenuItem,
    customizations?: Record<string, string>,
    customMessage?: string,
    quantity?: number,
  ) => {
    if (!isStoreOpen || !isAcceptingOrders) return;
    addItem(item, customizations, customMessage, quantity);
  };

  const handleUpdateCartFromDetail = (
    item: MenuItem,
    customizations?: Record<string, string>,
    customMessage?: string,
    quantity?: number,
  ) => {
    if (!isStoreOpen || !isAcceptingOrders) return;
    setItemQuantity(item, customizations, customMessage, quantity);
  };

  // ---------------------------------------------------------
  // Delivery / schedule
  // ---------------------------------------------------------
  const handleDeliveryChange = (type: "now" | "schedule") => {
    if (type === "schedule") {
      if (cart.length === 0) {
        setDeliveryType("now");
        return;
      }
      if (!scheduleData) setIsScheduleOpen(true);
      setDeliveryType("schedule");
    } else {
      setDeliveryType("now");
      setScheduleData(null);
      setIsScheduleOpen(false);
    }
  };

  const handleScheduleSave = (date: string, time: string) => {
    setScheduleData({ date, time });
    setDeliveryType("schedule");
    setIsScheduleOpen(false);
  };

  const handleScheduleClose = () => {
    setDeliveryType("now");
    setScheduleData(null);
    setIsScheduleOpen(false);
  };

  // ---------------------------------------------------------
  // Order placement
  // ---------------------------------------------------------
  const handlePlaceOrder = () => {
    if (!isStoreOpen) {
      alert("Store is currently closed. Please try again later.");
      return;
    }
    if (!isAcceptingOrders) {
      alert("This store is not accepting orders right now.");
      return;
    }
    if (deliveryType === "schedule" && !scheduleData) {
      setIsScheduleOpen(true);
      return;
    }
    setIsNameOpen(true);
  };

  const handleNameConfirmed = (name: string) => {
    setCustomerName(name);
    setIsNameOpen(false);
    setIsLocationOpen(true);
  };

  const handleConfirmLocation = () => {
    setIsLocationOpen(false);
    setIsCartOpen(false);
    sendWhatsAppMessage(customerName);
  };

  // ---------------------------------------------------------
  // WhatsApp order message
  // ---------------------------------------------------------
  const sendWhatsAppMessage = (nameForOrder: string) => {
    if (cart.length === 0) return;

    const tpl = tenant?.messageTemplate ?? DEFAULT_MESSAGE_TEMPLATE;

    const totalItems = getTotalItems();
    const subtotal = getSubtotal();
    const gstAmount = getGstAmount();
    const discount = getDiscountAmount();
    const discountPercent = getDiscountPercent();
    const finalTotal = getTotalWithDelivery();
    const orderNo = generateOrderNumber();
    const deliveryTime = getDeliveryTime();
    const brandName = tenant?.displayName ?? "";
    const tagline = tenant?.storeTagline ?? "";

    const orderLabel = (
      tpl.orderLabel || "New Order From {customerName}"
    ).replace("{customerName}", nameForOrder || "Customer");

    let message = `*${orderLabel}*\n`;
    message += `-----------------\n`;
    if (brandName) message += `*${brandName}*\n`;
    if (tagline) message += `_${tagline}_\n`;
    message += `Order ID. - ${orderNo}\n`;
    message += `Total Items - ${totalItems}\n`;
    message += `Payment - ${paymentMode}`;
    if (paymentMode === "Online" && discountPercent > 0) {
      message += ` (${discountPercent}% OFF)`;
    }
    message += `\n`;
    message += `Exp. Delivery - ${deliveryTime}\n`;

    if (deliveryType === "schedule" && scheduleData) {
      const sdt = new Date(`${scheduleData.date}T${scheduleData.time}`);
      let h = sdt.getHours();
      const m = String(sdt.getMinutes()).padStart(2, "0");
      const ap = h >= 12 ? "PM" : "AM";
      h = h % 12;
      h = h ? h : 12;
      message += `Scheduled Delivery - ${scheduleData.date} at ${h}:${m} ${ap}\n`;
      message += `*Note:* Prepaid . Send Reminder before 1hr\n`;
    }

    message += `-----------------\n`;
    message += `*${tpl.itemListTitle || "Item List"}*\n`;

    cart.forEach((item) => {
      const baseForItem = item.basePrice || item.price;
      const addons = item.addonPrice || 0;
      const unitPrice = baseForItem + addons;
      const total = unitPrice * item.quantity;

      let line = (tpl.itemLineTemplate || "{name} x {qty}")
        .replace("{name}", item.name)
        .replace("{qty}", String(item.quantity));

      if (
        tpl.showItemCustomizations &&
        item.customizations &&
        Object.keys(item.customizations).length > 0
      ) {
        const cs = Object.entries(item.customizations)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ");
        line += ` (${cs})`;
      }
      if (tpl.showItemAddons && addons > 0) {
        line += ` [+Rs${addons} add-ons]`;
      }
      if (tpl.showItemDiscount) {
        const d = Number(item.discount ?? 0);
        if (d > 0 && d <= 100) line += ` [${d}% off]`;
      }
      line += ` - Rs ${total}`;
      message += `- - - - - - -\n${line}\n`;

      if (
        tpl.showItemNotes &&
        item.customMessage &&
        item.customMessage.trim()
      ) {
        message += `   Note: ${item.customMessage.trim()}\n`;
      }
    });

    message += `-----------------\n`;
    message += `${tpl.subtotalLabel || "Subtotal"} - Rs ${Math.round(subtotal)}\n`;
    message += `${tpl.deliveryLabel || "Delivery"} - Rs ${DELIVERY_FEE}\n`;

    if (PACKING_CHARGE > 0) {
      message += `Packing - Rs ${PACKING_CHARGE}\n`;
    }
    if (GST_PERCENT > 0 && gstAmount > 0) {
      message += `GST (${GST_PERCENT}%) - Rs ${gstAmount}\n`;
    }

    if (paymentMode === "Online" && discountPercent > 0) {
      message += `${tpl.discountLabel || "Discount"} (${discountPercent}%) - Rs ${discount}\n`;
      message += `-----------------\n`;
      message += `\n*${tpl.totalLabel || "Total Amount"} - Rs ${finalTotal}*\n`;
      message += `(${discountPercent}% discount applied on total)\n`;
    } else {
      message += `-----------------\n`;
      message += `\n*${tpl.totalLabel || "Total Amount"} - Rs ${finalTotal}*\n`;
      const feeLine = (
        tpl.freeDeliveryLabel || "(+Rs {fee} Inc. for delivery)"
      ).replace("{fee}", String(DELIVERY_FEE));
      message += `${feeLine}\n`;
    }

    message += `\n-----------------\n`;
    if (tpl.footerNote1) message += `_${tpl.footerNote1}_\n`;
    if (tpl.footerNote2) message += `_${tpl.footerNote2}_\n`;
    if (tpl.footerSignature) message += `_${tpl.footerSignature}_`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${RESTAURANT_PHONE}?text=${encoded}`;
    window.open(url, "_blank");
  };

  // =========================================================
  // Render
  // =========================================================
  return (
    <>
      {/* Dine-in live status banner */}
      {tenant?.dineinEnabled && <CustomerOrderStatus />}

      <div
        className={`${styles.container} ${
          getTotalItems() > 0 && isStoreOpen ? styles.hasFloatingCart : ""
        }`}
      >
        {/* Global loading — includes store state */}
        {isAppLoading && <DashboardSkeleton count={6} />}

        {!isAppLoading && tenant && isDeactivated && <StoreDeactivated />}

        {!isAppLoading && tenant && !isDeactivated && (
          <>
            {/* Brand block (hidden while filtering) */}
            {!isFiltering && (
              <BrandInfo
                brandName={tenant?.displayName ?? ShopInfo.Shop_name}
                brandDesc={tenant?.storeTagline ?? "Menu Display by Teckut"}
                hideBanner={!isStoreOpen}
              />
            )}

            {/* ── CLOSED-STORE BANNER ──
                Only shows when the store is closed.
                Menu below is hidden in that case. */}
            {!isStoreOpen && <StoreBanner />}

            {/* ── MENU (only when store is open) ── */}
            {isStoreOpen && (
              <div ref={menuTopRef}>
                <MenuFilters
                  items={visibleItems}
                  filters={filters}
                  onChange={setFilters}
                  onOpenWishlist={() => setIsWishlistOpen(true)}
                />

                {showFilterLoader ? (
                  <DashboardSkeleton
                    count={6}
                    hideHeader
                    hideBrand
                    hidePill
                  />
                ) : filteredItems.length === 0 ? (
                  <div className={styles.emptyFilterState}>
                    <p>
                      No {labels.items.toLowerCase()} match your filters.
                    </p>
                    <button type="button" onClick={resetFilters}>
                      Clear filters
                    </button>
                  </div>
                ) : (
                  <Menu
                    items={filteredItems}
                    cart={cart}
                    onAddItem={addItem}
                    onRemoveItem={removeItem}
                    onItemClick={handleItemClick}
                    acceptingOrders={isAcceptingOrders}
                  />
                )}
              </div>
            )}

            {plan.canWishlist && isWishlistOpen && (
              <WishlistPanel
                isOpen={isWishlistOpen}
                onClose={() => setIsWishlistOpen(false)}
                onItemClick={(item) => {
                  setSelectedItem(item);
                  setIsDetailOpen(true);
                }}
              />
            )}
          </>
        )}

        {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          isStoreOpen &&
          isAcceptingOrders &&
          tenant.dineinEnabled !== true &&
          getTotalItems() > 0 && (
            <FloatingCart
              itemCount={getTotalItems()}
              onClick={() => setIsCartOpen(true)}
            />
          )}

        {tenant && !isDeactivated && (
          <CartModal
            isOpen={isCartOpen}
            cart={cart}
            paymentMode={paymentMode}
            deliveryType={deliveryType}
            scheduleData={scheduleData}
            onClose={() => setIsCartOpen(false)}
            onIncrement={(id, customizations) => {
              const item = allItems.find((item) => item.id === id);
              if (item && isStoreOpen && isAcceptingOrders)
                addItem(item, customizations);
            }}
            onDecrement={removeItem}
            onPlaceOrder={handlePlaceOrder}
            onPaymentChange={setPaymentMode}
            onDeliveryChange={handleDeliveryChange}
            onOpenSchedule={() => setIsScheduleOpen(true)}
            subtotal={getSubtotal()}
            total={getTotalWithDelivery()}
            discount={getDiscountAmount()}
            discountPercent={getDiscountPercent()}
            deliveryFee={DELIVERY_FEE}
            packingCharge={PACKING_CHARGE}
            gstPercent={GST_PERCENT}
            gstAmount={getGstAmount()}
            totalItems={getTotalItems()}
            acceptingOrders={isAcceptingOrders}
          />
        )}

        <ScheduleModal
          isOpen={isScheduleOpen}
          onClose={handleScheduleClose}
          onSave={handleScheduleSave}
        />

        <LocationModal
          isOpen={isLocationOpen}
          onClose={() => setIsLocationOpen(false)}
          onConfirm={handleConfirmLocation}
        />

        <CustomerNameModal
          isOpen={isNameOpen}
          promptText={
            tenant?.messageTemplate?.namePrompt ??
            DEFAULT_MESSAGE_TEMPLATE.namePrompt
          }
          placeholder={
            tenant?.messageTemplate?.namePromptPlaceholder ??
            DEFAULT_MESSAGE_TEMPLATE.namePromptPlaceholder
          }
          initialValue={customerName}
          onCancel={() => setIsNameOpen(false)}
          onConfirm={handleNameConfirmed}
        />

        <MenuDetail
          isOpen={isDetailOpen}
          item={selectedItem}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedItem(null);
          }}
          onAddToCart={handleAddToCartFromDetail}
          onUpdateCart={handleUpdateCartFromDetail}
          acceptingOrders={isAcceptingOrders}
          cart={cart}
        />
      </div>
    </>
  );
};

export default AppContent;