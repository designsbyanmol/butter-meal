// src/components/Header/TenantNotificationsDrawer.tsx
import React, { useCallback } from 'react';
import { Badge } from '../ui';
import { supabaseService } from '../../services/supabase.service';
import { useTenant } from '../../contexts/TenantContext';
import {
  DisputeNotificationsDrawer,
  DisputeNotifRow,
} from './DisputeNotificationsDrawer';
import shared from './DisputeNotificationsDrawer.module.scss';

interface Props {
  onOpenReview: (notif: {
    disputeId: string;
    reviewId: string;
    outcome: 'deleted' | 'rejected';
    reviewItemName: string | null;
  }) => void;
}

const TenantNotificationsDrawer: React.FC<Props> = ({ onOpenReview }) => {
  const { tenant } = useTenant();

  const fetchRows = useCallback(async (): Promise<DisputeNotifRow[]> => {
    if (!tenant) return [];
    const list = await supabaseService.getResolvedDisputesForTenant(
      tenant.slug,
    );
    return list.map((d) => ({
      id: d.disputeId,
      timeIso: d.resolvedAt ?? d.createdAt,
      seenAt: d.tenantSeenAt ?? null,
      payload: {
        disputeId: d.disputeId,
        reviewId: d.reviewId,
        outcome: d.outcome,
        reviewItemName: d.review?.itemName ?? null,
      },
    }));
  }, [tenant?.slug]);

  const markSeen = useCallback(async (id: string) => {
    await supabaseService.markDisputeTenantSeen(id);
  }, []);

  const clearAll = useCallback(async () => {
    if (!tenant?.slug) return;
    await supabaseService.clearTenantDisputes(tenant.slug);
  }, [tenant?.slug]);

  const renderRowBody = useCallback((row: DisputeNotifRow) => {
    const { outcome, reviewItemName } = row.payload;
    const action = outcome === 'deleted' ? 'removed' : 'rejected';
    return (
      <>
        Your dispute was <strong>{action}</strong>
        {reviewItemName && (
          <>
            {' '}
            — <em>{reviewItemName}</em>
          </>
        )}
        <span className={shared.rowMeta}>
          <Badge
            tone={outcome === 'deleted' ? 'danger' : 'warning'}
            size="sm"
          >
            {outcome === 'deleted' ? 'Review removed' : 'Dispute rejected'}
          </Badge>
        </span>
      </>
    );
  }, []);

  return (
    <DisputeNotificationsDrawer
      enabled={!!tenant}
      fetchRows={fetchRows}
      markSeen={markSeen}
      clearAll={clearAll}
      onRowClick={onOpenReview}
      renderRowBody={renderRowBody}
      clearConfirmMessage="This removes every resolved dispute from this list on every device. New updates will still appear as they come in."
      emptyDescription="Updates on your review disputes will show up here."
    />
  );
};

export default TenantNotificationsDrawer;