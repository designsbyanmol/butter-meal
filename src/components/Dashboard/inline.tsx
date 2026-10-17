// components/Dashboard/inline.tsx
import React from 'react';
import local from './DashboardShell.module.scss';

interface InlineSectionProps {
  title: string;
  actions?: React.ReactNode;
  /**
   * When true, the header row is hidden. Used when the section is
   * embedded inside a modal that already renders the title + actions.
   */
  embedded?: boolean;
  children: React.ReactNode;
}

export const InlineSection: React.FC<InlineSectionProps> = ({
  title,
  actions,
  embedded = false,
  children,
}) => {
  if (embedded) {
    return <div className={local.sectionBody}>{children}</div>;
  }

  return (
    <div className={local.sectionWrap}>
      <div className={local.sectionHead}>
        <h2 className={local.sectionTitle}>{title}</h2>
        {actions && <div className={local.sectionActions}>{actions}</div>}
      </div>
      <div className={local.sectionBody}>{children}</div>
    </div>
  );
};