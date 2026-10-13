// src/components/MainDashboard/DineinOrdersModal.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  EmptyState,
  Badge,
  Banner,
  Button,
  ConfirmDialog,
  Tabs,
  Accordion,
  IconButton,
} from "../ui";
import { supabaseService } from "../../services/supabase.service";
import { useTenant } from "../../contexts/TenantContext";
import { DineinOrder, DineinOrderItem } from "../../types";
import { formatRupees } from "../../utils/subscription";
import OrderDetail from "./OrderDetail/OrderDetail";
import OrderHistoryModal from "./OrderHistoryModal";
import { ClockIcon } from "../../assets/svgs";
import local from "./DineinOrdersModal.module.scss";
import MarkPaidModal from "./MarkPaidModal";
import { printReceiptNode } from "../../utils/printReceipt";
import Receipt from "./OrderDetail/Receipt";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  focusOrderId?: string | null;
  /**
   * 'admin' (default) — full tabs, full actions, order history.
   * 'staff' — single Preparing tab, no action buttons, no history.
   *   Staff can only toggle per-item served checkboxes.
   */
  mode?: "admin" | "staff";
}

// ---------------------------------------------------------
// Tab model
// ---------------------------------------------------------
type TabKey = "new" | "preparing" | "served" | "rejected";

const ACTIVE_STATUSES: DineinOrder["status"][] = [
  "placed",
  "accepted",
  "preparing",
  "served",
  "bill_requested",
  "paid",
  "cancelled",
];

const TAB_STATUSES: Record<TabKey, DineinOrder["status"][]> = {
  new: ["placed"],
  preparing: ["accepted", "preparing"],
  served: ["served", "bill_requested", "paid"],
  rejected: ["cancelled"],
};

const TAB_ORDER: TabKey[] = ["new", "preparing", "served", "rejected"];

// ---------------------------------------------------------
// Helpers
// ---------------------------------------------------------
const statusLabel = (status: DineinOrder["status"]): string => {
  switch (status) {
    case "placed":
      return "New";
    case "accepted":
      return "Accepted";
    case "preparing":
      return "Preparing";
    case "served":
      return "Served";
    case "bill_requested":
      return "Bill requested";
    case "cancelled":
      return "Rejected";
    case "paid":
      return "success";
    default:
      return status;
  }
};

const statusTone = (
  status: DineinOrder["status"],
): "info" | "warning" | "success" | "neutral" | "danger" => {
  switch (status) {
    case "placed":
      return "danger";
    case "accepted":
      return "info";
    case "preparing":
      return "warning";
    case "served":
      return "success";
    case "bill_requested":
      return "neutral";
    case "cancelled":
      return "danger";
    default:
      return "neutral";
  }
};

const stageAction = (
  status: DineinOrder["status"],
): { label: string; target: "accepted" | "preparing" } | null => {
  switch (status) {
    case "placed":
      return { label: "Accept", target: "accepted" };
    case "accepted":
      return { label: "Preparing", target: "preparing" };
    default:
      return null;
  }
};

const formatElapsed = (fromIso?: string): string => {
  if (!fromIso) return "";
  const sec = Math.max(
    0,
    Math.floor((Date.now() - new Date(fromIso).getTime()) / 1000),
  );
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (h > 0) return `${h}h ${pad(m)}m ${pad(s)}s`;
  if (m > 0) return `${m}m ${pad(s)}s`;
  return `${s}s`;
};

const stageTimerBase = (o: DineinOrder): string | undefined => {
  switch (o.status) {
    case "placed":
      return o.createdAt;
    case "accepted":
      return o.acceptedAt;
    case "preparing":
      return o.preparingAt;
    case "served":
      return o.servedAt;
    default:
      return undefined;
  }
};

const tabForStatus = (status: DineinOrder["status"]): TabKey | null => {
  for (const key of TAB_ORDER) {
    if (TAB_STATUSES[key].includes(status)) return key;
  }
  return null;
};

