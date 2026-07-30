-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'STAFF');

-- CreateEnum
CREATE TYPE "PricingType" AS ENUM ('PER_BAG', 'LUMPSUM');

-- CreateEnum
CREATE TYPE "EwayStatus" AS ENUM ('NOT_REQUIRED', 'PENDING', 'GENERATED');

-- CreateEnum
CREATE TYPE "LedgerType" AS ENUM ('DEBIT', 'CREDIT');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE');

-- CreateEnum
CREATE TYPE "StockAction" AS ENUM ('MANUFACTURING_ADDITION', 'PURCHASE_ADDITION', 'ORDER_DEDUCTION', 'MANUAL_CORRECTION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'STAFF',
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "gstin" TEXT,
    "creditLimit" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BagMaster" (
    "id" TEXT NOT NULL,
    "bagType" TEXT NOT NULL,
    "defaultRate" DECIMAL(10,2) NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "lowStockThreshold" INTEGER NOT NULL DEFAULT 2000,
    "hsnCode" TEXT DEFAULT '6305',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BagMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transport" (
    "id" TEXT NOT NULL,
    "vehicleNo" TEXT NOT NULL,
    "driverName" TEXT NOT NULL,
    "driverPhone" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "challanNo" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "transportId" TEXT NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "gstEnabled" BOOLEAN NOT NULL DEFAULT false,
    "cgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "sgstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "igstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "ewayBillStatus" "EwayStatus" NOT NULL DEFAULT 'NOT_REQUIRED',
    "ewayBillNo" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bagTypeId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricingType" "PricingType" NOT NULL,
    "ratePerBag" DECIMAL(10,2),
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KhataLedger" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "orderId" TEXT,
    "type" "LedgerType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "paymentMode" "PaymentMode",
    "referenceNo" TEXT,
    "notes" TEXT,
    "runningBalance" DECIMAL(12,2) NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "KhataLedger_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditLog" (
    "id" TEXT NOT NULL,
    "bagTypeId" TEXT NOT NULL,
    "type" "StockAction" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReminderLog" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "balanceAtSend" DECIMAL(12,2) NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "channel" TEXT NOT NULL DEFAULT 'whatsapp',

    CONSTRAINT "ReminderLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BusinessSettings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "businessName" TEXT NOT NULL,
    "businessGstin" TEXT,
    "businessAddress" TEXT NOT NULL,
    "businessPhone" TEXT NOT NULL,
    "whatsappTemplate" TEXT NOT NULL DEFAULT 'Dear {customer_name}, your pending balance for Bardan Onion Bags as of {current_date} is Rs.{balance_amount}. Kindly settle this at your earliest convenience. Thank you - {business_name}.',
    "gstEnabledDefault" BOOLEAN NOT NULL DEFAULT false,
    "cgstPercent" DECIMAL(5,2) NOT NULL DEFAULT 2.5,
    "sgstPercent" DECIMAL(5,2) NOT NULL DEFAULT 2.5,
    "ewayThreshold" DECIMAL(12,2) NOT NULL DEFAULT 50000.00,
    "reminderDayOfMonth" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BusinessSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_phone_key" ON "User"("phone");

-- CreateIndex
CREATE INDEX "Customer_phone_idx" ON "Customer"("phone");

-- CreateIndex
CREATE INDEX "Customer_name_idx" ON "Customer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "BagMaster_bagType_key" ON "BagMaster"("bagType");

-- CreateIndex
CREATE UNIQUE INDEX "Order_challanNo_key" ON "Order"("challanNo");

-- CreateIndex
CREATE INDEX "Order_customerId_idx" ON "Order"("customerId");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "KhataLedger_orderId_key" ON "KhataLedger"("orderId");

-- CreateIndex
CREATE INDEX "KhataLedger_customerId_date_idx" ON "KhataLedger"("customerId", "date");

-- CreateIndex
CREATE INDEX "StockAuditLog_bagTypeId_createdAt_idx" ON "StockAuditLog"("bagTypeId", "createdAt");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_bagTypeId_fkey" FOREIGN KEY ("bagTypeId") REFERENCES "BagMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhataLedger" ADD CONSTRAINT "KhataLedger_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KhataLedger" ADD CONSTRAINT "KhataLedger_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditLog" ADD CONSTRAINT "StockAuditLog_bagTypeId_fkey" FOREIGN KEY ("bagTypeId") REFERENCES "BagMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReminderLog" ADD CONSTRAINT "ReminderLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
