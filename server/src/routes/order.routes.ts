import { Router } from "express";
import { orderCreateSchema, orderEditSchema, orderCancelSchema, ewayBillNoSchema } from "@bardan/shared/validation/order.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import * as orderService from "../services/order.service";
import * as ewaybillService from "../services/ewaybill.service";

const router = Router();
router.use(requireAuth);

router.post(
  "/",
  validateBody(orderCreateSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.createOrder({
      input: req.body,
      createdById: req.user!.userId,
      isAdmin: req.user!.role === "ADMIN",
    });
    res.status(201).json({ success: true, data: order });
  })
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, search, customerId, ewayStatus, vehicleId, from, to, sortBy, sortDir } = req.query;
    const result = await orderService.listOrders({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search as string | undefined,
      customerId: customerId as string | undefined,
      ewayStatus: ewayStatus as string | undefined,
      vehicleId: vehicleId as string | undefined,
      from: from as string | undefined,
      to: to as string | undefined,
      sortBy: sortBy as string | undefined,
      sortDir: sortDir as "asc" | "desc" | undefined,
    });
    res.json({ success: true, data: result });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const order = await orderService.getOrderById(req.params.id);
    res.json({ success: true, data: order });
  })
);

router.get(
  "/:id/json",
  asyncHandler(async (req, res) => {
    const payload = await ewaybillService.buildEwayBillJson(req.params.id);
    const order = await orderService.getOrderById(req.params.id);
    res.setHeader("Content-Disposition", `attachment; filename="EWB_${order.challanNo}.json"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(payload, null, 2));
  })
);

router.put(
  "/:id/ewaybill",
  validateBody(ewayBillNoSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.setEwayBillNumber(req.params.id, req.body.ewayBillNo);
    res.json({ success: true, data: order });
  })
);

// §3 — ADMIN-only edit, with full transactional stock/ledger reversal
router.put(
  "/:id",
  requireAdmin,
  validateBody(orderEditSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.editOrder(req.params.id, req.body, req.user!.userId);
    res.json({ success: true, data: order });
  })
);

// §3 — ADMIN-only cancel, alternative to editing when an e-way bill is already GENERATED
router.post(
  "/:id/cancel",
  requireAdmin,
  validateBody(orderCancelSchema),
  asyncHandler(async (req, res) => {
    const order = await orderService.cancelOrder(req.params.id, req.body.cancelReason, req.user!.userId);
    res.json({ success: true, data: order });
  })
);

export default router;
