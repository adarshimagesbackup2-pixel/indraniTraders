import { z } from "zod";

export const paymentModeEnum = z.enum(["CASH", "UPI", "BANK_TRANSFER", "CHEQUE"]);

export const paymentCreateSchema = z
  .object({
    customerId: z.string().uuid("Customer is required"),
    amount: z.coerce
      .number()
      .positive("Amount must be greater than 0")
      .max(9999999.99, "Amount is too large"),
    paymentDate: z
      .string()
      .refine((d) => !isNaN(Date.parse(d)), "Invalid date")
      .refine((d) => new Date(d) <= new Date(), "Payment date cannot be in the future"),
    paymentMode: paymentModeEnum,
    referenceNo: z.string().trim().max(100).optional().or(z.literal("")),
    notes: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .refine(
    (data) =>
      data.paymentMode === "CASH" ||
      (data.referenceNo !== undefined && data.referenceNo.length > 0),
    {
      message: "Reference ID is required for UPI, Bank Transfer, and Cheque",
      path: ["referenceNo"],
    }
  );

export type PaymentCreateInput = z.infer<typeof paymentCreateSchema>;
