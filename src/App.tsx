// App.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useCart } from "./hooks/useCart";
import { useAuth } from "./hooks/useAuth";
import { useMenu } from "./hooks/useMenu";
import { menuService } from "./services/menu.service";
import { db } from "./services/database.service";
import { supabaseService } from "./services/supabase.service";
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
import { ShopInfo } from "./config/credentials";
import StoreDeactivated from "./components/Store/StoreDeactivated";
import MainDashboard from "./components/MainDashboard/MainDashboard";
import TenantNotFound from "./components/TenantNotFound/TenantNotFound";
import MenuFilters from "./components/Menu/MenuFilters";
import {
  MenuFilterState,
  createEmptyFilters,
} from "./components/Menu/menuFilters.types";
import DashboardSkeleton from "./components/DashboardSkeleton/DashboardSkeleton";
import CustomerNameModal from "./components/Cart/CustomerNameModal";
import PausedScreen from "./components/Store/PausedScreen";
import ExpiredScreen from "./components/Store/ExpiredScreen";
import RenewalBanner from "./components/Store/RenewalBanner";
import SignupPage from "./components/Pages/Signup/SignupPage";
import { getCustomerName } from "./utils/customerName";
import { getStoreLabels } from "./utils/storeLabels";
import { getCategoryDefaults } from "./data/storeDefaults";
import { DEFAULT_MESSAGE_TEMPLATE, MenuItem } from "./types";
import styles from "./App.module.scss";
import TenantDashboardCards from './components/MainDashboard/TenantDashboardCards';
import { getCategoryLabel } from "./data/storeCategories";
import CustomerOrderStatus from "./components/Dinein/CustomerOrderStatus";

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
// Signup route detection
// =========================================================
const isSignupRoute = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    return url.searchParams.has("_sign-up");
  } catch {
    return false;
  }
};

