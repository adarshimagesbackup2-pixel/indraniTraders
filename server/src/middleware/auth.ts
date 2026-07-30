import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export interface AuthTokenPayload {
  userId: string;
  name: string;
  role: "ADMIN" | "STAFF";
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;

/**
 * Requires a valid access token via `Authorization: Bearer <token>`.
 * All /api/* routes except /api/auth/* go through this, per §4.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: { message: "Missing or invalid Authorization header" },
    });
  }

  const token = header.slice("Bearer ".length);

  try {
    const payload = jwt.verify(token, ACCESS_SECRET) as AuthTokenPayload;
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      error: { message: "Access token is invalid or expired" },
    });
  }
}

/**
 * Role guard: only ADMIN may proceed. STAFF gets 403.
 * Used on credit-limit edits, customer/bag deletes, settings edits,
 * ledger entry edits/deletes, and the recalculate-balances maintenance
 * action, per §4 and §6.3/§6.7/§6.8.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.user?.role !== "ADMIN") {
    return res.status(403).json({
      success: false,
      error: { message: "This action requires an ADMIN role" },
    });
  }
  next();
}
