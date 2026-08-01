-- Add godown dispatch tracking to Order (additive only — safe for existing data)
CREATE TYPE "DispatchStatus" AS ENUM ('IN_GODOWN', 'OUT_GODOWN');

ALTER TABLE "Order" ADD COLUMN "dispatchStatus" "DispatchStatus" NOT NULL DEFAULT 'IN_GODOWN';
ALTER TABLE "Order" ADD COLUMN "dispatchedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN "dispatchedById" TEXT;
