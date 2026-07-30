import { Router } from "express";
import { customerSchema, customerUpdateSchema, blacklistToggleSchema } from "@bardan/shared/validation/customer.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import * as customerService from "../services/customer.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, pageSize, search, sortBy, sortDir, blacklistedOnly } = req.query;
    const result = await customerService.listCustomers({
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      search: search as string | undefined,
      sortBy: sortBy as string | undefined,
      sortDir: sortDir as "asc" | "desc" | undefined,
      blacklistedOnly: blacklistedOnly === "true",
    });
    res.json({ success: true, data: result });
  })
);

router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const customer = await customerService.getCustomerById(req.params.id);
    res.json({ success: true, data: customer });
  })
);

router.post(
  "/",
  validateBody(customerSchema),
  asyncHandler(async (req, res) => {
    const customer = await customerService.createCustomer(req.body, req.user?.userId);
    res.status(201).json({ success: true, data: customer });
  })
);

router.put(
  "/:id",
  validateBody(customerUpdateSchema),
  asyncHandler(async (req, res) => {
    if (req.body.creditLimit !== undefined && req.user?.role !== "ADMIN") {
      throw new ApiError(403, "Only an ADMIN can change a customer's credit limit");
    }
    const customer = await customerService.updateCustomer(req.params.id, req.body, req.user?.userId);
    res.json({ success: true, data: customer });
  })
);

// §4 — ADMIN-only blacklist toggle
router.put(
  "/:id/blacklist",
  requireAdmin,
  validateBody(blacklistToggleSchema),
  asyncHandler(async (req, res) => {
    const customer = await customerService.setBlacklist(req.params.id, req.body, req.user!.userId);
    res.json({ success: true, data: customer });
  })
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await customerService.deleteCustomer(req.params.id);
    res.json({ success: true, data: null });
  })
);

export default router;
