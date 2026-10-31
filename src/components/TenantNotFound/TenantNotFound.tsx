// src/components/TenantNotFound/TenantNotFound.tsx
import React from 'react';
import { EmptyState } from '../ui';
import local from './TenantNotFound.module.scss';

export type TenantNotFoundReason = 'not-found' | 'connection';

interface TenantNotFoundProps {
  /**
   * Why the tenant couldn't be resolved.
   * - 'not-found' → tenant genuinely doesn't exist / is inactive.
   * - 'connection' → we couldn't reach the backend (Supabase).
   * Defaults to 'not-found' for backwards compat.
   */
  reason?: TenantNotFoundReason;
}

const TenantNotFound: React.FC<TenantNotFoundProps> = ({
  reason = 'not-found',
}) => {
  if (reason === 'connection') {
    return (
      <div className={local.page}>
        <EmptyState
          icon="⚠"
          title="Reconnecting..."
          description={
            <>
              <p className={local.subtitle}>
                We couldn't reach the store right now.
              </p>
              <p className={local.hint}>
                Check your internet connection. This page will refresh
                automatically once the connection is restored.
              </p>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div className={local.page}>
      <EmptyState
        icon="404"
        title="Something went wrong. Reload Please"
        description={
          <>
            <p className={local.subtitle}>
              Some Technical Glitch has happened or you are on a wrong url.
            </p>
            <p className={local.hint}>
              If you followed a link from someone, ask them to send you an
              up-to-date URL. If you are the store owner, please contact the
              platform administrator.
            </p>
          </>
        }
      />
    </div>
  );
};

export default TenantNotFound;