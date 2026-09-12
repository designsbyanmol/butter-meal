// App.tsx
import React, { useEffect, useState } from "react";
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
import Promotion from "./components/Promotion/Promotion";
import CartModal from "./components/Cart/CartModal";
import FloatingCart from "./components/FloatingCart/FloatingCart";
import ScheduleModal from "./components/Schedule/ScheduleModal";
import LocationModal from "./components/Location/LocationModal";
import MenuDetail from "./components/MenuDetail/MenuDetail";
import Header from "./components/Header/Header";
import AdminPanel from "./components/Admin/AdminPanel";
import StoreBanner from "./components/Store/StoreBanner";
import MenuSkeleton from "./components/Menu/MenuSkeleton";
import { ShopInfo } from "./config/credentials";
import StoreDeactivated from "./components/Store/StoreDeactivated";
import MainDashboard from "./components/MainDashboard/MainDashboard";
import TenantNotFound from './components/TenantNotFound/TenantNotFound';
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
  const { tenant, isLoading: tenantLoading, isDeactivated,tenantNotFound } = useTenant();
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
  // Tenant-scoped initialization.
  // Main URL (no tenant) is a valid state — don't block on it.
  // ---------------------------------------------------------
  useEffect(() => {
    // Wait until tenant context has resolved
    if (tenantLoading) return;

    let stop: (() => void) | undefined;

    const init = async () => {
      try {
        if (tenant) {
          // Tenant URL: seed that tenant's data, start sync
          await db.initializeDefaultUsers(tenant.slug);
          await menuService.setTenant(tenant.slug);
          await menuService.initializeItems(defaultMenuItems);
          stop = menuService.startSync({ pollMs: 60_000 });
        }
        // Main URL: nothing tenant-specific to initialize here.
        // The admin uses the Stores panel to manage tenants.
      } catch (error) {
        console.error("App initialization failed:", error);
      } finally {
        // Always clear the loading gate, tenant or not.
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
  // Page title reflects the tenant
  // ---------------------------------------------------------
  useEffect(() => {
    document.title = tenant
      ? `${tenant.displayName} — Menu`
      : "Menu Display by Teckut";
  }, [tenant?.displayName]);

  // ---------------------------------------------------------
  // Loading gate
  // ---------------------------------------------------------
// Loading gate first
if (
  isInitializing ||
  authLoading ||
  tenantLoading ||
  storeLoading ||
  !cartLoaded
) {
  return (
    <div className={styles.container}>
      <div className={styles.loadingState}>
        <div className={styles.loader}></div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

// ✅ Dead URL — no header, no cart, just the error page
if (tenantNotFound) {
  return <TenantNotFound />;
}

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
  return (
    <>
      {isAuthenticated && isAdmin && (
        <DatabaseStatusNotice
          isConnected={isConnected}
          isChecking={isChecking}
        />
      )}

      <Header companyName={tenant?.displayName ?? "Teckut"} year={2026} />

      <div
        className={`${styles.container} ${
          getTotalItems() > 0 && isStoreOpen ? styles.hasFloatingCart : ""
        }`}
      >
        {/* Main URL — no tenant context. Show the platform dashboard. */}
        {!tenant && <MainDashboard />}

        {/* Deactivated tenant — no menu, no cart */}
        {tenant && isDeactivated && <StoreDeactivated />}

        {/* Active tenant, store closed */}
        {tenant && !isDeactivated && !isStoreOpen && <StoreBanner />}

        {/* Active tenant, store open */}
        {tenant && !isDeactivated && isStoreOpen && (
          <>
            <BrandInfo
              brandName={tenant?.displayName ?? ShopInfo.Shop_name}
              brandDesc={ShopInfo.Shop_tagline}
            />
            {menuLoading ? (
              <MenuSkeleton count={6} />
            ) : (
              <Menu
                items={visibleItems}
                cart={cart}
                onAddItem={addItem}
                onRemoveItem={removeItem}
                onItemClick={handleItemClick}
              />
            )}
          </>
        )}

        {/* Floating cart — only for active tenants with items */}
        {tenant && !isDeactivated && isStoreOpen && getTotalItems() > 0 && (
          <FloatingCart
            itemCount={getTotalItems()}
            onClick={() => setIsCartOpen(true)}
          />
        )}

        {/* Cart modal — hidden on main URL since there's no menu to add from */}
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
