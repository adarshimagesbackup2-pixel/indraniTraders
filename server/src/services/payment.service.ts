import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import { getLatestRunningBalance } from "./khata.service";
import type { PaymentCreateInput } from "@bardan/shared/validation/payment.schema";

/**
 * Records a CREDIT ledger entry. Per §6.6: amount validated > 0 upstream,
 * newRunningBalance can go negative (customer advance/credit — shown in
 * UI as green "Advance ₹X"). No stock or order impact.
 */
export async function recordPayment(input: PaymentCreateInput, createdById: string) {
  return prisma.$transaction(async (tx) => {
    const customer = await tx.customer.findUnique({ where: { id: input.customerId } });
    if (!customer || !customer.isActive) {
      throw new ApiError(422, "Customer not found or inactive");
    }

    const lastBalance = await getLatestRunningBalance(customer.id, tx);
    const newRunningBalance = lastBalance - input.amount;

    return tx.khataLedger.create({
      data: {
        customerId: customer.id,
        type: "CREDIT",
        amount: input.amount,
        paymentMode: input.paymentMode,
        referenceNo: input.referenceNo || null,
        notes: input.notes || null,
        runningBalance: newRunningBalance,
        date: new Date(input.paymentDate),
        createdById,
      },
    });
  });
}
