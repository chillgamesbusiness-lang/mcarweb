-- ============================================================
-- Patch: Fix RLS circular dependency + add performance indexes
--
-- Problem:
--   get_my_role() reads from the users table.
--   Every RLS policy on every table calls get_my_role().
--   When a request arrives via the anon key, Postgres evaluates
--   the RLS policy on users to decide if get_my_role() can read
--   from users — but reading users requires calling get_my_role()
--   first. Circular deadlock / very slow fallback path.
--
-- Fix 1: SECURITY DEFINER on get_my_role()
--   The function now executes with the privileges of its owner
--   (postgres), bypassing RLS on the users table entirely.
--   It returns the role for auth.uid() without triggering any
--   policy evaluation on users.
--
-- Fix 2: Indexes on all RLS-filtered columns
--   Postgres does a sequential scan if the WHERE column has no
--   index. RLS policies on leads filter by assigned_inspector_id
--   and lead_id — both need indexes.
--
-- Fix 3: STABLE volatility (already set, confirmed here)
--   Postgres evaluates STABLE functions once per query, not once
--   per row. Combined with the (SELECT get_my_role()) subquery
--   trick, this prevents per-row re-evaluation.
--
-- Safe to run multiple times.
-- Run in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================


-- ============================================================
-- 1. Rebuild get_my_role() as SECURITY DEFINER
--    - Runs as the function owner (bypasses RLS on users table)
--    - STABLE: result cached within a single query
--    - search_path = '' prevents search-path injection attacks
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role
  FROM public.users
  WHERE id = (SELECT auth.uid())
$$;

-- Revoke public execute, grant only to authenticated + anon
REVOKE ALL ON FUNCTION get_my_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_my_role() TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_role() TO anon;
GRANT EXECUTE ON FUNCTION get_my_role() TO service_role;


-- ============================================================
-- 2. Add indexes on columns used in RLS policy WHERE clauses
-- ============================================================

-- users.id is already the primary key (indexed). No action needed.

-- leads: RLS policies filter on assigned_inspector_id
CREATE INDEX IF NOT EXISTS idx_leads_assigned_inspector
  ON leads(assigned_inspector_id);

-- leads: foreign key from appointments, inspections, notes etc.
CREATE INDEX IF NOT EXISTS idx_leads_id
  ON leads(id);

-- appointments: filter by lead_id in inspector RLS
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id
  ON appointments(lead_id);

-- inspections: filter by lead_id and inspector_id
CREATE INDEX IF NOT EXISTS idx_inspections_lead_id
  ON inspections(lead_id);

CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id
  ON inspections(inspector_id);

-- notes: filter by lead_id in inspector RLS
CREATE INDEX IF NOT EXISTS idx_notes_lead_id
  ON notes(lead_id);

-- prepurchase_checklist: filter by lead_id in inspector RLS
CREATE INDEX IF NOT EXISTS idx_checklist_lead_id
  ON prepurchase_checklist(lead_id);

-- audit_log: most common query is by lead_id
CREATE INDEX IF NOT EXISTS idx_audit_log_lead_id
  ON audit_log(lead_id);

-- otp_sessions: looked up by phone number
CREATE INDEX IF NOT EXISTS idx_otp_sessions_phone
  ON otp_sessions(phone);

-- valuation_snapshots: looked up by lead_id  
CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_lead_id
  ON valuation_snapshots(lead_id);


-- ============================================================
-- DONE.
-- After running this, the anon/authenticated key can call
-- get_my_role() and all RLS policies will evaluate correctly
-- without circular dependency or sequential scans.
-- No app restart or Vercel redeploy needed.
-- ============================================================
