// src/components/Dinein/CustomerOrderStatus.tsx
import React, { useEffect, useRef, useState } from "react";
import { useTenant } from "../../contexts/TenantContext";
import { supabaseService } from "../../services/supabase.service";
import { getEffectiveDeviceId } from "../../utils/deviceId";
import CustomerRequestBillButton from "../Header/CustomerRequestBillButton";
import { MinusIcon, DownloadIcon, CopyIcon } from "../../assets/svgs";
import { DineinOrder } from "../../types";
import { buildUpiUri } from "../../utils/upiQr";
import { downloadBillPdf } from "../../utils/billPdf";
import { Button, Banner, Sheet, ConfirmDialog } from "../ui";
import {
  PendingItem,
  getPendingItemsForOrder,
  removePendingItem,
  remainingMs,
  subscribePendingItems,
} from "../../utils/dineinPendingItems";
import local from "./CustomerOrderStatus.module.scss";

const POLL_MS_ACTIVE = 15_000;
const POLL_MS_BILL = 30_000;
const POLL_MS_TERMINAL = 120_000;

const ACTIVE_ORDER_KEY_PREFIX = "dinein-active-order::";

const ACTIVE_SET = new Set<string>([
  "placed",
  "accepted",
  "preparing",
  "served",
  "bill_requested",
  "paid",
]);

const STAGE_COPY: Record<string, string> = {
  placed: "Order Placed - will be accepted soon",
  accepted: "Order Accepted",
  preparing: "Order is getting prepared",
  served: "Order Served - Enjoy!",
  cancelled: "Order could not be accepted",
};

const TIP_OPTIONS = [10, 20, 50, 100, 150];
const MIN_SERVE_MINUTES = 15;

