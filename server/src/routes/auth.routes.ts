import { Router } from "express";
import rateLimit from "express-rate-limit";
import { loginSchema, changePasswordSchema } from "@bardan/shared/validation/auth.schema";
import { validateBody } from "../middleware/validate";
import { requireAuth } from "../middleware/auth";
import { asyncHandler, ApiError } from "../middleware/errorHandler";
import * as authService from "../services/auth.service";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: "Too many login attempts. Try again later." } },
});

const REFRESH_COOKIE = "bardan_refresh_token";
const isProd = process.env.NODE_ENV === "production";

router.post(
  "/login",
  loginLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const { phone, password, rememberMe } = req.body;
    const result = await authService.login(phone, password, rememberMe);

    res.cookie(REFRESH_COOKIE, result.refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: "strict",
      maxAge: (rememberMe ? 90 : 30) * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: { accessToken: result.accessToken, user: result.user },
    });
  })
);

router.post(
  "/refresh",
  asyncHandler(async (req, res) => {
    const token = req.cookies?.[REFRESH_COOKIE];
    if (!token) throw new ApiError(401, "No refresh token present");
    const accessToken = authService.refreshAccessToken(token);
    res.json({ success: true, data: { accessToken } });
  })
);

router.post("/logout", (req, res) => {
  res.clearCookie(REFRESH_COOKIE);
  res.json({ success: true, data: null });
});

router.post(
  "/change-password",
  requireAuth,
  validateBody(changePasswordSchema),
  asyncHandler(async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.userId, oldPassword, newPassword);
    res.json({ success: true, data: null });
  })
);

export default router;
