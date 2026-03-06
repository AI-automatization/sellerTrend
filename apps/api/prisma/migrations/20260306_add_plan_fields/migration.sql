-- Add plan fields to accounts table
ALTER TABLE "accounts" ADD COLUMN "plan" VARCHAR(20) NOT NULL DEFAULT 'FREE';
ALTER TABLE "accounts" ADD COLUMN "plan_expires_at" TIMESTAMPTZ;
ALTER TABLE "accounts" ADD COLUMN "analyses_used" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "accounts" ADD COLUMN "plan_renewed_at" TIMESTAMPTZ;

-- Add new transaction types
ALTER TYPE "TransactionType" ADD VALUE 'SUBSCRIPTION';
ALTER TYPE "TransactionType" ADD VALUE 'PLAN_CHANGE';
