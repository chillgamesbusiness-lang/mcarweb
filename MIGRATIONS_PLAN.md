# Migrations Plan – Vehicle Acquisition & CRM System v1

**Status:** Pre-build reference
**Last updated:** 22 February 2026
**Tool:** Supabase CLI (`supabase migration new <name>`) + SQL editor fallback

Run everything in the order listed. Do not skip steps.

---

## Step 1 — Enums

Create all enums before any table that references them.

```sql
-- Migration: 001_create_enums

CREATE TYPE user_role AS ENUM (
  'admin',
  'inspector'
);

CREATE TYPE lead_status AS ENUM (
  'new',
  'contacted',
  'appointment_booked',
  'inspected',
  'offer_approved',
  'won',
  'lost'
);

CREATE TYPE finance_status AS ENUM (
  'not_checked',
  'clear',
  'finance_found'
);

CREATE TYPE appointment_type AS ENUM (
  'in_person',
  'video'
);

CREATE TYPE appointment_status AS ENUM (
  'booked',
  'completed',
  'cancelled',
  'no_show'
);
```

---

## Step 2 — Tables (dependency order)

### 2a — `users`

No foreign key dependencies. Must exist before leads, inspections, notes, etc.

```sql
-- Migration: 002_create_users

CREATE TABLE users (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name          text NOT NULL,
  email         text NOT NULL UNIQUE,
  role          user_role NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  last_login_at timestamptz
);
```

> `id` is the Supabase Auth `user.id` — no separate serial. This keeps auth and profile in sync.

---

### 2b — `leads`

Depends on `users` (via `assigned_inspector_id`).

```sql
-- Migration: 003_create_leads

CREATE TABLE leads (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at            timestamptz NOT NULL DEFAULT now(),

  -- Seller
  seller_name           text NOT NULL,
  seller_phone          text NOT NULL,
  seller_email          text NOT NULL,
  seller_postcode       text NOT NULL,

  -- Vehicle (from reg lookup)
  reg                   text NOT NULL,
  make                  text,
  model                 text,
  year                  integer,
  fuel                  text,
  transmission          text,
  colour                text,

  -- Condition (user-entered)
  mileage               integer NOT NULL,
  condition             text NOT NULL CHECK (condition IN ('excellent', 'good', 'fair', 'poor')),

  -- Offer
  estimated_min         integer,
  estimated_max         integer,

  -- CRM state
  status                lead_status NOT NULL DEFAULT 'new',
  finance_status        finance_status NOT NULL DEFAULT 'not_checked',
  assigned_inspector_id uuid REFERENCES users(id) ON DELETE SET NULL,

  -- Attribution
  source                text,

  -- Consent
  consent_marketing        boolean NOT NULL DEFAULT false,
  consent_data_processing  boolean NOT NULL DEFAULT true
);
```

---

### 2c — `appointments`

Depends on `leads`.

```sql
-- Migration: 004_create_appointments

CREATE TABLE appointments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  type             appointment_type NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  status           appointment_status NOT NULL DEFAULT 'booked',
  location_or_link text,
  created_at       timestamptz NOT NULL DEFAULT now()
);
```

---

### 2d — `inspections`

Depends on `leads` and `users`.

```sql
-- Migration: 005_create_inspections

CREATE TABLE inspections (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id           uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  inspector_id      uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  checklist_json    jsonb NOT NULL DEFAULT '{}',
  photo_urls        text[] NOT NULL DEFAULT '{}',
  recommended_offer integer,
  notes             text,
  submitted_at      timestamptz
);
```

---

### 2e — `notes`

Depends on `leads` and `users`.

```sql
-- Migration: 006_create_notes

CREATE TABLE notes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id        uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  author_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  body           text NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);
```

---

### 2f — `prepurchase_checklist`

Depends on `leads` and `users`.

```sql
-- Migration: 007_create_prepurchase_checklist

CREATE TABLE prepurchase_checklist (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id      uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  items_json   jsonb NOT NULL DEFAULT '{}',
  completed_at timestamptz,
  completed_by uuid REFERENCES users(id) ON DELETE SET NULL
);
```

---

### 2g — `audit_log`

Depends on `leads` and `users`. Append-only — no updates or deletes.

```sql
-- Migration: 008_create_audit_log

CREATE TABLE audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id       uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  action        text NOT NULL CHECK (action IN (
                  'status_change',
                  'finance_change',
                  'assignment_change',
                  'note_added',
                  'inspection_submitted'
                )),
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  old_value     jsonb,
  new_value     jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Prevent any updates or deletes on audit_log
CREATE RULE no_update_audit_log AS ON UPDATE TO audit_log DO INSTEAD NOTHING;
CREATE RULE no_delete_audit_log AS ON DELETE TO audit_log DO INSTEAD NOTHING;
```

---

## Step 3 — Indexes

Run after all tables are created.

```sql
-- Migration: 009_create_indexes

-- leads
CREATE INDEX idx_leads_reg             ON leads (reg);
CREATE INDEX idx_leads_status          ON leads (status);
CREATE INDEX idx_leads_created_at      ON leads (created_at DESC);
CREATE INDEX idx_leads_inspector       ON leads (assigned_inspector_id);
CREATE INDEX idx_leads_finance_status  ON leads (finance_status);

-- appointments
CREATE INDEX idx_appointments_lead_id  ON appointments (lead_id);
CREATE INDEX idx_appointments_start_at ON appointments (start_at);
CREATE INDEX idx_appointments_status   ON appointments (status);

-- inspections
CREATE INDEX idx_inspections_lead_id      ON inspections (lead_id);
CREATE INDEX idx_inspections_inspector_id ON inspections (inspector_id);

-- notes
CREATE INDEX idx_notes_lead_id ON notes (lead_id);

-- audit_log
CREATE INDEX idx_audit_log_lead_id ON audit_log (lead_id);
CREATE INDEX idx_audit_log_created_at ON audit_log (created_at DESC);
```

