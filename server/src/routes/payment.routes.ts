import { Router } from "express";
import { paymentCreateSchema } from "@bardan/shared/validation/payment.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as paymentService from "../services/payment.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  validateBody(paymentCreateSchema),
  asyncHandler(async (req, res) => {
    const payment = await paymentService.recordPayment(req.body, req.user!.userId);
    res.status(201).json({ success: true, data: payment });
  })
);

export default router;
