// components/Home/sections/FAQ.tsx
import React, { useState } from 'react';
import local from './FAQ.module.scss';
import shell from '../HomePage.module.scss';
import { MinusIcon, PlusIcon } from '../../../assets/svgs';

const ITEMS = [
  {
    q: 'Do my customers need to install an app?',
    a: 'No. They scan a QR code or open your store link in any browser. Everything works on any phone.',
  },
  {
    q: 'How does WhatsApp ordering work?',
    a: 'Customers add items to their cart and place the order. The order arrives on your store WhatsApp number as a neatly formatted message with all items, quantities, notes and totals.',
  },
  {
    q: 'Can I use Dozzelo for both dine-in and delivery?',
    a: 'Yes. Dine-in mode is a switch inside your store settings. Turn it on for restaurants and tables, off for standard catalogue or WhatsApp-only ordering.',
  },
  {
    q: 'Do you take a commission on orders?',
    a: 'Never. You pay a flat monthly subscription. Every rupee from every order goes directly to you.',
  },
  {
    q: 'What do I need to get started?',
    a: 'Your store name, a phone number, and a few menu items. Setup takes about five minutes.',
  },
  {
    q: 'Can I manage multiple stores from one account?',
    a: 'Yes. Each store has its own URL, menu, staff, and settings. Switch between them from one login.',
  },
];

const FAQ: React.FC = () => {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section className={`${shell.section} ${local.section}`} id="faq">
      <div className={shell.sectionInner}>
        <div className={shell.sectionHead}>
          <span className={shell.eyebrow}>Questions & answers</span>
          <h2 className={shell.title}>Everything you need to know</h2>
        </div>

        <div className={local.list}>
          {ITEMS.map((it, i) => {
            const isOpen = open === i;
            return (
              <div
                key={it.q}
                className={`${local.item} ${isOpen ? local.itemOpen : ''}`}
              >
                <button
                  type="button"
                  className={local.question}
                  onClick={() => setOpen(isOpen ? null : i)}
                  aria-expanded={isOpen}
                >
                  <span>{it.q}</span>
                  <span className={local.chevron} aria-hidden>
                    {isOpen ? <MinusIcon width={16} height={16}/> : <PlusIcon width={16} height={16}/>}
                  </span>
                </button>
                {isOpen && <p className={local.answer}>{it.a}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default FAQ;