-- Drop the overly-permissive platform_stats_admin_all policy flagged by
-- Supabase Security Advisor ("RLS Policy Always True" — USING (true) on public role).
-- The replacement is platform_stats_admin_write in 20260623_rls_missing_policies.sql,
-- which already restricts writes to authenticated admins only.

DROP POLICY IF EXISTS "platform_stats_admin_all" ON public.platform_stats;
