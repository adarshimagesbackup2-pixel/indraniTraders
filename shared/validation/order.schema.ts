import { z } from "zod";

export const pricingTypeEnum = z.enum(["PER_BAG", "LUMPSUM"]);

export const transportModeEnum = z.enum(["ROAD", "RAIL", "AIR", "SHIP"]);

export const transportationReasonEnum = z.enum([
  "SUPPLY",
  "EXPORT",
  "JOB_WORK",
  "SKD_CKD",
  "RECIPIENT_NOT_KNOWN",
  "LINE_SALES",
  "SALES_RETURN",
  "EXHIBITION_FAIRS",
  "FOR_OWN_USE",
  "OTHERS",
]);

export const orderLineItemSchema = z
  .object({
    bagTypeId: z.string().uuid("Select a bag type"),
    quantity: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be greater than 0"),
    pricingType: pricingTypeEnum,
    ratePerBag: z.coerce.number().positive().max(9999999.99).optional(),
    lumpsumAmount: z.coerce.number().positive().max(9999999.99).optional(),
  })
  .refine((item) => (item.pricingType === "PER_BAG" ? item.ratePerBag !== undefined : true), {
    message: "Rate per bag is required",
    path: ["ratePerBag"],
  })
  .refine((item) => (item.pricingType === "LUMPSUM" ? item.lumpsumAmount !== undefined : true), {
    message: "Lump-sum amount is required",
    path: ["lumpsumAmount"],
  });

export const orderCreateSchema = z
  .object({
    customerId: z.string().uuid("Select a customer"),
    transportId: z.string().uuid("Select a vehicle"),
    gstEnabled: z.boolean().default(false),
    items: z.array(orderLineItemSchema).min(1, "Add at least one bag type"),
    overrideCreditLimit: z.boolean().optional().default(false),

    // §4 — blacklist override, ADMIN only (same pattern as credit limit override)
    overrideBlacklist: z.boolean().optional().default(false),

    // §2 — custom bill/challan numbers
    customChallanNo: z.string().trim().max(50).optional().or(z.literal("")),
    customerBillNo: z.string().trim().max(50).optional().or(z.literal("")),

    // §1.4 — e-way transport detail
    transportationReason: transportationReasonEnum.default("SUPPLY"),
    transportMode: transportModeEnum.default("ROAD"),
    transportDocNo: z.string().trim().max(50).optional().or(z.literal("")),
    transportDocDate: z.string().optional().or(z.literal("")),
    transDistanceKm: z.coerce.number().int().positive().optional(),
  })
  .refine(
    (data) => data.transportMode === "ROAD" || (data.transportDocNo && data.transportDocNo.length > 0),
    { message: "Transport document number is required for Rail/Air/Ship", path: ["transportDocNo"] }
  );

export const ewayBillNoSchema = z.object({
  ewayBillNo: z.string().regex(/^[0-9]{12}$/, "EWB number must be exactly 12 digits"),
});

// §3 — editing an existing order requires a reason (ADMIN only)
export const orderEditSchema = z.object({
  customerId: z.string().uuid("Select a customer"),
  transportId: z.string().uuid("Select a vehicle"),
  gstEnabled: z.boolean().default(false),
  items: z.array(orderLineItemSchema).min(1, "Add at least one bag type"),
  customerBillNo: z.string().trim().max(50).optional().or(z.literal("")),
  transportationReason: transportationReasonEnum.default("SUPPLY"),
  transportMode: transportModeEnum.default("ROAD"),
  transportDocNo: z.string().trim().max(50).optional().or(z.literal("")),
  transportDocDate: z.string().optional().or(z.literal("")),
  transDistanceKm: z.coerce.number().int().positive().optional(),
  editReason: z.string().trim().min(1, "A reason for this edit is required").max(500),
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
export type OrderEditInput = z.infer<typeof orderEditSchema>;
export type OrderCancelInput = z.infer<typeof orderCancelSchema>;
export type EwayBillNoInput = z.infer<typeof ewayBillNoSchema>;
export type OrderLineItemInput = z.infer<typeof orderLineItemSchema>;

export const orderCancelSchema = z.object({
  cancelReason: z.string().trim().min(1, "A reason for cancelling is required").max(500),
});

