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
import { authService } from "../../services/auth.service";
import {
  StoreIcon,
  MenuIcon,
  UsersIcon,
  StarIcon,
  EditIcon,
  UtensilsIcon as OrdersIcon,
  PowerIcon,
  InfoIcon as SupportIcon,
  RecieptIcon,
  ClockIcon,
  PlusIcon,
} from "../../assets/svgs";
import shell from "../Dashboard/DashboardShell.module.scss";
import { useNavigationPreloader } from "../../hooks/useNavigationPreloader";

const ADMIN_EMAIL = "ContactDozzelo@gmail.com";
const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png";

const PAGE_FOR_SECTION: Record<string, string> = {
  menu: "admin-menu.html",
  billing: "admin-pharmacy-billing.html",
  appointments: "admin-appointments.html",
  hospital_billing: "admin-hospital-billing.html",
  store: "admin-store.html",
  users: "admin-users.html",
  orders: "admin-orders.html",
  reviews: "admin-reviews.html",
  info: "admin-info.html",
};

/** Reverse map: filename → section key. `admin.html` → '' (landing). */
const SECTION_FOR_PAGE: Record<string, string> = {
  "admin-menu.html": "menu",
  "admin-pharmacy-billing.html": "billing",
  "admin-appointments.html": "appointments",
  "admin-store.html": "store",
  "admin-users.html": "users",
  "admin-orders.html": "orders",
  "admin-reviews.html": "reviews",
  "admin-info.html": "info",
  "admin.html": "",
};

/**
 * Build the URL for a section page. Billing uses a hospital-specific
 * page for pharmacy tenants, and the shared `admin-menu.html?body=billing`
 * for everyone else.
 */
const sectionUrl = (
  slug: string,
  sectionKey: string,
  isHospital: boolean,
): string => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");

  if (sectionKey === "billing") {
    const page = isHospital ? "admin-pharmacy-billing.html" : "admin-menu.html";
    const params = new URLSearchParams({ t: `${slug}_admin` });
    if (!isHospital) params.set("body", "billing");
    return `${window.location.origin}${dir}${page}?${params.toString()}`;
  }
  if (sectionKey === "hospital_billing") {
    const params = new URLSearchParams({ t: `${slug}_admin` });
    return `${window.location.origin}${dir}admin-hospital-billing.html?${params.toString()}`;
  }

  const page = PAGE_FOR_SECTION[sectionKey] ?? "admin.html";
  return `${window.location.origin}${dir}${page}?t=${slug}_admin`;
};

const homeUrl = (slug: string): string => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, "/");
  return `${window.location.origin}${dir}admin.html?t=${slug}_admin`;
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

