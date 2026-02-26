-- ============================================================
-- Patch: Add pending_photo_urls + expand audit_log action
-- Safe to re-run (idempotent).
-- ============================================================

-- Add pending_photo_urls column to leads
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'leads'
      AND column_name = 'pending_photo_urls'
  ) THEN
    ALTER TABLE leads ADD COLUMN pending_photo_urls text[] DEFAULT '{}';
  END IF;
END $$;

-- Expand audit_log action check to include 'photos_uploaded'
-- Drop old constraint, add new one
ALTER TABLE audit_log DROP CONSTRAINT IF EXISTS audit_log_action_check;
ALTER TABLE audit_log ADD CONSTRAINT audit_log_action_check CHECK (action IN (
  'status_change',
  'finance_change',
  'assignment_change',
  'note_added',
  'inspection_submitted',
  'photos_uploaded'
));
