-- T-497: daily_orders_delta va min_price ustunlarini product_snapshot_daily ga qo'shish
-- Bu ustunlar schema.prisma da bor lekin migrationda yo'q edi

ALTER TABLE product_snapshot_daily
  ADD COLUMN IF NOT EXISTS daily_orders_delta bigint,
  ADD COLUMN IF NOT EXISTS min_price bigint;
