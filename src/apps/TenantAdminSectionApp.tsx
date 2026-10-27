// src/apps/TenantAdminSectionApp.tsx
import React from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import { useAuth } from "../hooks/useAuth";
import { useTenant, TenantProvider } from "../contexts/TenantContext";
import { StoreProvider } from "../contexts/StoreContext";
import { usePlan } from "../hooks/usePlan";
import DashboardShell, {
  NavItem,
} from "../components/Dashboard/DashboardShell";
import MobileDashboardShell, {
  MobileNavItem,
  KebabItem,
} from "../components/Dashboard/MobileDashboardShell";
import TenantNotificationsDrawer from "../components/Header/TenantNotificationsDrawer";
import DineinNotificationsDrawer from "../components/Header/DineinNotificationsDrawer";
import LoginModal from "../components/Auth/LoginModal";
import DashboardSkeleton from "../components/DashboardSkeleton/DashboardSkeleton";
import TenantNotFound from "../components/TenantNotFound/TenantNotFound";
import { authService } from "../services/auth.service";
import {
  MenuIcon,
  StoreIcon,
  UsersIcon,
  StarIcon,
  EditIcon,
  UtensilsIcon as OrdersIcon,
  RecieptIcon,
  PowerIcon,
  ClockIcon,
} from "../assets/svgs";

const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png";

const MOBILE_KEBAB_KEYS = new Set(["reviews", "info"]);

const PAGE_FOR_SECTION: Record<string, string> = {
  menu: "admin-menu.html",
  billing: "admin-pharmacy-billing.html",
  appointments: 'admin-appointments.html',
  store: "admin-store.html",
  users: "admin-users.html",
  orders: "admin-orders.html",
  reviews: "admin-reviews.html",
  info: "admin-info.html",
};

const readSlugFromUrl = (): string | null => {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get("t");
    if (!qp) return null;
    return qp.endsWith("_admin") ? qp.slice(0, -6) : qp;
  } catch {
    return null;
  }
};

/** Build the URL for a specific section page. */
const sectionUrl = (slug: string, sectionKey: string): string => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  const page = PAGE_FOR_SECTION[sectionKey] ?? "admin.html";
  return `${window.location.origin}${dir}${page}?t=${slug}_admin`;
};

/** Build the URL for the tenant admin landing page (greeting). */
const homeUrl = (slug: string): string => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  return `${window.location.origin}${dir}admin.html?t=${slug}_admin`;
};

interface Props {
  sectionKey: string;
  children: React.ReactNode;
}

const handleLogout = () => {
  if (!window.confirm("Log out?")) return;
  authService.logout();
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  window.location.href = `${window.location.origin}${dir}home.html`;
};

(function bindFromUrlOnce() {
  try {
    const url = new URL(window.location.href);
    const qp = url.searchParams.get("t");
    if (!qp) return;
    const isAdmin = qp.endsWith("_admin");
    const slug = isAdmin ? qp.slice(0, -6) : qp;
    authService.bindTenant(slug, isAdmin, false);
  } catch {
    /* ignore */
  }
})();

