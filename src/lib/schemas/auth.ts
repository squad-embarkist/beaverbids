import { z } from "zod";

// Shared by the sign-in and create-account forms and their server actions.
// Error messages are keys under Auth.errors in messages/en.json, so this
// file holds no user-facing text.

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const NAME_MAX = 120;

export const AUTH_ERROR_KEYS = [
  "nameRequired",
  "nameTooLong",
  "emailInvalid",
  "passwordRequired",
  "passwordTooShort",
  "passwordTooLong",
  "invalidCredentials",
  "emailTaken",
  "unknown",
] as const;

export type AuthErrorKey = (typeof AUTH_ERROR_KEYS)[number];

// Trim and lowercase first, then check the format, so " Jo@Example.com "
// is accepted and stored as "jo@example.com".
const email = z
  .string({ error: "emailInvalid" })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "emailInvalid" }));

export const signInSchema = z.object({
  email,
  password: z.string({ error: "passwordRequired" }).min(1, { error: "passwordRequired" }),
});

export const createAccountSchema = z.object({
  name: z
    .string({ error: "nameRequired" })
    .trim()
    .min(1, { error: "nameRequired" })
    .max(NAME_MAX, { error: "nameTooLong" }),
  email,
  password: z
    .string({ error: "passwordRequired" })
    .min(PASSWORD_MIN, { error: "passwordTooShort" })
    .max(PASSWORD_MAX, { error: "passwordTooLong" }),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export function isAuthErrorKey(value: string): value is AuthErrorKey {
  return (AUTH_ERROR_KEYS as readonly string[]).includes(value);
}
