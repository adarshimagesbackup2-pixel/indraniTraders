import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

interface AuditLogInput {
  action: string;
  entityType: string;
  entityId: string;
  performedById: string;
  details?: Record<string, unknown>;
}

/** Writes one audit log row. Accepts either the main client or a transaction client. */
export async function writeAuditLog(
  tx: Prisma.TransactionClient | typeof prisma,
  input: AuditLogInput
) {
  await tx.auditLog.create({
    data: {
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      performedById: input.performedById,
      details: input.details ? JSON.stringify(input.details) : null,
    },
  });
}

export interface AuditLogFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  entityType?: string;
  from?: string;
  to?: string;
}

export async function listAuditLogs(filters: AuditLogFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  const where: Record<string, unknown> = {};
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.search) {
    where.OR = [
      { action: { contains: filters.search, mode: "insensitive" } },
      { entityId: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.from || filters.to) {
    where.performedAt = {
      ...(filters.from ? { gte: new Date(filters.from) } : {}),
      ...(filters.to ? { lte: new Date(filters.to) } : {}),
    };
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { performedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data: logs, total, page, pageSize };
}
