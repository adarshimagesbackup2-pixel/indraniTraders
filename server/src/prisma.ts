import { PrismaClient } from "@prisma/client";

// Single shared Prisma instance across the app (avoids exhausting DB
// connections from multiple instantiations, especially under tsx watch/HMR).
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});
