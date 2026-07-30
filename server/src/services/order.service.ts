import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import { generateChallanNumber } from "../utils/challanNumber";
import { roundToRupee } from "../utils/currency";
import { getLatestRunningBalance, recalculateBalances } from "./khata.service";
import { writeAuditLog } from "./audit.service";
import type { OrderCreateInput, OrderEditInput } from "@bardan/shared/validation/order.schema";

interface CreateOrderParams {
  input: OrderCreateInput;
  createdById: string;
  isAdmin: boolean;
}

/**
 * Computes per-line-item GST split (§1.1): CGST+SGST if intrastate
 * (customer.stateCode === business.businessStateCode), IGST if interstate.
 * Rate comes from BagMaster.gstRate at order time and is snapshotted onto
 * OrderItem so later product-rate edits don't retroactively change history.
 */
function splitGst(taxableAmount: number, gstRatePercent: number, isIntrastate: boolean) {
  const totalGst = taxableAmount * (gstRatePercent / 100);
  if (isIntrastate) {
    return { cgstAmount: totalGst / 2, sgstAmount: totalGst / 2, igstAmount: 0 };
  }
  return { cgstAmount: 0, sgstAmount: 0, igstAmount: totalGst };
}

export async function createOrder({ input, createdById, isAdmin }: CreateOrderParams) {
  return prisma.$transaction(async (tx) => {
    const settings = await tx.businessSettings.findUniqueOrThrow({ where: { id: "singleton" } });

    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer || !customer.isActive) {
      throw new ApiError(422, "Customer not found or inactive");
    }

    // §1.3 — block new orders until state code + pincode are filled in
    if (!customer.stateCode || !customer.pincode) {
      throw new ApiError(
        422,
        `${customer.name} is missing their GST state code and/or pincode. Add these in Masters → Customers before creating an order for them.`
      );
    }

    // §4 — blacklist hard-block, ADMIN-only override (same pattern as credit limit)
    if (customer.isBlacklisted) {
      if (!input.overrideBlacklist || !isAdmin) {
        throw new ApiError(
          422,
          `This customer is blacklisted: ${customer.blacklistReason}. Contact an admin to remove this status before creating new orders.`
        );
      }
    }

    const transport = await tx.transport.findUnique({ where: { id: input.transportId } });
    if (!transport || !transport.isActive) {
      throw new ApiError(422, "Transport vehicle not found or inactive");
    }

    const bagTypeIds = [...new Set(input.items.map((i) => i.bagTypeId))];
    const bagTypes = await tx.bagMaster.findMany({ where: { id: { in: bagTypeIds } } });
    const bagTypeMap = new Map(bagTypes.map((b) => [b.id, b]));

    const requestedQtyByBag = new Map<string, number>();
    for (const item of input.items) {
      requestedQtyByBag.set(item.bagTypeId, (requestedQtyByBag.get(item.bagTypeId) ?? 0) + item.quantity);
    }

    for (const [bagTypeId, requestedQty] of requestedQtyByBag) {
      const bag = bagTypeMap.get(bagTypeId);
      if (!bag) throw new ApiError(422, "One or more bag types were not found");
      if (requestedQty > bag.currentStock) {
        throw new ApiError(
          422,
          `Only ${bag.currentStock} of "${bag.bagType}" available in stock (requested ${requestedQty})`,
          { [`items.${bagTypeId}`]: `Only ${bag.currentStock} available` }
        );
      }
    }

    const isIntrastate = customer.stateCode === settings.businessStateCode;

    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    const lineItemsData = input.items.map((item) => {
      const bag = bagTypeMap.get(item.bagTypeId)!;
      const lineTotal =
        item.pricingType === "PER_BAG"
          ? item.quantity * (item.ratePerBag ?? Number(bag.defaultRate))
          : (item.lumpsumAmount ?? 0);
      subtotal += lineTotal;

      const gstRate = Number(bag.gstRate);
      const { cgstAmount, sgstAmount, igstAmount } = input.gstEnabled
        ? splitGst(lineTotal, gstRate, isIntrastate)
        : { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };

      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;

      return {
        bagTypeId: item.bagTypeId,
        quantity: item.quantity,
        pricingType: item.pricingType,
        ratePerBag: item.pricingType === "PER_BAG" ? item.ratePerBag ?? bag.defaultRate : null,
        lineTotal,
        gstRate: input.gstEnabled ? gstRate : 0,
        cgstAmount,
        sgstAmount,
        igstAmount,
      };
    });

    const totalAmount = roundToRupee(subtotal + totalCgst + totalSgst + totalIgst);

    const currentOutstanding = await getLatestRunningBalance(customer.id, tx);
    const newBalance = currentOutstanding + totalAmount;
    const creditLimit = Number(customer.creditLimit);

    let overrideNote: string | null = null;
    if (creditLimit > 0 && newBalance > creditLimit) {
      if (!input.overrideCreditLimit || !isAdmin) {
        const overage = newBalance - creditLimit;
        throw new ApiError(
          422,
          `This order exceeds the customer's credit limit by ₹${overage.toFixed(2)}. Current outstanding: ₹${currentOutstanding.toFixed(
            2
          )}, Credit limit: ₹${creditLimit.toFixed(2)}.`
        );
      }
      overrideNote = "Credit limit override by ADMIN";
    }

    // §2 — custom bill/challan numbers: use the user's exact value if given,
    // otherwise fall back to auto-generation. Uniqueness enforced by the DB's
    // unique constraint on challanNo regardless of which path is used.
    let challanNo: string;
    if (input.customChallanNo && input.customChallanNo.trim().length > 0) {
      const clash = await tx.order.findUnique({ where: { challanNo: input.customChallanNo.trim() } });
      if (clash) {
        throw new ApiError(422, "This number is already in use", { customChallanNo: "This number is already in use" });
      }
      challanNo = input.customChallanNo.trim();
    } else {
      if (settings.numberingMode === "MANUAL") {
        throw new ApiError(422, "Numbering Mode is set to Manual — enter a bill/challan number.", {
          customChallanNo: "A number is required in Manual numbering mode",
        });
      }
      challanNo = await generateChallanNumber(tx);
    }

    // §1.4 — e-way threshold: intrastate vs interstate, per customer's state code
    const applicableThreshold = isIntrastate
      ? Number(settings.ewayThresholdIntrastate)
      : Number(settings.ewayThresholdInterstate);
    const ewayBillStatus = totalAmount >= applicableThreshold ? "PENDING" : "NOT_REQUIRED";

    const order = await tx.order.create({
      data: {
        challanNo,
        customerId: customer.id,
        transportId: transport.id,
        subtotal,
        gstEnabled: input.gstEnabled,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        totalAmount,
        ewayBillStatus,
        createdById,
        customerBillNo: input.customerBillNo || null,
        transportationReason: input.transportationReason,
        transportMode: input.transportMode,
        transportDocNo: input.transportMode === "ROAD" ? null : input.transportDocNo || null,
        transportDocDate:
          input.transportMode === "ROAD" || !input.transportDocDate ? null : new Date(input.transportDocDate),
        transDistanceKm: input.transDistanceKm ?? null,
        items: { create: lineItemsData },
      },
      include: { items: { include: { bagType: true } }, customer: true, transport: true },
    });

    for (const [bagTypeId, requestedQty] of requestedQtyByBag) {
      const bag = bagTypeMap.get(bagTypeId)!;
      const balanceAfter = bag.currentStock - requestedQty;
      await tx.bagMaster.update({ where: { id: bagTypeId }, data: { currentStock: balanceAfter } });
      await tx.stockAuditLog.create({
        data: {
          bagTypeId,
          type: "ORDER_DEDUCTION",
          quantity: -requestedQty,
          balanceAfter,
          notes: `Challan ${challanNo}`,
          createdById,
        },
      });
    }

    await tx.khataLedger.create({
      data: {
        customerId: customer.id,
        orderId: order.id,
        type: "DEBIT",
        amount: totalAmount,
        runningBalance: newBalance,
        notes: overrideNote,
        createdById,
      },
    });

    await writeAuditLog(tx, {
      action: "ORDER_CREATED",
      entityType: "Order",
      entityId: order.id,
      performedById: createdById,
      details: { challanNo, totalAmount },
    });

    return order;
  });
}

