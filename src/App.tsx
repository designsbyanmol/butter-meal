// App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { menuItems as defaultMenuItems } from "./data/menuData";
import { useCart } from "./hooks/useCart";
import { useAuth } from "./hooks/useAuth";
import { useMenu } from "./hooks/useMenu";
import { menuService } from "./services/menu.service";
import { db } from "./services/database.service";
import { isSupabaseConfigured } from "./config/env";
import { StoreProvider, useStore } from "./contexts/StoreContext";
import { TenantProvider, useTenant } from "./contexts/TenantContext";
import Menu from "./components/Menu/Menu";
import BrandInfo from "./components/BrandInfo/BrandInfo";
import CartModal from "./components/Cart/CartModal";
import FloatingCart from "./components/FloatingCart/FloatingCart";
import ScheduleModal from "./components/Schedule/ScheduleModal";
import LocationModal from "./components/Location/LocationModal";
import MenuDetail from "./components/MenuDetail/MenuDetail";
import Header from "./components/Header/Header";
import StoreBanner from "./components/Store/StoreBanner";
import DashboardSkeleton from "./components/DashboardSkeleton/DashboardSkeleton";
import { ShopInfo } from "./config/credentials";
import StoreDeactivated from "./components/Store/StoreDeactivated";
import MainDashboard from "./components/MainDashboard/MainDashboard";
import TenantNotFound from "./components/TenantNotFound/TenantNotFound";
import MenuFilters from "./components/Menu/MenuFilters";
import {
  MenuFilterState,
  EMPTY_FILTERS,
} from "./components/Menu/menuFilters.types";
import styles from "./App.module.scss";
import { dispatchAdminAction } from "./utils/adminEvents";
import CustomerNameModal from "./components/Cart/CustomerNameModal";
import { DEFAULT_MESSAGE_TEMPLATE } from "./types";
import { getCustomerName } from './utils/customerName';

// =========================================================
// Database status notice (admin only)
// =========================================================
const DatabaseStatusNotice: React.FC<{
  isConnected: boolean;
  isChecking: boolean;
}> = ({ isConnected, isChecking }) => {
  if (isChecking) {
    return (
      <div className={`${styles.dbStatusNotice} ${styles.checking}`}>
        <span className={styles.statusDot}></span>
        <span className={styles.statusText}>
          ⏳ Checking database connection...
        </span>
      </div>
    );
  }

  return (
    <div
      className={`${styles.dbStatusNotice} ${
        isConnected ? styles.connected : styles.disconnected
      }`}
    >
      <span className={styles.statusDot}></span>
      <span className={styles.statusText}>
        {isConnected ? "Working!" : "Wait"}
      </span>
      {!isConnected && (
        <span className={styles.reconnectingText}> - Reconnecting...</span>
      )}
    </div>
  );
};

