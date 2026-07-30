import { z } from "zod";
import { phoneSchema } from "./auth.schema";

export const transportSchema = z.object({
  vehicleNo: z.string().trim().min(1, "Vehicle number is required").max(20),
  driverName: z.string().trim().min(1, "Driver name is required").max(200),
  driverPhone: phoneSchema,
});

export const transportUpdateSchema = transportSchema.partial();

export type TransportInput = z.infer<typeof transportSchema>;
export type TransportUpdateInput = z.infer<typeof transportUpdateSchema>;
