// src/apps/StaticApp.tsx
import React from 'react';
import styles from './StaticApp.module.scss';

interface StaticAppProps {
  title: string;
  description?: string;
}

const StaticApp: React.FC<StaticAppProps> = ({ title, description }) => (
  <div className={styles.page}>
    <header className={styles.header}>
      <a href="/" className={styles.brand}>
        <img
          src="https://cdn.jsdelivr.net/gh/designsbyanmol/images@main/brand/logo-icon.png"
          alt="Dozzelo"
          width={32}
          height={32}
        />
        <span>Dozzelo</span>
      </a>
      <a href="/" className={styles.backLink}>
        ← Back to home
      </a>
    </header>

    <main className={styles.main}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>
        {description ?? 'This page is coming soon.'}
      </p>
    </main>

    <footer className={styles.footer}>
      © 2026 Dozzelo. All rights reserved.
    </footer>
  </div>
);

export default StaticApp;