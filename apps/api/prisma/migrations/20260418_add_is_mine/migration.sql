-- Migration: 20260418_add_is_mine
-- TrackedProduct ga is_mine ustun qo'shish
-- "Bu mening mahsulotim" feature uchun

ALTER TABLE "tracked_products"
    ADD COLUMN IF NOT EXISTS "is_mine" BOOLEAN NOT NULL DEFAULT false;
