import { Router } from "express";
import { stockAddSchema, bulkStockAddSchema } from "@bardan/shared/validation/stock.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as stockService from "../services/stock.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/add",
  validateBody(stockAddSchema),
  asyncHandler(async (req, res) => {
    const log = await stockService.addStock(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: log });
  })
);

// §7.6 — bulk stock adjustment
router.post(
  "/bulk-add",
  validateBody(bulkStockAddSchema),
  asyncHandler(async (req, res) => {
    const logs = await stockService.bulkAddStock(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: logs });
  })
);

router.get(
  "/audit-log",
  asyncHandler(async (req, res) => {
    const { bagTypeId, from, to, page, pageSize } = req.query;
    const result = await stockService.listStockAudit({
      bagTypeId: bagTypeId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
    });
    res.json({ success: true, data: result });
  })
);

export default router;
