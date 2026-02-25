-- ============================================================
-- Vehicle Acquisition & CRM System v1 — Full Migration
-- Safe to run multiple times (idempotent).
-- ============================================================

-- =====================
-- STEP 1: ENUMS
-- =====================

DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('admin', 'inspector');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM (
    'new', 'contacted', 'appointment_booked',
    'inspected', 'offer_approved', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE finance_status AS ENUM ('not_checked', 'clear', 'finance_found');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_type AS ENUM ('in_person', 'video');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('booked', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- =====================
-- STEP 2: TABLES
-- =====================

CREATE TABLE IF NOT EXISTS users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  role          user_role NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),
  seller_name           text NOT NULL,
  seller_phone          text NOT NULL,
  seller_email          text NOT NULL,
  seller_postcode       text NOT NULL,
  reg                   text NOT NULL,
  make                  text,
  model                 text,
  year                  integer,
  fuel                  text,
  transmission          text,
  colour                text,
  mileage               integer NOT NULL,
  condition             text NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),
  estimated_min         integer,
  estimated_max         integer,
  status                lead_status NOT NULL DEFAULT 'new',
  finance_status        finance_status NOT NULL DEFAULT 'not_checked',
  assigned_inspector_id uuid REFERENCES users(id) ON DELETE SET NULL,
  source                text,
  consent_marketing        boolean NOT NULL DEFAULT false,
  consent_data_processing  boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type             appointment_type NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'booked',
  location_or_link text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inspections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  inspector_id      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checklist_json    jsonb NOT NULL DEFAULT '{}',
  photo_urls        text[] NOT NULL DEFAULT '{}',
  recommended_offer integer,
  notes             text,
  submitted_at      timestamptz
);

CREATE TABLE IF NOT EXISTS notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prepurchase_checklist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  items_json   jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action        text NOT NULL CHECK (action IN (
                  'status_change', 'finance_change', 'assignment_change',
                  'note_added', 'inspection_submitted'
                )),
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE RULE no_update_audit_log AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE OR REPLACE RULE no_delete_audit_log AS ON DELETE TO audit_log DO INSTEAD NOTHING;

-- =====================
-- STEP 3: INDEXES
-- =====================

CREATE INDEX IF NOT EXISTS idx_leads_reg             ON leads (reg);
CREATE INDEX IF NOT EXISTS idx_leads_status          ON leads (status);
CREATE INDEX IF NOT EXISTS idx_leads_created_at      ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_inspector       ON leads (assigned_inspector_id);
CREATE INDEX IF NOT EXISTS idx_leads_finance_status  ON leads (finance_status);
CREATE INDEX IF NOT EXISTS idx_appointments_lead_id  ON appointments (lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON appointments (start_at);
CREATE INDEX IF NOT EXISTS idx_appointments_status   ON appointments (status);
CREATE INDEX IF NOT EXISTS idx_inspections_lead_id      ON inspections (lead_id);
CREATE INDEX IF NOT EXISTS idx_inspections_inspector_id ON inspections (inspector_id);
CREATE INDEX IF NOT EXISTS idx_notes_lead_id         ON notes (lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_lead_id     ON audit_log (lead_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at  ON audit_log (created_at DESC);

-- =====================
-- STEP 4: ROW LEVEL SECURITY
-- =====================

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepurchase_checklist ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role LANGUAGE sql STABLE AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;

-- users policies
DROP POLICY IF EXISTS "admin_read_users" ON users;
CREATE POLICY "admin_read_users" ON users FOR SELECT USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "self_read_users" ON users;
CREATE POLICY "self_read_users" ON users FOR SELECT USING (id = auth.uid());

DROP POLICY IF EXISTS "admin_write_users" ON users;
CREATE POLICY "admin_write_users" ON users FOR ALL USING (get_my_role() = 'admin');

-- leads policies
DROP POLICY IF EXISTS "admin_all_leads" ON leads;
CREATE POLICY "admin_all_leads" ON leads FOR ALL USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "inspector_read_assigned_leads" ON leads;
CREATE POLICY "inspector_read_assigned_leads" ON leads
  FOR SELECT USING (get_my_role() = 'inspector' AND assigned_inspector_id = auth.uid());

-- appointments policies
DROP POLICY IF EXISTS "admin_all_appointments" ON appointments;
CREATE POLICY "admin_all_appointments" ON appointments FOR ALL USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "inspector_read_assigned_appointments" ON appointments;
CREATE POLICY "inspector_read_assigned_appointments" ON appointments
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = appointments.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );

-- inspections policies
DROP POLICY IF EXISTS "admin_read_inspections" ON inspections;
CREATE POLICY "admin_read_inspections" ON inspections FOR SELECT USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "inspector_write_own_inspection" ON inspections;
CREATE POLICY "inspector_write_own_inspection" ON inspections
  FOR ALL USING (
    get_my_role() = 'inspector'
    AND inspector_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = inspections.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );

-- notes policies
DROP POLICY IF EXISTS "admin_all_notes" ON notes;
CREATE POLICY "admin_all_notes" ON notes FOR ALL USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "inspector_read_notes_assigned" ON notes;
CREATE POLICY "inspector_read_notes_assigned" ON notes
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = notes.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );

-- audit_log policies
DROP POLICY IF EXISTS "admin_read_audit_log" ON audit_log;
CREATE POLICY "admin_read_audit_log" ON audit_log FOR SELECT USING (get_my_role() = 'admin');

-- prepurchase_checklist policies
DROP POLICY IF EXISTS "admin_all_checklist" ON prepurchase_checklist;
CREATE POLICY "admin_all_checklist" ON prepurchase_checklist FOR ALL USING (get_my_role() = 'admin');

DROP POLICY IF EXISTS "inspector_read_checklist_assigned" ON prepurchase_checklist;
CREATE POLICY "inspector_read_checklist_assigned" ON prepurchase_checklist
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = prepurchase_checklist.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );

-- =====================
-- STEP 5: STORAGE POLICIES
-- =====================
-- Bucket "inspection-photos" must already exist in Dashboard ? Storage before running these.

DROP POLICY IF EXISTS "inspector_upload_photos" ON storage.objects;
CREATE POLICY "inspector_upload_photos" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'inspection-photos'
    AND auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "admin_read_photos" ON storage.objects;
CREATE POLICY "admin_read_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'inspection-photos'
    AND get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS "inspector_read_own_photos" ON storage.objects;
CREATE POLICY "inspector_read_own_photos" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'inspection-photos'
    AND get_my_role() = 'inspector'
  );

-- ============================================================
-- DONE! Safe to re-run at any time.
--
-- NEXT STEP: Create your first admin user.
--   1. Supabase Dashboard ? Authentication ? Add user ? enter email + password
--   2. Copy the UUID from the user list, then run:
--
--   INSERT INTO users (id, email, name, role)
--   VALUES ('<paste-uuid-here>', 'your@email.com', 'Your Name', 'admin');
--
-- Then log in at https://mcarweb.vercel.app/login
-- ============================================================
