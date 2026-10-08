// src/components/ui/Accordion/Accordion.tsx
import React, { useState } from 'react';
import { RightArrow } from '../../../assets/svgs';
import styles from './Accordion.module.scss';

export interface AccordionProps {
  title: React.ReactNode;
  /** Optional content shown right of the title (e.g. count pill). */
  meta?: React.ReactNode;
  /** Default open state. Uncontrolled. */
  defaultOpen?: boolean;
  /** Force open regardless of internal state. */
  forceOpen?: boolean;
  /** Hide the header toggle (render the body only). Useful for search overrides. */
  hideHeader?: boolean;
  className?: string;
  children: React.ReactNode;
}

const Accordion: React.FC<AccordionProps> = ({
  title,
  meta,
  defaultOpen = false,
  forceOpen = false,
  hideHeader = false,
  className,
  children,
}) => {
  const [open, setOpen] = useState(defaultOpen);
  const isOpen = forceOpen || open;

  if (hideHeader) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={[styles.wrap, className ?? ''].filter(Boolean).join(' ')}>
      <button
        type="button"
        className={styles.header}
        onClick={() => setOpen((s) => !s)}
        aria-expanded={isOpen}
      >
        <span
          className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ''}`}
          aria-hidden
        >
          <RightArrow width={16} height={16} fill="#1e1e1e" />
        </span>
        <span className={styles.title}>{title}</span>
        {meta && <span className={styles.meta}>{meta}</span>}
      </button>

      {isOpen && <div className={styles.body}>{children}</div>}
    </div>
  );
};

export default Accordion;