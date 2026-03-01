-- Engine Coefficients + Shadow Mode
-- Stores versioned coefficient sets with activation tracking.
-- Shadow mode: candidate coefficients are logged alongside current but don't affect real offers.

-- ── Table: engine_coefficients ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS engine_coefficients (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id     text NOT NULL UNIQUE,  -- e.g. 'v3.0.0', 'v3.1.0-rc1'
  coefficients   jsonb NOT NULL,         -- CalibrationCoefficients JSON
  status         text NOT NULL DEFAULT 'candidate' CHECK (status IN ('current', 'candidate', 'retired', 'rolled_back')),
  shadow_mode    boolean NOT NULL DEFAULT true,  -- true = log only, don't use for real offers
  activated_at   timestamptz,
  retired_at     timestamptz,
  owner_admin_id uuid REFERENCES auth.users(id),
  reasoning      text[],                 -- from computeCalibrationAdjustments
  sample_size    integer DEFAULT 0,
  created_at     timestamptz DEFAULT now() NOT NULL
);

-- Index for fast lookup of current active coefficient set
CREATE INDEX IF NOT EXISTS idx_engine_coefficients_status ON engine_coefficients(status) WHERE status = 'current';

-- ── Table: shadow_comparison_log ─────────────────────────────────────────────
-- Logs what the candidate coefficients WOULD have returned vs what current returned.

CREATE TABLE IF NOT EXISTS shadow_comparison_log (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id         uuid,
  current_version text NOT NULL,
  candidate_version text NOT NULL,
  current_midpoint  integer NOT NULL,
  candidate_midpoint integer NOT NULL,
  current_min       integer NOT NULL,
  candidate_min     integer NOT NULL,
  current_max       integer NOT NULL,
  candidate_max     integer NOT NULL,
  delta_midpoint    integer NOT NULL,
  delta_pct         numeric(6,2) NOT NULL,
  created_at        timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_shadow_log_created ON shadow_comparison_log(created_at DESC);

-- ── RLS policies ─────────────────────────────────────────────────────────────

ALTER TABLE engine_coefficients ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_comparison_log ENABLE ROW LEVEL SECURITY;

-- Service role only — no anon/user access
CREATE POLICY "engine_coefficients_service_only"
  ON engine_coefficients FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "shadow_log_service_only"
  ON shadow_comparison_log FOR ALL
  USING (auth.role() = 'service_role');
