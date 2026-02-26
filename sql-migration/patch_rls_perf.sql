-- ============================================================
-- Patch: Fix RLS performance issues (Supabase DB Linter)
--
-- Issue 1 (auth_rls_initplan): auth.uid() / auth.role() were
--   called directly in policy USING clauses, causing Postgres to
--   re-evaluate them for every row scanned.
--   Fix: wrap in (select auth.uid()) so the planner hoists it as
--   an InitPlan evaluated once per query.
--
-- Issue 2 (multiple_permissive_policies): FOR ALL admin policies
--   overlap with inspector FOR SELECT policies on the same tables,
--   meaning Postgres must evaluate BOTH per row.
--   Fix: replace admin FOR ALL with explicit INSERT/UPDATE/DELETE
--   policies; merge SELECT access into a single unified policy per
--   table using OR, covering both admin and inspector cases.
--
-- Safe to run multiple times (all creates are preceded by drops).
-- ============================================================


-- ============================================================
-- Fix get_my_role() helper — cache auth.uid() as a subselect
-- so it is planned once per query, not once per row.
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = (SELECT auth.uid())
$$;


-- ============================================================
-- TABLE: users
-- Before: 3 overlapping SELECT policies
--   admin_read_users  (FOR SELECT)
--   admin_write_users (FOR ALL  → includes SELECT)
--   self_read_users   (FOR SELECT, used bare auth.uid())
-- After:  1 merged SELECT + explicit admin INSERT/UPDATE/DELETE
-- ============================================================
DROP POLICY IF EXISTS "admin_read_users"  ON users;
DROP POLICY IF EXISTS "admin_write_users" ON users;
DROP POLICY IF EXISTS "self_read_users"   ON users;

-- Merged SELECT: admin sees everyone, user sees themselves
CREATE POLICY "users_select" ON users
  FOR SELECT USING (
    (SELECT get_my_role()) = 'admin'
    OR id = (SELECT auth.uid())
  );

CREATE POLICY "admin_insert_users" ON users
  FOR INSERT WITH CHECK ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_update_users" ON users
  FOR UPDATE USING ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_delete_users" ON users
  FOR DELETE USING ((SELECT get_my_role()) = 'admin');


-- ============================================================
-- TABLE: leads
-- Before: admin_all_leads (FOR ALL) + inspector_read_assigned_leads (FOR SELECT)
-- After:  1 merged SELECT + explicit admin INS/UPD/DEL
-- ============================================================
DROP POLICY IF EXISTS "admin_all_leads"                ON leads;
DROP POLICY IF EXISTS "inspector_read_assigned_leads"  ON leads;

