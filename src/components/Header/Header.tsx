// components/Header/Header.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTenant } from "../../contexts/TenantContext";
import { useCustomerName } from "../../hooks/useCustomerName";
import { usePlan } from "../../hooks/usePlan";
import UserManagement from "../Admin/UserManagement";
import AdminPanel from "../Admin/AdminPanel";
import StoreModal from "../Store/StoreModal";
import TenantManager from "../Admin/TenantManager";
import InfoPopup from "../Store/InfoPopup";
import PlanBadgeInline from "../Store/PlanBadgeInline";
import { Avatar, Badge, IconButton, Button } from "../ui";
import { MenuIcon, UsersIcon, StoreIcon } from "../../assets/svgs";
import { subscribeAdminAction, AdminAction } from "../../utils/adminEvents";
import ReviewsAdminModal from "../MainDashboard/ReviewsAdminModal";
import AdminNotificationsDrawer from "./AdminNotificationsDrawer";
import TenantNotificationsDrawer from "./TenantNotificationsDrawer";
import DineinNotificationsDrawer from "./DineinNotificationsDrawer";
import ReviewsModal from "../MainDashboard/Modals/ReviewsModal";
import DineinOrdersModal from "../MainDashboard/DineinOrdersModal";
import local from "./Header.module.scss";

interface HeaderProps {
  companyName: string;
  year: number;
}

interface FocusDispute {
  disputeId: string;
  reviewId: string;
  outcome: "deleted" | "rejected";
  reviewItemName: string | null;
}

const AVATAR_COLORS = [
  "#3caa46",
  "#2563eb",
  "#9333ea",
  "#f59e0b",
  "#dc3545",
  "#0f766e",
  "#c2410c",
] as const;

