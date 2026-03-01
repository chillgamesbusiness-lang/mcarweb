-- ============================================================
-- Patch: v3 Engine — Explanation + Profit + Coefficients + Outcome Pipeline
-- Safe to re-run (idempotent).
-- ============================================================

-- ─── 1. Valuation snapshot new columns ─────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'valuation_snapshots'
      AND column_name = 'customer_explanation'
  ) THEN
    ALTER TABLE valuation_snapshots ADD COLUMN customer_explanation jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'valuation_snapshots'
      AND column_name = 'admin_explanation'
  ) THEN
    ALTER TABLE valuation_snapshots ADD COLUMN admin_explanation jsonb;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'valuation_snapshots'
      AND column_name = 'profit_simulation'
  ) THEN
    ALTER TABLE valuation_snapshots ADD COLUMN profit_simulation jsonb;
  END IF;
END $$;

-- ─── 2. Engine Coefficients (versioned, feature-flagged) ───────────────────
CREATE TABLE IF NOT EXISTS engine_coefficients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id      text NOT NULL UNIQUE,
  coefficients    jsonb NOT NULL,
  status          text NOT NULL DEFAULT 'candidate'
                    CHECK (status IN ('current', 'candidate', 'retired', 'rolled_back')),
  shadow_mode     boolean NOT NULL DEFAULT true,
  activated_at    timestamptz,
  retired_at      timestamptz,
  owner_admin_id  uuid REFERENCES auth.users(id),
  reasoning       text[] NOT NULL DEFAULT '{}',
  sample_size     integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE engine_coefficients ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_engine_coefficients" ON engine_coefficients;
CREATE POLICY "service_role_all_engine_coefficients" ON engine_coefficients
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_engine_coefficients_status
  ON engine_coefficients (status);

-- ─── 3. Shadow Comparison Log ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS shadow_comparison_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             uuid REFERENCES leads(id) ON DELETE SET NULL,
  current_version     text NOT NULL,
  candidate_version   text NOT NULL,
  current_midpoint    integer NOT NULL,
  candidate_midpoint  integer NOT NULL,
  current_min         integer NOT NULL,
  candidate_min       integer NOT NULL,
  current_max         integer NOT NULL,
  candidate_max       integer NOT NULL,
  delta_midpoint      integer NOT NULL,
  delta_pct           numeric(6,2) NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE shadow_comparison_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_role_all_shadow_log" ON shadow_comparison_log;
CREATE POLICY "service_role_all_shadow_log" ON shadow_comparison_log
  FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_shadow_log_candidate
  ON shadow_comparison_log (candidate_version);

-- ─── 4. Extended outcome columns on leads ──────────────────────────────────
-- actual_purchase_price: what the business paid the seller
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'actual_purchase_price'
  ) THEN
    ALTER TABLE leads ADD COLUMN actual_purchase_price integer;
  END IF;
END $$;

-- actual_resale_price: what the car was resold for
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'actual_resale_price'
  ) THEN
    ALTER TABLE leads ADD COLUMN actual_resale_price integer;
  END IF;
END $$;

-- actual_recon_cost: actual recon spend
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'actual_recon_cost'
  ) THEN
    ALTER TABLE leads ADD COLUMN actual_recon_cost integer;
  END IF;
END $$;

-- days_to_sale: how many days from purchase to resale
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'days_to_sale'
  ) THEN
    ALTER TABLE leads ADD COLUMN days_to_sale integer;
  END IF;
END $$;

-- ─── 5. Expand audit_log action check for new actions ─────────────────────
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
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
  'coefficient_rolled_back'
));
