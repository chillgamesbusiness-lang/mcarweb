-- ============================================================
-- Session 6: Valuation snapshots + Outcome tracking
-- Safe to re-run (idempotent).
-- ============================================================

-- ─── 1. Valuation Snapshots ─────────────────────────────────────────────────
-- Frozen at time of quote. Never recomputed.
-- One snapshot per lead (1:1). Stores full input + computed output.

CREATE TABLE IF NOT EXISTS valuation_snapshots (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id         uuid NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- Input snapshot (frozen vehicle profile at quote time)
  input_vehicle   jsonb NOT NULL,       -- VehicleProfile object
  input_condition text NOT NULL,
  input_postcode  text NOT NULL,

  -- Computed output (frozen result)
  result_min          integer NOT NULL,
  result_max          integer NOT NULL,
  result_midpoint     integer NOT NULL,
  confidence_score    integer NOT NULL,
  risk_tier           text NOT NULL,
  risk_flags          jsonb NOT NULL DEFAULT '[]',
  auto_quote          boolean NOT NULL,
  market_value_used   integer NOT NULL,
  all_multipliers     jsonb NOT NULL,    -- AllMultipliers object
  region_used         text NOT NULL,
  engine_version      text NOT NULL DEFAULT 'v1',
  valuation_engine_version text NOT NULL DEFAULT 'pricingEngine.calculateValuation:v3.0'
);

CREATE INDEX IF NOT EXISTS idx_valuation_snapshots_lead_id
  ON valuation_snapshots (lead_id);

ALTER TABLE valuation_snapshots ENABLE ROW LEVEL SECURITY;

-- Only service role + admin can read these
DROP POLICY IF EXISTS "admin_read_valuation_snapshots" ON valuation_snapshots;
CREATE POLICY "admin_read_valuation_snapshots" ON valuation_snapshots
  FOR SELECT USING (get_my_role() = 'admin');

-- ─── 2. Outcome tracking on leads ──────────────────────────────────────────

-- outcome column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'outcome'
  ) THEN
    ALTER TABLE leads ADD COLUMN outcome text
      CHECK (outcome IN ('won', 'lost') OR outcome IS NULL);
  END IF;
END $$;

-- reason_if_lost column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'reason_if_lost'
  ) THEN
    ALTER TABLE leads ADD COLUMN reason_if_lost text
      CHECK (reason_if_lost IN (
        'price_too_low',
        'sold_elsewhere',
        'changed_mind',
        'failed_inspection',
        'no_response',
        'other'
      ) OR reason_if_lost IS NULL);
  END IF;
END $$;

-- final_offer column (what was actually agreed, if won)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'final_offer'
  ) THEN
    ALTER TABLE leads ADD COLUMN final_offer integer;
  END IF;
END $$;

-- outcome_at timestamp
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'outcome_at'
  ) THEN
    ALTER TABLE leads ADD COLUMN outcome_at timestamptz;
  END IF;
END $$;

-- Index for outcome analytics
CREATE INDEX IF NOT EXISTS idx_leads_outcome ON leads (outcome);

-- ─── 3. Expand audit_log action check ──────────────────────────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  'status_change',
  'finance_change',
  'assignment_change',
  'note_added',
  'inspection_submitted',
  'photos_uploaded',
  'outcome_recorded',
  'valuation_snapshot'
));

-- ============================================================
-- DONE!
-- ============================================================
