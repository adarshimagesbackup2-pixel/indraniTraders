-- CreateEnum
CREATE TYPE "NumberingMode" AS ENUM ('AUTO', 'MANUAL');

-- CreateEnum
CREATE TYPE "TransportMode" AS ENUM ('ROAD', 'RAIL', 'AIR', 'SHIP');

-- CreateEnum
CREATE TYPE "TransportationReason" AS ENUM ('SUPPLY', 'EXPORT', 'JOB_WORK', 'SKD_CKD', 'RECIPIENT_NOT_KNOWN', 'LINE_SALES', 'SALES_RETURN', 'EXHIBITION_FAIRS', 'FOR_OWN_USE', 'OTHERS');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('ACTIVE', 'CANCELLED');

-- DropIndex
DROP INDEX "KhataLedger_orderId_key";

-- AlterTable
ALTER TABLE "BagMaster" ADD COLUMN     "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 5.00,
ADD COLUMN     "unitOfMeasure" TEXT NOT NULL DEFAULT 'BAG';

-- AlterTable
ALTER TABLE "BusinessSettings" ADD COLUMN     "businessAddressLine1" TEXT,
ADD COLUMN     "businessAddressLine2" TEXT,
ADD COLUMN     "businessPincode" TEXT,
ADD COLUMN     "businessPlace" TEXT,
ADD COLUMN     "businessStateCode" TEXT,
ADD COLUMN     "defaultTransportMode" "TransportMode" NOT NULL DEFAULT 'ROAD',
ADD COLUMN     "defaultTransportationReason" "TransportationReason" NOT NULL DEFAULT 'SUPPLY',
ADD COLUMN     "ewayThresholdInterstate" DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
ADD COLUMN     "ewayThresholdIntrastate" DECIMAL(12,2) NOT NULL DEFAULT 100000.00,
ADD COLUMN     "financialYearStartMonth" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "numberingMode" "NumberingMode" NOT NULL DEFAULT 'AUTO',
ADD COLUMN     "turnoverAboveFiveCr" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "blacklistReason" TEXT,
ADD COLUMN     "blacklistedAt" TIMESTAMP(3),
ADD COLUMN     "blacklistedById" TEXT,
ADD COLUMN     "isBlacklisted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "shipToAddress" TEXT,
ADD COLUMN     "shipToGstin" TEXT,
ADD COLUMN     "shipToPincode" TEXT,
ADD COLUMN     "shipToStateCode" TEXT,
ADD COLUMN     "stateCode" TEXT;

-- AlterTable
ALTER TABLE "KhataLedger" ADD COLUMN     "correctionForId" TEXT,
ADD COLUMN     "isCorrection" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "cancelReason" TEXT,
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "customerBillNo" TEXT,
ADD COLUMN     "editReason" TEXT,
ADD COLUMN     "editedAt" TIMESTAMP(3),
ADD COLUMN     "editedById" TEXT,
ADD COLUMN     "status" "OrderStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "transDistanceKm" INTEGER,
ADD COLUMN     "transportDocDate" TIMESTAMP(3),
ADD COLUMN     "transportDocNo" TEXT,
ADD COLUMN     "transportationReason" "TransportationReason" NOT NULL DEFAULT 'SUPPLY';

-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "gstRate" DECIMAL(5,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
ADD COLUMN     "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00;

-- CreateTable
CREATE TABLE "MenuLabel" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "customLabel" TEXT,

    CONSTRAINT "MenuLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "performedById" TEXT NOT NULL,
    "performedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "details" TEXT,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MenuLabel_key_key" ON "MenuLabel"("key");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_performedAt_idx" ON "AuditLog"("performedAt");
