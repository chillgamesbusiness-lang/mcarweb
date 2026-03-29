-- Outcome Tracking: predicted vs actual for recalibration
-- Tracks buy/sell events against valuation engine predictions

CREATE TABLE IF NOT EXISTS valuation_outcomes (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at    timestamptz DEFAULT now() NOT NULL,

  -- Vehicle identity
  registration  text,
  make          text NOT NULL,
  model         text NOT NULL,
  year          int NOT NULL,
  mileage       int NOT NULL,
  fuel          text,
  engine_cc     int,

  -- What the engine predicted
  predicted_retail    int NOT NULL,
  predicted_trade     int NOT NULL,
  predicted_private   int NOT NULL,
  confidence          int NOT NULL,
  confidence_level    text NOT NULL CHECK (confidence_level IN ('high', 'medium', 'low')),
  methodology         text NOT NULL,
  anomaly             boolean DEFAULT false,

  -- What actually happened
  event_type    text NOT NULL CHECK (event_type IN ('purchase', 'sale')),
  actual_price  int NOT NULL,
  event_date    date NOT NULL DEFAULT CURRENT_DATE,
  notes         text,

  -- Computed accuracy
  deviation_pct numeric GENERATED ALWAYS AS (
    CASE WHEN predicted_retail > 0
      THEN ROUND(((actual_price - predicted_retail)::numeric / predicted_retail) * 100, 1)
      ELSE NULL
    END
  ) STORED,

  -- Link to lead if applicable
  lead_id       uuid REFERENCES leads(id) ON DELETE SET NULL
);

-- Indexes for analytics
CREATE INDEX IF NOT EXISTS idx_outcomes_make_model ON valuation_outcomes (make, model);
CREATE INDEX IF NOT EXISTS idx_outcomes_methodology ON valuation_outcomes (methodology);
CREATE INDEX IF NOT EXISTS idx_outcomes_event_date ON valuation_outcomes (event_date DESC);
CREATE INDEX IF NOT EXISTS idx_outcomes_deviation ON valuation_outcomes (deviation_pct);

-- RLS
ALTER TABLE valuation_outcomes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage outcomes"
  ON valuation_outcomes
  FOR ALL
  USING (get_my_role() IN ('admin', 'owner'))
  WITH CHECK (get_my_role() IN ('admin', 'owner'));

-- View: recalibration insights
CREATE OR REPLACE VIEW recalibration_summary AS
SELECT
  make,
  model,
  methodology,
  confidence_level,
  COUNT(*)                               AS sample_count,
  ROUND(AVG(deviation_pct), 1)           AS avg_deviation_pct,
  ROUND(AVG(ABS(deviation_pct)), 1)      AS avg_abs_deviation_pct,
  ROUND(STDDEV(deviation_pct), 1)        AS stddev_deviation_pct,
  ROUND(MIN(deviation_pct), 1)           AS min_deviation_pct,
  ROUND(MAX(deviation_pct), 1)           AS max_deviation_pct,
  COUNT(*) FILTER (WHERE ABS(deviation_pct) <= 10) AS within_10pct,
  COUNT(*) FILTER (WHERE ABS(deviation_pct) <= 15) AS within_15pct
FROM valuation_outcomes
WHERE event_date >= CURRENT_DATE - INTERVAL '6 months'
GROUP BY make, model, methodology, confidence_level
ORDER BY sample_count DESC;