const formatElapsed = (totalSec: number): string => {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(sec)}s`;
  if (m > 0) return `${m}m ${pad(sec)}s`;
  return `${sec}s`;
};

const secondsBetween = (fromIso?: string, toIso?: string): number => {
  if (!fromIso || !toIso) return 0;
  const a = new Date(fromIso).getTime();
  const b = new Date(toIso).getTime();
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0;
  return Math.max(0, Math.floor((b - a) / 1000));
};

const prepEtaCopy = (itemsCount: number): string => {
  if (itemsCount > 15) {
    return "please be patient - your items will be served as early as possible";
  }
  const minutes =
    itemsCount <= 5
      ? MIN_SERVE_MINUTES
      : itemsCount <= 10
        ? MIN_SERVE_MINUTES + 5
        : MIN_SERVE_MINUTES + 10;
  return `will be served in ~${minutes} min`;
};

const rupees = (n: number): string =>
  `Rs ${Number(n).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;

type PayFlowState = "idle" | "awaiting" | "awaiting_no_vpa" | "failed";

const CustomerOrderStatus: React.FC = () => {
  const { tenant } = useTenant();

  const [deviceId] = useState<string>(() => getEffectiveDeviceId());
  const storageKey = `${ACTIVE_ORDER_KEY_PREFIX}${deviceId}`;

  const [order, setOrder] = useState<DineinOrder | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  const [isItemsOpen, setIsItemsOpen] = useState(false);
  const [isUpiSheetOpen, setIsUpiSheetOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [payFlow, setPayFlow] = useState<PayFlowState>("idle");
  const [payBusy, setPayBusy] = useState(false);
  const [payError, setPayError] = useState("");
  const [pendingItems, setPendingItems] = useState<PendingItem[]>([]);
  const [, setCountdownTick] = useState(0);
  const [pendingToRemove, setPendingToRemove] = useState<PendingItem | null>(
    null,
  );

  const lastUpdatedRef = useRef<string | null>(null);
  const missingStreakRef = useRef(0);

  const clearLocalState = () => {
    setOrder(null);
    setIsVisible(false);
    setIsMinimized(false);
    setIsItemsOpen(false);
    setIsUpiSheetOpen(false);
    setPayFlow("idle");
    setPayError("");
    lastUpdatedRef.current = null;
  };

  const hideBanner = () => {
    clearLocalState();
    missingStreakRef.current = 0;
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* ignore */
    }
  };

  const load = async () => {
    if (!tenant?.dineinEnabled) return;

    let activeId: string | null = null;
    try {
      activeId = sessionStorage.getItem(storageKey);
    } catch {
      /* ignore */
    }

    if (!activeId) {
      if (order) clearLocalState();
      return;
    }

    let fresh: DineinOrder | null = null;
    try {
      fresh = await supabaseService.getDineinOrderById(activeId);
    } catch (err) {
      console.warn("[customer-order-status] fetch failed:", err);
      return;
    }

    if (!fresh) {
      missingStreakRef.current += 1;
      if (missingStreakRef.current >= 2) {
        hideBanner();
      }
      return;
    }
    missingStreakRef.current = 0;

    if (!ACTIVE_SET.has(fresh.status)) {
      hideBanner();
      return;
    }

    if (fresh.updatedAt !== lastUpdatedRef.current) {
      lastUpdatedRef.current = fresh.updatedAt;
      setOrder(fresh);
      setIsVisible(true);
    }
  };

  useEffect(() => {
    if (!tenant?.dineinEnabled) return;

    let cancelled = false;
    let timer: number | null = null;

    const nextDelay = (): number => {
      const s = order?.status;
      if (
        s === "placed" ||
        s === "accepted" ||
        s === "preparing" ||
        s === "served"
      ) {
        return POLL_MS_ACTIVE;
      }
      if (s === "bill_requested") return POLL_MS_BILL;
      if (s === "paid") return POLL_MS_TERMINAL;
      return POLL_MS_ACTIVE;
    };

    const schedule = () => {
      if (cancelled) return;
      timer = window.setTimeout(async () => {
        if (cancelled) return;
        if (typeof document !== "undefined" && document.hidden) {
          schedule();
          return;
        }
        await load();
        schedule();
      }, nextDelay());
    };

    void load().finally(schedule);

    const onVisibility = () => {
      if (document.hidden) return;
      if (timer !== null) window.clearTimeout(timer);
      void load().finally(schedule);
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer !== null) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenant?.dineinEnabled, deviceId, order?.status]);

  useEffect(() => {
    const onLocal = () => {
      void load();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === storageKey) void load();
    };
    const onCustom = (e: Event) => {
      void (e as CustomEvent).detail;
      void load();
    };

    window.addEventListener("focus", onLocal);
    window.addEventListener("storage", onStorage);
    window.addEventListener("dinein-active-order-changed", onCustom);

    return () => {
      window.removeEventListener("focus", onLocal);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("dinein-active-order-changed", onCustom);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!order) {
      setPendingItems([]);
      return;
    }
    const refresh = () => {
      setPendingItems(getPendingItemsForOrder(order.id));
    };
    refresh();
    return subscribePendingItems(refresh);
  }, [order?.id]);

  useEffect(() => {
    if (!isItemsOpen) return;
    const id = window.setInterval(() => setCountdownTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isItemsOpen]);

  useEffect(() => {
    if (!order) return;
    const ref =
      order.status === "served"
        ? order.servedAt
        : order.status === "preparing"
          ? order.preparingAt
          : order.status === "accepted"
            ? order.acceptedAt
            : order.createdAt;
    const ts = ref ? new Date(ref).getTime() : Date.now();
    setElapsedSec(Math.max(0, Math.floor((Date.now() - ts) / 1000)));
  }, [order?.id, order?.status]);

  useEffect(() => {
    if (!isVisible || !order) return;
    if (order.status !== "placed") return;
    const id = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(id);
  }, [isVisible, order?.status, order?.id]);

  useEffect(() => {
    if (!order) return;
    if (order.status !== "bill_requested" && order.status !== "paid") {
      setPayFlow("idle");
      setPayError("");
      setIsUpiSheetOpen(false);
    }
  }, [order?.status]);

  const itemsCount = order
    ? order.items.reduce((s, i) => s + i.quantity, 0) +
      pendingItems.reduce((s, p) => s + p.item.quantity, 0)
    : 0;

  const timeToAcceptSec = order
    ? secondsBetween(order.createdAt, order.acceptedAt)
    : 0;

  if (!order || !isVisible) return null;

  const elapsedCopy =
    order.status === "accepted" && order.acceptedAt
      ? `in ${formatElapsed(timeToAcceptSec)}`
      : "";

  const headline = (() => {
    switch (order.status) {
      case "accepted":
        return `Order Accepted ${elapsedCopy}`;
      case "preparing":
        return `Order is getting prepared - ${prepEtaCopy(itemsCount)}`;
      case "bill_requested":
        return order.payOnline
          ? "Bill ready - pay online to close your order"
          : "Bill Requested - the bill will be brought to your table";
      case "paid":
        return "Thanks for taking our service and have a nice day.";
      default:
        return STAGE_COPY[order.status] ?? "Order in progress";
    }
  })();

  const stageLine = (() => {
    switch (order.status) {
      case "placed":
        return `Waiting · ${formatElapsed(elapsedSec)}`;
      case "accepted":
        return `Accepted in ${formatElapsed(timeToAcceptSec)}`;
      case "preparing":
        return "Preparing";
      case "served":
        return "Served";
      case "bill_requested":
        if (!order.payOnlineRequested) return "Waiting for the bill";
        if (!order.payOnline)
          return "Waiting for staff to confirm online payment";
        return "Waiting for online payment";
      case "paid":
        return "Paid";
      case "cancelled":
        return "Cancelled";
      default:
        return "";
    }
  })();

  const openUpiSheet = () => {
    if (!tenant?.upiId) {
      setPayError("");
      setPayFlow("awaiting_no_vpa");
      return;
    }
    setCopied(false);
    setPayError("");
    setIsUpiSheetOpen(true);
  };

  const fireUpiDeepLink = () => {
    if (!tenant?.upiId || !order) return;
    const uri = buildUpiUri({
      payeeVpa: tenant.upiId,
      payeeName: tenant.displayName,
      amount: order.totalAmount,
      note: `Order ${order.orderNo} bill`,
      txnRef: order.orderNo,
    });
    try {
      const a = document.createElement("a");
      a.href = uri;
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch {
      try {
        window.location.href = uri;
      } catch {
        /* ignore */
      }
    }
    setIsUpiSheetOpen(false);
    setPayFlow("awaiting");
  };

  const copyUpiId = async () => {
    if (!tenant?.upiId) return;
    try {
      await navigator.clipboard.writeText(tenant.upiId);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const copyAmount = async () => {
    if (!order) return;
    try {
      await navigator.clipboard.writeText(String(order.totalAmount));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  const handleConfirmPaid = async () => {
    if (!order) return;
    setPayBusy(true);
    setPayError("");
    try {
      const updated = await supabaseService.claimDineinPayment(order.id);
      if (!updated) throw new Error("Could not record payment");
      setOrder(updated);
      lastUpdatedRef.current = updated.updatedAt;
      setPayFlow("idle");
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Failed to record payment",
      );
    } finally {
      setPayBusy(false);
    }
  };

  const handlePaymentFailed = () => {
    setPayFlow("failed");
    setPayError("");
  };

  const handleRetry = () => {
    setPayFlow("idle");
    openUpiSheet();
  };

  const handleSettleOffline = async () => {
    if (!order) return;
    setPayBusy(true);
    setPayError("");
    try {
      const updated = await supabaseService.setDineinSettleOffline(order.id);
      if (!updated) throw new Error("Could not switch to offline");
      setOrder(updated);
      lastUpdatedRef.current = updated.updatedAt;
      setPayFlow("idle");
    } catch (err) {
      setPayError(
        err instanceof Error ? err.message : "Could not switch to offline",
      );
    } finally {
      setPayBusy(false);
    }
  };

  const handleDownloadBill = () => {
    if (!tenant || !order) return;
    downloadBillPdf(order, {
      displayName: tenant.displayName,
      storeTagline: tenant.storeTagline,
      gstPercent: tenant.gstPercent,
    });
  };

  const handleEndOrder = async () => {
    if (!order) return;
    await supabaseService.endDineinOrder(order.id);
    hideBanner();
  };

  const handleSelectTip = async (amount: number) => {
    if (!order) return;
    if (
      order.status !== "served" &&
      order.status !== "preparing" &&
      order.status !== "accepted" &&
      order.status !== "placed"
    ) {
      return;
    }
    const current = order.staffTip ?? 0;
    const next = current === amount ? 0 : amount;
    setPayBusy(true);
    setPayError("");
    try {
      const updated = await supabaseService.setDineinStaffTip(order.id, next);
      if (!updated) throw new Error("Failed to update tip");
      setOrder(updated);
      lastUpdatedRef.current = updated.updatedAt;
    } catch (err) {
      setPayError(err instanceof Error ? err.message : "Failed to update tip");
    } finally {
      setPayBusy(false);
    }
  };

  const renderActions = () => {
    if (
      order.status === "placed" ||
      order.status === "accepted" ||
      order.status === "preparing"
    ) {
      return (
        <div className={local.bannerBtnRow}>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsItemsOpen(true)}
          >
            View Order
          </Button>
        </div>
      );
    }

    if (order.status === "served" && !order.billRequested) {
      const tip = order.staffTip ?? 0;
      return (
        <div className={local.bannerTipBlock}>
          {tenant?.staffTippingEnabled && (
            <>
              <div className={local.tipLabel}>
                Add a tip for the staff serving you
              </div>
              <div className={local.tipRow}>
                {TIP_OPTIONS.map((amount) => (
                  <button
                    key={amount}
                    type="button"
                    className={`${local.tipPill} ${
                      tip === amount ? local.tipPillActive : ""
                    }`}
                    disabled={payBusy}
                    onClick={() => handleSelectTip(amount)}
                  >
                    +{amount}
                  </button>
                ))}
              </div>
              {tip > 0 && (
                <div className={local.tipSelectedNote}>
                  Rs {tip} tip will be added to your total
                </div>
              )}
            </>
          )}
          <div className={local.bannerBtnRow}>
            <CustomerRequestBillButton forceVisible orderId={order.id} />
          </div>
        </div>
      );
    }

    if (order.status === "bill_requested") {
      if (!order.payOnlineRequested) {
        return (
          <div className={local.bannerNote}>
            Waiting for staff to bring the bill...
          </div>
        );
      }

      if (!order.payOnline) {
        return (
          <div className={local.bannerNote}>
            Waiting for staff to confirm online payment...
          </div>
        );
      }

      if (order.customerPaidClaimed) {
        return (
          <div className={local.bannerNote}>
            Payment recorded - waiting for the staff to verify...
          </div>
        );
      }

      if (payFlow === "idle") {
        const tip = order.staffTip ?? 0;
        const baseAmount = order.totalAmount - tip;
        return (
          <div className={local.bannerConfirmBlock}>
            <div className={local.bannerBtnRow}>
              <Button size="sm" onClick={openUpiSheet}>
                Pay {rupees(order.totalAmount)}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDownloadBill}
                leftIcon={<DownloadIcon width={14} height={14} fill="#fff" />}
              >
                Download Bill
              </Button>
            </div>
            {tip > 0 && (
              <div className={local.bannerBreakdown}>
                Rs {baseAmount} (Items + GST) + Rs {tip} Tip
              </div>
            )}
          </div>
        );
      }

      if (payFlow === "awaiting_no_vpa") {
        return (
          <div className={local.bannerConfirmBlock}>
            <div className={local.bannerNote}>
              The store hasn't set up their UPI ID yet. Please ask the
              staff for the bill.
            </div>
            <div className={local.bannerBtnRow}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPayFlow("idle")}
              >
                Back
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSettleOffline}
                loading={payBusy}
              >
                Settle Offline
              </Button>
            </div>
          </div>
        );
      }

      if (payFlow === "awaiting") {
        return (
          <div className={local.bannerConfirmBlock}>
            <div className={local.bannerNote}>Did the payment go through?</div>
            <div className={local.bannerBtnRow}>
              <Button
                size="sm"
                variant="success"
                onClick={handleConfirmPaid}
                loading={payBusy}
              >
                Yes, I've paid
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handlePaymentFailed}
                disabled={payBusy}
              >
                Payment failed
              </Button>
            </div>
            {payError && (
              <Banner variant="error" inline onDismiss={() => setPayError("")}>
                {payError}
              </Banner>
            )}
          </div>
        );
      }

      if (payFlow === "failed") {
        return (
          <div className={local.bannerConfirmBlock}>
            {payError && (
              <Banner variant="error" inline onDismiss={() => setPayError("")}>
                {payError}
              </Banner>
            )}
            <div className={local.bannerBtnRow}>
              <Button size="sm" onClick={handleRetry}>
                Retry
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSettleOffline}
                loading={payBusy}
              >
                Settle Offline
              </Button>
            </div>
          </div>
        );
      }
    }

    if (order.status === "paid") {
      return (
        <div className={local.bannerBtnRow}>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleDownloadBill}
            leftIcon={<DownloadIcon width={14} height={14} fill="#fff" />}
          >
            Download Bill
          </Button>
          <Button size="sm" onClick={handleEndOrder}>
            End Order
          </Button>
        </div>
      );
    }

    return null;
  };

  const minimizedLabel = (() => {
    switch (order.status) {
      case "placed":
        return "New";
      case "accepted":
        return "Accepted";
      case "preparing":
        return "Preparing";
      case "served":
        return "Served";
      case "bill_requested":
        return "Bill Req.";
      case "paid":
        return "Paid";
      case "cancelled":
        return "Cancelled";
      default:
        return "";
    }
  })();

  if (isMinimized) {
    return (
      <button
        type="button"
        className={local.minimizedPill}
        onClick={() => setIsMinimized(false)}
        aria-label="Show order status"
      >
        <span className={local.minimizedDot} aria-hidden />
        <span className={local.minimizedOrderNo}>#{order.orderNo}</span>
        <span className={local.minimizedStatus}>{minimizedLabel}</span>
      </button>
    );
  }

  return (
    <>
      <div className={local.banner} role="status" aria-live="polite">
        <div className={local.body}>
          <div className={local.orderNo}>#{order.orderNo}</div>
          <div className={local.headline}>{headline}</div>
          <div className={local.stage}>{stageLine}</div>

          <div className={local.bannerAction}>{renderActions()}</div>
        </div>
        <button
          type="button"
          className={local.minimizeBtn}
          onClick={() => setIsMinimized(true)}
          aria-label="Minimize"
          title="Minimize"
        >
          <MinusIcon width={16} height={16} fill="#fff" />
        </button>
      </div>

      <Sheet
        isOpen={isItemsOpen}
        mobileFullScreen
        onClose={() => setIsItemsOpen(false)}
        title={
          <>
            Your Order
            <span className={local.sheetCount}>
              {itemsCount} item{itemsCount === 1 ? "" : "s"}
            </span>
          </>
        }
        maxHeightVh={80}
        overlayZIndex={3000}
        footer={
          <Button block onClick={() => setIsItemsOpen(false)}>
            Close
          </Button>
        }
      >
        {pendingItems.length > 0 && (
          <>
            <div className={local.sheetSection}>
              <span className={local.sheetSectionLabel}>
                Pending ({pendingItems.length})
              </span>
              <span className={local.sheetSectionHint}>
                Remove within 1 min to cancel
              </span>
            </div>

            <ul className={local.sheetList}>
              {pendingItems.map((p) => {
                const ms = remainingMs(p);
                const sec = Math.ceil(ms / 1000);
                return (
                  <li key={p.pendingId} className={local.sheetRowPending}>
                    <div className={local.sheetRowTop}>
                      <span className={local.sheetRowName}>{p.item.name}</span>
                      <span className={local.sheetRowQty}>
                        x {p.item.quantity}
                      </span>
                      <span className={local.sheetRowPrice}>
                        {rupees(p.item.lineTotal)}
                      </span>
                    </div>

                    <div className={local.pendingFooter}>
                      <span className={local.pendingCountdown}>
                        Remove within {sec}s
                      </span>
                      <Button
                        size="xs"
                        variant="danger"
                        onClick={() => setPendingToRemove(p)}
                      >
                        Remove
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className={local.sheetSection}>
              <span className={local.sheetSectionLabel}>Confirmed</span>
            </div>
          </>
        )}

        <ul className={local.sheetList}>
          {order.items.map((it, i) => (
            <li key={i} className={local.sheetRow}>
              <div className={local.sheetRowTop}>
                <span className={local.sheetRowName}>{it.name}</span>
                <span className={local.sheetRowQty}>x {it.quantity}</span>
                <span className={local.sheetRowPrice}>
                  {rupees(it.lineTotal)}
                </span>
              </div>

              {it.customizations &&
                Object.keys(it.customizations).length > 0 && (
                  <div className={local.sheetRowCustom}>
                    {Object.entries(it.customizations)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </div>
                )}

              {it.customMessage && it.customMessage.trim() && (
                <div className={local.sheetRowNote}>
                  Note: {it.customMessage.trim()}
                </div>
              )}
            </li>
          ))}
        </ul>

        <div className={local.sheetTotals}>
          <div className={local.sheetTotalRow}>
            <span>Subtotal</span>
            <span>{rupees(order.subtotal)}</span>
          </div>
          {order.gstAmount > 0 && (
            <div className={local.sheetTotalRow}>
              <span>GST ({order.gstPercent}%)</span>
              <span>{rupees(order.gstAmount)}</span>
            </div>
          )}
          {order.packingCharge > 0 && (
            <div className={local.sheetTotalRow}>
              <span>Packing</span>
              <span>{rupees(order.packingCharge)}</span>
            </div>
          )}
          {order.storewideDiscount > 0 && (
            <div className={local.sheetTotalRow}>
              <span>Discount</span>
              <span>-{rupees(order.storewideDiscount)}</span>
            </div>
          )}
          <div className={`${local.sheetTotalRow} ${local.sheetTotalBig}`}>
            <span>Total</span>
            <span>{rupees(order.totalAmount)}</span>
          </div>
        </div>
      </Sheet>

      <ConfirmDialog
        isOpen={!!pendingToRemove}
        title="Remove this item?"
        message={
          pendingToRemove ? (
            <>
              Remove <strong>{pendingToRemove.item.name}</strong> x{" "}
              {pendingToRemove.item.quantity} from your order? This item will
              not be sent to the kitchen.
            </>
          ) : (
            ""
          )
        }
        confirmText="Yes, Remove"
        cancelText="Keep"
        variant="danger"
        overlayZIndex={3100}
        onConfirm={() => {
          if (pendingToRemove) {
            removePendingItem(pendingToRemove.pendingId);
          }
          setPendingToRemove(null);
        }}
        onCancel={() => setPendingToRemove(null)}
      />

      <Sheet
        isOpen={isUpiSheetOpen}
        mobileFullScreen
        onClose={() => setIsUpiSheetOpen(false)}
        title="Pay via UPI"
        maxHeightVh={80}
        overlayZIndex={3000}
        footer={
          <Button
            variant="ghost"
            onClick={() => setIsUpiSheetOpen(false)}
            block
          >
            Cancel
          </Button>
        }
      >
        <div className={local.upiSheet}>
          <p className={local.upiSheetLead}>
            Pay <strong>{rupees(order.totalAmount)}</strong> to{" "}
            <strong>{tenant?.displayName}</strong> using any UPI app (GPay,
            PhonePe, Paytm, BHIM).
          </p>

          <div className={local.upiDetailCard}>
            <div className={local.upiDetailRow}>
              <span className={local.upiDetailLabel}>UPI ID</span>
              <div className={local.upiDetailValueRow}>
                <span className={local.upiDetailValue}>{tenant?.upiId}</span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={copyUpiId}
                  leftIcon={
                    <CopyIcon width={14} height={14} fill="currentColor" />
                  }
                >
                  {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            </div>

            <div className={local.upiDetailRow}>
              <span className={local.upiDetailLabel}>Amount</span>
              <div className={local.upiDetailValueRow}>
                <span className={local.upiDetailValue}>
                  {rupees(order.totalAmount)}
                </span>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={copyAmount}
                  leftIcon={
                    <CopyIcon width={14} height={14} fill="currentColor" />
                  }
                >
                  Copy
                </Button>
              </div>
            </div>

            <div className={local.upiDetailRow}>
              <span className={local.upiDetailLabel}>Note</span>
              <span className={local.upiDetailValue}>
                Order #{order.orderNo}
              </span>
            </div>
          </div>

          <p className={local.upiSheetHint}>
            On mobile, tap <strong>Open UPI App</strong> below - your phone
            will show a list of installed UPI apps. On desktop, copy the UPI
            ID and pay from your bank's app.
          </p>

          <Button block onClick={fireUpiDeepLink}>
            Open UPI App
          </Button>

          <p className={local.upiSheetNote}>
            After paying, tap <strong>Cancel</strong> and then{" "}
            <strong>I've paid</strong> to confirm the order.
          </p>
        </div>
      </Sheet>
    </>
  );
};

export default CustomerOrderStatus;