// src/apps/SuperAdminSectionApp.tsx
import React from "react";
import { useIsMobile } from "../hooks/useIsMobile";
import DashboardShell, {
  NavItem,
} from "../components/Dashboard/DashboardShell";
import MobileDashboardShell, {
  MobileNavItem,
  KebabItem,
} from "../components/Dashboard/MobileDashboardShell";
import AdminNotificationsDrawer from "../components/Header/AdminNotificationsDrawer";
import LoginModal from "../components/Auth/LoginModal";
import DashboardSkeleton from "../components/DashboardSkeleton/DashboardSkeleton";
import { authService } from "../services/auth.service";
import {
  StoreIcon,
  StarIcon,
  Special,
  UsersIcon,
  PowerIcon,
  InfoIcon,
} from "../assets/svgs";
import { IconButton } from "../components/ui";

const LOGO_URL =
  "https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png";

/** Map every section key to its own HTML page. */
const SECTION_PAGE: Record<string, string> = {
  stores: "superadmin-stores.html",
  reviews: "superadmin-reviews.html",
  plans: "plans.html",
  revenue: "superadmin-revenue.html",
  settings: "superadmin-settings.html",
};

interface Props {
  isAuthenticated: boolean;
  isLoading: boolean;
  isPlatformAdmin: boolean;
  sectionKey: string;
  children: React.ReactNode;
}

const navigateToSection = (key: string) => {
  const page = SECTION_PAGE[key];
  if (!page) return;
  window.location.href = `./${page}`;
};

const navigateTo = (page: string) => {
  const dir = window.location.pathname.replace(/\/[^/]*$/, '/');
  window.location.href = `${window.location.origin}${dir}${page}`;
};

const handleLogout = () => {
  if (!window.confirm("Log out?")) return;
  authService.logout();
  window.location.href = `${window.location.origin}/`;
};

const SuperAdminSectionApp: React.FC<Props> = ({
  isAuthenticated,
  isLoading,
  isPlatformAdmin,
  sectionKey,
  children,
}) => {
  const isMobile = useIsMobile(900);

  if (isLoading) {
    return <DashboardSkeleton count={6} hideHeader hideBrand hidePill />;
  }
  if (!isAuthenticated) {
    return (
      <>
        <div style={{ minHeight: "100vh", background: "#f8fafc" }} />
        <LoginModal isOpen={true} onClose={() => {}} forceOpen={true} />
      </>
    );
  }
  if (!isPlatformAdmin) {
    return (
      <div
        style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}
      >
        <div style={{ textAlign: "center" }}>
          <h2>Not authorized</h2>
          <p style={{ color: "#666" }}>
            This page is for platform administrators only.
          </p>
        </div>
      </div>
    );
  }

  // ── Nav items ──
  // Only the CURRENT section renders `children`. All other sections
  // navigate away, so their `render` is null.
  const navItems: NavItem[] = [
    {
      key: "stores",
      label: "Stores",
      icon: <StoreIcon width={22} height={22} fill="currentColor" />,
      render: sectionKey === "stores" ? () => children : () => null,
    },
    {
      key: "reviews",
      label: "Reviews",
      icon: <StarIcon width={22} height={22} fill="currentColor" />,
      render: sectionKey === "reviews" ? () => children : () => null,
    },
    {
      key: "plans",
      label: "Plans",
      icon: <Special width={22} height={22} />,
      render: sectionKey === "plans" ? () => children : () => null,
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: <InfoIcon width={22} height={22} fill="currentColor" />,
      render: sectionKey === "revenue" ? () => children : () => null,
    },
    {
      key: "settings",
      label: "Settings",
      icon: <UsersIcon width={22} height={22} fill="currentColor" />,
      render: sectionKey === "settings" ? () => children : () => null,
    },
  ];

  const handleActiveKeyChange = (key: string) => {
    if (!key) {
      window.location.href = "./superadmin.html";
      return;
    }
    if (key === sectionKey) return;
    navigateToSection(key);
  };

  const kebabItems: KebabItem[] = [
    {
      kind: "action",
      key: "settings",
      label: "Global Settings",
      icon: <UsersIcon width={18} height={18} fill="#1e7e34" />,
      onClick: () => navigateToSection("settings"),
    },
    { kind: "divider" },
    {
      kind: "action",
      key: "logout",
      label: "Logout",
      icon: <PowerIcon width={18} height={18} fill="#a62d2d" />,
      onClick: handleLogout,
    },
  ];

  const notificationsSlot = (
    <AdminNotificationsDrawer
      onOpenDispute={() => navigateToSection("reviews")}
    />
  );

  if (isMobile) {
    const mobileNavItems: MobileNavItem[] = navItems.map((i) => ({
      key: i.key,
      label: i.label,
      icon: i.icon,
      render: i.render, // ← preserve, not () => null
      visible: true,
    }));

    return (
      <MobileDashboardShell
        logoUrl={LOGO_URL}
        roleLabel="Super Admin"
        navItems={mobileNavItems}
        activeKey={sectionKey}
        onActiveKeyChange={handleActiveKeyChange}
        onLogoClick={() => (window.location.href = "./superadmin.html")}
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
      onLogoClick={() => (window.location.href = "./superadmin.html")}
      footer={{
  notifications: notificationsSlot,
  kebabItems: [
    {
      key: 'settings',
      label: 'Global Settings',
      icon: <UsersIcon width={18} height={18} fill="#1e7e34" />,
      onClick: () => navigateTo('superadmin-settings.html'),
    },
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

export default SuperAdminSectionApp;
