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
