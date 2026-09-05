// App.tsx
import React, { useEffect, useState } from 'react';
import { menuItems as defaultMenuItems } from './data/menuData';
import { useCart } from './hooks/useCart';
import { useAuth } from './hooks/useAuth';
import { useMenu } from './hooks/useMenu';
import { menuService } from './services/menu.service';
import { db } from './services/database.service';
import { isSupabaseConfigured } from './config/env';
import Menu from './components/Menu/Menu';
import BrandInfo from './components/BrandInfo/BrandInfo';
import Promotion from './components/Promotion/Promotion';
import CartModal from './components/Cart/CartModal';
import FloatingCart from './components/FloatingCart/FloatingCart';
import ScheduleModal from './components/Schedule/ScheduleModal';
import LocationModal from './components/Location/LocationModal';
import MenuDetail from './components/MenuDetail/MenuDetail';
import Header from './components/Header/Header';
import AdminPanel from './components/Admin/AdminPanel';
import styles from './App.module.scss';

// Database Status Notice Component
const DatabaseStatusNotice: React.FC<{ isConnected: boolean; isChecking: boolean }> = ({ isConnected, isChecking }) => {
  if (isChecking) {
    return (
      <div className={`${styles.dbStatusNotice} ${styles.checking}`}>
        <span className={styles.statusDot}></span>
        <span className={styles.statusText}>⏳ Checking database connection...</span>
      </div>
    );
  }

  return (
    <div className={`${styles.dbStatusNotice} ${isConnected ? styles.connected : styles.disconnected}`}>
      <span className={styles.statusDot}></span>
      <span className={styles.statusText}>
        {isConnected ? 'Working!' : 'Oops'}
      </span>
      {!isConnected && (
        <span className={styles.reconnectingText}> - Reconnecting...</span>
      )}
    </div>
  );
};

