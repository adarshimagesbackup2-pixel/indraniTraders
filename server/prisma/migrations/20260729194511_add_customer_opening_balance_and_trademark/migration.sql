-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "openingBalanceType" "LedgerType" NOT NULL DEFAULT 'DEBIT',
ADD COLUMN     "trademarkName" TEXT;
