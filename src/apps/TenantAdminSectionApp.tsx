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
import Avatar from "../components/ui/Avatar/Avatar";
import { authService } from "../services/auth.service";

import {
  MenuIcon,
  StoreIcon,
  UsersIcon,
  StarIcon,
  EditIcon,
  RecieptIcon as OrdersIcon,
  PowerIcon,
} from "../assets/svgs";
import { IconButton } from "../components/ui";

const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png";

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

const sectionUrl = (slug: string, sectionKey: string): string => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  const page =
    sectionKey === "menu"
      ? "admin-menu.html"
      : sectionKey === "store"
        ? "admin-store.html"
        : sectionKey === "users"
          ? "admin-users.html"
          : sectionKey === "orders"
            ? "admin-orders.html"
            : sectionKey === "reviews"
              ? "admin-reviews.html"
              : sectionKey === "info"
                ? "admin-info.html"
                : "admin.html";
  return `${window.location.origin}${dir}${page}?t=${slug}_admin`;
};

/** The admin landing page (greeting cards), not any section page. */
const landingUrl = (slug: string): string => {
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
  window.location.href = `${window.location.origin}/`;
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

  const goToInfo = () => {
    window.location.href = sectionUrl(slug, "info");
  };

  const navItems: NavItem[] = [
    {
      key: "menu",
      label: "Menu",
      icon: <MenuIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canEditFields || plan.canManageStore,
      render: sectionKey === "menu" ? () => children : () => null,
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
      label: "Info",
      icon: <></>,
      visible: false,
      render: sectionKey === "info" ? () => children : () => null,
    },
  ];

  const handleActiveKeyChange = (key: string) => {
    if (!key) {
      return;
    }
    if (key === sectionKey) return;
    window.location.href = sectionUrl(slug, key);
  };

  const kebabItems: KebabItem[] = [
    ...(isAdmin
      ? [
          {
            kind: "action" as const,
            key: "info",
            label: "Store Information",
            icon: <EditIcon width={18} height={18} fill="#1e7e34" />,
            onClick: goToInfo,
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

  const avatarNode = isAdmin ? (
    <button
      type="button"
      className="tenant-avatar-btn"
      onClick={goToInfo}
      aria-label="Open store information"
      title="Store Information"
      style={{
        width: 40,
        height: 40,
        padding: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        borderRadius: 999,
      }}
    >
      <Avatar
        name={user.name}
        src={tenant.avatarUrl || undefined}
        role="admin"
        size="md"
      />
    </button>
  ) : undefined;

  if (isMobile) {
    const mobileNavItems: MobileNavItem[] = navItems.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      render: i.render,
      visible: i.visible,
    }));

    return (
      <MobileDashboardShell
        logoUrl={LOGO_URL}
        roleLabel={isAdmin ? "Admin" : "Staff"}
        navItems={mobileNavItems}
        activeKey={sectionKey}
        onActiveKeyChange={handleActiveKeyChange}
        onLogoClick={() => {
          window.location.href = landingUrl(slug);
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
        window.location.href = landingUrl(slug);
      }}
      footer={{
  notifications: notificationsSlot,
  kebabItems: [
    ...(isAdmin
      ? [
          {
            key: 'info',
            label: 'Store Information',
            icon: <EditIcon width={18} height={18} fill="#1e7e34" />,
            onClick: goToInfo,
          },
        ]
      : []),
    {
      key: 'logout',
      label: 'Logout',
      icon: <PowerIcon width={18} height={18} fill="#a62d2d" />,
      tone: 'danger' as const,
      onClick: handleLogout,
    },
  ],
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
