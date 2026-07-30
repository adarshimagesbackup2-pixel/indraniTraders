import { Router } from "express";
import { settingsUpdateSchema } from "@bardan/shared/validation/settings.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth, requireAdmin } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";
import { prisma } from "../prisma";
import { recalculateAllBalances } from "../services/khata.service";

const router = Router();
router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const settings = await prisma.businessSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    res.json({ success: true, data: settings });
  })
);

router.put(
  "/",
  requireAdmin,
  validateBody(settingsUpdateSchema),
  asyncHandler(async (req, res) => {
    const b = req.body;
    const settings = await prisma.businessSettings.update({
      where: { id: "singleton" },
      data: {
        businessName: b.businessName,
        businessGstin: b.businessGstin || null,
        businessAddress: b.businessAddress,
        businessPhone: b.businessPhone,
        whatsappTemplate: b.whatsappTemplate,
        gstEnabledDefault: b.gstEnabledDefault,
        cgstPercent: b.cgstPercent,
        sgstPercent: b.sgstPercent,
        ewayThreshold: b.ewayThreshold,
        reminderDayOfMonth: b.reminderDayOfMonth,
        businessPincode: b.businessPincode || null,
        businessStateCode: b.businessStateCode || null,
        businessAddressLine1: b.businessAddressLine1 || null,
        businessAddressLine2: b.businessAddressLine2 || null,
        businessPlace: b.businessPlace || null,
        turnoverAboveFiveCr: b.turnoverAboveFiveCr,
        defaultTransportMode: b.defaultTransportMode,
        defaultTransportationReason: b.defaultTransportationReason,
        ewayThresholdIntrastate: b.ewayThresholdIntrastate,
        ewayThresholdInterstate: b.ewayThresholdInterstate,
        numberingMode: b.numberingMode,
        financialYearStartMonth: b.financialYearStartMonth,
      },
    });
    res.json({ success: true, data: settings });
  })
);

router.post(
  "/recalculate-balances",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const result = await recalculateAllBalances();
    res.json({ success: true, data: result });
  })
);

// §7.10 — full database backup/export, ADMIN only
router.get(
  "/backup",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const [customers, bags, transports, orders, orderItems, ledger, stockLogs, settings, reminders] =
      await Promise.all([
        prisma.customer.findMany(),
        prisma.bagMaster.findMany(),
        prisma.transport.findMany(),
        prisma.order.findMany(),
        prisma.orderItem.findMany(),
        prisma.khataLedger.findMany(),
        prisma.stockAuditLog.findMany(),
        prisma.businessSettings.findMany(),
        prisma.reminderLog.findMany(),
      ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      customers,
      bags,
      transports,
      orders,
      orderItems,
      ledger,
      stockLogs,
      settings,
      reminders,
    };

    const filename = `bardan-erp-backup-${new Date().toISOString().slice(0, 10)}.json`;
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Type", "application/json");
    res.send(JSON.stringify(backup, null, 2));
  })
);

export default router;
