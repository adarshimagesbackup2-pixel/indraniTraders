import { Request, Response, NextFunction } from "express";
import { logger } from "../utils/logger";

export class ApiError extends Error {
  statusCode: number;
  fields?: Record<string, string>;

  constructor(statusCode: number, message: string, fields?: Record<string, string>) {
    super(message);
    this.statusCode = statusCode;
    this.fields = fields;
  }
}

/**
 * Centralized error → JSON response. Every route/service throws ApiError
 * (or lets Zod validation errors bubble via the validate middleware) and
 * this converts it to the standard { success, error: { message, fields? } }
 * envelope described in §9.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  next: NextFunction
) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      error: { message: err.message, fields: err.fields },
    });
  }

  logger.error("Unhandled error", err);
  return res.status(500).json({
    success: false,
    error: { message: "An unexpected server error occurred" },
  });
}

/** Wraps an async route handler so thrown/rejected errors reach errorHandler. */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
