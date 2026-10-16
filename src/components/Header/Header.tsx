// components/Header/Header.tsx
import React, { useState, useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useTenant } from "../../contexts/TenantContext";
import { useWishlist } from "../../hooks/useWishlist";
import { useCustomerName } from "../../hooks/useCustomerName";
import { usePlan } from "../../hooks/usePlan";
import { MenuItem } from "../../types";
import LoginModal from "../Auth/LoginModal";
import UserManagement from "../Admin/UserManagement";
import AdminPanel from "../Admin/AdminPanel";
import StoreModal from "../Store/StoreModal";
import TenantManager from "../Admin/TenantManager";
import WishlistPanel from "../Menu/WishlistPanel";
import InfoPopup from "../Store/InfoPopup";
import PlanBadgeInline from "../Store/PlanBadgeInline";
import WishlistIcon from "../../assets/svgs/WishlistIcon";
import WishlistFilledIcon from "../../assets/svgs/WishlistFilledIcon";
import { Avatar, Badge, IconButton, Button } from "../ui";
import { MenuIcon, UsersIcon, StoreIcon } from "../../assets/svgs";
import { subscribeAdminAction, AdminAction } from "../../utils/adminEvents";
import ReviewsAdminModal from "../MainDashboard/ReviewsAdminModal";
import AdminNotificationsDrawer from "./AdminNotificationsDrawer";
import TenantNotificationsDrawer from "./TenantNotificationsDrawer";
import DineinNotificationsDrawer from "./DineinNotificationsDrawer";
import ReviewsModal from "../MainDashboard/Modals/ReviewsModal";
import DineinOrdersModal from "../MainDashboard/DineinOrdersModal";
import WelcomePopup from "../Auth/WelcomePopup";
import local from "./Header.module.scss";

interface HeaderProps {
  companyName: string;
  year: number;
  onWishlistItemClick?: (item: MenuItem) => void;
}

interface FocusDispute {
  disputeId: string;
  reviewId: string;
  outcome: "deleted" | "rejected";
  reviewItemName: string | null;
}

const AVATAR_COLORS = [
  "#3caa46", // primary green
  "#2563eb", // blue
  "#9333ea", // purple
  "#f59e0b", // amber
  "#dc3545", // red
  "#0f766e", // teal
  "#c2410c", // orange-brown
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

const Header: React.FC<HeaderProps> = ({
  companyName,
  year,
  onWishlistItemClick,
}) => {
  const {
    user,
    isAuthenticated,
    logout,
    isAdmin,
    isLoading: authLoading,
  } = useAuth();
  const { tenant, isDeactivated, isAdminView, isSmartAdminHost } = useTenant();
  const { count: wishlistCount } = useWishlist();
  const customerName = useCustomerName();
  const plan = usePlan();

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [isTenantManagerOpen, setIsTenantManagerOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
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

  const [welcome, setWelcome] = useState<{
    userName: string;
    storeName?: string;
  } | null>(null);

  const isForcedLogin =
    isAdminView &&
    !isAuthenticated &&
    !authLoading &&
    !isDeactivated &&
    !!tenant;

  useEffect(() => {
    if (isForcedLogin) {
      setIsLoginOpen(true);
    }
  }, [isForcedLogin]);

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
  const showWishlist = !!tenant && !isDeactivated && !isAdminView;
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

  const handleLogin = () => setIsLoginOpen(true);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      logout();
    }
  };

  const handleWishlistItemClick = (item: MenuItem) => {
    onWishlistItemClick?.(item);
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
            {showWishlist && !isAuthenticated && plan.canWishlist && (
              <div className={local.wishlistWrap}>
                <IconButton
                  variant="ghost"
                  size="md"
                  aria-label="Open wishlist"
                  tooltip="Wishlist"
                  onClick={() => setIsWishlistOpen(true)}
                >
                  {wishlistCount > 0 ? (
                    <WishlistFilledIcon width={20} height={20} fill="#e23744" />
                  ) : (
                    <WishlistIcon width={20} height={20} fill="#1e1e1e" />
                  )}
                </IconButton>
                {wishlistCount > 0 && (
                  <span className={local.wishlistBadge}>
                    {wishlistCount > 99 ? "99+" : wishlistCount}
                  </span>
                )}
              </div>
            )}

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
                      <MenuIcon width={20} height={20} color="#1e1e1e" />
                    </IconButton>

                    {plan.canManageUsers && isAdmin && (
                      <IconButton
                        variant="soft"
                        size="md"
                        aria-label="User Management"
                        tooltip="User Management"
                        onClick={() => setIsUserManagementOpen(true)}
                      >
                        <UsersIcon width={20} height={20} color="#1e1e1e" />
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
                  <Button size="xs" onClick={handleLogin}>
                    Sign In
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        forceOpen={isForcedLogin}
        onLoginSuccess={(info) => {
          setIsLoginOpen(false);
          setWelcome(info);
        }}
      />

      <WelcomePopup
        isOpen={!!welcome}
        userName={welcome?.userName ?? ""}
        storeName={welcome?.storeName}
        onDismiss={() => setWelcome(null)}
      />

      {isUserManagementOpen && tenant && isAdmin && (
        <UserManagement
          onClose={() => setIsUserManagementOpen(false)}
        />
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

      {plan.canWishlist && isWishlistOpen && (
        <WishlistPanel
          isOpen={isWishlistOpen}
          onClose={() => setIsWishlistOpen(false)}
          onItemClick={handleWishlistItemClick}
        />
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
