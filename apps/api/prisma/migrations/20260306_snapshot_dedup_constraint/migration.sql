-- T-386: Snapshot dedup — DB-level unique constraint (5 min bucket)

-- Step 1: Add generated column — snapshot_at truncated to 5-minute bucket
ALTER TABLE product_snapshots
ADD COLUMN snapshot_bucket timestamptz
GENERATED ALWAYS AS (
  date_trunc('hour', snapshot_at) +
  (EXTRACT(minute FROM snapshot_at)::int / 5) * interval '5 minutes'
) STORED;

-- Step 2: Remove duplicates within same bucket (keep earliest snapshot)
DELETE FROM product_snapshots a
USING product_snapshots b
WHERE a.product_id = b.product_id
  AND a.snapshot_bucket = b.snapshot_bucket
  AND a.snapshot_at > b.snapshot_at;

-- Step 3: Add unique constraint
ALTER TABLE product_snapshots
ADD CONSTRAINT product_snapshots_product_bucket_unique
UNIQUE (product_id, snapshot_bucket);
