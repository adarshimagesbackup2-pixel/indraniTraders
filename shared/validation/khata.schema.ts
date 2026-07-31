import { z } from "zod";
import { paymentModeEnum } from "./payment.schema";

export const khataEntryUpdateSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(9999999.99, "Amount is too large"),
  date: z
    .string()
    .refine((d) => !isNaN(Date.parse(d)), "Invalid date")
    .refine((d) => new Date(d) <= new Date(), "Date cannot be in the future"),
  paymentMode: paymentModeEnum.optional(),
  referenceNo: z.string().trim().max(100).optional().or(z.literal("")),
  notes: z.string().trim().max(1000).optional().or(z.literal("")),
});

export type KhataEntryUpdateInput = z.infer<typeof khataEntryUpdateSchema>;
