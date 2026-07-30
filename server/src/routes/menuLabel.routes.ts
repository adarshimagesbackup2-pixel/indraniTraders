import { Router } from "express";
import { menuLabelUpdateSchema } from "@bardan/shared/validation/menuLabel.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../prisma";

const DEFAULT_KEYS = ["dashboard", "orders", "khata", "stock", "challans", "reminders", "masters"];

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const existing = await prisma.menuLabel.findMany();
    const existingKeys = new Set(existing.map((e) => e.key));
    const missing = DEFAULT_KEYS.filter((k) => !existingKeys.has(k));
    if (missing.length > 0) {
      await prisma.menuLabel.createMany({
        data: missing.map((key) => ({ key, customLabel: null })),
        skipDuplicates: true,
      });
    }
    const labels = await prisma.menuLabel.findMany();
    res.json({ success: true, data: labels });
  })
);

router.put(
  "/",
  requireAdmin,
  validateBody(menuLabelUpdateSchema),
  asyncHandler(async (req, res) => {
    for (const { key, customLabel } of req.body.labels) {
      await prisma.menuLabel.upsert({
        where: { key },
        update: { customLabel: customLabel || null },
        create: { key, customLabel: customLabel || null },
      });
    }
    const labels = await prisma.menuLabel.findMany();
    res.json({ success: true, data: labels });
  })
);

export default router;
