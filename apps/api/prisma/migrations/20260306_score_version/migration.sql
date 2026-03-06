-- T-388: Add score_version to track scoring formula changes
ALTER TABLE product_snapshots
ADD COLUMN score_version integer NOT NULL DEFAULT 2;
