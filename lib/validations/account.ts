import { z } from "zod";
import { password } from "@/lib/validations/auth";

export const profileSchema = z.object({
  name: z.string().min(2, "Enter your name"),
  email: z.email("Enter a valid email"),
});
export type ProfileValues = z.infer<typeof profileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    password,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    message: "Passwords don't match",
    path: ["confirm"],
  })
  .refine((d) => d.password !== d.currentPassword, {
    message: "New password must be different from the current one",
    path: ["password"],
  });
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
