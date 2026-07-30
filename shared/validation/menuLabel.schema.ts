import { z } from "zod";

export const menuLabelUpdateSchema = z.object({
  labels: z.array(
    z.object({
      key: z.string().min(1),
      customLabel: z.string().trim().max(50).optional().or(z.literal("")),
    })
  ),
});

export type MenuLabelUpdateInput = z.infer<typeof menuLabelUpdateSchema>;
