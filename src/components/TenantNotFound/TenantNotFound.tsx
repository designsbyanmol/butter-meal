// components/TenantNotFound/TenantNotFound.tsx
import React from 'react';
import { EmptyState } from '../ui';
import local from './TenantNotFound.module.scss';

const TenantNotFound: React.FC = () => {
  return (
    <div className={local.page}>
      <EmptyState
        icon="🔍"
        title="URL does not exist"
        description={
          <>
            <p className={local.subtitle}>
              This store link is invalid or has been removed.
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