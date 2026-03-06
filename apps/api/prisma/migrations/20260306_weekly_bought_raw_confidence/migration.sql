-- T-387: Add weekly_bought_raw_text + confidence to product_snapshots
ALTER TABLE product_snapshots
ADD COLUMN weekly_bought_raw_text text,
ADD COLUMN weekly_bought_confidence decimal(3,2);