const TenantAdminSectionAppInner: React.FC<Props> = ({
  sectionKey,
  children,
}) => {
  const isMobile = useIsMobile(900);
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { tenant, isLoading: tenantLoading, tenantNotFound } = useTenant();
  const plan = usePlan();

  const slug = React.useMemo(() => readSlugFromUrl(), []);

  if (!slug) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ margin: "0 0 8px" }}>Missing store URL</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Add <code>?t=your-store_admin</code> to the URL.
          </p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }

  if (!isAuthenticated) {
    const displayName = tenant?.displayName ?? slug;
    return (
      <>
        <div style={{ minHeight: "100vh", background: "#f8fafc" }} />
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
          storeIdentity={{ slug, displayName }}
        />
      </>
    );
  }

  if (tenantLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }

  if (tenantNotFound || !tenant) {
    return <TenantNotFound />;
  }

  if (!user?.isPlatformAdmin && user?.tenantSlug && user.tenantSlug !== slug) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
        }}
      >
        <div style={{ textAlign: "center", maxWidth: 400 }}>
          <h2 style={{ margin: "0 0 8px" }}>Wrong store</h2>
          <p style={{ margin: 0, color: "#666", fontSize: 14 }}>
            Your login is for a different store. Sign out to continue.
          </p>
        </div>
      </div>
    );
  }

  const isAdmin = user?.role === "admin";
  const isDinein = tenant.dineinEnabled === true;
  const isHospital = tenant.storeCategory === 'hospital-pharmacy';

  const navItems: NavItem[] = [
    {
      key: 'billing',
      label: 'Pharmacy Billing',
      icon: <RecieptIcon width={20} height={20} fill="currentColor" />,
      visible: isHospital && isAdmin,
      render: sectionKey === 'billing' ? () => children : () => null,
    },
    {
      key: 'menu',
      label: isHospital ? 'Stock' : 'Menu',
      icon: <MenuIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canEditFields || plan.canManageStore,
      render: sectionKey === 'menu' ? () => children : () => null,
    },
    {
  key: 'appointments',
  label: 'Appointments',
  icon: <ClockIcon width={20} height={20} fill="currentColor" />, // Use an appropriate icon
  visible: isHospital && isAdmin,
  render: sectionKey === 'appointments' ? () => children : () => null,
},
    {
      key: "store",
      label: "Store",
      icon: <StoreIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageStore,
      render: sectionKey === "store" ? () => children : () => null,
    },
    {
      key: "users",
      label: "Users",
      icon: <UsersIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageUsers,
      render: sectionKey === "users" ? () => children : () => null,
    },
    {
      key: "reviews",
      label: "Reviews",
      icon: <StarIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canReview,
      render: sectionKey === "reviews" ? () => children : () => null,
    },
    {
      key: "orders",
      label: "Orders",
      icon: <OrdersIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canOrder && isDinein,
      render: sectionKey === "orders" ? () => children : () => null,
    },
    {
      key: "info",
      label: "Store Info",
      icon: <EditIcon width={20} height={20} fill="currentColor" />,
      visible: false,
      render: sectionKey === "info" ? () => children : () => null,
    },
  ];

  const handleActiveKeyChange = (key: string) => {
    if (!key) {
      window.location.href = homeUrl(slug);
      return;
    }
    if (key === sectionKey) return;
    window.location.href = sectionUrl(slug, key);
  };

  const kebabItems: KebabItem[] = [
    ...(isAdmin && plan.canReview
      ? [
          {
            kind: "action" as const,
            key: "reviews",
            label: "Reviews",
            icon: <StarIcon width={18} height={18} fill="#1e7e34" />,
            onClick: () => {
              window.location.href = sectionUrl(slug, "reviews");
            },
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            kind: "action" as const,
            key: "info",
            label: "Store Information",
            icon: <EditIcon width={18} height={18} fill="#1e7e34" />,
            onClick: () => {
              window.location.href = sectionUrl(slug, "info");
            },
          },
        ]
      : []),
    { kind: "divider" as const },
    {
      kind: "action",
      key: "logout",
      label: "Logout",
      icon: <PowerIcon width={18} height={18} fill="#a62d2d" />,
      onClick: handleLogout,
    },
  ];

  const notificationsSlot = (
    <>
      {isAdmin && plan.canReview && (
        <TenantNotificationsDrawer
          onOpenReview={() => {
            window.location.href = sectionUrl(slug, "reviews");
          }}
        />
      )}
      {isAdmin && isDinein && (
        <DineinNotificationsDrawer
          onOpenOrder={() => {
            window.location.href = sectionUrl(slug, "orders");
          }}
        />
      )}
    </>
  );

  if (isMobile) {
    const mobileNavItems: MobileNavItem[] = navItems.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      render: i.render,
      visible: !MOBILE_KEBAB_KEYS.has(i.key) && i.visible !== false,
    }));

    return (
      <MobileDashboardShell
        logoUrl={LOGO_URL}
        roleLabel={isAdmin ? "Admin" : "Staff"}
        navItems={mobileNavItems}
        activeKey={sectionKey}
        onActiveKeyChange={handleActiveKeyChange}
        onLogoClick={() => {
          // ← Home goes to the landing page, not the menu section.
          window.location.href = homeUrl(slug);
        }}
        greeting={null}
        kebabItems={kebabItems}
        notifications={notificationsSlot}
      />
    );
  }


  return (
    <DashboardShell
      logoUrl={LOGO_URL}
      items={navItems}
      activeKey={sectionKey}
      onActiveKeyChange={handleActiveKeyChange}
      greeting={null}
      onAdd={null}
      onLogoClick={() => {
        // ← Home goes to the landing page, not the menu section.
        window.location.href = homeUrl(slug);
      }}
      footer={{
        notifications: notificationsSlot,
        kebabItems: kebabItems.map((k) =>
          k.kind === "divider"
            ? { key: `div-${Math.random()}`, label: "", onClick: () => {} }
            : {
                key: k.key,
                label: k.label,
                icon: k.icon,
                tone: k.tone,
                onClick: k.onClick,
              },
        ),
      }}
    />
  );
};

const TenantAdminSectionApp: React.FC<Props> = ({ sectionKey, children }) => (
  <TenantProvider>
    <StoreProvider>
      <TenantAdminSectionAppInner sectionKey={sectionKey}>
        {children}
      </TenantAdminSectionAppInner>
    </StoreProvider>
  </TenantProvider>
);

export default TenantAdminSectionApp;
