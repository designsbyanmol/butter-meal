// src/config/retention.ts
/**
 * How long bills and dine-in order history are kept — both in the
 * local cache (`localStorage`) and on Supabase.
 *
 * Change this value to adjust the retention for every history surface
 * (Pharmacy Bill History, Store Bill History, Dine-in Order History)
 * and for the server-side cleanup RPC.
 *
 * The UI filters out anything older than this immediately, so lowering
 * it takes effect on the next open of any history modal. Lowering it
 * also prunes the local cache straight away; the server is pruned by
 * the daily cleanup RPC (or on-demand).
 */
export const HISTORY_RETENTION_MONTHS = 3;

export const historyRetentionCutoffIso = (): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - HISTORY_RETENTION_MONTHS);
  return d.toISOString();
};