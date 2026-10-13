// src/components/MainDashboard/OrderDetail/Receipt.tsx
import React from 'react';
import { useTenant } from '../../../contexts/TenantContext';
import { DineinOrder } from '../../../types';
import { formatRupees } from '../../../utils/subscription';
import { consolidateItems } from '../../../utils/billPdf';
import local from './Receipt.module.scss';

interface ReceiptProps {
  order: DineinOrder;
}

const Receipt: React.FC<ReceiptProps> = ({ order }) => {
  const { tenant } = useTenant();
  if (!tenant) return null;

  const tableHeading =
    order.tableLabelKind === 'number'
      ? `Table ${order.tableLabel}`
      : order.tableLabel;

  const lines = consolidateItems(order.items);

  return (
    <div className={local.receipt}>
      {/* ---------- Header ---------- */}
      <div className={local.header}>
        <h2>{tenant.displayName}</h2>
        {tenant.storeTagline && (
          <p className={local.tagline}>{tenant.storeTagline}</p>
        )}
        <div className={local.tableLine}>{tableHeading}</div>
        <div className={local.orderNo}>Order #{order.orderNo}</div>
        <div className={local.dateLine}>
          {new Date(order.createdAt).toLocaleString()}
        </div>
      </div>

      {/* ---------- Column headers ---------- */}
      <div className={local.itemsHeader}>
        <span className={local.colSn}>#</span>
        <span className={local.colName}>Item</span>
        <span className={local.colQty}>Qty</span>
        <span className={local.colPrice}>Price</span>
        <span className={local.colTotal}>Total</span>
      </div>

      {/* ---------- Items ---------- */}
      <div className={local.items}>
        {lines.map((it, i) => (
          <div key={i} className={local.itemRow}>
            <div className={local.itemLine}>
              <span className={local.colSn}>{i + 1}</span>
              <span className={local.colName}>{it.name}</span>
              <span className={local.colQty}>{it.quantity}</span>
              <span className={local.colPrice}>
                {formatRupees(it.unitPrice)}
              </span>
              <span className={local.colTotal}>
                {formatRupees(it.lineTotal)}
              </span>
            </div>

            {it.customizations &&
              Object.keys(it.customizations).length > 0 && (
                <div className={local.itemCustom}>
                  {Object.entries(it.customizations)
                    .map(([k, v]) => `${k}: ${v}`)
                    .join(', ')}
                </div>
              )}

            {it.customMessage && it.customMessage.trim() && (
              <div className={local.itemNote}>
                Note: {it.customMessage.trim()}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ---------- Totals ---------- */}
      <div className={local.totals}>
        <div className={local.row}>
          <span>Subtotal</span>
          <span>{formatRupees(order.subtotal)}</span>
        </div>

        {order.gstAmount > 0 && (
          <div className={local.row}>
            <span>GST ({order.gstPercent}%)</span>
            <span>{formatRupees(order.gstAmount)}</span>
          </div>
        )}

        {order.packingCharge > 0 && (
          <div className={local.row}>
            <span>Packing</span>
            <span>{formatRupees(order.packingCharge)}</span>
          </div>
        )}

        {order.storewideDiscount > 0 && (
          <div className={local.row}>
            <span>Discount</span>
            <span>-{formatRupees(order.storewideDiscount)}</span>
          </div>
        )}

        <div className={`${local.row} ${local.total}`}>
          <span>Total</span>
          <span>{formatRupees(order.totalAmount)}</span>
        </div>
      </div>

      {/* ---------- Footer ---------- */}
      <div className={local.footer}>
        <p>Thank you! Visit again.</p>
      </div>
    </div>
  );
};

export default Receipt;