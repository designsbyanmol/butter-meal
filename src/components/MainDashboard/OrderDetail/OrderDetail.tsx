// src/components/MainDashboard/OrderDetail/OrderDetail.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Modal,
  Button,
  Badge,
  Banner,
  ConfirmDialog,
  Checkbox,
} from "../../ui";
import { useTenant } from "../../../contexts/TenantContext";
import { DineinOrder } from "../../../types";
import { supabaseService } from "../../../services/supabase.service";
import { formatRupees } from "../../../utils/subscription";
import { printReceiptNode } from "../../../utils/printReceipt";
import Receipt from "./Receipt";
import local from "./OrderDetail.module.scss";

interface OrderDetailProps {
  isOpen: boolean;
  order: DineinOrder;
  onClose: () => void;
  /**
   * Called after any mutation that changes the order's server state.
   * The parent (`DineinOrdersModal`) owns the list and refetches it,
   * so this modal never needs to fetch on its own.
   */
  onRefresh?: () => void;
}

const REJECTABLE_STATUSES: DineinOrder["status"][] = ["placed"];

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

const allItemsServed = (order: DineinOrder): boolean =>
  order.items.length > 0 && order.items.every((it) => it.served === true);

const servedCount = (order: DineinOrder): number =>
  order.items.reduce((n, it) => (it.served ? n + 1 : n), 0);

const checkboxMode = (
  status: DineinOrder["status"],
): "disabled" | "interactive" | "readonly" | "hidden" => {
  if (status === "placed" || status === "accepted") return "disabled";
  if (status === "preparing") return "interactive";
  if (status === "served" || status === "bill_requested" || status === "paid") {
    return "readonly";
  }
  return "hidden";
};

