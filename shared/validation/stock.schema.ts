import { z } from "zod";

export const stockEntryTypeEnum = z.enum(["MANUFACTURING_ADDITION", "PURCHASE_ADDITION"]);

export const stockAddSchema = z.object({
  bagTypeId: z.string().uuid("Select a bag type"),
  entryType: stockEntryTypeEnum,
  quantityAdded: z.coerce
    .number()
    .int("Quantity must be a whole number")
    .positive("Quantity must be greater than 0"),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

// §7.6 — multi-select bulk stock adjustment (physical stock-take correction)
export const bulkStockAddSchema = z.object({
  entries: z
    .array(
      z.object({
        bagTypeId: z.string().uuid("Select a bag type"),
        entryType: stockEntryTypeEnum,
        quantityAdded: z.coerce.number().int("Quantity must be a whole number").positive("Quantity must be greater than 0"),
        notes: z.string().trim().max(500).optional().or(z.literal("")),
      })
    )
    .min(1, "Add at least one bag type"),
});

export type StockAddInput = z.infer<typeof stockAddSchema>;
export type BulkStockAddInput = z.infer<typeof bulkStockAddSchema>;
