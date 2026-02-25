-- ============================================================
-- Seed: Test lead assigned to the first inspector in users table
-- Run this in Supabase SQL Editor
-- ============================================================

INSERT INTO leads (
  seller_name,
  seller_phone,
  seller_email,
  seller_postcode,
  reg,
  make,
  model,
  year,
  fuel,
  transmission,
  colour,
  mileage,
  condition,
  estimated_min,
  estimated_max,
  status,
  finance_status,
  assigned_inspector_id,
  source,
  consent_marketing,
  consent_data_processing
)
SELECT
  'Test Seller',
  '+447700900123',
  'seller@example.com',
  'SW1A 1AA',
  'AA11AAA',
  'Toyota',
  'Corolla',
  2018,
  'petrol',
  'automatic',
  'Blue',
  45000,
  'good',
  6500,
  7200,
  'appointment_booked',
  'not_checked',
  id,   -- inspector UUID pulled automatically
  'manual-test',
  false,
  true
FROM users
WHERE role = 'inspector'
LIMIT 1;

-- Confirm it was inserted
SELECT id, seller_name, reg, status, assigned_inspector_id FROM leads ORDER BY created_at DESC LIMIT 1;
