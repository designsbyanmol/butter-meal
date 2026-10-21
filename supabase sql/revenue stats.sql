CREATE OR REPLACE FUNCTION get_platform_revenue_stats()
RETURNS JSONB AS $$
DECLARE
  total_revenue NUMERIC;
  revenue_this_month NUMERIC;
  revenue_last_month NUMERIC;
  total_invoices INTEGER;
  pending_invoices INTEGER;
  pending_amount NUMERIC;
  recent_invoices JSONB;
BEGIN
  -- 1. Total Revenue (All time)
  SELECT COALESCE(SUM(final_amount), 0) INTO total_revenue
  FROM star_veg_invoices
  WHERE status = 'paid';

  -- 2. Revenue This Month
  SELECT COALESCE(SUM(final_amount), 0) INTO revenue_this_month
  FROM star_veg_invoices
  WHERE status = 'paid' 
    AND created_at >= date_trunc('month', CURRENT_DATE);

  -- 3. Revenue Last Month
  SELECT COALESCE(SUM(final_amount), 0) INTO revenue_last_month
  FROM star_veg_invoices
  WHERE status = 'paid' 
    AND created_at >= date_trunc('month', CURRENT_DATE - INTERVAL '1 month')
    AND created_at < date_trunc('month', CURRENT_DATE);

  -- 4. Invoice Counts & Pending Amount
  SELECT COUNT(*) INTO total_invoices FROM star_veg_invoices;
  
  SELECT COUNT(*), COALESCE(SUM(final_amount), 0) 
  INTO pending_invoices, pending_amount
  FROM star_veg_invoices
  WHERE status = 'pending';

  -- 5. Recent 10 Invoices (joined with tenant names)
  SELECT jsonb_agg(t) INTO recent_invoices
  FROM (
    SELECT 
      i.id,
      i.tenant_slug,
      tn.display_name AS tenant_name,
      i.final_amount,
      i.status,
      i.plan_id,
      i.months,
      i.created_at
    FROM star_veg_invoices i
    LEFT JOIN star_veg_tenants tn ON tn.slug = i.tenant_slug
    ORDER BY i.created_at DESC
    LIMIT 10
  ) t;

  RETURN jsonb_build_object(
    'totalRevenue', total_revenue,
    'revenueThisMonth', revenue_this_month,
    'revenueLastMonth', revenue_last_month,
    'totalInvoices', total_invoices,
    'pendingInvoices', pending_invoices,
    'pendingAmount', pending_amount,
    'recentInvoices', COALESCE(recent_invoices, '[]'::jsonb)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_platform_revenue_stats() TO anon, authenticated;