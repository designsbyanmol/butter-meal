// components/Home/shared/SiteHeader.tsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "../../ui";
import { RightArrow } from "../../../assets/svgs";
import local from "../HomePage.module.scss";

interface SiteHeaderProps {
  mobileNavOpen: boolean;
  onToggleNav: () => void;
  onCloseNav: () => void;
  onStoreLogin: () => void;
}

const NAV_LINKS = [
  { label: "Who It's For", href: "#audience" },
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#workflow" },
  { label: "Plans", href: "#plans" },
  { label: "FAQ", href: "#faq" },
];

const LOAD_DELAY = 2000;
const HEADER_OFFSET = 140;

const SiteHeader: React.FC<SiteHeaderProps> = ({
  mobileNavOpen,
  onToggleNav,
  onCloseNav,
  onStoreLogin,
}) => {
  const [activeHref, setActiveHref] = useState<string>("");
  const [loadingHref, setLoadingHref] = useState<string | null>(null);

  const lockRef = useRef(false);
  const lockTimer = useRef<number | null>(null);

  // Recompute which section is currently active based on the viewport anchor
  // Recompute which section is currently active based on the viewport anchor
  const computeActive = useCallback(() => {
    const ids = NAV_LINKS.map((l) => l.href.replace("#", ""));
    const anchor = window.scrollY + HEADER_OFFSET;

    // If we're at/above the very top, highlight nothing
    const firstEl = document.getElementById(ids[0]);
    if (firstEl) {
      const firstTop = firstEl.getBoundingClientRect().top + window.scrollY;
      if (anchor < firstTop) {
        setActiveHref("");
        return;
      }
    }

    let active = "";
    let smallest = Infinity;

    for (const id of ids) {
      const el = document.getElementById(id);
      if (!el) continue;

      const top = el.getBoundingClientRect().top + window.scrollY;
      const bottom = top + el.offsetHeight;

      // Section spans the anchor? That's the active one.
      if (anchor >= top && anchor < bottom) {
        active = `#${id}`;
        smallest = 0;
        break;
      }

      // Otherwise pick the section whose top is closest above the anchor.
      const distance = anchor - top;
      if (distance >= 0 && distance < smallest) {
        smallest = distance;
        active = `#${id}`;
      }
    }

    // No section above the anchor → nothing active
    if (!active) {
      setActiveHref("");
      return;
    }

    setActiveHref(active);
  }, []);

  // Scroll-spy: runs on scroll, resize, and initial mount
  useEffect(() => {
    const onScroll = () => {
      if (lockRef.current) return;
      computeActive();
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [computeActive]);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    if (loadingHref) return;

    lockRef.current = true;
    if (lockTimer.current) window.clearTimeout(lockTimer.current);

    setLoadingHref(href);
    setActiveHref(href);

    window.setTimeout(() => {
      onCloseNav();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // Give the smooth scroll time to finish, then unlock and re-sync.
      lockTimer.current = window.setTimeout(() => {
        lockRef.current = false;
        setLoadingHref(null);
        computeActive();
      }, 700);
    }, LOAD_DELAY);
  };

  useEffect(
    () => () => {
      if (lockTimer.current) window.clearTimeout(lockTimer.current);
    },
    [],
  );

  return (
    <div className={local.header}>
      <div className={local.headerInner}>
        <a
          className={local.headerBrand}
          onClick={(e) => {
            e.preventDefault();
            onCloseNav();
            window.scrollTo({ top: 0, behavior: "smooth" });
            setActiveHref("");
          }}
        >
          <img
            src="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/dozzelo-full-logo.webp"
            alt="Dozzelo - Powered by Teckut"
            className={local.brandLogo}
            draggable={false}
            height={60}
            width={60}
          />
        </a>

        <nav className={`${local.nav}`}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={`${local.navLink} ${
                activeHref === l.href ? local.navLinkActive : ""
              } ${loadingHref === l.href ? local.navLinkLoading : ""}`}
              onClick={(e) => handleNavClick(e, l.href)}
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className={local.headerActions}>
          <Button
            size="sm"
            variant="ghost"
            shape="pill"
            onClick={onStoreLogin}
            rightIcon={<RightArrow width={14} height={14} fill="#0F172A" />}
          >
            Store Login
          </Button>
        </div>

        <button
          type="button"
          className={local.burger}
          onClick={onToggleNav}
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
        >
          <span
            className={`${local.burgerLine} ${
              mobileNavOpen ? local.burgerLineOpenTop : ""
            }`}
          />
          <span
            className={`${local.burgerLine} ${
              mobileNavOpen ? local.burgerLineOpenMid : ""
            }`}
          />
          <span
            className={`${local.burgerLine} ${
              mobileNavOpen ? local.burgerLineOpenBot : ""
            }`}
          />
        </button>
      </div>

      {mobileNavOpen && (
        <div className={local.mobileNav}>
          {NAV_LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className={`${local.mobileNavLink} ${
                activeHref === l.href ? local.mobileNavLinkActive : ""
              } ${loadingHref === l.href ? local.mobileNavLinkLoading : ""}`}
              onClick={(e) => handleNavClick(e, l.href)}
            >
              {l.label}
            </a>
          ))}
          <Button
            block
            onClick={onStoreLogin}
            rightIcon={<RightArrow width={16} height={16} fill="#fff" />}
          >
            Store Login
          </Button>
        </div>
      )}

      {loadingHref && (
        <div className={local.navLoader} role="status" aria-live="polite">
          <div className={local.navLoaderBar} />
        </div>
      )}
    </div>
  );
};

export default SiteHeader;
