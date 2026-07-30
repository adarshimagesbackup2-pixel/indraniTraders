import { Request, Response, NextFunction } from "express";
import { ZodSchema, ZodError } from "zod";

/**
 * Validates req.body against the given Zod schema. On failure, responds
 * 422 with field-level errors so the frontend can map them directly onto
 * React Hook Form field errors (per §9). On success, replaces req.body
 * with the parsed (and coerced/defaulted) value.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields: Record<string, string> = {};
        for (const issue of err.issues) {
          const key = issue.path.join(".") || "_root";
          if (!fields[key]) fields[key] = issue.message;
        }
        return res.status(422).json({
          success: false,
          error: { message: "Validation failed", fields },
        });
      }
      next(err);
    }
  };
}
