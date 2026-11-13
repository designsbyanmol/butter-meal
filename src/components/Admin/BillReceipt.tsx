// src/components/Admin/BillReceipt.tsx
import React, { forwardRef } from "react";
import { formatRupees } from "../../utils/subscription";
import type { Tenant } from "../../contexts/TenantContext";
import type { BillSettlement } from "../../types";
import local from "./Pharmacy.module.scss";

export interface BillReceiptLine {
  id?: string;
  name: string;
  quantity: number;
  price: number;
  pack?: string;
  amount: number;
  customizations?: Record<string, string>;
  customMessage?: string;
}

export interface BillReceiptProps {
  tenant: Tenant | null;
  billNo: string;
  /** Pre-formatted timestamp string ("12 Nov 2026, 04:32 PM"). */
  timestamp: string;
  customerName: string;
  address?: string;
  items: BillReceiptLine[];
  subtotal: number;
  lineDiscount: number;
  additionalDiscountPct: number;
  additionalDiscount: number;
  gstPercent: number;
  gstAmount: number;
  taxableValue: number;
  finalAmount: number;
  terms?: string;
  /** Optional refunds to print at the bottom. */
  settlements?: BillSettlement[];
}

const BillReceipt = forwardRef<HTMLDivElement, BillReceiptProps>(
  (
    {
      tenant,
      billNo,
      timestamp,
      customerName,
      address,
      items,
      subtotal,
      lineDiscount,
      additionalDiscountPct,
      additionalDiscount,
      gstPercent,
      gstAmount,
      taxableValue,
      finalAmount,
      terms,
      settlements = [],
    },
    ref,
  ) => (
    <div ref={ref} className={local.billingReceipt}>
      <div className={local.billingHeader}>
        <h2>{tenant?.displayName || "Store"}</h2>
        {tenant?.storeAddress && (
          <p className={local.billingAddress}>{tenant.storeAddress}</p>
        )}
        {tenant?.storeTagline && (
          <p className={local.billingTagline}>{tenant.storeTagline}</p>
        )}
        {tenant?.gstNo && (
          <p className={local.billingGstin}>GSTIN: {tenant.gstNo}</p>
        )}
        {tenant?.whatsappPhone && (
          <p className={local.billingContact}>Ph: {tenant.whatsappPhone}</p>
        )}
      </div>

      <div className={local.billingCustomerBar}>
        <div className={local.billingCustomerCell}>
          <div>
            <strong>Customer:</strong> {customerName || "-"}
          </div>
          {address && (
            <div>
              <strong>Address:</strong> {address}
            </div>
          )}
        </div>
        <div className={local.billingDocCell}>
          <div className={local.billNo}>{billNo}</div>
          <div className={local.billDate}>{timestamp}</div>
        </div>
      </div>

      <div className={local.billingItemsHeader}>
        <span className={local.billingColSn}>#</span>
        <span className={local.billingColName}>Item</span>
        <span className={local.billingColQty}>Qty</span>
        <span className={local.billingColPrice}>Price</span>
        <span className={local.billingColTotal}>Total</span>
      </div>

      <div className={local.billingItems}>
        {items.map((ln, i) => (
          <div key={ln.id ?? i} className={local.billingItemLine}>
            <span className={local.billingColSn}>{i + 1}</span>
            <span className={local.billingColName}>
              {ln.name}
              {ln.pack && (
                <div className={local.billingItemPack}>{ln.pack} per pack</div>
              )}
              {ln.customizations &&
                Object.keys(ln.customizations).length > 0 && (
                  <div className={local.billingItemCustom}>
                    {Object.entries(ln.customizations)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")}
                  </div>
                )}
              {ln.customMessage && (
                <div className={local.billingItemNote}>
                  Note: {ln.customMessage}
                </div>
              )}
            </span>
            <span className={local.billingColQty}>{ln.quantity}</span>
            <span className={local.billingColPrice}>
              {Number(ln.price).toFixed(2)}
            </span>
            <span className={local.billingColTotal}>
              {Number(ln.amount).toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      <div className={local.billingTotals}>
        <div className={local.billingTotalRow}>
          <span>Subtotal</span>
          <span>{formatRupees(subtotal)}</span>
        </div>
        <div className={local.billingTotalRow}>
          <span>Item discount</span>
          <span>-{formatRupees(lineDiscount)}</span>
        </div>
        {additionalDiscountPct > 0 && (
          <div className={local.billingTotalRow}>
            <span>Additional ({additionalDiscountPct}%)</span>
            <span>-{formatRupees(additionalDiscount)}</span>
          </div>
        )}
        {gstPercent > 0 && (
          <>
            <div className={local.billingTotalRow}>
              <span>Taxable value</span>
              <span>{formatRupees(taxableValue)}</span>
            </div>
            <div className={local.billingTotalRow}>
              <span>GST ({gstPercent}%)</span>
              <span>{formatRupees(gstAmount)}</span>
            </div>
          </>
        )}
        <div className={`${local.billingTotalRow} ${local.billingTotalBig}`}>
          <span>Total</span>
          <span>{formatRupees(finalAmount)}</span>
        </div>
      </div>

      {settlements.length > 0 && (
        <div className={local.billingSettlements}>
          {settlements.map((s) => (
            <div key={s.id}>
              Refund:{" "}
              <span className={local.refundAmount}>
                {formatRupees(s.refundTotal)}
              </span>{" "}
              on {new Date(s.createdAt).toLocaleDateString("en-IN")}
            </div>
          ))}
        </div>
      )}

      {terms && (
        <div className={local.billingTerms}>
          <div className={local.billingTermsTitle}>Terms & Conditions</div>
          <div className={local.billingTermsBody}>{terms}</div>
        </div>
      )}

      <div className={local.billingFooter}>
        <div className={local.billingFooterText}>Thank you! Visit again.</div>
      </div>
    </div>
  ),
);

BillReceipt.displayName = "BillReceipt";
export default BillReceipt;
