import { Prisma } from "@prisma/client";

/**
 * Generates the next challan number in format CH-YYYYMMDD-XXXX where XXXX
 * is a zero-padded daily sequence that resets at midnight. Must be called
 * from *inside* the same Prisma $transaction that creates the Order, per
 * §6.1 / §6.5, so the count-then-insert is atomic under concurrent
 * submissions (Prisma transactions run against a single connection which
 * combined with the unique index on challanNo prevents duplicates).
 */
export async function generateChallanNumber(
  tx: Prisma.TransactionClient,
  now: Date = new Date()
): Promise<string> {
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const countToday = await tx.order.count({
    where: {
      createdAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const sequence = String(countToday + 1).padStart(4, "0");
  const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  return `CH-${datePart}-${sequence}`;
}
