// src/components/Store/StoreBannerImage.tsx
import React, { useEffect, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { getCategoryDefaults } from "../../data/storeDefaults";
import styles from "./StoreBannerImage.module.scss";

interface StoreBannerImageProps {
  className?: string;
  hidden?: boolean;
}

/** Last-resort banner if every other source is empty. */
const HARD_FALLBACK =
  'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/assets/dinin.webp';

/**
 * Renders the tenant's banner image with a three-tier fallback:
 *   1. tenant.bannerUrl (owner-set or seeded default from ShopInfo)
 *   2. category-specific default from storeDefaults
 *   3. hardcoded Unsplash fallback
 *
 * Logs the resolved source once per mount when `?_debug=banner` is
 * present in the URL, so you can verify what the browser actually
 * received without touching production behaviour.
 */
const StoreBannerImage: React.FC<StoreBannerImageProps> = ({
  className,
  hidden = false,
}) => {
  const { tenant } = useTenant();

  const categoryFallback = getCategoryDefaults(tenant?.storeCategory).bannerUrl;

  // Three-tier resolution: tenant value - category default - hardcode.
  const primarySrc =
    (tenant?.bannerUrl && tenant.bannerUrl.trim()) ||
    (categoryFallback && categoryFallback.trim()) ||
    HARD_FALLBACK;

  const [src, setSrc] = useState<string>(primarySrc);

  useEffect(() => {
    setSrc(primarySrc);
  }, [primarySrc]);

  // Debug log - only fires when ?_debug=banner is set.
  useEffect(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get("_debug") === "banner") {
        // eslint-disable-next-line no-console
        console.log("[StoreBannerImage] resolution", {
          tenantExists: !!tenant,
          tenantSlug: tenant?.slug,
          tenantBannerUrl: tenant?.bannerUrl,
          tenantCategory: tenant?.storeCategory,
          categoryFallback,
          primarySrc,
          currentSrc: src,
        });
      }
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.slug, primarySrc, src]);

  if (hidden) return null;
  if (!src) {
    // Should never happen now (HARD_FALLBACK is non-empty), but
    // render an empty placeholder to avoid a silent crash.
    return (
      <div className={`${styles.bannerWrap} ${className ?? ""}`} aria-hidden />
    );
  }

  return (
    <div className={`${styles.bannerWrap} ${className ?? ""}`}>
      <img
        src={src}
        alt={`${tenant?.displayName ?? "Store"} banner`}
        loading="eager"
        decoding="async"
        onError={() => {
          // Fall through: tenant URL - category fallback - hardcode.
          if (
            tenant?.bannerUrl &&
            src !== categoryFallback &&
            categoryFallback
          ) {
            setSrc(categoryFallback);
            return;
          }
          if (src !== HARD_FALLBACK) {
            setSrc(HARD_FALLBACK);
            return;
          }
          // Nothing left to try. Leave the broken state so the issue
          // is visible rather than silently swallowed.
        }}
      />
    </div>
  );
};

export default StoreBannerImage;
