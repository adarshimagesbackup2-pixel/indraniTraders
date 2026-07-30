import { Router } from "express";
import { transportSchema, transportUpdateSchema } from "@bardan/shared/validation/transport.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as transportService from "../services/transport.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const transports = await transportService.listTransports();
    res.json({ success: true, data: transports });
  })
);

router.post(
  "/",
  validateBody(transportSchema),
  asyncHandler(async (req, res) => {
    const transport = await transportService.createTransport(req.body);
    res.status(201).json({ success: true, data: transport });
  })
);

router.put(
  "/:id",
  validateBody(transportUpdateSchema),
  asyncHandler(async (req, res) => {
    const transport = await transportService.updateTransport(req.params.id, req.body);
    res.json({ success: true, data: transport });
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    await transportService.deactivateTransport(req.params.id);
    res.json({ success: true, data: null });
  })
);

export default router;
