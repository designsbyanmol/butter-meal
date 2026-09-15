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
  const { isStoreOpen, isLoading: storeLoading } = useStore();
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

  // Menu filters
  const [filters, setFilters] = useState<MenuFilterState>({
    ...EMPTY_FILTERS,
    types: new Set(),
  });

  // ---------------------------------------------------------
  // Connection check subscription
  // ---------------------------------------------------------
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsConnected(true);
      setIsChecking(false);
      return;
    }

    const checkConnection = async () => {
      setIsChecking(true);
      const connected = await db.forceConnectionCheck();
      setIsConnected(connected);
      setIsChecking(false);
    };

    checkConnection();

    if (typeof db.subscribeToMaintenance === "function") {
      const unsubscribe = db.subscribeToMaintenance((isActive) => {
        setIsConnected(!isActive);
        setIsChecking(false);
      });
      return () => {
        if (unsubscribe) unsubscribe();
      };
    }

    const interval = setInterval(async () => {
      const connected = await db.forceConnectionCheck();
      setIsConnected(connected);
      setIsChecking(false);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

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
          stop = menuService.startSync({ pollMs: 60_000 });
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

  // ---------------------------------------------------------
  // Filtered items
  // ---------------------------------------------------------
  const filteredItems = useMemo(() => {
    const q = filters.search.trim().toLowerCase();

    const list = visibleItems.filter((item) => {
      if (q) {
        const hay =
          `${item.name} ${item.desc ?? ''} ${item.category ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      if (filters.category && item.category !== filters.category) return false;

      if (filters.stock === 'inStock' && !item.inStock) return false;
      if (filters.stock === 'outOfStock' && item.inStock) return false;

      if (filters.types.size > 0) {
        const t = filters.types;
        const match =
          (t.has('popular') && item.attributes?.isPopular) ||
          (t.has('new') && item.attributes?.isNew) ||
          (t.has('chefSpecial') && item.attributes?.isChefSpecial) ||
          (t.has('limited') && item.attributes?.isLimited) ||
          (t.has('veg') && item.isVeg === true) ||
          (t.has('nonVeg') && item.isVeg === false);
        if (!match) return false;
      }
      return true;
    });

    const priceOf = (it: typeof visibleItems[number]) =>
      it.costPrice && it.costPrice > 0 ? it.costPrice : it.price;

    const healthScore = (it: typeof visibleItems[number]) => {
      const n = it.nutritionalInfo;
      const p = Number(n?.protein ?? 0);
      const f = Number(n?.fat ?? 0);
      const c = Number(n?.carbs ?? 0);
      return p * 2 - f - c * 0.5;
    };

    const discountOf = (it: typeof visibleItems[number]) => {
      const base = Number(it.costPrice ?? 0);
      const sell = Number(it.price ?? 0);
      if (base <= 0 || sell <= 0 || base <= sell) return 0;
      return (base - sell) / base;
    };

    const sorted = [...list];
    switch (filters.sort) {
      case 'priceAsc':
        sorted.sort((a, b) => priceOf(a) - priceOf(b));
        break;
      case 'priceDesc':
        sorted.sort((a, b) => priceOf(b) - priceOf(a));
        break;
      case 'ratingDesc':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'ratingAsc':
        sorted.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
        break;
      case 'healthiest':
        sorted.sort((a, b) => healthScore(b) - healthScore(a));
        break;
      case 'discountDesc':
        sorted.sort((a, b) => discountOf(b) - discountOf(a));
        break;
      case 'discountLeast':
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
      alert("Store is currently closed. Please try again later.");
      return;
    }
    if (deliveryType === "schedule" && !scheduleData) {
      setIsScheduleOpen(true);
      return;
    }
    setIsLocationOpen(true);
  };

  const handleConfirmLocation = () => {
    setIsLocationOpen(false);
    setIsCartOpen(false);
    sendWhatsAppMessage();
  };

  const sendWhatsAppMessage = () => {
    if (cart.length === 0) return;

    const totalItems = getTotalItems();
    const subtotal = getSubtotal();
    const discount = getDiscountAmount();
    const discountPercent = getDiscountPercent();
    const finalTotal = getTotalWithDelivery();
    const orderNo = generateOrderNumber();
    const deliveryTime = getDeliveryTime();

    let message = `*New Order Placed*\n`;
    message += `-----------------\n`;
    message += `Order ID. - ${orderNo}\n`;
    message += `Total Items - ${totalItems}\n`;
    message += `Payment - ${paymentMode}`;
    if (paymentMode === "Online" && discountPercent > 0) {
      message += ` (${discountPercent}% OFF)`;
    }
    message += `\n`;
    message += `Exp. Delivery - ${deliveryTime}\n`;

    if (deliveryType === "schedule" && scheduleData) {
      const scheduledDateTime = new Date(
        `${scheduleData.date}T${scheduleData.time}`,
      );
      let schedHours = scheduledDateTime.getHours();
      const schedMins = String(scheduledDateTime.getMinutes()).padStart(2, "0");
      const schedAmpm = schedHours >= 12 ? "PM" : "AM";
      schedHours = schedHours % 12;
      schedHours = schedHours ? schedHours : 12;
      message += `Scheduled Delivery - ${scheduleData.date} at ${schedHours}:${schedMins} ${schedAmpm}\n`;
      message += `*Note:* Prepaid · Send Reminder before 1hr\n`;
    }

    message += `-----------------\n`;
    message += `*Item List*\n`;

    let hasCustomMessages = false;

    cart.forEach((item) => {
      const pricePerItem =
        (item.basePrice || item.price) + (item.addonPrice || 0);
      const itemTotal = pricePerItem * item.quantity;
      let itemLine = `${item.name} x ${item.quantity}`;
      message += `- - - - - - -\n`;
      if (item.customizations && Object.keys(item.customizations).length > 0) {
        const customStr = Object.entries(item.customizations)
          .map(([key, value]) => `${key}: ${value}`)
          .join(", ");
        itemLine += ` (${customStr})`;
      }
      if (item.addonPrice && item.addonPrice > 0) {
        itemLine += ` [+Rs${item.addonPrice} add-ons]`;
      }
      itemLine += ` - Rs ${itemTotal}`;
      message += `${itemLine}\n`;

      if (item.customMessage && item.customMessage.trim()) {
        hasCustomMessages = true;
      }
    });

    message += `-----------------\n`;
    message += `Subtotal - Rs ${Math.round(subtotal)}\n`;
    message += `Delivery - Rs ${DELIVERY_FEE}\n`;

    if (paymentMode === "Online" && discountPercent > 0) {
      message += `Discount (${discountPercent}%) - Rs ${discount}\n`;
      message += `-----------------\n`;
      message += `\nTotal Amount - *Rs ${finalTotal}*\n`;
      message += `(${discountPercent}% discount applied on total)\n`;
    } else {
      message += `-----------------\n`;
      message += `\nTotal Amount - *Rs ${finalTotal}*\n`;
      message += `(+Rs ${DELIVERY_FEE} Inc. for delivery)\n`;
    }

    if (hasCustomMessages) {
      message += `\n-----------------\n`;
      message += `*Special Instructions:*\n`;
      cart.forEach((item) => {
        if (item.customMessage && item.customMessage.trim()) {
          message += `- ${item.name}: ${item.customMessage.trim()}\n`;
        }
      });
    }

    message += `\n-----------------\n`;
    message += `_We take orders on trust. Once a faulty will be a lifetime faulty_\n`;
    message += `_Editing this order before payment = Order Cancelled_\n`;
    message += `_-Butter Meal_`;

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
          companyName={tenant?.displayName ?? "Teckut"}
          year={2026}
          onWishlistItemClick={(item) => {
            setSelectedItem(item);
            setIsDetailOpen(true);
          }}
        />
      )}

      <div
        className={`${styles.container} ${
          getTotalItems() > 0 && isStoreOpen ? styles.hasFloatingCart : ""
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
              />
            )}
          </>
        )}

        {/* Floating cart */}
        {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          isStoreOpen &&
          getTotalItems() > 0 && (
            <FloatingCart
              itemCount={getTotalItems()}
              onClick={() => setIsCartOpen(true)}
            />
          )}

        {/* Cart modal */}
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
              if (item && isStoreOpen) addItem(item, customizations);
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

        <MenuDetail
          isOpen={isDetailOpen}
          item={selectedItem}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedItem(null);
          }}
          onAddToCart={handleAddToCartFromDetail}
        />
      </div>
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