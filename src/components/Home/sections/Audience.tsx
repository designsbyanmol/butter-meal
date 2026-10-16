// components/Home/sections/Audience.tsx
import React from 'react';
import { STORE_CATEGORIES } from '../../../data/storeCategories';
import local from './Audience.module.scss';
import shell from '../HomePage.module.scss';

const Audience: React.FC = () => (
  <section className={shell.section} id="audience">
    <div className={shell.sectionInner}>
      <div className={shell.sectionHead}>
        <span className={shell.eyebrow}>Built for your business</span>
        <h2 className={shell.title}>One platform, any shop</h2>
        <p className={shell.lead}>
          Whether you run a busy restaurant or a small home kitchen, Avoca
          adapts to how you sell.
        </p>
      </div>

      <div className={local.grid}>
        {STORE_CATEGORIES.map((c) => (
          <article
            key={c.value}
            className={`${local.card} ${local[c.accent]}`}
          >
            <div className={local.cardImage}>
              <img src={c.image} alt={c.label} loading="lazy" />
            </div>
            <div className={local.cardBody}>
              <span className={local.cardIcon} aria-hidden />
              <h3 className={local.cardTitle}>{c.label}</h3>
              <p className={local.cardDesc}>{c.description}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Audience;