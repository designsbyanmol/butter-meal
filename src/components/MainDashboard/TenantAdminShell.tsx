// src/components/MainDashboard/TenantAdminShell.tsx
import React, { useState } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTenant } from "../../contexts/TenantContext";
import { usePlan } from "../../hooks/usePlan";
import { useIsMobile } from "../../hooks/useIsMobile";
import DashboardShell, { NavItem } from "../Dashboard/DashboardShell";
import MobileDashboardShell, {
  MobileNavItem,
  KebabItem,
} from "../Dashboard/MobileDashboardShell";
import TenantNotificationsDrawer from "../Header/TenantNotificationsDrawer";
import DineinNotificationsDrawer from "../Header/DineinNotificationsDrawer";
import ContactAdminModal from "../Auth/ContactAdminModal";
import LoginModal from "../Auth/LoginModal";
import DashboardSkeleton from "../DashboardSkeleton/DashboardSkeleton";
import Avatar from "../ui/Avatar/Avatar";
import { authService } from "../../services/auth.service";
import {
  StoreIcon,
  MenuIcon,
  UsersIcon,
  StarIcon,
  EditIcon,
  RecieptIcon as OrdersIcon,
  PowerIcon,
  InfoIcon as SupportIcon,
} from "../../assets/svgs";
import shell from "../Dashboard/DashboardShell.module.scss";
import { IconButton } from "../ui";

const ADMIN_EMAIL = "ContactDozzelo@gmail.com";
const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png";

const LANDING_PAGE_SECTIONS = new Set([
  "menu",
  "store",
  "users",
  "orders",
  "reviews",
  "info",
]);

const PAGE_FOR_SECTION: Record<string, string> = {
  menu: "admin-menu.html",
  store: "admin-store.html",
  users: "admin-users.html",
  orders: "admin-orders.html",
  reviews: "admin-reviews.html",
  info: "admin-info.html",
};

const sectionUrl = (slug: string, sectionKey: string): string => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  const page = PAGE_FOR_SECTION[sectionKey] ?? "admin.html";
  return `${window.location.origin}${dir}${page}?t=${slug}_admin`;
};

