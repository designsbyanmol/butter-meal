// components/Home/sections/Testimonials.tsx
import React from 'react';
import { Card, Avatar, Badge, Slider } from '../../ui';
import local from './Testimonials.module.scss';
import shell from '../HomePage.module.scss';

const CDN = 'https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/avatar';

const QUOTES = [
  {
    label: 'Restaurant owner',
    badge: { text: '+42% orders', tone: 'success' as const },
    text: '"We printed Dozzelo QRs for all 24 tables and my captains stopped running between the kitchen and counter. Orders hit our WhatsApp instantly, bills print in one tap, and Saturday night no longer turns into chaos."',
    name: 'Rahul Mehta',
    role: 'Owner - Spice Route, Pune',
    avatar:
      `${CDN}/user-1.webp`,
  },
  {
    label: 'Cloud kitchen',
    badge: { text: 'Zero commission', tone: 'warning' as const },
    text: '"I moved off the big delivery apps six months ago. Direct WhatsApp orders now cover 70% of my day, and I keep the full amount - no commission cuts, no cold food sitting in a delivery bag. Just my customers ordering from me."',
    name: "Elena D'Souza",
    role: 'Chef-owner - Elena Bakes, Goa',
    avatar:
      `${CDN}/user-2.webp`,
  },
  {
    label: 'Cafe chain',
    badge: { text: '-40% calls', tone: 'success' as const },
    text: '"Three cafes, one dashboard. My managers update the menu once and all three outlets reflect it in seconds. The dine-in QR is what customers love most - no waiting for a waiter just to see the menu or ask for the bill."',
    name: 'Ananya Krishnan',
    role: 'Co-founder - Filter Coffee Co., Bengaluru',
    avatar:
      `${CDN}/user-3.webp`,
  },
  {
    label: 'Sweets & snacks',
    badge: { text: '2 min billing', tone: 'info' as const },
    text: '"Festival season used to break us. Now my staff scan a QR at the counter and print an 80mm bill in two minutes flat. The GST is handled automatically, and I finally have time to actually greet the regulars."',
    name: 'Vikram Singh Rathore',
    role: 'Owner - Mithai Mahal, Jaipur',
    avatar:
      `${CDN}/user-4.webp`,
  },
  {
    label: 'Online bakery',
    badge: { text: '-30 min per rush', tone: 'success' as const },
    text: '"Cake pre-orders used to be a notebook of scribbles and missed calls. Now every custom order lands as a clean WhatsApp message with the design photo, delivery time and customer name. My baker reads it once and starts work."',
    name: 'Priya Raghavan',
    role: 'Head baker - The Butter Tin, Chennai',
    avatar:
      `${CDN}/user-5.webp`,
  },
  {
    label: 'Quick-service',
    badge: { text: '+55% repeat', tone: 'success' as const },
    text: '"Repeat customers jumped the moment we started collecting their names on every order. Dozzelo ties each order to a phone number, so my staff recognises regulars and remembers their usual. Small thing - makes a huge difference on a busy Sunday."',
    name: 'Arjun Banerjee',
    role: 'Franchise owner - Kolkata Roll Co., Kolkata',
    avatar:
      `${CDN}/user-6.webp`,
  },
];

const Testimonials: React.FC = () => {
  const slides = QUOTES.map((q) => (
    <Card key={q.name} padding="lg" className={local.card}>
      <div className={local.head}>
        <span className={local.label}>{q.label}</span>
        <Badge tone={q.badge.tone} size="sm">
          {q.badge.text}
        </Badge>
      </div>
      <p className={local.text}>{q.text}</p>
      <div className={local.foot}>
        <Avatar src={q.avatar} size="md" name={q.name} />
        <div className={local.footText}>
          <strong>{q.name}</strong>
          <span>{q.role}</span>
        </div>
      </div>
    </Card>
  ));

  return (
    <section className={`${shell.section} ${local.section}`} id="stories">
      <div className={shell.sectionInner}>
        <div className={shell.sectionHead}>
          <span className={shell.eyebrow}>Loved by shops</span>
          <h2 className={shell.title}>Businesses growing with Dozzelo</h2>
        </div>

        <Slider
          items={slides}
          itemsPerView={{ desktop: 2, tablet: 2, mobile: 1.1}}
          mobilePeek={1.1}
          gap={10}
          loop={false}
          // autoPlayMs={7000}
          pauseOnHover
          showDots
          showArrows = {false}
          showCounter={false}
          ariaLabel="Customer testimonials"
          className={local.slider}
        />
      </div>
    </section>
  );
};

export default Testimonials;