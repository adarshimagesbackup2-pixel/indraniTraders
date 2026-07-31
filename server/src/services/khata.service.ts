import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";

/**
 * Returns the customer's latest running balance (last ledger row's
 * runningBalance, ordered by date then createdAt), or 0 if the customer
 * has no ledger history yet. Can run inside or outside a transaction.
 */
export async function getLatestRunningBalance(
  customerId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<number> {
  const lastEntry = await tx.khataLedger.findFirst({
    where: { customerId },
    orderBy: [{ date: "desc" }, { createdById: "desc" }],
  });
  return lastEntry ? Number(lastEntry.runningBalance) : 0;
}

/**
 * Full customer ledger rewrite: walks every ledger row for the customer in
 * chronological order and recomputes runningBalance = previous ± amount.
 * This is the one case where a full rewrite is required — per §6.7/§6.8,
 * triggered by the admin "Recalculate Balances" action, or automatically
 * after an admin edits/backdates a historical entry.
 */
export async function recalculateBalances(
  customerId: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma
): Promise<void> {
  const entries = await tx.khataLedger.findMany({
    where: { customerId },
    orderBy: [{ date: "asc" }, { createdById: "asc" }],
  });

  let running = 0;
  for (const entry of entries) {
    running =
      entry.type === "DEBIT" ? running + Number(entry.amount) : running - Number(entry.amount);

    if (Number(entry.runningBalance) !== running) {
      await tx.khataLedger.update({
        where: { id: entry.id },
        data: { runningBalance: running },
      });
    }
  }
}

/** Recalculates balances for every customer — used by the maintenance endpoint. */
export async function recalculateAllBalances(): Promise<{ customersProcessed: number }> {
  const customers = await prisma.customer.findMany({ select: { id: true } });
  await prisma.$transaction(async (tx) => {
    for (const customer of customers) {
      await recalculateBalances(customer.id, tx);
    }
  });
  
  return { customersProcessed: customers.length };
}
import { ApiError } from "../middleware/errorHandler";
import { writeAuditLog } from "./audit.service";
import type { KhataEntryUpdateInput } from "@bardan/shared/validation/khata.schema";

/**
 * Edits a manual ledger entry (a recorded payment/correction). Entries
 * generated automatically from an Order (type DEBIT with an orderId) are
 * NOT editable here — they must be changed via the order itself, so the
 * order total and the khata never drift apart. After the edit, every
 * later entry for this customer is recalculated so runningBalance stays
 * correct (§6.7/§6.8).
 */
export async function updateLedgerEntry(
  entryId: string,
  input: KhataEntryUpdateInput,
  performedById: string
) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.khataLedger.findUnique({ where: { id: entryId } });
    if (!entry) throw new ApiError(404, "Ledger entry not found");
    if (entry.orderId) {
      throw new ApiError(
        422,
        "This entry is linked to an order and can't be edited from Khata. Edit the order instead."
      );
    }

    const updated = await tx.khataLedger.update({
      where: { id: entryId },
      data: {
        amount: input.amount,
        date: new Date(input.date),
        paymentMode: input.paymentMode,
        referenceNo: input.referenceNo || null,
        notes: input.notes || null,
      },
    });

    await recalculateBalances(entry.customerId, tx);
    await writeAuditLog(tx, {
      action: "KHATA_ENTRY_EDITED",
      entityType: "KhataLedger",
      entityId: entryId,
      performedById,
      details: { before: { amount: Number(entry.amount), date: entry.date }, after: input },
    });

    return updated;
  });
}

/**
 * Deletes a manual ledger entry (same order-linked restriction as above),
 * then recalculates the customer's running balances.
 */
export async function deleteLedgerEntry(entryId: string, performedById: string) {
  return prisma.$transaction(async (tx) => {
    const entry = await tx.khataLedger.findUnique({ where: { id: entryId } });
    if (!entry) throw new ApiError(404, "Ledger entry not found");
    if (entry.orderId) {
      throw new ApiError(
        422,
        "This entry is linked to an order and can't be deleted from Khata. Cancel/edit the order instead."
      );
    }

    await tx.khataLedger.delete({ where: { id: entryId } });
    await recalculateBalances(entry.customerId, tx);
    await writeAuditLog(tx, {
      action: "KHATA_ENTRY_DELETED",
      entityType: "KhataLedger",
      entityId: entryId,
      performedById,
      details: { amount: Number(entry.amount), type: entry.type, date: entry.date },
    });

    return { customerId: entry.customerId };
  });
}
