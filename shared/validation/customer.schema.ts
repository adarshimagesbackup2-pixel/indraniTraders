import { z } from "zod";
import { phoneSchema } from "./auth.schema";

// Standard GSTIN regex
export const gstinSchema = z
  .string()
  .regex(
    /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    "Invalid GSTIN format"
  )
  .optional()
  .or(z.literal(""));

// 2-digit GST state code, e.g. "27" for Maharashtra
export const stateCodeSchema = z
  .string()
  .regex(/^[0-9]{2}$/, "State code must be 2 digits");

export const pincodeSchema = z.string().regex(/^[0-9]{6}$/, "Pincode must be 6 digits");

export const customerSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  phone: phoneSchema,
  address: z.string().trim().min(1, "Address is required").max(500),
  gstin: gstinSchema,
  creditLimit: z.coerce.number().min(0, "Credit limit cannot be negative").default(0),
  trademarkName: z.string().trim().max(200).optional().or(z.literal("")),
  openingBalance: z.coerce.number().min(0, "Opening balance cannot be negative").default(0),
  openingBalanceType: z.enum(["DEBIT", "CREDIT"]).default("DEBIT"),

  // §1.3 — required for e-Way Bill threshold + intrastate/interstate determination
  stateCode: stateCodeSchema,
  pincode: pincodeSchema,

  // §1.3 — optional ship-to details; if blank, ship-to = bill-to
  shipToAddress: z.string().trim().max(500).optional().or(z.literal("")),
  shipToGstin: gstinSchema,
  shipToPincode: z
    .string()
    .regex(/^[0-9]{6}$/, "Pincode must be 6 digits")
    .optional()
    .or(z.literal("")),
  shipToStateCode: z
    .string()
    .regex(/^[0-9]{2}$/, "State code must be 2 digits")
    .optional()
    .or(z.literal("")),
});

export const customerUpdateSchema = customerSchema.partial();

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return value;
}, z.boolean());

// §4 — blacklist toggle, ADMIN only, reason required when blacklisting
export const blacklistToggleSchema = z.object({
  isBlacklisted: booleanLikeSchema,
  blacklistReason: z.string().trim().max(500).optional(),
}).refine((data) => !data.isBlacklisted || (data.blacklistReason && data.blacklistReason.length > 0), {
  message: "A reason is required to blacklist a customer",
  path: ["blacklistReason"],
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
export type BlacklistToggleInput = z.infer<typeof blacklistToggleSchema>;