const navigateToHome = () => {
  window.location.href = `${window.location.origin}/`;
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

type Accent = "green" | "blue" | "amber" | "purple" | "rose" | "teal";

interface CardDef {
  key: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  accent: Accent;
  visible: boolean;
  target?: string;
  onClick?: () => void;
}

const TenantAdminShell: React.FC = () => {
  const { user, isAdmin, isLoading } = useAuth();
  const { tenant, isLoading: tenantLoading, tenantNotFound } = useTenant();
  const plan = usePlan();
  const isMobile = useIsMobile(900);

  const [supportOpen, setSupportOpen] = useState(false);

  const slug = React.useMemo(() => readSlugFromUrl(), []);

  if (isLoading || tenantLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }
  if (!tenant || tenantNotFound) {
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <div style={{ textAlign: "center", maxWidth: 400, padding: 24 }}>
          <h2>Store not found</h2>
          <p style={{ color: "#666", fontSize: 14 }}>
            The store at this URL doesn't exist or is inactive.
          </p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <>
        <div style={{ minHeight: "100vh", background: "#f8fafc" }} />
        <LoginModal
          isOpen={true}
          onClose={() => {}}
          forceOpen={true}
          storeIdentity={{
            slug: tenant.slug,
            displayName: tenant.displayName,
          }}
        />
      </>
    );
  }

  if (!slug) return null;

  const isDinein = tenant.dineinEnabled === true;

  const handleLogout = () => {
    if (!window.confirm("Log out?")) return;
    authService.logout();
    navigateToHome();
  };

  const handleActiveKeyChange = (key: string) => {
    if (!key) return;
    if (LANDING_PAGE_SECTIONS.has(key)) {
      window.location.href = sectionUrl(slug, key);
    }
  };

  const goToInfo = () => {
    window.location.href = sectionUrl(slug, "info");
  };

  const navItems: NavItem[] = [
    {
      key: "menu",
      label: "Menu",
      icon: <MenuIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canEditFields || plan.canManageStore,
      render: () => null,
    },
    {
      key: "store",
      label: "Store",
      icon: <StoreIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageStore,
      render: () => null,
    },
    {
      key: "users",
      label: "Users",
      icon: <UsersIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageUsers,
      render: () => null,
    },
    {
      key: "reviews",
      label: "Reviews",
      icon: <StarIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canReview,
      render: () => null,
    },
    {
      key: "orders",
      label: "Orders",
      icon: <OrdersIcon width={20} height={20} fill="currentColor" />,
      visible: plan.canOrder && isDinein,
      render: () => null,
    },
  ];

  const cardDefs: CardDef[] = [
    {
      key: "store",
      label: "Manage Store",
      description: "Open / close & accepting orders",
      icon: <StoreIcon width={20} height={20} fill="#ffffff" />,
      accent: "amber",
      visible: isAdmin && plan.canManageStore,
      target: "store",
    },
    {
      key: "menu",
      label: "Manage Menu",
      description: "Items, prices & availability",
      icon: <MenuIcon width={20} height={20} fill="#ffffff" />,
      accent: "blue",
      visible: plan.canEditFields || plan.canManageStore,
      target: "menu",
    },
    {
      key: "users",
      label: "Manage Staff",
      description: "Staff accounts & access",
      icon: <UsersIcon width={20} height={20} fill="#ffffff" />,
      accent: "purple",
      visible: isAdmin && plan.canManageUsers,
      target: "users",
    },
    {
      key: "info",
      label: "Store Details",
      description: "Name, banner, tagline & contact",
      icon: <EditIcon width={20} height={20} fill="#ffffff" />,
      accent: "green",
      visible: isAdmin,
      target: "info",
    },
    {
      key: "reviews",
      label: "Reviews",
      description: "Customer feedback & ratings",
      icon: <StarIcon width={20} height={20} fill="#ffffff" />,
      accent: "rose",
      visible: isAdmin && plan.canReview,
      target: "reviews",
    },
    {
      key: "orders",
      label: "Orders",
      description: "Dine-in orders & bills",
      icon: <OrdersIcon width={20} height={20} fill="#ffffff" />,
      accent: "teal",
      visible: plan.canOrder && isDinein,
      target: "orders",
    },
    {
      key: "support",
      label: "Get Support",
      description: "Reach out to Dozzelo team via mail",
      icon: <SupportIcon width={20} height={20} fill="#ffffff" />,
      accent: "green",
      visible: true,
      onClick: () => setSupportOpen(true),
    },
  ];

  const visibleCards = cardDefs.filter((c) => c.visible);

  const greetingContent = (
    <div className={shell.welcome}>
      <div className={shell.welcomeHead}>
        <h1>
          Welcome back, <span>{user.name}</span>
        </h1>
        <p>
          You're signed in to <strong>{tenant.displayName}</strong>. Pick a
          section to get started.
        </p>
      </div>
      <div className={shell.cardGrid}>
        {visibleCards.map((c) => (
          <button
            key={c.key}
            type="button"
            className={`${shell.card} ${shell[c.accent]}`}
            onClick={() => {
              if (c.target) handleActiveKeyChange(c.target);
              else c.onClick?.();
            }}
          >
            <span className={shell.cardIcon}>{c.icon}</span>
            <span className={shell.cardLabel}>{c.label}</span>
            <span className={shell.cardDesc}>{c.description}</span>
          </button>
        ))}
      </div>
    </div>
  );

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

  if (isMobile) {
    const mobileNavItems: MobileNavItem[] = navItems.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      render: () => null,
      visible: i.visible,
    }));

    return (
      <>
        <MobileDashboardShell
          logoUrl={LOGO_URL}
          roleLabel={isAdmin ? "Admin" : "Staff"}
          navItems={mobileNavItems}
          activeKey=""
          onActiveKeyChange={handleActiveKeyChange}
          onLogoClick={() => {
            /* already on landing */
          }}
          greeting={greetingContent}
          kebabItems={kebabItems}
          notifications={notificationsSlot}
        />
        {supportOpen && (
          <ContactAdminModal
            isOpen={true}
            onClose={() => setSupportOpen(false)}
            email={ADMIN_EMAIL}
          />
        )}
      </>
    );
  }

  return (
    <>
      <DashboardShell
        logoUrl={LOGO_URL}
        items={navItems}
        activeKey=""
        onActiveKeyChange={handleActiveKeyChange}
        greeting={greetingContent}
        onLogoClick={() => {
          /* already on landing */
        }}
        onAdd={null}
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
      {supportOpen && (
        <ContactAdminModal
          isOpen={true}
          onClose={() => setSupportOpen(false)}
          email={ADMIN_EMAIL}
        />
      )}
    </>
  );
};

export default TenantAdminShell;
