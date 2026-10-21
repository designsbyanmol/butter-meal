// src/components/Header/AdminNotificationsDrawer.tsx
import React, { useCallback } from 'react';
import { supabaseService } from '../../services/supabase.service';
import {
  DisputeNotificationsDrawer,
  DisputeNotifRow,
} from './DisputeNotificationsDrawer';

interface Props {
  onOpenDispute: (disputeId: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const AdminNotificationsDrawer: React.FC<Props> = ({
  onOpenDispute,
  isOpen,
  onClose,
}) => {
  const fetchRows = useCallback(async (): Promise<DisputeNotifRow[]> => {
    const list = await supabaseService.getDisputesWithReviews({
      status: 'pending',
    });
    return list.map((d) => ({
      id: d.disputeId,
      timeIso: d.createdAt,
      seenAt: d.platformSeenAt ?? null,
      payload: {
        disputeId: d.disputeId,
        tenantName: d.tenantName,
      },
    }));
  }, []);

  const markSeen = useCallback(async (id: string) => {
    await supabaseService.markDisputePlatformSeen(id);
  }, []);

  const clearAll = useCallback(async () => {
    await supabaseService.clearPlatformDisputes();
  }, []);

  const renderRowBody = useCallback(
    (row: DisputeNotifRow) => (
      <>
        <strong>{row.payload.tenantName}</strong> raised a dispute
      </>
    ),
    [],
  );

  return (
    <DisputeNotificationsDrawer
      enabled
      fetchRows={fetchRows}
      markSeen={markSeen}
      clearAll={clearAll}
      onRowClick={(payload) => onOpenDispute(payload.disputeId)}
      renderRowBody={renderRowBody}
      clearConfirmMessage="This removes every pending dispute from this list on every device. New disputes will still appear as they come in."
      emptyTitle="No notifications yet"
      emptyDescription="Disputes raised by tenants will show up here."
      isOpen={isOpen}
      onClose={onClose}
    />
  );
};

export default AdminNotificationsDrawer;