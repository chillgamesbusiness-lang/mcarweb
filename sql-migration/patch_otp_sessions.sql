-- Migration: Update otp_sessions table structure for secure OTP storage
-- - Store code_hash instead of plaintext codes
-- - Add ip_address tracking for per-IP rate limiting
-- - Add created_at for cooldown enforcement
-- - Rename expiresAt to expires_at for consistency

-- Drop old table if exists (no production data yet)
DROP TABLE IF EXISTS otp_sessions;

CREATE TABLE otp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT NOT NULL,
  code_hash TEXT NOT NULL,           -- SHA-256 hash of OTP code (never store plaintext)
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INT NOT NULL DEFAULT 0,
  verified BOOLEAN NOT NULL DEFAULT FALSE,
  ip_address TEXT,                    -- For per-IP rate limiting & audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for lookups by phone (cooldown checks, analytics)
CREATE INDEX idx_otp_sessions_phone ON otp_sessions (phone, created_at DESC);

-- Index for cleanup of expired sessions
CREATE INDEX idx_otp_sessions_expires ON otp_sessions (expires_at);

-- Auto-delete expired sessions after 24 hours (keeps table lean)
-- Run periodically via pg_cron or manual cleanup:
-- DELETE FROM otp_sessions WHERE expires_at < NOW() - INTERVAL '24 hours';

-- Enable RLS
ALTER TABLE otp_sessions ENABLE ROW LEVEL SECURITY;

-- Service role only — no public access to OTP sessions
CREATE POLICY "Service role full access on otp_sessions"
  ON otp_sessions
  FOR ALL
  USING (auth.role() = 'service_role');
