// components/Dashboard/inline.tsx
import React from 'react';
import local from './DashboardShell.module.scss';

interface InlineSectionProps {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Standard chrome for a right-pane section: a header row with a title
 * and optional action buttons, then the section body.
 */
export const InlineSection: React.FC<InlineSectionProps> = ({
  title,
  actions,
  children,
}) => (
  <div className={local.sectionWrap}>
    <div className={local.sectionHead}>
      <h2 className={local.sectionTitle}>{title}</h2>
      {actions && <div className={local.sectionActions}>{actions}</div>}
    </div>
    <div className={local.sectionBody}>{children}</div>
  </div>
);