const AppContent: React.FC = () => {
  // Auth hooks - will load from localStorage
  const { isAuthenticated, user, isLoading: authLoading, isAdmin } = useAuth();
  const { visibleItems, items: allItems, loading: menuLoading } = useMenu();
  const [isAdminOpen, setIsAdminOpen] = React.useState(false);
  
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
    isLoaded: cartLoaded
  } = useCart();

  const [isCartOpen, setIsCartOpen] = React.useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = React.useState(false);
  const [isLocationOpen, setIsLocationOpen] = React.useState(false);
  const [selectedItem, setSelectedItem] = React.useState<typeof defaultMenuItems[0] | null>(null);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);

  // Connection state - start with false (disconnected) until verified
  const [isConnected, setIsConnected] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);

  // Subscribe to maintenance/connection status changes
  useEffect(() => {
    if (!isSupabaseConfigured) {
      setIsConnected(true);
      setIsChecking(false);
      setIsInitializing(false);
      return;
    }

    // Force a connection check on load
    const checkConnection = async () => {
      setIsChecking(true);
      console.log('🔄 Starting connection check...');
      const connected = await db.forceConnectionCheck();
      console.log('🔍 Connection check result:', connected ? 'CONNECTED ✅' : 'DISCONNECTED ❌');
      setIsConnected(connected);
      setIsChecking(false);
    };

    checkConnection();

    // Subscribe to maintenance status changes
    if (typeof db.subscribeToMaintenance === 'function') {
      const unsubscribe = db.subscribeToMaintenance((isActive) => {
        const connected = !isActive;
        console.log('🔔 Connection status changed:', connected ? 'CONNECTED ✅' : 'DISCONNECTED ❌');
        setIsConnected(connected);
        setIsChecking(false);
      });

      return () => {
        if (unsubscribe) unsubscribe();
      };
    } else {
      // Fallback - check every 5 seconds
      const interval = setInterval(async () => {
        const connected = await db.forceConnectionCheck();
        setIsConnected(connected);
        setIsChecking(false);
      }, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  // Initialize app data
  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...');
        await db.initializeDefaultUsers();
        await menuService.initializeItems(defaultMenuItems);
        console.log('✅ App initialization complete!');
      } catch (error) {
        console.error('❌ Error initializing app:', error);
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeApp();
  }, []);

  // Show loading state
  if (isInitializing || authLoading || menuLoading || !cartLoaded) {
    return (
      <div className={styles.container}>
        <div className={styles.loadingState}>
          <div className={styles.loader}></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  const handleItemClick = (item: typeof defaultMenuItems[0]) => {
    setSelectedItem(item);
    setIsDetailOpen(true);
  };

  const handleAddToCartFromDetail = (item: typeof defaultMenuItems[0], customizations?: Record<string, string>, customMessage?: string) => {
  addItem(item, customizations, customMessage);
};

  const handleDeliveryChange = (type: 'now' | 'schedule') => {
    if (type === 'schedule') {
      if (cart.length === 0) {
        setDeliveryType('now');
        return;
      }
      if (!scheduleData) {
        setIsScheduleOpen(true);
      }
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
    if (deliveryType === 'schedule' && !scheduleData) {
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
  if (paymentMode === 'Online' && discountPercent > 0) {
    message += ` (${discountPercent}% OFF)`;
  }
  message += `\n`;
  message += `Exp. Delivery - ${deliveryTime}\n`;

  if (deliveryType === 'schedule' && scheduleData) {
    const scheduledDateTime = new Date(`${scheduleData.date}T${scheduleData.time}`);
    let schedHours = scheduledDateTime.getHours();
    const schedMins = String(scheduledDateTime.getMinutes()).padStart(2, '0');
    const schedAmpm = schedHours >= 12 ? 'PM' : 'AM';
    schedHours = schedHours % 12;
    schedHours = schedHours ? schedHours : 12;
    message += `Scheduled Delivery - ${scheduleData.date} at ${schedHours}:${schedMins} ${schedAmpm}\n`;
    message += `*Note:* Prepaid · Send Reminder before 1hr\n`;
  }

  message += `-----------------\n`;
  message += `*Item List*\n`;
  
  // Track if we have any custom messages to show
  let hasCustomMessages = false;
  
  cart.forEach(item => {
    const pricePerItem = (item.basePrice || item.price) + (item.addonPrice || 0);
    const itemTotal = pricePerItem * item.quantity;
    let itemLine = `${item.name} x ${item.quantity}`;
    message += `- - - - - - -\n`;
    if (item.customizations && Object.keys(item.customizations).length > 0) {
      const customStr = Object.entries(item.customizations)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ');
      itemLine += ` (${customStr})`;
    }
    if (item.addonPrice && item.addonPrice > 0) {
      itemLine += ` [+Rs${item.addonPrice} add-ons]`;
    }
    itemLine += ` - Rs ${itemTotal}`;
    message += `${itemLine}\n`;
    
    // Check if this item has a custom message
    if (item.customMessage && item.customMessage.trim()) {
      hasCustomMessages = true;
    }
  });
  
  message += `-----------------\n`;
  message += `Subtotal - Rs ${Math.round(subtotal)}\n`;
  message += `Delivery - Rs ${DELIVERY_FEE}\n`;

  if (paymentMode === 'Online' && discountPercent > 0) {
    message += `Discount (${discountPercent}%) - Rs ${discount}\n`;
    message += `-----------------\n`;
    message += `\nTotal Amount - *Rs ${finalTotal}*\n`;
    message += `(${discountPercent}% discount applied on total)\n`;
  } else {
    message += `-----------------\n`;
    message += `\nTotal Amount - *Rs ${finalTotal}*\n`;
    message += `(+Rs ${DELIVERY_FEE} Inc. for delivery)\n`;
  }

  // Add custom messages section if any exist
  if (hasCustomMessages) {
    message += `\n-----------------\n`;
    message += `*Special Instructions:*\n`;
    cart.forEach(item => {
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
  window.open(url, '_blank');
};

  return (
    <>
      {isAuthenticated && (
        <DatabaseStatusNotice isConnected={isConnected} isChecking={isChecking} />
        )}
      <Header 
        companyName='Teckut' 
        year={2026}
      />
      <div className={`${styles.container} ${getTotalItems() > 0 ? styles.hasFloatingCart : ''}`}>
        <BrandInfo brandName='Restaurant Menu Display' brandDesc='Taste that reminds you home'/>
        <Promotion
          messages={[
            "Welcome!",
            "Pay Online and get 20% Off",
            "Launch Time Offer!"
          ]}
          typingSpeed={110}
          delayBeforeErase={1500}
        />
        <Menu
          items={visibleItems}
          cart={cart}
          onAddItem={addItem}
          onRemoveItem={removeItem}
          onItemClick={handleItemClick}
        />

        {getTotalItems() > 0 && (
          <FloatingCart
            itemCount={getTotalItems()}
            onClick={() => setIsCartOpen(true)}
          />
        )}

        <CartModal
          isOpen={isCartOpen}
          cart={cart}
          paymentMode={paymentMode}
          deliveryType={deliveryType}
          scheduleData={scheduleData}
          onClose={() => setIsCartOpen(false)}
          onIncrement={(id, customizations) => {
            const item = allItems.find(item => item.id === id);
            if (item) addItem(item, customizations);
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

        {isAdminOpen && isAuthenticated && isAdmin && (
          <AdminPanel
            onClose={() => setIsAdminOpen(false)}
          />
        )}
      </div>
    </>
  );
};

const App: React.FC = () => {
  return <AppContent />;
};

export default App;