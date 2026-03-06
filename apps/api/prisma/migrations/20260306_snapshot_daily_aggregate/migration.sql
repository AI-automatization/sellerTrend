-- T-389: Snapshot retention — daily aggregate table
CREATE TABLE product_snapshot_daily (
  id text PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id bigint NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  day date NOT NULL,
  avg_score decimal(8,4),
  max_weekly_bought integer,
  avg_rating decimal(3,2),
  max_orders bigint,
  min_price bigint,
  snapshot_count integer NOT NULL DEFAULT 1,
  score_version integer NOT NULL DEFAULT 2,
  UNIQUE (product_id, day)
);

CREATE INDEX idx_snapshot_daily_product_day ON product_snapshot_daily (product_id, day);