export async function getOrderById(id: string) {
  const order = await prisma.order.findUnique({
    where: { id },
    include: { items: { include: { bagType: true } }, customer: true, transport: true },
  });
  if (!order) throw new ApiError(404, "Order not found");
  return order;
}

export async function setEwayBillNumber(orderId: string, ewayBillNo: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new ApiError(404, "Order not found");
  if (order.ewayBillStatus === "NOT_REQUIRED") {
    throw new ApiError(422, "This order does not require an e-Way Bill");
  }
  return prisma.order.update({ where: { id: orderId }, data: { ewayBillNo, ewayBillStatus: "GENERATED" } });
}

export interface OrderListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  customerId?: string;
  ewayStatus?: string;
  vehicleId?: string;
  from?: string;
  to?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

export async function listOrders(filters: OrderListFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  const where: Record<string, unknown> = {};
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.vehicleId) where.transportId = filters.vehicleId;
  if (filters.ewayStatus) where.ewayBillStatus = filters.ewayStatus;
  if (filters.search) {
    where.OR = [
      { challanNo: { contains: filters.search, mode: "insensitive" } },
      { customerBillNo: { contains: filters.search, mode: "insensitive" } },
      { customer: { name: { contains: filters.search, mode: "insensitive" } } },
    ];
  }
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [total, orders] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: { include: { bagType: true } }, customer: true, transport: true },
      orderBy: { [filters.sortBy ?? "createdAt"]: filters.sortDir ?? "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: orders, total, page, pageSize };
}

