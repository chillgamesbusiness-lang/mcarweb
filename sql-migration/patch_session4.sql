-- Session 4: Vehicle lookup cache table + Upstash not needed in DB

-- 1. Cache table for vehicle lookups
CREATE TABLE IF NOT EXISTS vehicle_lookup_cache (
  reg TEXT PRIMARY KEY,
  payload JSONB NOT NULL,
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for cache expiry queries
CREATE INDEX IF NOT EXISTS idx_vehicle_lookup_cache_fetched
  ON vehicle_lookup_cache (fetched_at DESC);

-- RLS: only service role can read/write this table
ALTER TABLE vehicle_lookup_cache ENABLE ROW LEVEL SECURITY;

-- No public policies — only service_role bypasses RLS
