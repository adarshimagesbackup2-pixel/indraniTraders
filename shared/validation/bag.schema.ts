import { z } from "zod";

export const unitOfMeasureEnum = z.enum(["BAG", "PCS", "KG", "NOS"]);

export const bagCreateSchema = z.object({
  bagType: z.string().trim().min(1, "Bag type name is required").max(200),
  defaultRate: z.coerce
    .number()
    .positive("Rate must be positive")
    .max(9999999.99, "Rate is too large")
    .refine((v) => Number(v.toFixed(2)) === v, "Max 2 decimal places"),
  currentStock: z.coerce
    .number()
    .int("Stock must be a whole number")
    .min(0, "Initial stock cannot be negative"),
  lowStockThreshold: z.coerce.number().int().min(0, "Threshold cannot be negative").default(2000),
  hsnCode: z.string().trim().max(20).default("6305"),

  // §1.1 — per-product GST + unit of measure
  gstRate: z.coerce
    .number()
    .min(0, "GST rate cannot be negative")
    .max(100, "GST rate cannot exceed 100%")
    .default(5),
  unitOfMeasure: unitOfMeasureEnum.default("BAG"),
});

// Stock is NOT editable after creation (only via /api/stock/add)
export const bagUpdateSchema = bagCreateSchema.omit({ currentStock: true }).partial();

export type BagCreateInput = z.infer<typeof bagCreateSchema>;
export type BagUpdateInput = z.infer<typeof bagUpdateSchema>;
