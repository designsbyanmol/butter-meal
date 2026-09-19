// App.tsx
import React, { useEffect, useMemo, useState } from 'react';
import { menuItems as defaultMenuItems } from './data/menuData';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';
import { useMenu } from './hooks/useMenu';
import { menuService } from './services/menu.service';
import { db } from './services/database.service';
import { isSupabaseConfigured } from './config/env';
import { StoreProvider, useStore } from './contexts/StoreContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import Menu from './components/Menu/Menu';
import BrandInfo from './components/BrandInfo/BrandInfo';
import CartModal from './components/Cart/CartModal';
import FloatingCart from './components/FloatingCart/FloatingCart';
import ScheduleModal from './components/Schedule/ScheduleModal';
import LocationModal from './components/Location/LocationModal';
import MenuDetail from './components/MenuDetail/MenuDetail';
import Header from './components/Header/Header';
import StoreBanner from './components/Store/StoreBanner';
import MenuSkeleton from './components/Menu/MenuSkeleton';
import { ShopInfo } from './config/credentials';
import StoreDeactivated from './components/Store/StoreDeactivated';
import MainDashboard from './components/MainDashboard/MainDashboard';
import TenantNotFound from './components/TenantNotFound/TenantNotFound';
import MenuFilters from './components/Menu/MenuFilters';
import {
  MenuFilterState,
  EMPTY_FILTERS,
} from './components/Menu/menuFilters.types';
import DashboardSkeleton from './components/DashboardSkeleton/DashboardSkeleton';
import CustomerNameModal from './components/Cart/CustomerNameModal';
import PausedScreen from './components/Store/PausedScreen';
import ExpiredScreen from './components/Store/ExpiredScreen';
import RenewalBanner from './components/Store/RenewalBanner';
import SignupPage from './components/pages/Signup/SignupPage';
import { getCustomerName } from './utils/customerName';
import { DEFAULT_MESSAGE_TEMPLATE } from './types';
import styles from './App.module.scss';

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
        {isConnected ? 'Working!' : 'Wait'}
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
  if (typeof window === 'undefined') return false;
  try {
    const url = new URL(window.location.href);
    return url.searchParams.has('_sign-up');
  } catch {
    return false;
  }
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
  const { isStoreOpen, isAcceptingOrders, isLoading: storeLoading } = useStore();
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
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [customerName, setCustomerName] = useState<string>(() =>
    getCustomerName(),
  );

  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  const [filters, setFilters] = useState<MenuFilterState>({
    ...EMPTY_FILTERS,
    types: new Set(),
  });

  // ---- Connection check (one-shot) ----
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

  // ---- Tenant-scoped initialization ----
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
        console.error('App initialization failed:', error);
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

  // ---- Page title ----
  useEffect(() => {
    document.title = tenant
      ? `${tenant.displayName} - Menu`
      : 'Menu Display by Teckut';
  }, [tenant?.displayName]);

  // ---- Keep selectedItem in sync with fresh data ----
  useEffect(() => {
    if (!selectedItem) return;
    const latest = allItems.find((it) => it.id === selectedItem.id);
    if (latest && latest !== selectedItem) {
      setSelectedItem(latest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allItems, selectedItem?.id]);

  // ---- Filtering ----
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
      return (
        Number(n?.protein ?? 0) * 2 -
        Number(n?.fat ?? 0) -
        Number(n?.carbs ?? 0) * 0.5
      );
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

  const isAppLoading =
    authLoading ||
    tenantLoading ||
    storeLoading ||
    !cartLoaded ||
    isInitializing ||
    menuLoading;

  // ---- Handlers ----
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
    if (!isStoreOpen || !isAcceptingOrders) return;
    addItem(item, customizations, customMessage);
  };

  const handleDeliveryChange = (type: 'now' | 'schedule') => {
    if (type === 'schedule') {
      if (cart.length === 0) {
        setDeliveryType('now');
        return;
      }
      if (!scheduleData) setIsScheduleOpen(true);
      setDeliveryType('schedule');
    } else {
      setDeliveryType('now');
      setScheduleData(null);
      setIsScheduleOpen(false);
    }
  };

  const handleScheduleSave = (date: string, time: string) => {
    setScheduleData({ date, time });
    setDeliveryType('schedule');
    setIsScheduleOpen(false);
  };

  const handleScheduleClose = () => {
    setDeliveryType('now');
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
    const brandName = tenant?.displayName ?? '';
    const tagline = tenant?.storeTagline ?? '';

    const orderLabel = (tpl.orderLabel || 'New Order From {customerName}').replace(
      '{customerName}',
      nameForOrder || 'Customer',
    );

    let message = `*${orderLabel}*\n`;
    message += `-----------------\n`;
    if (brandName) message += `*${brandName}*\n`;
    if (tagline) message += `_${tagline}_\n`;
    message += `Order ID. - ${orderNo}\n`;
    message += `Total Items - ${totalItems}\n`;
    message += `Payment - ${paymentMode}`;
    if (paymentMode === 'Online' && discountPercent > 0) {
      message += ` (${discountPercent}% OFF)`;
    }
    message += `\n`;
    message += `Exp. Delivery - ${deliveryTime}\n`;

    if (deliveryType === 'schedule' && scheduleData) {
      const sdt = new Date(`${scheduleData.date}T${scheduleData.time}`);
      let h = sdt.getHours();
      const m = String(sdt.getMinutes()).padStart(2, '0');
      const ap = h >= 12 ? 'PM' : 'AM';
      h = h % 12;
      h = h ? h : 12;
      message += `Scheduled Delivery - ${scheduleData.date} at ${h}:${m} ${ap}\n`;
      message += `*Note:* Prepaid . Send Reminder before 1hr\n`;
    }

    message += `-----------------\n`;
    message += `*${tpl.itemListTitle || 'Item List'}*\n`;

    cart.forEach((item) => {
      const baseForItem = item.basePrice || item.price;
      const addons = item.addonPrice || 0;
      const unitPrice = baseForItem + addons;
      const total = unitPrice * item.quantity;

      let line = (tpl.itemLineTemplate || '{name} x {qty}')
        .replace('{name}', item.name)
        .replace('{qty}', String(item.quantity));

      if (
        tpl.showItemCustomizations &&
        item.customizations &&
        Object.keys(item.customizations).length > 0
      ) {
        const cs = Object.entries(item.customizations)
          .map(([k, v]) => `${k}: ${v}`)
          .join(', ');
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

      if (tpl.showItemNotes && item.customMessage && item.customMessage.trim()) {
        message += `   Note: ${item.customMessage.trim()}\n`;
      }
    });

    message += `-----------------\n`;
    message += `${tpl.subtotalLabel || 'Subtotal'} - Rs ${Math.round(subtotal)}\n`;
    message += `${tpl.deliveryLabel || 'Delivery'} - Rs ${DELIVERY_FEE}\n`;

    if (paymentMode === 'Online' && discountPercent > 0) {
      message += `${tpl.discountLabel || 'Discount'} (${discountPercent}%) - Rs ${discount}\n`;
      message += `-----------------\n`;
      message += `\n*${tpl.totalLabel || 'Total Amount'} - Rs ${finalTotal}*\n`;
      message += `(${discountPercent}% discount applied on total)\n`;
    } else {
      message += `-----------------\n`;
      message += `\n*${tpl.totalLabel || 'Total Amount'} - Rs ${finalTotal}*\n`;
      const feeLine = (tpl.freeDeliveryLabel || '(+Rs {fee} Inc. for delivery)').replace(
        '{fee}',
        String(DELIVERY_FEE),
      );
      message += `${feeLine}\n`;
    }

    message += `\n-----------------\n`;
    if (tpl.footerNote1) message += `_${tpl.footerNote1}_\n`;
    if (tpl.footerNote2) message += `_${tpl.footerNote2}_\n`;
    if (tpl.footerSignature) message += `_${tpl.footerSignature}_`;

    const encoded = encodeURIComponent(message);
    const url = `https://wa.me/${RESTAURANT_PHONE}?text=${encoded}`;
    window.open(url, '_blank');
  };

  // ---- Subscription state ----
  const subscriptionStatus = tenant?.subscriptionStatus ?? 'active';
  const daysLeft = tenant?.daysUntilExpiry ?? Infinity;
  const isExpired = subscriptionStatus === 'expired' || daysLeft < 0;
  const isPaused = subscriptionStatus === 'paused';

  // ---- Render ----
  return (
    <>
      {isAuthenticated && isAdmin && !isAppLoading && (
        <DatabaseStatusNotice
          isConnected={isConnected}
          isChecking={isChecking}
        />
      )}

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
        {!tenant && !tenantLoading && <MainDashboard />}

        {tenantNotFound && <TenantNotFound />}

        {isAppLoading && !tenantNotFound && tenant && <DashboardSkeleton count={6} />}

        {/* Paused / expired tenant */}
        {!isAppLoading && tenant && (isDeactivated || isPaused) && (
          isAuthenticated && isAdmin ? <PausedScreen /> : <StoreDeactivated />
        )}

        {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          !isPaused &&
          isExpired && <ExpiredScreen />}

        {/* Active tenant */}
        {!isAppLoading &&
          tenant &&
          !isDeactivated &&
          !isPaused &&
          !isExpired && (
            <>
              <BrandInfo
                brandName={tenant?.displayName ?? ShopInfo.Shop_name}
                brandDesc={ShopInfo.Shop_tagline}
              />

              {isAuthenticated && isAdmin && <RenewalBanner />}

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
                      <p>No dishes match your filters.</p>
                      <button
                        type="button"
                        onClick={() =>
                          setFilters({
                            ...EMPTY_FILTERS,
                            types: new Set(),
                          })
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
          !isPaused &&
          !isExpired &&
          isStoreOpen &&
          isAcceptingOrders &&
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
          acceptingOrders={isAcceptingOrders}
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