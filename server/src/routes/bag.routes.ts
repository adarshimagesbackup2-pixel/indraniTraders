import { Router } from "express";
import { bagCreateSchema, bagUpdateSchema } from "@bardan/shared/validation/bag.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as bagService from "../services/bag.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const bags = await bagService.listBags();
    res.json({ success: true, data: bags });
  })
);

router.post(
  "/",
  validateBody(bagCreateSchema),
  asyncHandler(async (req, res) => {
    const bag = await bagService.createBag(req.body);
    res.status(201).json({ success: true, data: bag });
  })
);

router.put(
  "/:id",
  validateBody(bagUpdateSchema),
  asyncHandler(async (req, res) => {
    const bag = await bagService.updateBag(req.params.id, req.body);
    res.json({ success: true, data: bag });
  })
);

// §7.4 — low stock reorder suggestion based on last 30 days' consumption
router.get(
  "/:id/reorder-suggestion",
  asyncHandler(async (req, res) => {
    const suggestedQuantity = await bagService.suggestReorderQuantity(req.params.id);
    res.json({ success: true, data: { suggestedQuantity } });
  })
);

export default router;
