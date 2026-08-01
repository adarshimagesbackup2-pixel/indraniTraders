import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { validateBody } from "../middleware/validate";
import { asyncHandler } from "../middleware/errorHandler";
import { askAssistant } from "../services/assistant.service";
import { assistantAskSchema } from "@bardan/shared/validation/assistant.schema";

const router = Router();
router.use(requireAuth);

router.post(
  "/ask",
  validateBody(assistantAskSchema),
  asyncHandler(async (req, res) => {
    const answer = await askAssistant(req.body.question);
    res.json({ success: true, data: { answer } });
  })
);

export default router;
