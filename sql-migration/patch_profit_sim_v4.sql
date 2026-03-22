-- Add profit_simulation_v4 JSONB column to valuation_snapshots
-- This stores the v4 Resale Evidence Engine output alongside the existing v3 profit_simulation.
-- Nullable: old snapshots won't have it, and if v4 enrichment fails it stays null.

ALTER TABLE valuation_snapshots
  ADD COLUMN IF NOT EXISTS profit_simulation_v4 jsonb DEFAULT NULL;

-- Index for querying leads with/without v4 data (shadow mode analysis)
CREATE INDEX IF NOT EXISTS idx_val_snap_has_v4
  ON valuation_snapshots ((profit_simulation_v4 IS NOT NULL));

COMMENT ON COLUMN valuation_snapshots.profit_simulation_v4 IS
  'V4 Resale Evidence Engine output — resale/profit/margin/confidence + evidence + comps. Null for pre-v4 snapshots or if enrichment failed.';
