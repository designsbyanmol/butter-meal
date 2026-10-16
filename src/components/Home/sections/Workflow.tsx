// components/Home/sections/Workflow.tsx
import React from 'react';
import { Badge } from '../../ui';
import local from './Workflow.module.scss';
import shell from '../HomePage.module.scss';

const STEPS = [
  {
    num: '01',
    title: 'Create your store',
    desc: 'Sign up, enter your store name, choose a plan. No credit card, no setup fees — you\'re live in 5 minutes.',
    img: 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=800&q=80',
    note: 'Free 1-month starter on signup',
  },
  {
    num: '02',
    title: 'Add your menu & QR',
    desc: 'Upload items with photos and prices. Download your store QR, print it for tables, counters or flyers.',
    img: 'https://images.unsplash.com/photo-1556740738-b6a63e27c4df?w=800&q=80',
    note: 'Bulk upload · unlimited items',
  },
  {
    num: '03',
    title: 'Start taking orders',
    desc: 'Customers scan, browse, and order — via WhatsApp or dine-in. Bills print in one tap.',
    img: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=80',
    note: 'Live order feed + instant alerts',
  },
];

const Workflow: React.FC = () => (
  <section className={`${shell.section} ${local.section}`} id="workflow">
    <div className={shell.sectionInner}>
      <div className={shell.sectionHead}>
        <span className={shell.eyebrow}>Simple setup</span>
        <h2 className={shell.title}>Live in three easy steps</h2>
        <p className={shell.lead}>
          You don&apos;t need a developer, a designer, or a POS machine. Just
          your menu and a phone.
        </p>
      </div>

      <div className={local.grid}>
        {STEPS.map((s) => (
          <div key={s.num} className={local.step}>
            <div className={local.stepHead}>
              <span className={local.stepNum}>{s.num}</span>
              <Badge tone="success" size="sm">
                {s.note}
              </Badge>
            </div>
            <h3 className={local.stepTitle}>{s.title}</h3>
            <p className={local.stepDesc}>{s.desc}</p>
            <div className={local.stepImgWrap}>
              <img src={s.img} alt={s.title} loading="lazy" />
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default Workflow;