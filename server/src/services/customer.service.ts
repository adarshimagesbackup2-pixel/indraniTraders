import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import { getLatestRunningBalance } from "./khata.service";
import { writeAuditLog } from "./audit.service";
import type { CustomerInput, CustomerUpdateInput, BlacklistToggleInput } from "@bardan/shared/validation/customer.schema";

export interface CustomerListFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  blacklistedOnly?: boolean;
}

export async function listCustomers(filters: CustomerListFilters) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 25;

  const where: Record<string, unknown> = { isActive: true };
  if (filters.blacklistedOnly) where.isBlacklisted = true;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { phone: { contains: filters.search } },
    ];
  }

  const [total, customers] = await Promise.all([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      orderBy: { [filters.sortBy ?? "name"]: filters.sortDir ?? "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  const withBalances = await Promise.all(
    customers.map(async (c) => ({ ...c, outstandingBalance: await getLatestRunningBalance(c.id) }))
  );

  return { data: withBalances, total, page, pageSize };
}

export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new ApiError(404, "Customer not found");
  const outstandingBalance = await getLatestRunningBalance(id);
  return {
    ...customer,
    outstandingBalance,
    creditRemaining: Number(customer.creditLimit) > 0 ? Number(customer.creditLimit) - outstandingBalance : null,
  };
}

export async function createCustomer(input: CustomerInput, createdById?: string) {
  const customer = await prisma.customer.create({
    data: {
      name: input.name,
      phone: input.phone,
      address: input.address,
      gstin: input.gstin || null,
      trademarkName: input.trademarkName || null,
      openingBalance: input.openingBalance,
      openingBalanceType: input.openingBalanceType,
      creditLimit: input.creditLimit,
      stateCode: input.stateCode,
      pincode: input.pincode,
      shipToAddress: input.shipToAddress || null,
      shipToGstin: input.shipToGstin || null,
      shipToPincode: input.shipToPincode || null,
      shipToStateCode: input.shipToStateCode || null,
    },
  });

  if (Number(input.openingBalance) > 0) {
    const openingBalance = Number(input.openingBalance);
    const currentBalance = await getLatestRunningBalance(customer.id);
    const newRunningBalance =
      input.openingBalanceType === "DEBIT" ? currentBalance + openingBalance : currentBalance - openingBalance;

    await prisma.khataLedger.create({
      data: {
        customerId: customer.id,
        type: input.openingBalanceType,
        amount: openingBalance,
        runningBalance: newRunningBalance,
        notes: "Opening khata balance",
        createdById: createdById ?? customer.id,
      },
    });
  }

  return customer;
}

export async function updateCustomer(id: string, input: CustomerUpdateInput, updatedById?: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  return prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.address !== undefined ? { address: input.address } : {}),
      ...(input.gstin !== undefined ? { gstin: input.gstin || null } : {}),
      ...(input.trademarkName !== undefined ? { trademarkName: input.trademarkName || null } : {}),
      ...(input.openingBalance !== undefined ? { openingBalance: input.openingBalance } : {}),
      ...(input.openingBalanceType !== undefined ? { openingBalanceType: input.openingBalanceType } : {}),
      ...(input.creditLimit !== undefined ? { creditLimit: input.creditLimit } : {}),
      ...(input.stateCode !== undefined ? { stateCode: input.stateCode } : {}),
      ...(input.pincode !== undefined ? { pincode: input.pincode } : {}),
      ...(input.shipToAddress !== undefined ? { shipToAddress: input.shipToAddress || null } : {}),
      ...(input.shipToGstin !== undefined ? { shipToGstin: input.shipToGstin || null } : {}),
      ...(input.shipToPincode !== undefined ? { shipToPincode: input.shipToPincode || null } : {}),
      ...(input.shipToStateCode !== undefined ? { shipToStateCode: input.shipToStateCode || null } : {}),
    },
  });
}

export async function deleteCustomer(id: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const ledgerCount = await prisma.khataLedger.count({ where: { customerId: id } });
  if (ledgerCount > 0) {
    throw new ApiError(422, "This customer has ledger history and cannot be deleted. They have been archived instead.");
  }

  return prisma.customer.update({ where: { id }, data: { isActive: false } });
}

/** §4 — ADMIN-only blacklist toggle. Reason required when blacklisting; cleared when un-blacklisting. */
export async function setBlacklist(id: string, input: BlacklistToggleInput, performedById: string) {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Customer not found");

  const updated = await prisma.customer.update({
    where: { id },
    data: input.isBlacklisted
      ? {
          isBlacklisted: true,
          blacklistReason: input.blacklistReason,
          blacklistedAt: new Date(),
          blacklistedById: performedById,
        }
      : {
          isBlacklisted: false,
          blacklistReason: null,
          blacklistedAt: null,
          blacklistedById: null,
        },
  });

  await writeAuditLog(prisma, {
    action: input.isBlacklisted ? "CUSTOMER_BLACKLISTED" : "CUSTOMER_UNBLACKLISTED",
    entityType: "Customer",
    entityId: id,
    performedById,
    details: { reason: input.blacklistReason },
  });

  return updated;
}
