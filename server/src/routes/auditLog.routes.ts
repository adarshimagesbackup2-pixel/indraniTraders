import { Router } from "express";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as auditService from "../services/audit.service";

const router = Router();
router.use(requireAuth, requireAdmin);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, search, entityType, from, to } = req.query;
    const result = await auditService.listAuditLogs({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search as string | undefined,
      entityType: entityType as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
    });
    res.json({ success: true, data: result });
  })
);

export default router;
