// services/plan.service.ts
import { supabase } from './supabase.client';
import {
  Plan,
  Invoice,
  PauseRequest,
  DurationMonths,
  PlanFeatures,
} from '../types';

export interface PlanChangeQuote {
  isUpgrade: boolean;
  isDowngrade: boolean;
  isRenewal: boolean;
  baseAmount: number;
  creditAmount: number;
  finalAmount: number;
  extraDays: number;
  newExpiresAt: string;
  currentPlanId: string;
  currentPlanPrice: number;
  newPlanPrice: number;
  remainingDays: number;
  months: number;
}

class PlanService {
  private getClient() {
    return supabase;
  }

  // ---------- Plans ----------
  async getAllPlans(): Promise<Plan[]> {
  const client = this.getClient();
  if (!client) {
    throw new Error('Supabase not configured');
  }
  const { data, error } = await client
    .from('star_veg_plans')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('getAllPlans error:', error);
    throw new Error(error.message || 'Failed to load plans');
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    name: row.name,
    monthlyPrice: Number(row.monthly_price),
    description: row.description ?? '',
    features: (row.features ?? {}) as PlanFeatures,
    isActive: row.is_active !== false,
    sortOrder: row.sort_order ?? 0,
  }));
}

  async getPlanById(id: string): Promise<Plan | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('star_veg_plans')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return {
      id: data.id,
      name: data.name,
      monthlyPrice: Number(data.monthly_price),
      description: data.description ?? '',
      features: (data.features ?? {}) as PlanFeatures,
      isActive: data.is_active !== false,
      sortOrder: data.sort_order ?? 0,
    };
  }

  // ---------- Invoices ----------

