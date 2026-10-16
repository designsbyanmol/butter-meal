// components/Home/sections/Vertical.tsx
import React from 'react';
import { Badge } from '../../ui';
import { CheckIcon } from '../../../assets/svgs';
import local from './Vertical.module.scss';
import shell from '../HomePage.module.scss';

const Vertical: React.FC = () => (
  <section className={`${shell.section} ${local.section}`} id="vertical">
    <div className={`${shell.sectionInner} ${local.split}`}>
      <div className={local.copy}>
        <span className={shell.eyebrow}>For dine-in restaurants</span>
        <h2 className={`${shell.title} ${local.title}`}>
          Turn every table into a self-service counter
        </h2>
        <p className={shell.lead} style={{ margin: 0 }}>
          Guests scan a QR at their table, order in seconds, and see what
          they&apos;ve ordered — while your staff tracks each item as it
          leaves the kitchen.
        </p>

        <ul className={local.list}>
          {[
            'QR placed on each table — no waiter needed to take orders',
            'Item-by-item served tracking so nothing gets missed',
            'One-tap bill requests, pay online via UPI or settle offline',
            'Staff tips shown to customers on the bill screen',
            'Kitchen-first view: see every table\'s status at a glance',
          ].map((line) => (
            <li key={line}>
              <CheckIcon width={14} height={14} fill="#1e7e34" />
              <span>{line}</span>
            </li>
          ))}
        </ul>

        <div className={local.badges}>
          <Badge tone="info" size="sm">UPI payments</Badge>
          <Badge tone="success" size="sm">Instant 80mm bills</Badge>
          <Badge tone="warning" size="sm">Staff tip support</Badge>
        </div>
      </div>

      <div className={local.visual}>
        <div className={local.tableCard}>
          <div className={local.tableCardHead}>
            <span className={local.tableName}>Table 04</span>
            <Badge tone="info" size="sm">Preparing</Badge>
          </div>
          <div className={local.tableItems}>
            {[
              { name: 'Veg Biryani', qty: 2, served: true },
              { name: 'Butter Naan', qty: 4, served: true },
              { name: 'Paneer Tikka', qty: 1, served: false },
              { name: 'Gulab Jamun', qty: 2, served: false },
            ].map((it) => (
              <div key={it.name} className={local.tableItem}>
                <span
                  className={
                    it.served ? local.checkOn : local.checkOff
                  }
                  aria-hidden
                >
                  {it.served ? '✓' : ''}
                </span>
                <span className={local.tableItemName}>{it.name}</span>
                <span className={local.tableItemQty}>× {it.qty}</span>
              </div>
            ))}
          </div>
          <div className={local.tableCardFoot}>
            <span>Subtotal</span>
            <span className={local.tableCardTotal}>₹1,140</span>
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Vertical;