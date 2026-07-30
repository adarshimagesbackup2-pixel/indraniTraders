import { z } from "zod";
import { phoneSchema } from "./auth.schema";
import { gstinSchema, stateCodeSchema, pincodeSchema } from "./customer.schema";
import { transportModeEnum, transportationReasonEnum } from "./order.schema";

export const numberingModeEnum = z.enum(["AUTO", "MANUAL"]);

export const settingsUpdateSchema = z.object({
  businessName: z.string().trim().min(1, "Business name is required").max(200),
  businessGstin: gstinSchema,
  businessAddress: z.string().trim().min(1, "Address is required").max(500),
  businessPhone: phoneSchema,
  whatsappTemplate: z.string().trim().min(1, "Template cannot be empty").max(2000),
  gstEnabledDefault: z.boolean(),
  cgstPercent: z.coerce.number().min(0).max(100),
  sgstPercent: z.coerce.number().min(0).max(100),
  ewayThreshold: z.coerce.number().positive(),
  reminderDayOfMonth: z.coerce.number().int().min(1).max(28),

  // §1.2 — e-Way Bill business defaults
  businessPincode: pincodeSchema.optional().or(z.literal("")),
  businessStateCode: stateCodeSchema.optional().or(z.literal("")),
  businessAddressLine1: z.string().trim().max(200).optional().or(z.literal("")),
  businessAddressLine2: z.string().trim().max(200).optional().or(z.literal("")),
  businessPlace: z.string().trim().max(100).optional().or(z.literal("")),
  turnoverAboveFiveCr: z.boolean().default(false),
  defaultTransportMode: transportModeEnum.default("ROAD"),
  defaultTransportationReason: transportationReasonEnum.default("SUPPLY"),
  ewayThresholdIntrastate: z.coerce.number().positive().default(100000),
  ewayThresholdInterstate: z.coerce.number().positive().default(50000),

  // §2 — numbering mode
  numberingMode: numberingModeEnum.default("AUTO"),

  // §7.9 — financial year start month (1-12, India default April = 4)
  financialYearStartMonth: z.coerce.number().int().min(1).max(12).default(4),
});

export type SettingsUpdateInput = z.infer<typeof settingsUpdateSchema>;
