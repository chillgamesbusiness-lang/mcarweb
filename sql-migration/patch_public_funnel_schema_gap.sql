-- ============================================================
-- Patch: Public funnel production schema gap
-- Safe to re-run (idempotent).
--
-- Fixes the live OTP/contact/booking path when older production
-- databases are missing the public-funnel hardening columns.
-- ============================================================

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'verified';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'offer_made';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'no_response';

ALTER TABLE audit_log
  ALTER COLUMN actor_user_id DROP NOT NULL;

ALTER TABLE audit_log
  ALTER COLUMN lead_id DROP NOT NULL;

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

ALTER TABLE leads ADD COLUMN IF NOT EXISTS offer_token_jti text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS contact_submit_id text;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS otp_session_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_offer_token_jti_unique
  ON leads (offer_token_jti)
  WHERE offer_token_jti IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_leads_contact_submit_id_unique
  ON leads (contact_submit_id)
  WHERE contact_submit_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_leads_reg_phone_created
  ON leads (reg, seller_phone, created_at DESC);

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS booking_submit_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_booking_submit_id_unique
  ON appointments (booking_submit_id)
  WHERE booking_submit_id IS NOT NULL;

ALTER TABLE valuation_snapshots
  ADD COLUMN IF NOT EXISTS valuation_engine_version text;

UPDATE valuation_snapshots
SET valuation_engine_version = COALESCE(valuation_engine_version, engine_version, 'pricingEngine.calculateValuation:v3.0')
WHERE valuation_engine_version IS NULL;

ALTER TABLE valuation_snapshots
  ALTER COLUMN valuation_engine_version SET DEFAULT 'pricingEngine.calculateValuation:v3.0';