const OrderDetail: React.FC<OrderDetailProps> = ({
  isOpen,
  order,
  onClose,
  onRefresh,
}) => {
  const { tenant } = useTenant();

  const [orderState, setOrderState] = useState<DineinOrder>(order);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmReject, setConfirmReject] = useState(false);
  const [confirmServed, setConfirmServed] = useState(false);
  const [, setTick] = useState(0);

  const receiptRef = useRef<HTMLDivElement>(null);

  // Sync from the parent whenever it hands us a fresh copy. The parent
  // is the source of truth for the order row; we never fetch on our
  // own. When `onRefresh` fires from a mutation, the parent re-fetches
  // its list and passes the fresh order down through this effect.
  useEffect(() => {
    setOrderState(order);
    setError("");
    setBusy(false);
    setConfirmReject(false);
    setConfirmServed(false);
  }, [order.id, order.updatedAt]);

  // Local 1s tick for the elapsed timer display.
  useEffect(() => {
    if (!isOpen) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [isOpen]);

  // ---------- Print ----------
  const handlePrint = () => {
    const ok = printReceiptNode(receiptRef.current);
    if (!ok) {
      setError("Allow pop-ups to print the bill.");
    }
  };

  // ---------- Staff-side Mark Paid / Pay Online ----------
  const handleStaffMarkPaid = async () => {
  setBusy(true);
  setError('');
  try {
    const updated = await supabaseService.confirmDineinPayment(
      orderState.id,
      'online',
    );
    if (!updated) throw new Error('Failed to confirm payment');
    setOrderState(updated);
    onRefresh?.();
  } catch (err) {
    setError(err instanceof Error ? err.message : 'Failed to confirm payment');
  } finally {
    setBusy(false);
  }
};

  // ---------- Send Pay Link ----------
  const handleSendPayLink = async () => {
    setBusy(true);
    setError("");
    try {
      const updated = await supabaseService.setDineinPayOnline(
        orderState.id,
        true,
      );
      if (!updated) throw new Error("Failed to send pay link");
      setOrderState(updated);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send link");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Per-item served toggle ----------
  const handleToggleItemServed = async (itemIndex: number, next: boolean) => {
    const prev = orderState;
    setOrderState((s) => ({
      ...s,
      items: s.items.map((it, i) =>
        i === itemIndex ? { ...it, served: next } : it,
      ),
    }));

    const updated = await supabaseService.setDineinOrderItemsServed(
      prev.id,
      [itemIndex],
      next,
    );
    if (!updated) {
      setError("Failed to update item state");
      setOrderState(prev);
      return;
    }
    setOrderState(updated);
    // No onRefresh here — this is a fine-grained change that only
    // affects this modal's item list. The parent will pick it up on
    // its next poll or on close.
  };

  // ---------- Stage advance ----------
  const handleAdvance = async () => {
    setBusy(true);
    setError("");
    try {
      const next =
        orderState.status === "placed"
          ? "accepted"
          : orderState.status === "accepted"
            ? "preparing"
            : null;
      if (!next) return;

      const updated = await supabaseService.setDineinOrderStatus(
        orderState.id,
        next,
      );
      if (!updated) throw new Error("Failed to update status");
      setOrderState(updated);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Mark served ----------
  const requestMarkServed = () => {
    if (!allItemsServed(orderState)) return;
    setConfirmServed(true);
  };

  const handleConfirmServed = async () => {
    setConfirmServed(false);
    setBusy(true);
    setError("");
    try {
      const updated = await supabaseService.setDineinOrderStatus(
        orderState.id,
        "served",
      );
      if (!updated) throw new Error("Failed to mark served");
      setOrderState(updated);
      onRefresh?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark served");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Reject ----------
  const handleReject = async () => {
    setConfirmReject(false);
    setBusy(true);
    setError("");
    try {
      const updated = await supabaseService.cancelDineinOrder(
        orderState.id,
        "Rejected by store",
      );
      if (!updated) throw new Error("Failed to cancel");
      setOrderState(updated);
      onRefresh?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel");
    } finally {
      setBusy(false);
    }
  };

  // ---------- Derived ----------
  const advanceLabel = (() => {
    switch (orderState.status) {
      case "placed":
        return "Accept Order";
      case "accepted":
        return "Start Preparing";
      default:
        return null;
    }
  })();

  const timerBase = (() => {
    switch (orderState.status) {
      case "placed":
        return orderState.createdAt;
      case "accepted":
        return orderState.acceptedAt;
      case "preparing":
        return orderState.preparingAt;
      case "served":
        return orderState.servedAt;
      default:
        return undefined;
    }
  })();

  const tableHeading =
    orderState.tableLabelKind === "number"
      ? `Table ${orderState.tableLabel}`
      : orderState.tableLabel;

  const canGenerateBill = orderState.status !== "cancelled";
  const canReject = REJECTABLE_STATUSES.includes(orderState.status);

  const mode = checkboxMode(orderState.status);
  const canServe = mode === "interactive" && allItemsServed(orderState);
  const servedN = servedCount(orderState);
  const totalN = orderState.items.length;
  const itemsTotalQty = orderState.items.reduce(
    (s, it) => s + (it.quantity || 0),
    0,
  );

  const isBillRequested = orderState.status === "bill_requested";
  const payLinkActive = isBillRequested && orderState.payOnline;
  const payLinkIdle =
    isBillRequested &&
    orderState.payOnlineRequested === true &&
    !orderState.payOnline;

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={`Order — ${tableHeading}`}
        size="md"
        footer={
          <>
            {canReject && (
              <Button
                variant="danger"
                onClick={() => setConfirmReject(true)}
                disabled={busy}
                style={{ marginRight: "auto" }}
              >
                Reject
              </Button>
            )}
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Close
            </Button>

            {canGenerateBill && (
              <Button variant="secondary" onClick={handlePrint}>
                Generate Bill
              </Button>
            )}

            {payLinkIdle && (
  <Button variant="primary" onClick={handleSendPayLink} loading={busy}>
    Send Pay Link
  </Button>
)}

{payLinkActive && !orderState.customerPaidClaimed && (
  <Button variant="ghost" disabled>
    Waiting for customer…
  </Button>
)}

{payLinkActive && orderState.customerPaidClaimed && (
  <Button variant="success" onClick={handleStaffMarkPaid} loading={busy}>
    Confirm Payment
  </Button>
)}
          </>
        }
      >
        {error && (
          <Banner variant="error" onDismiss={() => setError("")}>
            {error}
          </Banner>
        )}

        <div className={local.statusRow}>
          <div className={local.statusBadge}>
            <span className={local.statusLabel}>
              {orderState.status.replace(/_/g, " ").toUpperCase()}
            </span>
            {timerBase && (
              <span className={local.statusTimer}>
                {formatElapsed(timerBase)}
              </span>
            )}
          </div>

          {advanceLabel && (
            <Button size="sm" onClick={handleAdvance} loading={busy}>
              {advanceLabel}
            </Button>
          )}

          {mode === "interactive" && (
            <Button
              size="sm"
              variant="success"
              disabled={!canServe || busy}
              title={canServe ? undefined : "Mark every item as served first"}
              onClick={requestMarkServed}
            >
              Mark Served
            </Button>
          )}

          {isBillRequested && (
            <Badge tone={orderState.payOnline ? "info" : "warning"} size="sm">
              {orderState.payOnline
                ? "Online payment pending"
                : "Offline bill requested"}
            </Badge>
          )}
        </div>

        <div className={local.metaBlock}>
          <div>
            <strong>Order No:</strong> #{orderState.orderNo}
          </div>
          <div>
            <strong>Table:</strong>{" "}
            {orderState.tableLabelKind === "number"
              ? `#${orderState.tableLabel}`
              : orderState.tableLabel}
          </div>
          <div>
            <strong>Customer:</strong> {orderState.customerName || "Guest"}
          </div>
          <div className={local.metaDevices}>
            <strong>Placed at:</strong>{" "}
            {new Date(orderState.createdAt).toLocaleString()}
          </div>
        </div>

        {mode !== "hidden" && (
          <div className={local.itemsBlock}>
            <div className={local.itemsHeader}>
              <span className={local.itemsHeaderLabel}>Items</span>
              <span className={local.itemsHeaderCount}>
                {servedN}/{totalN} served
              </span>
            </div>

            {orderState.items.map((it, i) => (
              <div key={i} className={local.itemRow}>
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
                <span className={local.itemRowMain}>
                  <span className={local.itemRowName}>
                    {it.name} x {it.quantity}
                  </span>
                  <span className={local.itemRowPrice}>
                    {formatRupees(it.lineTotal)}
                  </span>
                </span>

                {((it.customizations &&
                  Object.keys(it.customizations).length > 0) ||
                  (it.customMessage && it.customMessage.trim())) && (
                  <span className={local.itemRowExtras}>
                    {it.customizations &&
                      Object.keys(it.customizations).length > 0 && (
                        <span className={local.itemCustom}>
                          {Object.entries(it.customizations)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(" · ")}
                        </span>
                      )}
                    {it.customMessage && it.customMessage.trim() && (
                      <span className={local.itemNote}>
                        Note: {it.customMessage.trim()}
                      </span>
                    )}
                  </span>
                )}
              </div>
            ))}

            {mode === "disabled" && (
              <div className={local.checkboxHint}>
                {orderState.status === "placed"
                  ? "Accept the order to start marking items served."
                  : orderState.status === "accepted"
                    ? 'Tap "Start Preparing" to start marking items served.'
                    : null}
              </div>
            )}
            {mode === "interactive" && !canServe && (
              <div className={local.serveGate}>
                {totalN - servedN} item
                {totalN - servedN === 1 ? "" : "s"} pending before served
              </div>
            )}
          </div>
        )}

        {/* ---- Bill summary ---- */}
        <div className={local.summaryBlock}>
          <div className={local.summaryRow}>
            <span className={local.summaryLabel}>Items ({itemsTotalQty})</span>
            <span className={local.summaryValue}>
              {formatRupees(orderState.subtotal)}
            </span>
          </div>

          {orderState.gstAmount > 0 && (
            <div className={local.summaryRow}>
              <span className={local.summaryLabel}>
                GST ({orderState.gstPercent}%)
              </span>
              <span className={local.summaryValue}>
                {formatRupees(orderState.gstAmount)}
              </span>
            </div>
          )}

          {orderState.packingCharge > 0 && (
            <div className={local.summaryRow}>
              <span className={local.summaryLabel}>Packing</span>
              <span className={local.summaryValue}>
                {formatRupees(orderState.packingCharge)}
              </span>
            </div>
          )}

          {orderState.storewideDiscount > 0 && (
            <div className={`${local.summaryRow} ${local.summaryDiscount}`}>
              <span className={local.summaryLabel}>Discount</span>
              <span className={local.summaryValue}>
                -{formatRupees(orderState.storewideDiscount)}
              </span>
            </div>
          )}

          <div className={`${local.summaryRow} ${local.summaryTotal}`}>
            <span className={local.summaryLabel}>Total</span>
            <span className={local.summaryValue}>
              {formatRupees(orderState.totalAmount)}
            </span>
          </div>

          {orderState.paymentRef && (
            <div className={local.summaryPaidLine}>
              <span>
                Paid via{" "}
                <strong>
                  {orderState.paymentRef === "online" ||
                  orderState.paymentRef.startsWith("upi")
                    ? "Online (UPI)"
                    : orderState.paymentRef === "cash"
                      ? "Cash"
                      : orderState.paymentRef}
                </strong>
              </span>
            </div>
          )}
        </div>

        {/* Hidden printable receipt — kept in the DOM so Generate Bill
            can render it into a new print window. */}
        <div className={local.hiddenReceipt} aria-hidden>
          <div ref={receiptRef}>
            <Receipt order={orderState} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={confirmReject}
        title="Reject order?"
        message={
          <>
            Reject order <strong>#{orderState.orderNo}</strong> at{" "}
            <strong>
              {orderState.tableLabelKind === "number"
                ? `Table ${orderState.tableLabel}`
                : orderState.tableLabel}
            </strong>
            ? The customer will be notified.
          </>
        }
        confirmText="Yes, Reject"
        variant="danger"
        onConfirm={handleReject}
        onCancel={() => setConfirmReject(false)}
      />

      <ConfirmDialog
        isOpen={confirmServed}
        title="Mark order as served?"
        message={
          <>
            Are all items in order <strong>#{orderState.orderNo}</strong> at{" "}
            <strong>
              {orderState.tableLabelKind === "number"
                ? `Table ${orderState.tableLabel}`
                : orderState.tableLabel}
            </strong>{" "}
            served to the table? This will move the order to the Served tab and
            free the table for new orders.
          </>
        }
        confirmText="Yes, all served"
        variant="primary"
        loading={busy}
        onConfirm={handleConfirmServed}
        onCancel={() => setConfirmServed(false)}
      />
    </>
  );
};

export default OrderDetail;