// =========================================================
// App content
// =========================================================
const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading: authLoading, isAdmin } = useAuth();
  const {
    tenant,
    isLoading: tenantLoading,
    isDeactivated,
    tenantNotFound,
  } = useTenant();
  const {
  isStoreOpen,
  isAcceptingOrders,   // ← NEW
  isLoading: storeLoading,
} = useStore();
  const { visibleItems, items: allItems, loading: menuLoading } = useMenu();

  const {
    cart,
    paymentMode,
    setPaymentMode,
    deliveryType,
    setDeliveryType,
    scheduleData,
    setScheduleData,
    addItem,
    removeItem,
    getDiscountPercent,
    getTotalItems,
    getSubtotal,
    getTotalWithDelivery,
    getDiscountAmount,
    getDeliveryTime,
    generateOrderNumber,
    DELIVERY_FEE,
    RESTAURANT_PHONE,
    isLoaded: cartLoaded,
  } = useCart();

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<
    (typeof defaultMenuItems)[0] | null
  >(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string>(() => getCustomerName());

  // One-shot connection check. No interval — the maintenance notice for
// admins reflects the state at page load and is updated only when an
// admin action triggers a check.
useEffect(() => {
  if (!isSupabaseConfigured) {
    setIsConnected(true);
    setIsChecking(false);
    return;
  }

  (async () => {
    const connected = await db.forceConnectionCheck();
    setIsConnected(connected);
    setIsChecking(false);
  })();
}, []);

  // Menu filters
  const [filters, setFilters] = useState<MenuFilterState>({
    ...EMPTY_FILTERS,
    types: new Set(),
  });

  // ---------------------------------------------------------
  // Tenant-scoped initialization
  // ---------------------------------------------------------
  useEffect(() => {
    if (tenantLoading) return;

    let stop: (() => void) | undefined;

    const init = async () => {
      try {
        if (tenant) {
          await db.initializeDefaultUsers(tenant.slug);
          await menuService.setTenant(tenant.slug);
          await menuService.initializeItems(defaultMenuItems);
          stop = menuService.startSync({ pollMs: 0 });
        }
      } catch (error) {
        console.error("App initialization failed:", error);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
    return () => {
      if (stop) stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, tenantLoading]);

  // ---------------------------------------------------------
  // Page title
  // ---------------------------------------------------------
  useEffect(() => {
    document.title = tenant
      ? `${tenant.displayName} — Menu`
      : "Menu Display by Teckut";
  }, [tenant?.displayName]);

  useEffect(() => {
  const LEGACY_KEYS = [
    'restaurant_cart',
    'restaurant_payment_mode',
    'restaurant_delivery_type',
    'restaurant_schedule_data',
    'restaurant_customer_name',
  ];
  LEGACY_KEYS.forEach((k) => {
    try { localStorage.removeItem(k); } catch { /* ignore */ }
  });
}, []);

// inside AppContent
useEffect(() => {
  if (!selectedItem) return;
  const latest = allItems.find((it) => it.id === selectedItem.id);
  if (latest && latest !== selectedItem) {
    setSelectedItem(latest);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [allItems, selectedItem?.id]);

  // ---------------------------------------------------------
  // Filtered items
  // ---------------------------------------------------------
  const filteredItems = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

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
        const t = filters.types;
        const match =
          (t.has("popular") && item.attributes?.isPopular) ||
          (t.has("new") && item.attributes?.isNew) ||
          (t.has("chefSpecial") && item.attributes?.isChefSpecial) ||
          (t.has("limited") && item.attributes?.isLimited) ||
          (t.has("veg") && item.isVeg === true) ||
          (t.has("nonVeg") && item.isVeg === false);
        if (!match) return false;
      }
      return true;
    });

    const priceOf = (it: (typeof visibleItems)[number]) =>
      it.costPrice && it.costPrice > 0 ? it.costPrice : it.price;

    const healthScore = (it: (typeof visibleItems)[number]) => {
      const n = it.nutritionalInfo;
      const p = Number(n?.protein ?? 0);
      const f = Number(n?.fat ?? 0);
      const c = Number(n?.carbs ?? 0);
      return p * 2 - f - c * 0.5;
    };

    const discountOf = (it: (typeof visibleItems)[number]) => {
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
  }, [visibleItems, filters]);

  // ---------------------------------------------------------
  // Single loading flag for the whole boot sequence
  // ---------------------------------------------------------
  const isAppLoading =
    authLoading ||
    tenantLoading ||
    storeLoading ||
    !cartLoaded ||
    isInitializing ||
    menuLoading;

  // ---------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------
  const handleItemClick = (item: (typeof defaultMenuItems)[0]) => {
    if (!isStoreOpen) return;
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleAddToCartFromDetail = (
    item: (typeof defaultMenuItems)[0],
    customizations?: Record<string, string>,
    customMessage?: string,
  ) => {
    if (!isStoreOpen) return;
    addItem(item, customizations, customMessage);
  };

  const handleDeliveryChange = (type: "now" | "schedule") => {
    if (type === "schedule") {
      if (cart.length === 0) {
        setDeliveryType("now");
        return;
      }
      if (!scheduleData) {
        setIsScheduleOpen(true);
      }
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

  const handlePlaceOrder = () => {
  if (!isStoreOpen) {
    alert('Store is currently closed. Please try again later.');
    return;
  }
  if (!isAcceptingOrders) {
    alert('This store is not accepting orders right now.');
    return;
  }
  if (deliveryType === 'schedule' && !scheduleData) {
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

  const sendWhatsAppMessage = (nameForOrder: string) => {
    if (cart.length === 0) return;

    const tpl = tenant?.messageTemplate ?? DEFAULT_MESSAGE_TEMPLATE;

    const totalItems = getTotalItems();
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const discountPercent = getDiscountPercent();
    const finalTotal = getTotalWithDelivery();
    const orderNo = generateOrderNumber();
    const deliveryTime = getDeliveryTime();
    const brandName = tenant?.displayName ?? "";
    const tagline = tenant?.storeTagline ?? "";

    // ---------- HEADER ----------
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
      message += `*Note:* Prepaid · Send Reminder before 1hr\n`;
    }

    // ---------- ITEM LIST ----------
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
        if (d > 0 && d <= 100) {
          line += ` [${d}% off]`;
        }
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

    // ---------- PRICING ----------
    message += `-----------------\n`;
    message += `${tpl.subtotalLabel || "Subtotal"} - Rs ${Math.round(subtotal)}\n`;
    message += `${tpl.deliveryLabel || "Delivery"} - Rs ${DELIVERY_FEE}\n`;

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

    // ---------- FOOTER ----------
    message += `\n-----------------\n`;
    if (tpl.footerNote1) message += `_${tpl.footerNote1}_\n`;
    if (tpl.footerNote2) message += `_${tpl.footerNote2}_\n`;
    if (tpl.footerSignature) message += `_${tpl.footerSignature}_`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${RESTAURANT_PHONE}?text=${encoded}`;
    window.open(url, "_blank");
  };

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------

  // Fully bare-bones screen while bootstrapping: skeleton only.
  // Fully bare-bones screen while bootstrapping: combined skeleton only.
  if (isAppLoading && !tenantNotFound && tenant) {
    return <DashboardSkeleton count={6} />;
  }

  return (
  <>
    {/* Database status — only for admins, only after loading */}
    {isAuthenticated && isAdmin && !isAppLoading && (
      <DatabaseStatusNotice
        isConnected={isConnected}
        isChecking={isChecking}
      />
    )}

    {/* Header — hidden during loading, and hidden on dead URLs */}
    {!tenantNotFound && !isAppLoading && (
      <Header
        companyName={tenant?.displayName ?? 'Teckut'}
        year={2026}
        onWishlistItemClick={(item) => {
          setSelectedItem(item);
          setIsDetailOpen(true);
        }}
      />
    )}

    <div
      className={`${styles.container} ${
        getTotalItems() > 0 && isStoreOpen ? styles.hasFloatingCart : ''
      }`}
    >
      {/* Main URL — no tenant. Show platform dashboard. */}
      {!tenant && !tenantLoading && <MainDashboard />}

      {/* Dead URL */}
      {tenantNotFound && <TenantNotFound />}

      {/* Deactivated tenant */}
      {!isAppLoading && tenant && isDeactivated && <StoreDeactivated />}

      {/* Store closed */}
      {!isAppLoading && tenant && !isDeactivated && !isStoreOpen && (
        <StoreBanner />
      )}

      {/* Store open — menu */}
      {!isAppLoading && tenant && !isDeactivated && isStoreOpen && (
        <>
          <BrandInfo
            brandName={tenant?.displayName ?? ShopInfo.Shop_name}
            brandDesc={ShopInfo.Shop_tagline}
          />

          {isAuthenticated && (
            <div className={styles.adminInfoWrap}>
              <div className={styles.adminInfoHeader}>
                <h2>You're in Admin Mode</h2>
                <p>
                  Everything you change here goes live on the customer side —
                  no separate publishing step.
                </p>
              </div>

              <div className={styles.adminInfoGrid}>
                <div className={styles.adminInfoCard}>
                  <button
                    type="button"
                    className={styles.cardLink}
                    onClick={() => dispatchAdminAction('open-menu-panel')}
                    aria-label="Open menu manager"
                    title="Open menu manager"
                  >
                    →
                  </button>
                  <div className={`${styles.adminInfoIcon} ${styles.iconMenu}`}>
                    🍽️
                  </div>
                  <h3>Update Menu</h3>
                  <p>
                    Add, edit, or remove dishes. Changes appear instantly for
                    customers.
                  </p>
                </div>

                <div className={styles.adminInfoCard}>
                  <button
                    type="button"
                    className={styles.cardLink}
                    onClick={() => dispatchAdminAction('open-store-settings')}
                    aria-label="Open store settings"
                    title="Open store settings"
                  >
                    →
                  </button>
                  <div className={`${styles.adminInfoIcon} ${styles.iconStore}`}>
                    🏪
                  </div>
                  <h3>Store Settings</h3>
                  <p>
                    Open or close the store, set a closing message, and control
                    when customers can order.
                  </p>
                </div>

                <div className={styles.adminInfoCard}>
                  <button
                    type="button"
                    className={styles.cardLink}
                    onClick={() =>
                      dispatchAdminAction('open-user-management')
                    }
                    aria-label="Open user management"
                    title="Open user management"
                  >
                    →
                  </button>
                  <div className={`${styles.adminInfoIcon} ${styles.iconUsers}`}>
                    👥
                  </div>
                  <h3>Manage Staff</h3>
                  <p>
                    Add team accounts, reset passwords, and control who can log
                    in to this store.
                  </p>
                </div>

                <div className={styles.adminInfoCard}>
                  <button
                    type="button"
                    className={styles.cardLink}
                    onClick={() => dispatchAdminAction('open-info-popup')}
                    aria-label="Open store information"
                    title="Open store information"
                  >
                    →
                  </button>
                  <div className={`${styles.adminInfoIcon} ${styles.iconInfo}`}>
                    ℹ️
                  </div>
                  <h3>Store Info</h3>
                  <p>
                    Edit the store name, tagline, banner, delivery fee, and
                    discounts.
                  </p>
                </div>
              </div>

              <div className={styles.adminInfoFooter}>
                <span className={styles.liveDot} />
                <span>Live sync is on — customer menu updates in real time.</span>
              </div>
            </div>
          )}

          {!isAuthenticated && (
            <>
              <MenuFilters
                items={visibleItems}
                filters={filters}
                onChange={setFilters}
              />

              {filteredItems.length === 0 ? (
                <div className={styles.emptyFilterState}>
                  <p>No dishes match your filters.</p>
                  <button
                    type="button"
                    onClick={() =>
                      setFilters({ ...EMPTY_FILTERS, types: new Set() })
                    }
                  >
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
            </>
          )}
        </>
      )}

      {/* Floating cart */}
      {!isAppLoading &&
  tenant &&
  !isDeactivated &&
  isStoreOpen &&
  isAcceptingOrders &&
  getTotalItems() > 0 &&
        !isAuthenticated && (
          <FloatingCart
            itemCount={getTotalItems()}
            onClick={() => setIsCartOpen(true)}
          />
        )}
    </div>

    {tenant && (
      <CartModal
  isOpen={isCartOpen}
  cart={cart}
  paymentMode={paymentMode}
  deliveryType={deliveryType}
  scheduleData={scheduleData}
  onClose={() => setIsCartOpen(false)}
  onIncrement={(id, customizations) => {
    const item = allItems.find((item) => item.id === id);
    if (item && isStoreOpen && isAcceptingOrders) addItem(item, customizations);
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
  totalItems={getTotalItems()}
  acceptingOrders={isAcceptingOrders}   // ← optional prop; disables Place Order button
/>
    )}

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
  onCancel={() => setIsNameOpen(false)}
  onConfirm={handleNameConfirmed}
/>

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

    <MenuDetail
  isOpen={isDetailOpen}
  item={selectedItem}
  onClose={() => {
    setIsDetailOpen(false);
    setSelectedItem(null);
  }}
  onAddToCart={handleAddToCartFromDetail}
  acceptingOrders={isAcceptingOrders}   // ← NEW
/>
  </>
);
};

// =========================================================
// App root — providers in the right order
// =========================================================
const App: React.FC = () => {
  return (
    <TenantProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </TenantProvider>
  );
};

export default App;