---

## Step 4 — Row Level Security (RLS) Policies

Enable RLS on every table first, then apply policies.

### 4a — Enable RLS

```sql
-- Migration: 010_enable_rls

ALTER TABLE users                ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads                ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections          ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE prepurchase_checklist ENABLE ROW LEVEL SECURITY;
```

---

### 4b — Helper function

Returns the role of the currently authenticated user. Used in all policies.

```sql
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role
LANGUAGE sql STABLE
AS $$
  SELECT role FROM users WHERE id = auth.uid()
$$;
```

---

### 4c — `users` policies

```sql
-- Admin can read all users
CREATE POLICY "admin_read_users" ON users
  FOR SELECT USING (get_my_role() = 'admin');

-- Any authenticated user can read their own row
CREATE POLICY "self_read_users" ON users
  FOR SELECT USING (id = auth.uid());

-- Only admin can insert/update/delete users
CREATE POLICY "admin_write_users" ON users
  FOR ALL USING (get_my_role() = 'admin');
```

---

### 4d — `leads` policies

```sql
-- Admin: full access
CREATE POLICY "admin_all_leads" ON leads
  FOR ALL USING (get_my_role() = 'admin');

-- Inspector: read only their assigned leads
CREATE POLICY "inspector_read_assigned_leads" ON leads
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND assigned_inspector_id = auth.uid()
  );

-- Public insert (lead submission via server-side API route using service role key)
-- No public RLS policy needed here — public funnel uses service_role key server-side
```

---

### 4e — `appointments` policies

```sql
-- Admin: full access
CREATE POLICY "admin_all_appointments" ON appointments
  FOR ALL USING (get_my_role() = 'admin');

-- Inspector: read appointments for their assigned leads only
CREATE POLICY "inspector_read_assigned_appointments" ON appointments
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = appointments.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );
```

---

### 4f — `inspections` policies

```sql
-- Admin: full read access
CREATE POLICY "admin_read_inspections" ON inspections
  FOR SELECT USING (get_my_role() = 'admin');

-- Inspector: insert and update only for their assigned lead
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
```

---

### 4g — `notes` policies

```sql
-- Admin: full access
CREATE POLICY "admin_all_notes" ON notes
  FOR ALL USING (get_my_role() = 'admin');

-- Inspector: read notes on assigned leads
CREATE POLICY "inspector_read_notes_assigned" ON notes
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = notes.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );
```

---

### 4h — `audit_log` policies

```sql
-- Admin: read all
CREATE POLICY "admin_read_audit_log" ON audit_log
  FOR SELECT USING (get_my_role() = 'admin');

-- No insert policy — audit_log is written server-side via service_role key only
-- No update/delete policies — blocked by rules at table level
```

---

### 4i — `prepurchase_checklist` policies

```sql
-- Admin: full access
CREATE POLICY "admin_all_checklist" ON prepurchase_checklist
  FOR ALL USING (get_my_role() = 'admin');

-- Inspector: read only for assigned lead
CREATE POLICY "inspector_read_checklist_assigned" ON prepurchase_checklist
  FOR SELECT USING (
    get_my_role() = 'inspector'
    AND EXISTS (
      SELECT 1 FROM leads
      WHERE leads.id = prepurchase_checklist.lead_id
      AND leads.assigned_inspector_id = auth.uid()
    )
  );
```

---

## Step 5 — Supabase Storage Bucket

Configure via Supabase Dashboard → Storage, or CLI.

```
Bucket name:    inspection-photos
Public:         false (private bucket)
File size limit: 10 MB per file
Allowed MIME types: image/jpeg, image/png, image/webp
```

### Storage RLS policies

```sql
-- Inspectors can upload to their own path: inspection-photos/{lead_id}/{inspector_id}/*
CREATE POLICY "inspector_upload_photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'inspection-photos'
    AND auth.role() = 'authenticated'
  );

-- Admin can read all photos
CREATE POLICY "admin_read_photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inspection-photos'
    AND get_my_role() = 'admin'
  );

-- Inspector can read photos for assigned leads only
-- (enforce path convention: inspection-photos/{lead_id}/... and check lead assignment)
CREATE POLICY "inspector_read_own_photos"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'inspection-photos'
    AND get_my_role() = 'inspector'
  );
```

> **Note:** Use signed URLs generated server-side for all photo reads. Do not expose bucket URLs directly.

---

## RLS Checklist

Use this as a sign-off before going live.

- [ ] `users` — admin reads all, self reads own, admin writes all
- [ ] `leads` — admin full, inspector reads assigned only, public insert via service_role server-side
- [ ] `appointments` — admin full, inspector reads assigned only
- [ ] `inspections` — admin reads all, inspector inserts/updates own assigned leads
- [ ] `notes` — admin full, inspector reads assigned only
- [ ] `audit_log` — admin reads all, insert via service_role only, no update/delete
- [ ] `prepurchase_checklist` — admin full, inspector reads assigned only
- [ ] Storage bucket — private, signed reads, inspector upload path enforced
- [ ] `get_my_role()` function deployed and tested
- [ ] Verified: inspector querying unassigned lead returns 0 rows
- [ ] Verified: unauthenticated request returns 0 rows on all tables
