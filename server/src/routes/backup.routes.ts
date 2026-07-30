import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { exportFullBackup } from "../services/backup.service";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  "/export",
  asyncHandler(async (req, res) => {
    const { from, to } = req.query as { from?: string; to?: string };
    const backup = await exportFullBackup({ from, to });
    const dateStamp = new Date().toISOString().slice(0, 10);
    const suffix = from || to ? `-${[from ?? "all", to ?? "all"].join("-to-")}` : "";

    res.setHeader("Content-Disposition", `attachment; filename="bardan-erp-backup-${dateStamp}${suffix}.json"`);
    res.setHeader("Content-Type", "application/json");
    // JSON.stringify with a replacer so Prisma Decimal objects serialize as plain numbers.
    res.send(JSON.stringify(backup, (_key, value) => (value?.constructor?.name === "Decimal" ? Number(value) : value), 2));
  })
);

export default router;