const allItemsServed = (order: DineinOrder): boolean =>
  order.items.length > 0 && order.items.every((it) => it.served === true);

const servedCount = (order: DineinOrder): number =>
  order.items.reduce((n, it) => (it.served ? n + 1 : n), 0);

const tableHeading = (o: DineinOrder): string =>
  o.tableLabelKind === "number" ? `Table ${o.tableLabel}` : o.tableLabel;

const isOrderUnseen = (o: DineinOrder): boolean =>
  o.status === "bill_requested";

type CardTone = "failed" | "info" | "served";

const cardTone = (o: DineinOrder): CardTone => {
  if (o.status === "paid") return "served";
  if (o.settledOfflineAfterFailure === true) return "failed";
  if (o.status === "bill_requested") return "info";
  return "served";
};

/**
 * Which modes each status maps to. Admin uses the per-status map;
 * staff has a fixed behavior (interactive on preparing, readonly on
 * everything else so the shape stays consistent).
 */
const checkboxModeForAdmin = (
  status: DineinOrder["status"],
): "disabled" | "interactive" | "readonly" | "hidden" => {
  if (status === "placed" || status === "accepted") return "disabled";
  if (status === "preparing") return "interactive";
  if (status === "served" || status === "bill_requested" || status === "paid") {
    return "readonly";
  }
  return "hidden";
};

const checkboxModeForStaff = (
  status: DineinOrder["status"],
): "disabled" | "interactive" | "readonly" | "hidden" => {
  if (status === "preparing") return "interactive";
  if (status === "accepted") return "disabled";
  if (status === "served" || status === "bill_requested" || status === "paid") {
    return "readonly";
  }
  return "hidden";
};

// ---------------------------------------------------------
// Compact accordion header
// ---------------------------------------------------------
interface CardHeaderProps {
  order: DineinOrder;
  servedN: number;
  totalN: number;
}

const CardHeader: React.FC<CardHeaderProps> = ({ order, servedN, totalN }) => {
  const timer = stageTimerBase(order);
  return (
    <span className={local.accordionHeader}>
      <span className={local.headerLeft}>
        <span className={local.headerTable}>{tableHeading(order)}</span>
        <span className={local.headerOrderNo}>#{order.orderNo}</span>
      </span>
      <span className={local.headerRight}>
        {timer && (
          <span className={local.stageTimer}>{formatElapsed(timer)}</span>
        )}
        <span className={local.headerServed}>
          {servedN}/{totalN} served
        </span>
        <Badge tone={statusTone(order.status)} size="sm">
          {statusLabel(order.status)}
        </Badge>
      </span>
    </span>
  );
};

