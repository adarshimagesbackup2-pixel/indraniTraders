import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as reminderService from "../services/reminder.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/pending",
  asyncHandler(async (req, res) => {
    const sortBy = (req.query.sortBy as "balance" | "name" | "lastPayment" | undefined) ?? "balance";
    const candidates = await reminderService.listReminderCandidates(sortBy);
    res.json({ success: true, data: candidates });
  })
);

router.post(
  "/log",
  asyncHandler(async (req, res) => {
    const { customerId, balanceAtSend } = req.body;
    const log = await reminderService.logReminderSent(customerId, balanceAtSend);
    res.status(201).json({ success: true, data: log });
  })
);

export default router;