/**
 * §3 — Edit an existing ACTIVE order. Reverses old stock/ledger effects and
 * applies the new ones inside one transaction, preserving history via
 * MANUAL_CORRECTION stock logs and a linked (not deleted) ledger correction
 * row. Blocked if the order already has a GENERATED e-way bill.
 */
export async function editOrder(orderId: string, input: OrderEditInput, editedById: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!existing) throw new ApiError(404, "Order not found");
    if (existing.status === "CANCELLED") throw new ApiError(422, "This order has been cancelled and cannot be edited");
    if (existing.ewayBillStatus === "GENERATED") {
      throw new ApiError(
        422,
        "This order already has an e-Way Bill generated. Cancel/update the e-Way Bill on the government portal first, or create a credit note instead."
      );
    }

    const settings = await tx.businessSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer) throw new ApiError(422, "Customer not found");
    if (!customer.stateCode || !customer.pincode) {
      throw new ApiError(422, `${customer.name} is missing their GST state code and/or pincode.`);
    }

    const transport = await tx.transport.findUnique({ where: { id: input.transportId } });
    if (!transport) throw new ApiError(422, "Transport vehicle not found");

    // 1. Reverse original stock deduction
    for (const oldItem of existing.items) {
      const bag = await tx.bagMaster.findUnique({ where: { id: oldItem.bagTypeId } });
      if (!bag) continue;
      const balanceAfter = bag.currentStock + oldItem.quantity;
      await tx.bagMaster.update({ where: { id: bag.id }, data: { currentStock: balanceAfter } });
      await tx.stockAuditLog.create({
        data: {
          bagTypeId: bag.id,
          type: "MANUAL_CORRECTION",
          quantity: oldItem.quantity,
          balanceAfter,
          notes: `Reversal for edit of challan ${existing.challanNo}`,
          createdById: editedById,
        },
      });
    }

    // 2. Validate + apply new quantities
    const bagTypeIds = [...new Set(input.items.map((i) => i.bagTypeId))];
    const bagTypes = await tx.bagMaster.findMany({ where: { id: { in: bagTypeIds } } });
    const bagTypeMap = new Map(bagTypes.map((b) => [b.id, b]));

    const requestedQtyByBag = new Map<string, number>();
    for (const item of input.items) {
      requestedQtyByBag.set(item.bagTypeId, (requestedQtyByBag.get(item.bagTypeId) ?? 0) + item.quantity);
    }
    for (const [bagTypeId, requestedQty] of requestedQtyByBag) {
      const bag = bagTypeMap.get(bagTypeId);
      if (!bag) throw new ApiError(422, "One or more bag types were not found");
      if (requestedQty > bag.currentStock) {
        throw new ApiError(422, `Only ${bag.currentStock} of "${bag.bagType}" available in stock (requested ${requestedQty})`);
      }
    }

    const isIntrastate = customer.stateCode === settings.businessStateCode;
    let subtotal = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    const lineItemsData = input.items.map((item) => {
      const bag = bagTypeMap.get(item.bagTypeId)!;
      const lineTotal =
        item.pricingType === "PER_BAG"
          ? item.quantity * (item.ratePerBag ?? Number(bag.defaultRate))
          : (item.lumpsumAmount ?? 0);
      subtotal += lineTotal;
      const gstRate = Number(bag.gstRate);
      const { cgstAmount, sgstAmount, igstAmount } = input.gstEnabled
        ? splitGst(lineTotal, gstRate, isIntrastate)
        : { cgstAmount: 0, sgstAmount: 0, igstAmount: 0 };
      totalCgst += cgstAmount;
      totalSgst += sgstAmount;
      totalIgst += igstAmount;
      return {
        bagTypeId: item.bagTypeId,
        quantity: item.quantity,
        pricingType: item.pricingType,
        ratePerBag: item.pricingType === "PER_BAG" ? item.ratePerBag ?? bag.defaultRate : null,
        lineTotal,
        gstRate: input.gstEnabled ? gstRate : 0,
        cgstAmount,
        sgstAmount,
        igstAmount,
      };
    });

    const newTotalAmount = roundToRupee(subtotal + totalCgst + totalSgst + totalIgst);

    for (const [bagTypeId, requestedQty] of requestedQtyByBag) {
      const bag = await tx.bagMaster.findUnique({ where: { id: bagTypeId } });
      if (!bag) continue;
      const balanceAfter = bag.currentStock - requestedQty;
      await tx.bagMaster.update({ where: { id: bagTypeId }, data: { currentStock: balanceAfter } });
      await tx.stockAuditLog.create({
        data: {
          bagTypeId,
          type: "MANUAL_CORRECTION",
          quantity: -requestedQty,
          balanceAfter,
          notes: `New quantity after edit of challan ${existing.challanNo}`,
          createdById: editedById,
        },
      });
    }

    // 3. Reverse original ledger DEBIT, post corrected DEBIT (linked, not deleted)
    const originalLedgerEntry = await tx.khataLedger.findFirst({ where: { orderId: existing.id, isCorrection: false } });
    const oldTotal = Number(existing.totalAmount);
    const balanceBeforeReversal = await getLatestRunningBalance(existing.customerId, tx);

    await tx.khataLedger.create({
      data: {
        customerId: existing.customerId,
        orderId: existing.id,
        type: "CREDIT",
        amount: oldTotal,
        runningBalance: balanceBeforeReversal - oldTotal,
        notes: `Reversal of original amount for edited challan ${existing.challanNo}`,
        createdById: editedById,
        isCorrection: true,
        correctionForId: originalLedgerEntry?.id ?? null,
      },
    });

    const balanceAfterReversal = balanceBeforeReversal - oldTotal;
    await tx.khataLedger.create({
      data: {
        customerId: input.customerId,
        orderId: existing.id,
        type: "DEBIT",
        amount: newTotalAmount,
        runningBalance: balanceAfterReversal + newTotalAmount,
        notes: `Corrected amount for edited challan ${existing.challanNo}: ${input.editReason}`,
        createdById: editedById,
        isCorrection: true,
        correctionForId: originalLedgerEntry?.id ?? null,
      },
    });

    // Recalculate forward for both customers involved (usually the same one)
    await recalculateBalances(existing.customerId, tx);
    if (input.customerId !== existing.customerId) {
      await recalculateBalances(input.customerId, tx);
    }

    // Delete + recreate order items to reflect new line items
    await tx.orderItem.deleteMany({ where: { orderId: existing.id } });

    const applicableThreshold = isIntrastate
      ? Number(settings.ewayThresholdIntrastate)
      : Number(settings.ewayThresholdInterstate);
    const ewayBillStatus = newTotalAmount >= applicableThreshold ? "PENDING" : "NOT_REQUIRED";

    const updated = await tx.order.update({
      where: { id: existing.id },
      data: {
        customerId: input.customerId,
        transportId: input.transportId,
        subtotal,
        gstEnabled: input.gstEnabled,
        cgstAmount: totalCgst,
        sgstAmount: totalSgst,
        igstAmount: totalIgst,
        totalAmount: newTotalAmount,
        ewayBillStatus,
        customerBillNo: input.customerBillNo || null,
        transportationReason: input.transportationReason,
        transportMode: input.transportMode,
        transportDocNo: input.transportMode === "ROAD" ? null : input.transportDocNo || null,
        transportDocDate:
          input.transportMode === "ROAD" || !input.transportDocDate ? null : new Date(input.transportDocDate),
        transDistanceKm: input.transDistanceKm ?? null,
        editedAt: new Date(),
        editedById,
        editReason: input.editReason,
        items: { create: lineItemsData },
      },
      include: { items: { include: { bagType: true } }, customer: true, transport: true },
    });

    await writeAuditLog(tx, {
      action: "ORDER_EDITED",
      entityType: "Order",
      entityId: existing.id,
      performedById: editedById,
      details: { challanNo: existing.challanNo, editReason: input.editReason, oldTotal, newTotal: newTotalAmount },
    });

    return updated;
  });
}

