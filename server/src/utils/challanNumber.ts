import { Prisma } from "@prisma/client";
import { ApiError } from "../middleware/errorHandler";

/**
 * Auto-numbering (§2): you enter your own first invoice number manually,
 * in whatever format you like. From then on, every auto-generated number
 * is simply the highest purely-numeric invoice number used so far, plus
 * one — no "CH-", no date prefix, just the next serial number.
 *
 * Older invoice numbers that aren't purely numeric (e.g. a legacy
 * "CH-20260115-0001" format) are ignored for this calculation — they stay
 * in your records as-is, they just don't count toward "the last number."
 *
 * Must be called from *inside* the same Prisma $transaction that creates
 * the Order (per §6.1/§6.5), so two people creating an order at the same
 * moment can't both land on the same next number.
 */
export async function generateChallanNumber(tx: Prisma.TransactionClient): Promise<string> {
  const existingOrders = await tx.order.findMany({ select: { challanNo: true } });

  const numericChallanNos = existingOrders
    .map((o) => o.challanNo)
    .filter((no) => /^\d+$/.test(no));

  if (numericChallanNos.length === 0) {
    throw new ApiError(
      422,
      "Enter your starting invoice number once — after that, new invoices will number automatically.",
      { customChallanNo: "Enter a starting invoice number (e.g. 1001)" }
    );
  }

  const maxLength = Math.max(...numericChallanNos.map((no) => no.length));
  const maxValue = Math.max(...numericChallanNos.map((no) => parseInt(no, 10)));
  const next = maxValue + 1;

  return String(next).padStart(maxLength, "0");
}
