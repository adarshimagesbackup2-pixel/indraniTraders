import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import type { TransportInput, TransportUpdateInput } from "@bardan/shared/validation/transport.schema";

export async function listTransports() {
  return prisma.transport.findMany({
    where: { isActive: true },
    orderBy: { vehicleNo: "asc" },
  });
}

export async function createTransport(input: TransportInput) {
  return prisma.transport.create({ data: input });
}

export async function updateTransport(id: string, input: TransportUpdateInput) {
  const existing = await prisma.transport.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Vehicle not found");
  return prisma.transport.update({ where: { id }, data: input });
}

export async function deactivateTransport(id: string) {
  const existing = await prisma.transport.findUnique({ where: { id } });
  if (!existing) throw new ApiError(404, "Vehicle not found");
  return prisma.transport.update({ where: { id }, data: { isActive: false } });
}
