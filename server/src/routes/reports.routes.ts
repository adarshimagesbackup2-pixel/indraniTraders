import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { generateStatementPdf } from "../services/pdf.service";
import { prisma } from "../prisma";

const router = Router();
router.use(requireAuth);

router.get(
  "/khata/:customerId/pdf",
  asyncHandler(async (req, res) => {
    const { customerId } = req.params;
    const { from, to } = req.query;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    const pdfBuffer = await generateStatementPdf({
      customerId,
      from: from as string | undefined,
      to: to as string | undefined,
    });

    const safeName = (customer?.trademarkName ?? customer?.name ?? "Customer").replace(/[^a-zA-Z0-9]+/g, "_");
    const fromLabel = (from as string | undefined) ?? "start";
    const toLabel = (to as string | undefined) ?? "today";
    const filename = `${safeName}_Statement_${fromLabel}_${toLabel}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(pdfBuffer);
  })
);

export default router;