const currentSectionFromPath = (): string => {
  try {
    const path = window.location.pathname;
    const fileName = path.slice(path.lastIndexOf("/") + 1).toLowerCase();

    // `admin-menu.html?body=billing` counts as the billing section
    // even though the filename is admin-menu.html.
    if (fileName === "admin-menu.html") {
      const url = new URL(window.location.href);
      if (url.searchParams.get("body") === "billing") return "billing";
      return "menu";
    }

    return SECTION_FOR_PAGE[fileName] ?? "";
  } catch {
    return "";
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
  const currentSection = React.useMemo(() => currentSectionFromPath(), []);

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
  const isHospital =
    (tenant.storeCategory ?? "").trim().toLowerCase() === "hospital-pharmacy";

  const nav = useNavigationPreloader({ title: "Loading..." });

  const sectionTitleFor = (key: string) =>
    (
      ({
        menu: "Loading Products...",
        billing: "Loading Billing...",
        hospital_billing: "Loading Hospital Billing...",
        store: "Loading Business...",
        users: "Loading Staff...",
        orders: "Loading Orders...",
        reviews: "Loading Reviews...",
        info: "Loading Business Info...",
        appointments: "Loading Appointments...",
      }) as Record<string, string>
    )[key] ?? "Loading...";

  const handleActiveKeyChange = (key: string) => {
    if (!key) return;
    const url = sectionUrl(slug, key, isHospital);
    nav.show(() => {
      window.location.href = url;
    }, sectionTitleFor(key));
  };

  const handleLogout = () => {
    if (!window.confirm("Log out?")) return;
    authService.logout();
    nav.show(() => {
      window.location.href = homeUrl(slug);
    }, "Signing out...");
  };

  const items: NavItem[] = [
    {
      key: "billing",
      label: isHospital ? "Billing" : "Billing",
      icon: <RecieptIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin,
      render: () => null,
    },
    {
      key: "appointments",
      label: "Appointments",
      icon: <ClockIcon width={20} height={20} fill="currentColor" />,
      visible: isHospital,
      render: () => null,
    },
    {
      key: "hospital_billing",
      label: "OPD/IPD",
      icon: <PlusIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && isHospital,
      render: () => null,
    },
    {
      key: "menu",
      label: isHospital ? "Stock" : "Products",
      icon: <MenuIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && (plan.canEditFields || plan.canManageStore),
      render: () => null,
    },
    {
      key: "store",
      label: isHospital ? "Manage" : "Manage",
      icon: <StoreIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageStore,
      render: () => null,
    },
    {
      key: "users",
      label: "Staff",
      icon: <UsersIcon width={20} height={20} fill="currentColor" />,
      visible: isAdmin && plan.canManageUsers,
      render: () => null,
    },
    {
      key: "reviews",
      label: "Reviews",
      icon: <StarIcon width={20} height={20} fill="currentColor" />,
      visible: false, // kebab-only, but in the lookup so the tab resolves
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
      key: "info",
      label: isHospital ? "Hospital Info" : "Business Info",
      description: "Name, banner, tagline & contact",
      icon: <EditIcon width={20} height={20} fill="#ffffff" />,
      accent: "green",
      visible: isAdmin,
      target: "info",
    },
    {
      key: "billing",
      label: isHospital ? "Pharmacy Billing" : "Billing",
      description: "Create bills & print receipts",
      icon: <RecieptIcon width={20} height={20} fill="#ffffff" />,
      accent: "amber",
      visible: isAdmin && (plan.canEditFields || plan.canManageStore),
      target: "billing",
    },
    {
      key: "hospital_billing",
      label: "Hospital Billing",
      description: "Create IPD/OPD bills & print receipts",
      icon: <RecieptIcon width={18} height={18} fill="#fff" />,
      accent: "purple",
      visible: isAdmin && isHospital,
      target: "hospital_billing",
    },
    {
      key: "appointments",
      label: "Appointments",
      description: "Manage today's patient queue & tokens",
      icon: <ClockIcon width={20} height={20} fill="#ffffff" />,
      accent: "blue",
      visible: isHospital,
      target: "appointments",
    },
    {
      key: "menu",
      label: isHospital ? "Pharmacy Stock" : "Manage Products",
      description: "Items, prices & availability",
      icon: <MenuIcon width={20} height={20} fill="#ffffff" />,
      accent: "purple",
      visible:
        (isAdmin && plan.canEditFields === true) ||
        (isAdmin && plan.canManageStore === true),
      target: "menu",
    },
    {
      key: "store",
      label: isHospital ? "Manage Hospital" : "Manage Business",
      description: "Open / close & accepting orders",
      icon: <StoreIcon width={20} height={20} fill="#ffffff" />,
      accent: "amber",
      visible: isAdmin && plan.canManageStore,
      target: "store",
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
      key: "reviews",
      label: "Manage Reviews",
      description: "Customer feedback & ratings",
      icon: <StarIcon width={20} height={20} fill="#ffffff" />,
      accent: "rose",
      visible: isAdmin && plan.canReview && !isHospital,
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
      label: "Contact Support",
      description: "Reach out to our team",
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
      {!isHospital && isAdmin && plan.canReview && (
        <TenantNotificationsDrawer
          onOpenReview={() => {
            window.location.href = sectionUrl(slug, "reviews", isHospital);
          }}
        />
      )}
      {isAdmin && isDinein && (
        <DineinNotificationsDrawer
          onOpenOrder={() => {
            window.location.href = sectionUrl(slug, "orders", isHospital);
          }}
        />
      )}
    </>
  );

  const kebabItems: KebabItem[] = [
    ...(isAdmin && plan.canReview && !isHospital
      ? [
          {
            kind: "action" as const,
            key: "reviews",
            label: "Reviews",
            icon: <StarIcon width={18} height={18} fill="#1e7e34" />,
            onClick: () => {
              window.location.href = sectionUrl(slug, "reviews", isHospital);
            },
          },
        ]
      : []),
    ...(isAdmin
      ? [
          {
            kind: "action" as const,
            key: "info",
            label: isHospital ? "Hospital Info" : "Business Info",
            icon: <EditIcon width={18} height={18} fill="#1e7e34" />,
            onClick: () => {
              window.location.href = sectionUrl(slug, "info", isHospital);
            },
          },
        ]
      : []),
    ...(isAdmin && isHospital
      ? [
          {
            kind: "action" as const,
            key: "hospital_billing",
            label: "Hospital Billing",
            icon: <RecieptIcon width={18} height={18} fill="#1e7e34" />,
            onClick: () => {
              nav.show(() => {
                window.location.href = sectionUrl(
                  slug,
                  "hospital_billing",
                  isHospital,
                );
              }, "Loading Hospital Billing...");
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

  if (isMobile) {
    const mobileNavItems: MobileNavItem[] = items
      .filter((i) => i.key !== "reviews" && i.key !== "appointments")
      .map((i) => ({
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
          activeKey={currentSection}
          onActiveKeyChange={handleActiveKeyChange}
          onLogoClick={() => {
            window.location.href = homeUrl(slug);
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
        items={items}
        activeKey=""
        onActiveKeyChange={handleActiveKeyChange}
        greeting={greetingContent}
        onLogoClick={() => {
          window.location.href = homeUrl(slug);
        }}
        onAdd={null}
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