// ---------------------------------------------------------
// Component
// ---------------------------------------------------------
const DineinOrdersModal: React.FC<Props> = ({
  isOpen,
  onClose,
  focusOrderId = null,
  mode = "admin",
}) => {
  const { tenant } = useTenant();
  const isStaff = mode === "staff";

  const [orders, setOrders] = useState<DineinOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<DineinOrder | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);
  const [confirmReject, setConfirmReject] = useState<DineinOrder | null>(null);
  const [confirmServed, setConfirmServed] = useState<DineinOrder | null>(null);
  // Staff defaults to the preparing tab and never changes it.
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [, setTick] = useState(0);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [markPaidFor, setMarkPaidFor] = useState<DineinOrder | null>(null);
  const [markPaidBusy, setMarkPaidBusy] = useState(false);
  const [markPaidError, setMarkPaidError] = useState("");
  const [printOrder, setPrintOrder] = useState<DineinOrder | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  const scrolledForRef = useRef<string | null>(null);

  // ---------- Load ----------
  const load = async () => {
    if (!tenant) return;
    setIsLoading(true);
    setError("");
    try {
      const list = await supabaseService.getDineinOrders(
        tenant.slug,
        ACTIVE_STATUSES,
      );
      setOrders(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    // When the modal opens for a staff user, land on Preparing.
    if (isStaff) setActiveTab("preparing");
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant?.slug, isStaff]);

  useEffect(() => {
    if (!isOpen) return;
    const refresh = window.setInterval(load, 20_000);
    const ticker = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      window.clearInterval(refresh);
      window.clearInterval(ticker);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, tenant?.slug]);

  // ---------- Focus-scroll ----------
  useEffect(() => {
    if (!focusOrderId) return;
    if (scrolledForRef.current === focusOrderId) return;

    const target = orders.find((o) => o.id === focusOrderId);
    if (!target) return;

    // Staff only see Preparing; if the focused order isn't in that
    // tab, we still land on Preparing — the notification won't be
    // actionable for staff unless the order is being prepared.
    const tab = tabForStatus(target.status);
    if (tab && tab !== activeTab && !isStaff) setActiveTab(tab);

    const t = window.setTimeout(() => {
      const el = document.querySelector<HTMLElement>(
        `[data-order-id="${focusOrderId}"]`,
      );
      if (!el) return;
      scrolledForRef.current = focusOrderId;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add(local.focused);
      window.setTimeout(() => el.classList.remove(local.focused), 2200);
    }, 350);

    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusOrderId, orders.length, activeTab, isStaff]);

  // ---------- Bucketing ----------
  const byTab = useMemo(() => {
    const bucket: Record<TabKey, DineinOrder[]> = {
      new: [],
      preparing: [],
      served: [],
      rejected: [],
    };
    orders.forEach((o) => {
      const tab = tabForStatus(o.status);
      if (tab) bucket[tab].push(o);
    });

    const rank = (status: DineinOrder["status"]): number => {
      if (status === "placed") return 0;
      if (status === "bill_requested") return 1;
      if (status === "accepted") return 2;
      if (status === "preparing") return 3;
      if (status === "served") return 4;
      if (status === "paid") return 5;
      if (status === "cancelled") return 6;
      return 7;
    };
    Object.keys(bucket).forEach((k) => {
      const key = k as TabKey;
      bucket[key].sort((a, b) => {
        const r = rank(a.status) - rank(b.status);
        if (r !== 0) return r;
        return (
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );
      });
    });
    return bucket;
  }, [orders]);

  const visibleOrders = byTab[activeTab];

  useEffect(() => {
    if (!printOrder) return;
    const ok = printReceiptNode(printRef.current);
    if (!ok) {
      setError("Allow pop-ups to print the bill.");
    }
    setPrintOrder(null);
  }, [printOrder]);

  const handleGenerateBill = (order: DineinOrder) => {
    setPrintOrder(order);
  };

  // ---------- Stage advance (Accept / Preparing) ----------
  const handleAdvance = async (
    order: DineinOrder,
    target: "accepted" | "preparing",
  ) => {
    setActingId(order.id);
    setError("");
    try {
      const updated = await supabaseService.setDineinOrderStatus(
        order.id,
        target,
      );
      if (!updated) throw new Error("Failed to update status");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setActingId(null);
    }
  };

  const handleSendPayLink = async (order: DineinOrder) => {
    if (!tenant?.upiId) {
      setError(
        "Set your UPI ID in Store Information before sending a pay link.",
      );
      return;
    }
    setActingId(order.id);
    setError("");
    try {
      const updated = await supabaseService.setDineinPayOnline(order.id, true);
      if (!updated) throw new Error("Failed to send pay link");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send pay link");
    } finally {
      setActingId(null);
    }
  };

  const handleConfirmPaymentReceived = async (order: DineinOrder) => {
    setActingId(order.id);
    setError("");
    try {
      const updated = await supabaseService.confirmDineinPayment(
        order.id,
        "online",
      );
      if (!updated) throw new Error("Failed to confirm payment");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
      load();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to confirm payment",
      );
    } finally {
      setActingId(null);
    }
  };

  // ---------- Per-item served toggle ----------
  const handleToggleItemServed = async (
    order: DineinOrder,
    itemIndex: number,
    next: boolean,
  ) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== order.id) return o;
        const items = o.items.map((it, i) =>
          i === itemIndex ? { ...it, served: next } : it,
        );
        return { ...o, items };
      }),
    );

    const updated = await supabaseService.setDineinOrderItemsServed(
      order.id,
      [itemIndex],
      next,
    );
    if (!updated) {
      setError("Failed to update item state");
      setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
      return;
    }
    setOrders((prev) => prev.map((o) => (o.id === order.id ? updated : o)));
  };

  // ---------- Served confirmation ----------
  const requestMarkServed = (order: DineinOrder) => {
    if (!allItemsServed(order)) return;
    setConfirmServed(order);
  };

  const handleConfirmServed = async () => {
    if (!confirmServed) return;
    const target = confirmServed;
    setConfirmServed(null);
    setActingId(target.id);
    setError("");
    try {
      const updated = await supabaseService.setDineinOrderStatus(
        target.id,
        "served",
      );
      if (!updated) throw new Error("Failed to mark served");
      setOrders((prev) => prev.map((o) => (o.id === target.id ? updated : o)));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark served");
    } finally {
      setActingId(null);
    }
  };

  const handleMarkPaidConfirm = async (mode: "online" | "cash") => {
    if (!markPaidFor) return;
    setMarkPaidBusy(true);
    setMarkPaidError("");
    try {
      const ok = await supabaseService.markDineinOrderPaid(
        markPaidFor.id,
        mode,
      );
      if (!ok) throw new Error("Failed to mark paid");
      setMarkPaidFor(null);
      load();
    } catch (err) {
      setMarkPaidError(
        err instanceof Error ? err.message : "Failed to mark paid",
      );
    } finally {
      setMarkPaidBusy(false);
    }
  };

  // ---------- Reject ----------
  const handleReject = async () => {
    if (!confirmReject) return;
    const target = confirmReject;
    setConfirmReject(null);
    setActingId(target.id);
    setError("");
    try {
      const updated = await supabaseService.cancelDineinOrder(
        target.id,
        "Rejected by store",
      );
      if (!updated) throw new Error("Failed to cancel");
      setOrders((prev) => prev.map((o) => (o.id === target.id ? updated : o)));
      load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setActingId(null);
    }
  };

  // ---------- Tabs config ----------
  const tabs = useMemo(
    () =>
      TAB_ORDER.map((key) => ({
        key,
        label: (
          <span className={local.tabLabel}>
            {key === "new"
              ? "New Orders"
              : key === "preparing"
                ? "Preparing"
                : key === "served"
                  ? "Served"
                  : "Rejected"}
            {byTab[key].length > 0 && (
              <span
                className={`${local.tabCount} ${
                  key === activeTab ? local.tabCountActive : ""
                }`}
              >
                {byTab[key].length}
              </span>
            )}
          </span>
        ),
      })),
    [byTab, activeTab],
  );

  // ---------------------------------------------------------
  // Render
  // ---------------------------------------------------------
  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isStaff ? "Active Orders" : "Order Placed"}
        size="xl"
        headerRight={
          !isStaff ? (
            <IconButton
              variant="soft"
              size="md"
              aria-label="Order history"
              tooltip="Order history"
              onClick={() => setHistoryOpen(true)}
            >
              <ClockIcon width={18} height={18} fill="#1e1e1e" />
            </IconButton>
          ) : undefined
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError("")}>
            {error}
          </Banner>
        )}

        {!isStaff && (
          <div className={local.tabsRow}>
            <Tabs<TabKey>
              items={tabs}
              value={activeTab}
              onChange={setActiveTab}
              block
            />
          </div>
        )}

        {isLoading && orders.length === 0 ? (
          <EmptyState title="Loading orders..." />
        ) : visibleOrders.length === 0 ? (
          <EmptyState
            title={
              isStaff
                ? "No orders in preparation."
                : activeTab === "new"
                  ? "No new orders right now."
                  : activeTab === "preparing"
                    ? "No orders in preparation."
                    : activeTab === "served"
                      ? "No served orders waiting on payment."
                      : "No rejected orders."
            }
          />
        ) : (
          <div className={local.grid}>
            {visibleOrders.map((o) => {
              const stage = stageAction(o.status);
              const isActing = actingId === o.id;
              const showReject = !isStaff && o.status === "placed";
              const mode0 = isStaff
                ? checkboxModeForStaff(o.status)
                : checkboxModeForAdmin(o.status);
              const servedN = servedCount(o);
              const totalN = o.items.length;
              const canServe = mode0 === "interactive" && allItemsServed(o);
              const tone = cardTone(o);
              const unseen = isOrderUnseen(o);

              return (
                <div
                  key={o.id}
                  data-order-id={o.id}
                  className={[
                    local.cardWrap,
                    tone === "failed" ? local.cardPaymentFailed : "",
                    tone === "info" ? local.cardBillRequested : "",
                    tone === "served" ? local.cardServed : "",
                    unseen ? local.cardUnseen : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <Accordion
                    hideChevron
                    title={
                      <CardHeader order={o} servedN={servedN} totalN={totalN} />
                    }
                  >
                    {/* ---- Item list with per-item served state ---- */}
                    <div className={local.items}>
                      {mode0 !== "hidden" && (
                        <div className={local.itemsHeader}>
                          <span className={local.itemsHeaderLabel}>Items</span>
                          <span className={local.itemsHeaderCount}>
                            {servedN}/{totalN} served
                          </span>
                        </div>
                      )}

                      {o.items.map((it: DineinOrderItem, i) => {
                        const hasCustomizations =
                          it.customizations &&
                          Object.keys(it.customizations).length > 0;
                        const hasNote =
                          !!it.customMessage && it.customMessage.trim() !== "";

                        const rowContent = (
                          <span className={local.itemRowContent}>
                            <span className={local.itemLine}>
                              {it.name} x {it.quantity}
                            </span>

                            {hasCustomizations && (
                              <span className={local.itemCustom}>
                                {Object.entries(it.customizations!)
                                  .map(([k, v]) => `${k}: ${v}`)
                                  .join(" · ")}
                              </span>
                            )}

                            {hasNote && (
                              <span className={local.itemNote}>
                                Note: {it.customMessage!.trim()}
                              </span>
                            )}
                          </span>
                        );

                        if (mode0 === "interactive") {
                          return (
                            <div key={i} className={local.itemRow}>
                              <label className={local.itemRowLabel}>
                                <input
                                  type="checkbox"
                                  className={local.itemCheckbox}
                                  checked={it.served === true}
                                  onChange={(e) =>
                                    handleToggleItemServed(
                                      o,
                                      i,
                                      e.target.checked,
                                    )
                                  }
                                />
                                <span
                                  className={local.itemCheckboxBox}
                                  aria-hidden
                                />
                                {rowContent}
                              </label>
                            </div>
                          );
                        }

                        if (mode0 === "disabled") {
                          return (
                            <div key={i} className={local.itemRow}>
                              <label className={local.itemRowLabel}>
                                <input
                                  type="checkbox"
                                  className={local.itemCheckbox}
                                  checked={it.served === true}
                                  disabled
                                  onChange={() => {}}
                                />
                                <span
                                  className={local.itemCheckboxBox}
                                  aria-hidden
                                />
                                {rowContent}
                              </label>
                            </div>
                          );
                        }

                        if (mode0 === "readonly") {
                          return (
                            <div key={i} className={local.itemRow}>
                              <div className={local.itemRowLabel}>
                                <span
                                  className={
                                    it.served
                                      ? local.checkmarkStatic
                                      : local.checkmarkStaticEmpty
                                  }
                                  aria-hidden
                                >
                                  ✓
                                </span>
                                {rowContent}
                              </div>
                            </div>
                          );
                        }

                        return null;
                      })}

                      {isStaff && o.status === "preparing" && (
  <Banner variant="success" inline>
    Now start preparing — tick items as they're served.
  </Banner>
)}

                      {mode0 === "disabled" && (
  <div className={local.checkboxHint}>
    {o.status === "placed"
      ? "Accept the order to start marking items served."
      : o.status === "accepted"
        ? isStaff
          ? "Waiting for the kitchen to start preparing…"
          : 'Tap "Preparing" to start marking items served.'
        : null}
  </div>
)}
                    </div>

                    {/* ---- Totals row ---- */}
                    {!isStaff && (
                      <div className={local.cardFooter}>
                        <span className={local.totalLabel}>Current total</span>
                        <span className={local.totalValue}>
                          {formatRupees(o.totalAmount)}
                        </span>
                      </div>
                    )}

                    {/* ---------- Admin-only: bill line, generate bill ---------- */}
                    {!isStaff && o.status === "paid" && (
                      <div className={local.billLine}>
                        Paid via{" "}
                        {(() => {
                          const ref = (o.paymentRef ?? "").toLowerCase();
                          if (ref === "online" || ref.startsWith("upi"))
                            return "Online (UPI)";
                          if (ref === "cash") return "Cash";
                          return o.paymentRef || "—";
                        })()}
                      </div>
                    )}

                    {!isStaff && o.status === "bill_requested" && (
                      <>
                        {o.settledOfflineAfterFailure && (
                          <div className={local.failureNotice}>
                            ⚠ Online payment failed — please settle offline
                          </div>
                        )}
                        <div className={local.billLine}>
                          {o.payOnline
                            ? "Online payment approved · waiting for customer"
                            : o.payOnlineRequested
                              ? "Customer chose online · tap Send Pay Link"
                              : o.settledOfflineAfterFailure
                                ? "Customer will pay offline — collect at the table"
                                : "Offline bill · customer will pay at the table"}
                        </div>
                      </>
                    )}

                    {!isStaff && o.status === "served" && !o.billRequested && (
                      <Button
                        size="xs"
                        variant="secondary"
                        disabled={isActing}
                        onClick={() => handleGenerateBill(o)}
                      >
                        Generate Bill
                      </Button>
                    )}

                    {/* ---------- Admin-only action row ---------- */}
                    {!isStaff &&
                      (stage ||
                        showReject ||
                        mode0 === "interactive" ||
                        o.status === "bill_requested") && (
                        <div className={local.cardActions}>
                          {stage && (
                            <Button
                              size="xs"
                              variant="primary"
                              loading={isActing}
                              onClick={() => handleAdvance(o, stage.target)}
                            >
                              {stage.label}
                            </Button>
                          )}

                          {mode0 === "interactive" && (
                            <Button
                              size="xs"
                              variant="success"
                              disabled={!canServe || isActing}
                              title={
                                canServe
                                  ? undefined
                                  : "Mark every item as served first"
                              }
                              onClick={() => requestMarkServed(o)}
                            >
                              Mark Served
                            </Button>
                          )}

                          {o.status === "bill_requested" && (
                            <>
                              {o.payOnlineRequested === true &&
                                !o.payOnline && (
                                  <Button
                                    size="xs"
                                    variant="primary"
                                    loading={isActing}
                                    disabled={!tenant?.upiId}
                                    title={
                                      !tenant?.upiId
                                        ? "Set your UPI ID in Store Information first"
                                        : undefined
                                    }
                                    onClick={() => handleSendPayLink(o)}
                                  >
                                    Send Pay Link
                                  </Button>
                                )}

                              {o.payOnline && !o.customerPaidClaimed && (
                                <Button size="xs" variant="ghost" disabled>
                                  Waiting for customer…
                                </Button>
                              )}

                              {o.payOnline && o.customerPaidClaimed && (
                                <Button
                                  size="xs"
                                  variant="success"
                                  loading={isActing}
                                  onClick={() =>
                                    handleConfirmPaymentReceived(o)
                                  }
                                >
                                  Confirm Payment
                                </Button>
                              )}

                              {o.payOnlineRequested !== true &&
                                !o.settledOfflineAfterFailure && (
                                  <Button
                                    size="xs"
                                    variant="ghost"
                                    disabled={isActing}
                                    onClick={() =>
                                      handleConfirmPaymentReceived(o)
                                    }
                                    title="Mark as paid when the customer pays cash"
                                  >
                                    Mark Paid
                                  </Button>
                                )}

                              {o.settledOfflineAfterFailure && (
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  disabled={isActing}
                                  onClick={() =>
                                    handleConfirmPaymentReceived(o)
                                  }
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </>
                          )}

                          {showReject && (
                            <Button
                              size="xs"
                              variant="danger"
                              disabled={isActing}
                              onClick={() => setConfirmReject(o)}
                            >
                              Reject
                            </Button>
                          )}

                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => setSelected(o)}
                            style={{ marginLeft: "auto" }}
                          >
                            Open details
                          </Button>
                        </div>
                      )}

                    {!isStaff && mode0 === "interactive" && !canServe && (
                      <div className={local.serveGate}>
                        {totalN - servedN} item
                        {totalN - servedN === 1 ? "" : "s"} pending before
                        served
                      </div>
                    )}
                  </Accordion>
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      {/* Admin-only side modals. Staff never see them. */}
      {!isStaff && selected && (
        <OrderDetail
          isOpen={true}
          order={selected}
          onClose={() => {
            setSelected(null);
            load();
          }}
          onRefresh={load}
        />
      )}

      {!isStaff && (
        <ConfirmDialog
          isOpen={!!confirmReject}
          title="Reject order?"
          message={
            confirmReject
              ? `Reject the order #${confirmReject.orderNo} from ${
                  confirmReject.tableLabelKind === "number"
                    ? `Table ${confirmReject.tableLabel}`
                    : confirmReject.tableLabel
                }? The customer will be notified.`
              : ""
          }
          confirmText="Yes, Reject"
          variant="danger"
          onConfirm={handleReject}
          onCancel={() => setConfirmReject(null)}
        />
      )}

      {!isStaff && (
        <ConfirmDialog
          isOpen={!!confirmServed}
          title="Mark order as served?"
          message={
            confirmServed ? (
              <>
                Are all items in order <strong>#{confirmServed.orderNo}</strong>{" "}
                at{" "}
                <strong>
                  {confirmServed.tableLabelKind === "number"
                    ? `Table ${confirmServed.tableLabel}`
                    : confirmServed.tableLabel}
                </strong>{" "}
                served to the table? This will move the order to the Served tab
                and free the table for new orders.
              </>
            ) : (
              ""
            )
          }
          confirmText="Yes, all served"
          variant="primary"
          loading={actingId === confirmServed?.id}
          onConfirm={handleConfirmServed}
          onCancel={() => setConfirmServed(null)}
        />
      )}

      {!isStaff && (
        <MarkPaidModal
          isOpen={!!markPaidFor}
          order={markPaidFor}
          busy={markPaidBusy}
          error={markPaidError}
          onConfirm={handleMarkPaidConfirm}
          onCancel={() => {
            if (markPaidBusy) return;
            setMarkPaidFor(null);
            setMarkPaidError("");
          }}
        />
      )}

      {!isStaff && (
        <OrderHistoryModal
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      {!isStaff && (
        <div
          ref={printRef}
          aria-hidden
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: "80mm",
            visibility: "hidden",
            pointerEvents: "none",
          }}
        >
          {printOrder && <Receipt order={printOrder} />}
        </div>
      )}
    </>
  );
};

export default DineinOrdersModal;