const colorForSlug = (slug: string | undefined): string => {
  if (!slug) return AVATAR_COLORS[0];
  let hash = 5381;
  for (let i = 0; i < slug.length; i++) {
    hash = ((hash << 5) + hash) ^ slug.charCodeAt(i);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const Header: React.FC<HeaderProps> = ({ companyName, year }) => {
  const {
    user,
    isAuthenticated,
    logout,
    isAdmin,
    isLoading: authLoading,
  } = useAuth();
  const { tenant, isDeactivated, isAdminView, isSmartAdminHost } = useTenant();
  const customerName = useCustomerName();
  const plan = usePlan();

  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isTenantManagerOpen, setIsTenantManagerOpen] = useState(false);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const [isReviewsOpen, setIsReviewsOpen] = useState(false);

  const [isReviewsModalOpen, setIsReviewsModalOpen] = useState(false);
  const [focusDisputeId, setFocusDisputeId] = useState<string | null>(null);

  const [focusDisputeOutcome, setFocusDisputeOutcome] =
    useState<FocusDispute | null>(null);

  const [isDineinOrdersOpen, setIsDineinOrdersOpen] = useState(false);
  const [focusDineinOrderId, setFocusDineinOrderId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const unsubscribe = subscribeAdminAction((action: AdminAction) => {
      switch (action) {
        case "open-menu-panel":
          setIsMenuPanelOpen(true);
          break;
        case "open-store-settings":
          setIsStoreModalOpen(true);
          break;
        case "open-user-management":
          if (isAdmin) setIsUserManagementOpen(true);
          break;
        case "open-info-popup":
          if (isAdmin) setIsInfoOpen(true);
          break;
        case "open-tenant-manager":
          setIsTenantManagerOpen(true);
          break;
        case "open-reviews":
          if (isAdmin) setIsReviewsOpen(true);
          break;
        case "open-orders":
          setIsDineinOrdersOpen(true);
          break;
      }
    });
    return unsubscribe;
  }, [isAdmin]);

  const shouldHideHeader = !tenant && !isSmartAdminHost;

  const isPlatformAdmin = !!user?.isPlatformAdmin;
  const isPlatformAdminViewingTenant = isPlatformAdmin && !!tenant;
  const isPlatformAdminOnHost = isPlatformAdmin && !tenant;

  const canManageTenant = isAuthenticated && !!tenant && !isDeactivated;
  const showAdminAvatar = isAuthenticated && !!tenant && !isDeactivated;

  const isAdminContext = isSmartAdminHost || isAdminView;
  const hasCustomerName = !isAuthenticated && customerName.trim().length > 0;

  const showPlatformBell = isAuthenticated && isPlatformAdminOnHost;
  const showTenantBell =
    isAuthenticated &&
    isAdmin &&
    !!tenant &&
    !isDeactivated &&
    !isPlatformAdmin &&
    plan.canReview;

  const showDineinBell =
    isAuthenticated &&
    isAdmin &&
    !!tenant &&
    tenant.dineinEnabled === true &&
    !isPlatformAdmin;

  const showLogout = isAuthenticated && !isPlatformAdminViewingTenant;

  const showSignIn =
    !isAuthenticated &&
    (!tenant || isAdminView || isSmartAdminHost) &&
    !authLoading;

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  const avatarInitial = (() => {
    const storeName = tenant?.displayName?.trim();
    if (storeName && storeName.length > 0) {
      return storeName.charAt(0).toUpperCase();
    }
    const userName = user?.name?.trim();
    if (userName && userName.length > 0) {
      return userName.charAt(0).toUpperCase();
    }
    return "?";
  })();

  const renderBrandText = () => {
    if (isAuthenticated && user?.name) {
      return (
        <>
          <span className={local.tagline}>{user.name}</span>
          {tenant &&
            !isPlatformAdminOnHost &&
            (isAdmin ? (
              <PlanBadgeInline onClick={() => setIsInfoOpen(true)} />
            ) : (
              <PlanBadgeInline />
            ))}
        </>
      );
    }

    if (isAdminContext) {
      if (isSmartAdminHost && !tenant) {
        return (
          <span className={local.companyName}>
            {companyName} {year}
          </span>
        );
      }
      return (
        <span className={local.companyName}>
          {tenant ? tenant.displayName : `${companyName} ${year}`}
        </span>
      );
    }

    if (hasCustomerName) {
      return (
        <span className={local.customerGreeting}>
          Hey! <strong>{customerName}</strong>
        </span>
      );
    }

    return (
      <span className={local.companyName}>
        {tenant ? tenant.displayName : `${companyName} ${year}`}
      </span>
    );
  };

  if (shouldHideHeader) return null;

  return (
    <>
      <div className={local.bm_header}>
        <div className={local.container}>
          <div className={local.brand}>
            {showAdminAvatar && (
              <span className={local.avatarWrap}>
                <Avatar
                  name={avatarInitial}
                  src={isAdmin ? tenant?.avatarUrl || undefined : undefined}
                  role={isAdmin ? "admin" : "staff"}
                  size="md"
                  onClick={isAdmin ? () => setIsInfoOpen(true) : undefined}
                />
                <span
                  className={`${local.roleBadge} ${
                    isAdmin ? local.roleBadgeAdmin : local.roleBadgeStaff
                  }`}
                >
                  {isAdmin ? "Admin" : "Staff"}
                </span>
              </span>
            )}
            {!isAuthenticated && (
              <span className={local.brandText}>{renderBrandText()}</span>
            )}

            {isSmartAdminHost && !tenant && (
              <Badge tone="info" size="sm">
                Smart Admin
              </Badge>
            )}

            {isAdminView && tenant && !isAuthenticated && (
              <Badge tone="warning" size="sm">
                Admin
              </Badge>
            )}
          </div>

          <div className={local.actions}>
            {isAuthenticated ? (
              <>
                {canManageTenant && (
                  <>
                    {plan.canManageStore && (
                      <IconButton
                        variant="soft"
                        size="md"
                        aria-label="Store Settings"
                        tooltip="Store Settings"
                        onClick={() => setIsStoreModalOpen(true)}
                      >
                        <StoreIcon width={20} height={20} fill="#1e1e1e" />
                      </IconButton>
                    )}

                    <IconButton
                      variant="soft"
                      size="md"
                      aria-label="Manage Menu"
                      tooltip="Manage Menu"
                      onClick={() => setIsMenuPanelOpen(true)}
                    >
                      <MenuIcon width={20} height={20} fill="#1e1e1e" />
                    </IconButton>

                    {plan.canManageUsers && isAdmin && (
                      <IconButton
                        variant="soft"
                        size="md"
                        aria-label="User Management"
                        tooltip="User Management"
                        onClick={() => setIsUserManagementOpen(true)}
                      >
                        <UsersIcon width={20} height={20} fill="#1e1e1e" />
                      </IconButton>
                    )}
                  </>
                )}

                {showPlatformBell && (
                  <AdminNotificationsDrawer
                    onOpenDispute={(disputeId) => {
                      setFocusDisputeId(disputeId);
                      setIsReviewsModalOpen(true);
                    }}
                  />
                )}

                {showTenantBell && (
                  <TenantNotificationsDrawer
                    onOpenReview={(n) => {
                      setFocusDisputeOutcome({
                        disputeId: n.disputeId,
                        reviewId: n.reviewId,
                        outcome: n.outcome,
                        reviewItemName: n.reviewItemName,
                      });
                      setIsReviewsOpen(true);
                    }}
                  />
                )}

                {showDineinBell && (
                  <DineinNotificationsDrawer
                    onOpenOrder={(orderId: string) => {
                      setFocusDineinOrderId(orderId);
                      setIsDineinOrdersOpen(true);
                    }}
                  />
                )}

                {isPlatformAdminViewingTenant && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setIsTenantManagerOpen(true)}
                    leftIcon={
                      <StoreIcon width={16} height={16} fill="#1e1e1e" />
                    }
                  >
                    Stores
                  </Button>
                )}

                {showLogout && (
                  <Button size="sm" variant="danger" onClick={handleLogout}>
                    Logout
                  </Button>
                )}
              </>
            ) : (
              <>
                {showSignIn && (
                  <Button
                    size="xs"
                    onClick={() => {
                      // App.tsx owns the forced-login flow. Dispatch an
                      // event so the app can open its own modal.
                      window.dispatchEvent(new Event("app:open-login"));
                    }}
                  >
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modals opened by the header - kept only for admin-mobile,
          where the shell doesn't render. */}
      {isUserManagementOpen && tenant && isAdmin && (
        <UserManagement onClose={() => setIsUserManagementOpen(false)} />
      )}

      {isMenuPanelOpen && (
        <AdminPanel onClose={() => setIsMenuPanelOpen(false)} />
      )}

      {isReviewsOpen && isAdmin && (
        <ReviewsAdminModal
          onClose={() => {
            setIsReviewsOpen(false);
            setFocusDisputeOutcome(null);
          }}
          focusDispute={focusDisputeOutcome}
        />
      )}

      <StoreModal
        isOpen={isStoreModalOpen}
        onClose={() => setIsStoreModalOpen(false)}
      />

      {isTenantManagerOpen && (
        <TenantManager onClose={() => setIsTenantManagerOpen(false)} />
      )}

      {showAdminAvatar && isAdmin && isInfoOpen && (
        <InfoPopup isOpen={isInfoOpen} onClose={() => setIsInfoOpen(false)} />
      )}

      {isReviewsModalOpen && (
        <ReviewsModal
          isOpen={isReviewsModalOpen}
          onClose={() => {
            setIsReviewsModalOpen(false);
            setFocusDisputeId(null);
          }}
          initialDisputeId={focusDisputeId}
        />
      )}

      {isDineinOrdersOpen && tenant && isAdmin && (
        <DineinOrdersModal
          isOpen={isDineinOrdersOpen}
          onClose={() => {
            setIsDineinOrdersOpen(false);
            setFocusDineinOrderId(null);
          }}
          focusOrderId={focusDineinOrderId}
          mode="admin"
        />
      )}
    </>
  );
};

export default Header;