// components/MainDashboard/Modals/ReviewsModalBody.tsx
import React, { useEffect, useState } from 'react';
import { Tabs } from '../../ui';
import ReviewSettingsPanel from '../ReviewSettingsPanel';
import StoreWiseReviews from './reviews/StoreWiseReviews';
import DisputedReviews from './reviews/DisputedReviews';
import ResolvedReviews from './reviews/ResolvedReviews';
import { InlineSection } from '../../Dashboard/inline';
import local from './Modals.module.scss';

interface ReviewsModalBodyProps {
  /** When set, the body opens on the Disputed tab and highlights this row. */
  initialDisputeId?: string | null;
}

type TabKey = 'settings' | 'store' | 'disputed' | 'resolved';

const ReviewsModalBody: React.FC<ReviewsModalBodyProps> = ({
  initialDisputeId = null,
}) => {
  const [tab, setTab] = useState<TabKey>('store');

  useEffect(() => {
    if (initialDisputeId) {
      setTab('disputed');
    }
  }, [initialDisputeId]);

  return (
    <InlineSection title="Reviews">
      <div className={local.reviewsHeader}>
        <Tabs<TabKey>
          block
          items={[
            { key: 'store', label: 'Store-wise' },
            { key: 'disputed', label: 'Disputed' },
            { key: 'resolved', label: 'Resolved' },
            { key: 'settings', label: 'Settings' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      <div className={local.reviewsBody}>
        {tab === 'settings' && <ReviewSettingsPanel />}
        {tab === 'store' && <StoreWiseReviews />}
        {tab === 'disputed' && (
          <DisputedReviews focusDisputeId={initialDisputeId} />
        )}
        {tab === 'resolved' && <ResolvedReviews />}
      </div>
    </InlineSection>
  );
};

export default ReviewsModalBody;