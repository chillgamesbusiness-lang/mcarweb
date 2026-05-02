-- ============================================================
-- Patch: Admin + inspector stability prerequisites
-- Safe to re-run (idempotent).
--
-- Fixes live databases that missed parts of earlier handoff patches:
-- - appointments.booking_submit_id used by booking idempotency
-- - audit_log.actor_kind used by all checked mutations
-- - audit_log action constraint covering every action emitted by the app
-- - pending_photo_urls used by inspector upload flow
-- ============================================================

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'offer_made';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'no_response';

ALTER TABLE audit_log
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE audit_log
  ALTER COLUMN lead_id DROP NOT NULL;

-- audit_log is append-only, so it must not cascade or mutate when a lead is deleted.
-- Preserve historical lead_id values as audit references and allow lead deletion to proceed.
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_lead_id_fkey;

ALTER TABLE audit_log
  ADD COLUMN IF NOT EXISTS actor_kind text NOT NULL DEFAULT 'system';

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_actor_kind_check;
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_actor_kind_check
  CHECK (actor_kind IN ('system', 'public_user', 'admin', 'inspector'));

ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log
  ADD CONSTRAINT audit_log_action_check CHECK (action IN (
    'status_change',
    'finance_change',
    'assignment_change',
    'note_added',
    'inspection_submitted',
    'photos_uploaded',
    'outcome_recorded',
    'valuation_snapshot',
    'calibration_recorded',
    'coefficient_activated',
    'coefficient_rolled_back',
    'booking_created',
    'lead_created',
    'lead_deleted'
  ));

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS booking_submit_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_booking_submit_id_unique
  ON appointments (booking_submit_id)
  WHERE booking_submit_id IS NOT NULL;

-- Deduplicate: keep the most-recent booked appointment per lead,
-- cancel any older duplicates so the unique index can be created.
UPDATE appointments
SET status = 'cancelled'
WHERE id IN (
  SELECT id FROM (
    SELECT id,
           ROW_NUMBER() OVER (
             PARTITION BY lead_id
             ORDER BY created_at DESC
           ) AS rn
    FROM appointments
    WHERE status = 'booked'
  ) ranked
  WHERE rn > 1
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_one_booked_per_lead
  ON appointments (lead_id)
  WHERE status = 'booked';

DO $$ BEGIN
  ALTER TABLE appointments
    ADD CONSTRAINT appointments_start_before_end
    CHECK (start_at < end_at);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS pending_photo_urls text[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_leads_assigned_inspector_status
  ON leads (assigned_inspector_id, status);