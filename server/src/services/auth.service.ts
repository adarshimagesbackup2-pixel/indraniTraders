import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../prisma";
import { ApiError } from "../middleware/errorHandler";
import type { AuthTokenPayload } from "../middleware/auth";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET as string;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET as string;
const ACCESS_TOKEN_TTL = "8h";

function signAccessToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

function signRefreshToken(payload: AuthTokenPayload, rememberMe: boolean): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: rememberMe ? "90d" : "30d" });
}

export async function login(phone: string, password: string, rememberMe: boolean) {
  const user = await prisma.user.findUnique({ where: { phone } });
  if (!user) throw new ApiError(401, "Invalid phone number or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, "Invalid phone number or password");

  const payload: AuthTokenPayload = { userId: user.id, name: user.name, role: user.role };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload, rememberMe);

  return {
    accessToken,
    refreshToken,
    rememberMe,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    },
  };
}

export function refreshAccessToken(refreshToken: string) {
  try {
    const payload = jwt.verify(refreshToken, REFRESH_SECRET) as AuthTokenPayload;
    const accessToken = signAccessToken({
      userId: payload.userId,
      name: payload.name,
      role: payload.role,
    });
    return accessToken;
  } catch {
    throw new ApiError(401, "Refresh token is invalid or expired");
  }
}

export async function changePassword(userId: string, oldPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const valid = await bcrypt.compare(oldPassword, user.passwordHash);
  if (!valid) throw new ApiError(422, "Current password is incorrect");

  const passwordHash = await bcrypt.hash(newPassword, 12);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash, mustChangePassword: false },
  });
}
export async function getCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(401, "Session is no longer valid");
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    mustChangePassword: user.mustChangePassword,
  };
}
export async function changePhone(userId: string, currentPassword: string, newPhone: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new ApiError(404, "User not found");

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ApiError(422, "Password is incorrect");

  const clash = await prisma.user.findUnique({ where: { phone: newPhone } });
  if (clash && clash.id !== userId) {
    throw new ApiError(422, "This phone number is already in use", { newPhone: "Already in use" });
  }

  await prisma.user.update({ where: { id: userId }, data: { phone: newPhone } });
}