/**
 * §3 — Cancel an order: reverses stock + ledger identically to a delete,
 * but marks status CANCELLED rather than removing the record (preserves history).
 */
export async function cancelOrder(orderId: string, cancelReason: string, cancelledById: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!existing) throw new ApiError(404, "Order not found");
    if (existing.status === "CANCELLED") throw new ApiError(422, "This order is already cancelled");

    for (const item of existing.items) {
      const bag = await tx.bagMaster.findUnique({ where: { id: item.bagTypeId } });
      if (!bag) continue;
      const balanceAfter = bag.currentStock + item.quantity;
      await tx.bagMaster.update({ where: { id: bag.id }, data: { currentStock: balanceAfter } });
      await tx.stockAuditLog.create({
        data: {
          bagTypeId: bag.id,
          type: "MANUAL_CORRECTION",
          quantity: item.quantity,
          balanceAfter,
          notes: `Reversal for cancelled challan ${existing.challanNo}`,
          createdById: cancelledById,
        },
      });
    }

    const originalLedgerEntry = await tx.khataLedger.findFirst({ where: { orderId: existing.id, isCorrection: false } });
    const balanceBefore = await getLatestRunningBalance(existing.customerId, tx);
    const oldTotal = Number(existing.totalAmount);

    await tx.khataLedger.create({
      data: {
        customerId: existing.customerId,
        orderId: existing.id,
        type: "CREDIT",
        amount: oldTotal,
        runningBalance: balanceBefore - oldTotal,
        notes: `Reversal for cancelled challan ${existing.challanNo}: ${cancelReason}`,
        createdById: cancelledById,
        isCorrection: true,
        correctionForId: originalLedgerEntry?.id ?? null,
      },
    });

    await recalculateBalances(existing.customerId, tx);

    const updated = await tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelledById, cancelReason },
      include: { items: { include: { bagType: true } }, customer: true, transport: true },
    });

    await writeAuditLog(tx, {
      action: "ORDER_CANCELLED",
      entityType: "Order",
      entityId: orderId,
      performedById: cancelledById,
      details: { challanNo: existing.challanNo, cancelReason },
    });

    return updated;
  });
}
