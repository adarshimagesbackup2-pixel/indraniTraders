import { z } from "zod";

export const phoneSchema = z
  .string()
  .regex(/^[0-9]{10}$/, "Phone number must be exactly 10 digits");

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const changePasswordSchema = z
  .object({
    oldPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .regex(/[A-Z]/, "New password must contain an uppercase letter")
      .regex(/[0-9]/, "New password must contain a number"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
