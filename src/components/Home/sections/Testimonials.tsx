// components/Home/sections/Testimonials.tsx
import React from 'react';
import { Card, Avatar, Badge } from '../../ui';
import local from './Testimonials.module.scss';
import shell from '../HomePage.module.scss';

const QUOTES = [
  {
    label: 'Restaurant owner',
    badge: { text: '+42% orders', tone: 'success' as const },
    text: '“We put Avoca QRs on all 24 tables. Orders flow straight to WhatsApp, bills print in one tap, and my captains finally stopped juggling notebooks.”',
    name: 'Rahul Mehta',
    role: 'Owner · Spice Route, Pune',
    avatar:
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop',
  },
  {
    label: 'Cloud kitchen',
    badge: { text: 'Zero commission', tone: 'warning' as const },
    text: '“I moved off the big delivery apps. Direct WhatsApp orders now cover 70% of my day. Same customer, same food — but I keep the full amount.”',
    name: 'Elena D\'Souza',
    role: 'Chef-owner · Elena Bakes, Goa',
    avatar:
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop',
  },
];

const Testimonials: React.FC = () => (
  <section className={`${shell.section} ${local.section}`} id="stories">
    <div className={shell.sectionInner}>
      <div className={shell.sectionHead}>
        <span className={shell.eyebrow}>Loved by shops</span>
        <h2 className={shell.title}>Businesses growing with Avoca</h2>
      </div>

      <div className={local.grid}>
        {QUOTES.map((q) => (
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
        ))}
      </div>
    </div>
  </section>
);

export default Testimonials;