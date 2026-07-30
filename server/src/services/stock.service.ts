import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import type { StockAddInput, BulkStockAddInput } from "@bardan/shared/validation/stock.schema";

export async function addStock(input: StockAddInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const bag = await tx.bagMaster.findUnique({ where: { id: input.bagTypeId } });
    if (!bag || !bag.isActive) throw new ApiError(404, "Bag type not found");

    const balanceAfter = bag.currentStock + input.quantityAdded;

    await tx.bagMaster.update({ where: { id: bag.id }, data: { currentStock: balanceAfter } });

    return tx.stockAuditLog.create({
      data: {
        bagTypeId: bag.id,
        type: input.entryType,
        quantity: input.quantityAdded,
        balanceAfter,
        notes: input.notes || null,
        createdById,
      },
    });
  });
}

/** §7.6 — bulk stock adjustment: multiple bag types corrected in one modal/transaction. */
export async function bulkAddStock(input: BulkStockAddInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const entry of input.entries) {
      const bag = await tx.bagMaster.findUnique({ where: { id: entry.bagTypeId } });
      if (!bag || !bag.isActive) throw new ApiError(404, `Bag type not found: ${entry.bagTypeId}`);

      const balanceAfter = bag.currentStock + entry.quantityAdded;
      await tx.bagMaster.update({ where: { id: bag.id }, data: { currentStock: balanceAfter } });

      const log = await tx.stockAuditLog.create({
        data: {
          bagTypeId: bag.id,
          type: entry.entryType,
          quantity: entry.quantityAdded,
          balanceAfter,
          notes: entry.notes || null,
          createdById,
        },
      });
      results.push(log);
    }
    return results;
  });
}

export interface StockAuditFilters {
  bagTypeId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

export async function listStockAudit(filters: StockAuditFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  const where: Record<string, unknown> = {};
  if (filters.bagTypeId) where.bagTypeId = filters.bagTypeId;
  if (filters.from || filters.to) {
    where.createdAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.stockAuditLog.count({ where }),
    prisma.stockAuditLog.findMany({
      where,
      include: { bagType: true },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: logs, total, page, pageSize };
}