CREATE POLICY "leads_select" ON leads
  FOR SELECT USING (
    (SELECT get_my_role()) = 'admin'
    OR (
      (SELECT get_my_role()) = 'inspector'
      AND assigned_inspector_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "admin_insert_leads" ON leads
  FOR INSERT WITH CHECK ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_update_leads" ON leads
  FOR UPDATE USING ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_delete_leads" ON leads
  FOR DELETE USING ((SELECT get_my_role()) = 'admin');


-- ============================================================
-- TABLE: appointments
-- Before: admin_all_appointments (FOR ALL) + inspector_read_assigned_appointments (FOR SELECT)
-- After:  1 merged SELECT + explicit admin INS/UPD/DEL
-- ============================================================
DROP POLICY IF EXISTS "admin_all_appointments"                    ON appointments;
DROP POLICY IF EXISTS "inspector_read_assigned_appointments"      ON appointments;

CREATE POLICY "appointments_select" ON appointments
  FOR SELECT USING (
    (SELECT get_my_role()) = 'admin'
    OR (
      (SELECT get_my_role()) = 'inspector'
      AND EXISTS (
        SELECT 1 FROM leads
        WHERE leads.id = appointments.lead_id
          AND leads.assigned_inspector_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "admin_insert_appointments" ON appointments
  FOR INSERT WITH CHECK ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_update_appointments" ON appointments
  FOR UPDATE USING ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_delete_appointments" ON appointments
  FOR DELETE USING ((SELECT get_my_role()) = 'admin');


-- ============================================================
-- TABLE: inspections
-- Before: admin_read_inspections (FOR SELECT) + inspector_write_own_inspection (FOR ALL → includes SELECT)
-- After:  1 merged SELECT + inspector INS/UPD (no admin write needed — admin reads only)
-- ============================================================
DROP POLICY IF EXISTS "admin_read_inspections"         ON inspections;
DROP POLICY IF EXISTS "inspector_write_own_inspection" ON inspections;

CREATE POLICY "inspections_select" ON inspections
  FOR SELECT USING (
    (SELECT get_my_role()) = 'admin'
    OR (
      (SELECT get_my_role()) = 'inspector'
      AND inspector_id = (SELECT auth.uid())
    )
  );

-- Inspector can submit / update their own inspection on assigned leads
CREATE POLICY "inspector_insert_inspection" ON inspections
  FOR INSERT WITH CHECK (
    (SELECT get_my_role()) = 'inspector'
    AND inspector_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = inspections.lead_id
        AND leads.assigned_inspector_id = (SELECT auth.uid())
    )
  );

CREATE POLICY "inspector_update_inspection" ON inspections
  FOR UPDATE USING (
    (SELECT get_my_role()) = 'inspector'
    AND inspector_id = (SELECT auth.uid())
  );


-- ============================================================
-- TABLE: notes
-- Before: admin_all_notes (FOR ALL) + inspector_read_notes_assigned (FOR SELECT)
-- After:  1 merged SELECT + explicit admin INS/UPD/DEL
-- ============================================================
DROP POLICY IF EXISTS "admin_all_notes"                ON notes;
DROP POLICY IF EXISTS "inspector_read_notes_assigned"  ON notes;

CREATE POLICY "notes_select" ON notes
  FOR SELECT USING (
    (SELECT get_my_role()) = 'admin'
    OR (
      (SELECT get_my_role()) = 'inspector'
      AND EXISTS (
        SELECT 1 FROM leads
        WHERE leads.id = notes.lead_id
          AND leads.assigned_inspector_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "admin_insert_notes" ON notes
  FOR INSERT WITH CHECK ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_update_notes" ON notes
  FOR UPDATE USING ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_delete_notes" ON notes
  FOR DELETE USING ((SELECT get_my_role()) = 'admin');


-- ============================================================
-- TABLE: prepurchase_checklist
-- Before: admin_all_checklist (FOR ALL) + inspector_read_checklist_assigned (FOR SELECT)
-- After:  1 merged SELECT + explicit admin INS/UPD/DEL
-- ============================================================
DROP POLICY IF EXISTS "admin_all_checklist"                  ON prepurchase_checklist;
DROP POLICY IF EXISTS "inspector_read_checklist_assigned"    ON prepurchase_checklist;

CREATE POLICY "checklist_select" ON prepurchase_checklist
  FOR SELECT USING (
    (SELECT get_my_role()) = 'admin'
    OR (
      (SELECT get_my_role()) = 'inspector'
      AND EXISTS (
        SELECT 1 FROM leads
        WHERE leads.id = prepurchase_checklist.lead_id
          AND leads.assigned_inspector_id = (SELECT auth.uid())
      )
    )
  );

CREATE POLICY "admin_insert_checklist" ON prepurchase_checklist
  FOR INSERT WITH CHECK ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_update_checklist" ON prepurchase_checklist
  FOR UPDATE USING ((SELECT get_my_role()) = 'admin');

CREATE POLICY "admin_delete_checklist" ON prepurchase_checklist
  FOR DELETE USING ((SELECT get_my_role()) = 'admin');


-- ============================================================
-- TABLE: otp_sessions
-- Fix auth.role() called bare (re-evaluated per row)
-- ============================================================
DROP POLICY IF EXISTS "Service role full access on otp_sessions" ON otp_sessions;

CREATE POLICY "Service role full access on otp_sessions"
  ON otp_sessions
  FOR ALL
  USING ((SELECT auth.role()) = 'service_role');


-- ============================================================
-- STORAGE: inspection-photos
-- Fix auth.role() called bare in inspector_upload_photos
-- ============================================================
DROP POLICY IF EXISTS "inspector_upload_photos" ON storage.objects;

CREATE POLICY "inspector_upload_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inspection-photos'
    AND (SELECT auth.role()) = 'authenticated'
  );

-- ============================================================
-- DONE.
-- Run this in: Supabase Dashboard → SQL Editor
-- No app restart or Vercel redeploy needed.
-- ============================================================