// =========================================================
// Standalone (installed-app) detection
// =========================================================
const isStandaloneDisplay = (): boolean => {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia?.("(display-mode: standalone)").matches;
  const iosStandalone = (window.navigator as any).standalone === true;
  return !!mq || !!iosStandalone;
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
    isAdminView,
    refreshTenant,
  } = useTenant();
  const {
    isStoreOpen,
    isAcceptingOrders,
    isLoading: storeLoading,
  } = useStore();
  const { visibleItems, items: allItems, loading: menuLoading } = useMenu();

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
    clearCart
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

  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const [filters, setFilters] = useState<MenuFilterState>(() =>
    createEmptyFilters(),
  );

  const [showPwaLauncher, setShowPwaLauncher] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    if (!isStandaloneDisplay()) return false;
    try {
      return sessionStorage.getItem("pwa-launcher:dismissed") !== "1";
    } catch {
      return true;
    }
  });

  const handleDismissLauncher = () => {
    try {
      sessionStorage.setItem("pwa-launcher:dismissed", "1");
    } catch {
      /* ignore */
    }
    setShowPwaLauncher(false);
  };

  const resetFilters = () => setFilters(createEmptyFilters());

    // ---- Connection check ----
  // Runs once on mount, then keeps retrying every 15s while the DB is
  // unreachable. Also subscribes to the service's maintenance state so
  // any check triggered elsewhere updates the badge.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsConnected(true);
      setIsChecking(false);
      return;
    }

    let cancelled = false;
    let interval: number | null = null;

    const unsubscribe = db.subscribeToMaintenance((active) => {
      if (cancelled) return;
      setIsConnected(!active);
      setIsChecking(false);
    });

    const attempt = async (): Promise<boolean> => {
      const connected = await db.forceConnectionCheck();
      if (cancelled) return connected;
      setIsConnected(connected);
      setIsChecking(false);
      return connected;
    };

    attempt().then((ok) => {
      if (cancelled || ok) return;
      interval = window.setInterval(async () => {
        const now = await attempt();
        if (now && interval !== null) {
          window.clearInterval(interval);
          interval = null;
        }
      }, 15_000);
    });

    return () => {
      cancelled = true;
      unsubscribe();
      if (interval !== null) window.clearInterval(interval);
    };
  }, []);

  // ---- Tenant-scoped initialization ----
  useEffect(() => {
    if (tenantLoading) return;
    let stop: (() => void) | undefined;
    const init = async () => {
      try {
        if (tenant) {
          await db.initializeDefaultUsers(tenant.slug);
          await menuService.setTenant(tenant.slug);

          const defaults = getCategoryDefaults(tenant.storeCategory);
          await menuService.initializeItems(defaults.items);

          if (!tenant.bannerUrl && defaults.bannerUrl) {
            try {
              await supabaseService.updateTenantInfo(
                tenant.slug,
                "banner_url",
                defaults.bannerUrl,
              );
              await refreshTenant();
            } catch (err) {
              console.warn("[App] failed to seed default banner:", err);
            }
          }

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
  }, [tenant?.slug, tenantLoading]);

  // ---- Page title ----
  useEffect(() => {
    document.title = tenant
      ? `${tenant.displayName} - ${labels.menu}`
      : "Menu Display by Teckut";
  }, [tenant?.displayName, labels.menu]);

  // ---- Keep selectedItem in sync with fresh data ----
  useEffect(() => {
    if (!selectedItem) return;
    const latest = allItems.find((it) => it.id === selectedItem.id);
    if (latest && latest !== selectedItem) {
      setSelectedItem(latest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, selectedItem?.id]);

  // When dine-in gets enabled for this tenant, the delivery cart
// is meaningless — the customer orders directly at the table. Wipe
// the cart so the floating button disappears and no stale items
// linger. Flipping back to false restores normal delivery flow.
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

  // ---- Filtering ----
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

  const isAppLoading =
    authLoading ||
    tenantLoading ||
    storeLoading ||
    !cartLoaded ||
    isInitializing ||
    menuLoading;

  // ---- Handlers ----
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

  // ---- Subscription state ----
  const subscriptionStatus = tenant?.subscriptionStatus ?? "active";
  const daysLeft = tenant?.daysUntilExpiry ?? Infinity;
  const isExpired = subscriptionStatus === "expired" || daysLeft < 0;
  const isPaused = subscriptionStatus === "paused";

  // ---- Render ----
  return (
    <>
      {isAuthenticated && isAdmin && !isAppLoading && (
        <DatabaseStatusNotice
          isConnected={isConnected}
          isChecking={isChecking}
        />
      )}

      {!isAuthenticated && tenant?.dineinEnabled && <CustomerOrderStatus />}

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

      {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          !isPaused &&
          isExpired && <ExpiredScreen />}

      <div
        className={`${styles.container} ${
          getTotalItems() > 0 && isStoreOpen ? styles.hasFloatingCart : ""
        }`}
      >
        {!tenant && !tenantLoading && <MainDashboard />}

        {tenantNotFound && <TenantNotFound />}

        {isAppLoading && !tenantNotFound && tenant && (
          <DashboardSkeleton count={6} />
        )}

        {!isAppLoading &&
          tenant &&
          (isDeactivated || isPaused) &&
          (isAuthenticated && isAdmin ? (
            <PausedScreen />
          ) : (
            <StoreDeactivated />
          ))}

        {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          !isPaused &&
          !isExpired && (
            <>
                {isAuthenticated && isAdmin && <RenewalBanner />}

{isAuthenticated && tenant && (
  <TenantDashboardCards />
)}

<BrandInfo
  brandName={tenant?.displayName ?? ShopInfo.Shop_name}
  brandDesc={
    tenant?.infoDefaults?.storeTagline
      ? getCategoryLabel(tenant?.storeCategory)
      : tenant?.storeTagline ??
        getCategoryLabel(tenant?.storeCategory)
  }
  // Hide the store banner for any authenticated tenant user
  // (admin or staff). The banner is only meant for customers.
  hideBanner={isAuthenticated}
/>


              {!isStoreOpen && <StoreBanner />}

              {isStoreOpen && !isAuthenticated && (
                <>
                  <MenuFilters
                    items={visibleItems}
                    filters={filters}
                    onChange={setFilters}
                  />
                  {filteredItems.length === 0 ? (
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
                </>
              )}
            </>
          )}

        {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          !isPaused &&
          !isExpired &&
          isStoreOpen &&
          isAcceptingOrders &&
          !isAuthenticated &&
          tenant.dineinEnabled !== true &&
          getTotalItems() > 0 && (
            <FloatingCart
              itemCount={getTotalItems()}
              onClick={() => setIsCartOpen(true)}
            />
          )}

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

// =========================================================
// App root
// =========================================================
const App: React.FC = () => {
  if (isSignupRoute()) {
    return <SignupPage />;
  }

  return (
    <TenantProvider>
      <StoreProvider>
        <AppContent />
      </StoreProvider>
    </TenantProvider>
  );
};

export default App;