async createInvoice(params: {
  tenantSlug: string;
  planId: string;
  months: number;
  baseAmount: number;
  discountPct: number;
  finalAmount: number;
}): Promise<Invoice | null> {
  const client = this.getClient();
  if (!client) {
    throw new Error('Supabase client not configured');
  }

  // Try to resolve tenant_id, but allow null during signup.
  let tenantId: string | null = null;
  try {
    const { data: tenantRow, error: tErr } = await client
      .from('star_veg_tenants')
      .select('id')
      .eq('slug', params.tenantSlug)
      .maybeSingle();

    if (tErr) {
      // Non-fatal - signup flow where the tenant doesn't exist yet.
      console.warn('createInvoice: tenant lookup failed', tErr.message);
    } else if (tenantRow) {
      tenantId = tenantRow.id;
    }
  } catch (err) {
    console.warn('createInvoice: tenant lookup threw', err);
  }

  const payload = {
    tenant_id: tenantId,               // may be null
    tenant_slug: params.tenantSlug,
    plan_id: params.planId,
    months: params.months,
    base_amount: params.baseAmount,
    discount_pct: params.discountPct,
    final_amount: params.finalAmount,
    status: 'pending',
  };

  console.log('[createInvoice] inserting', payload);

  const { data, error } = await client
    .from('star_veg_invoices')
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error('[createInvoice] insert error:', {
      code: error.code,
      message: error.message,
      details: (error as any).details,
      hint: (error as any).hint,
    });

    // Friendlier messages for common cases
    if (error.code === '42P01') {
      throw new Error('Invoices table not found. Did the SQL migration run?');
    }
    if (error.code === '42501') {
      throw new Error(
        'Permission denied inserting invoice. Check RLS policies and grants.',
      );
    }
    if (error.code === '23503') {
      throw new Error(
        'Foreign key violation. Check that plan_id exists in star_veg_plans.',
      );
    }
    if (error.code === '23502') {
      throw new Error(
        'Missing required column on invoice. A NOT NULL constraint is failing.',
      );
    }

    throw new Error(error.message || 'Failed to create invoice');
  }

  if (!data) {
    throw new Error('Invoice created but no row returned');
  }

  return this.mapInvoice(data);
}

  async updateInvoiceRazorpayOrder(
    invoiceId: string,
    razorpayOrderId: string,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client
      .from('star_veg_invoices')
      .update({ razorpay_order_id: razorpayOrderId })
      .eq('id', invoiceId);
    return !error;
  }

  async getInvoiceById(id: string): Promise<Invoice | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client
      .from('star_veg_invoices')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error || !data) return null;
    return this.mapInvoice(data);
  }

  async getInvoicesForTenant(slug: string): Promise<Invoice[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('star_veg_invoices')
      .select('*')
      .eq('tenant_slug', slug)
      .order('created_at', { ascending: false });
    if (error) return [];
    return (data || []).map((r: any) => this.mapInvoice(r));
  }

  async markInvoicePaid(
    invoiceId: string,
    adminNote?: string,
  ): Promise<Invoice | null> {
    const client = this.getClient();
    if (!client) return null;
    const { data, error } = await client.rpc('mark_invoice_paid', {
      invoice_id_in: invoiceId,
      admin_note_in: adminNote ?? null,
    });
    if (error) {
      console.error('mark_invoice_paid error:', error);
      throw new Error(error.message || 'Failed to mark invoice paid');
    }
    const row = Array.isArray(data) ? data[0] : data;
    return row ? this.mapInvoice(row) : null;
  }

  // ---------- Subscription ----------
  async createTenantWithPlan(params: {
  displayName: string;
  slug: string;
  ownerPhone: string;
  ownerName: string;
  ownerPassword: string;
  planId: string;
  months: number;
  whatsappPhone?: string;
  storeCategory?: string;
}): Promise<boolean> {
  const client = this.getClient();
  if (!client) return false;
  const { error } = await client.rpc('create_tenant_with_plan', {
    display_name_in: params.displayName,
    slug_in: params.slug,
    owner_phone_in: params.ownerPhone,
    owner_name_in: params.ownerName,
    owner_pw_in: params.ownerPassword,
    plan_id_in: params.planId,
    months_in: params.months,
    whatsapp_phone_in: params.whatsappPhone ?? params.ownerPhone,
    store_category_in: params.storeCategory ?? 'restaurant',
  });
  if (error) {
    console.error('create_tenant_with_plan error:', error);
    throw new Error(error.message || 'Failed to create tenant');
  }
  return true;
}

  async extendSubscription(
    slug: string,
    months: number,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc('extend_subscription', {
      tenant_slug_in: slug,
      months_in: months,
    });
    if (error) {
      console.error('extend_subscription error:', error);
      throw new Error(error.message || 'Failed to extend subscription');
    }
    return true;
  }

  async changePlan(
    slug: string,
    planId: string,
    months: number,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { error } = await client.rpc('change_plan', {
      tenant_slug_in: slug,
      plan_id_in: planId,
      months_in: months,
    });
    if (error) {
      console.error('change_plan error:', error);
      throw new Error(error.message || 'Failed to change plan');
    }
    return true;
  }

  async requestPause(slug: string): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc('request_pause_tenant', {
      tenant_slug_in: slug,
    });
    if (error) return false;
    return !!data;
  }

  async resolvePauseRequest(
    requestId: string,
    accept: boolean,
  ): Promise<boolean> {
    const client = this.getClient();
    if (!client) return false;
    const { data, error } = await client.rpc('resolve_pause_request', {
      request_id_in: requestId,
      accept_in: accept,
    });
    if (error) return false;
    return !!data;
  }

  async getPendingPauseRequests(): Promise<PauseRequest[]> {
    const client = this.getClient();
    if (!client) return [];
    const { data, error } = await client
      .from('star_veg_pause_requests')
      .select(
        'id, tenant_slug, requested_at, status, resolved_at, resolved_by',
      )
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });
    if (error) return [];
    return (data || []).map((row: any) => ({
      id: row.id,
      tenantSlug: row.tenant_slug,
      requestedAt: row.requested_at,
      status: row.status,
      resolvedAt: row.resolved_at,
      resolvedBy: row.resolved_by,
    }));
  }

  async expireStaleSubscriptions(): Promise<number> {
    const client = this.getClient();
    if (!client) return 0;
    const { data, error } = await client.rpc('expire_stale_subscriptions');
    if (error) return 0;
    return Number(data) || 0;
  }

  // ---------- Mapper ----------
  private mapInvoice(row: any): Invoice {
    return {
      id: row.id,
      tenantSlug: row.tenant_slug,
      planId: row.plan_id,
      months: row.months,
      baseAmount: Number(row.base_amount),
      discountPct: Number(row.discount_pct),
      finalAmount: Number(row.final_amount),
      status: row.status,
      paidAt: row.paid_at ?? undefined,
      markedPaidBy: row.marked_paid_by ?? undefined,
      razorpayOrderId: row.razorpay_order_id ?? undefined,
      razorpayPaymentId: row.razorpay_payment_id ?? undefined,
      notes: row.notes ?? '',
      createdAt: row.created_at,
    };
  }

  async getPlanChangeQuote(
  tenantSlug: string,
  newPlanId: string,
  months: number,
): Promise<PlanChangeQuote | null> {
  const client = this.getClient();
  if (!client) return null;

  const { data, error } = await client.rpc('compute_plan_change_quote', {
    tenant_slug_in: tenantSlug,
    new_plan_id_in: newPlanId,
    months_in: months,
  });

  if (error) {
    console.error('compute_plan_change_quote error:', error);
    throw new Error(error.message || 'Failed to compute quote');
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    isUpgrade: row.is_upgrade === true,
    isDowngrade: row.is_downgrade === true,
    isRenewal: row.is_renewal === true,
    baseAmount: Number(row.base_amount),
    creditAmount: Number(row.credit_amount),
    finalAmount: Number(row.final_amount),
    extraDays: Number(row.extra_days) || 0,
    newExpiresAt: row.new_expires_at,
    currentPlanId: row.current_plan_id,
    currentPlanPrice: Number(row.current_plan_price),
    newPlanPrice: Number(row.new_plan_price),
    remainingDays: Number(row.remaining_days) || 0,
    months: Number(row.months),
  };
}
}

export const planService = new PlanService();