import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import { prisma } from "../prisma";
import { getLatestRunningBalance } from "../services/khata.service";

const router = Router();
router.use(requireAuth);

/** Overview register: all customers + balances, per §8.3. */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const customers = await prisma.customer.findMany({ where: { isActive: true } });

    const rows = await Promise.all(
      customers.map(async (c) => {
        const [totalBilled, totalPaid, lastPayment] = await Promise.all([
          prisma.khataLedger.aggregate({
            where: { customerId: c.id, type: "DEBIT" },
            _sum: { amount: true },
          }),
          prisma.khataLedger.aggregate({
            where: { customerId: c.id, type: "CREDIT" },
            _sum: { amount: true },
          }),
          prisma.khataLedger.findFirst({
            where: { customerId: c.id, type: "CREDIT" },
            orderBy: { date: "desc" },
          }),
        ]);
        const netOutstanding = await getLatestRunningBalance(c.id);

        return {
          customerId: c.id,
          name: c.name,
          phone: c.phone,
          totalBilled: Number(totalBilled._sum.amount ?? 0),
          totalPaid: Number(totalPaid._sum.amount ?? 0),
          netOutstanding,
          status: netOutstanding <= 0 ? "Clear" : "Pending",
          lastPaymentDate: lastPayment?.date ?? null,
        };
      })
    );

    res.json({ success: true, data: rows });
  })
);

/** Full transaction history + summary for one customer, per §8.3. */
router.get(
  "/:customerId",
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { from, to } = req.query;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) throw new ApiError(404, "Customer not found");

    const where: Record<string, unknown> = { customerId };
    if (from || to) {
      where.date = {
        ...(from ? { gte: new Date(from as string) } : {}),
        ...(to ? { lte: new Date(to as string) } : {}),
      };
    }

    const entries = await prisma.khataLedger.findMany({
      where,
      include: { order: true },
      orderBy: [{ date: "asc" }],
    });

    const outstandingBalance = await getLatestRunningBalance(customerId);
    const lastPayment = await prisma.khataLedger.findFirst({
      where: { customerId, type: "CREDIT" },
      orderBy: { date: "desc" },
    });

    res.json({
      success: true,
      data: {
        customer,
        outstandingBalance,
        creditRemaining:
          Number(customer.creditLimit) > 0
            ? Number(customer.creditLimit) - outstandingBalance
            : null,
        lastPaymentDate: lastPayment?.date ?? null,
        lastPaymentAmount: lastPayment ? Number(lastPayment.amount) : null,
        entries,
      },
    });
  })
);

export default router;
