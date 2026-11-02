import { z } from "zod";

// Shared by the account forms and their server actions. Error messages are
// keys under Auth.errors in messages/en.json, so this file holds no
// user-facing text.

// "Twelve characters or more": the checklist and placeholders on the Figma
// password screens (docs/plans/account-flow-plan.md, D2). Better Auth checks
// the same bounds on sign-up and reset; existing shorter passwords still log
// in, since length is only checked when a password is set.
export const PASSWORD_MIN = 12;
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
  "tooManyAttempts",
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
  // "Keep me logged in on this computer": unticked, the session cookie ends
  // with the browser. A checkbox posts "on" or nothing.
  rememberMe: z
    .union([z.literal("on"), z.literal("true"), z.literal("false"), z.boolean(), z.null()])
    .optional()
    .transform((value) => value === "on" || value === "true" || value === true),
});

// "Send it again" on Check inbox, with the address from the pending cookie
// or, when the cookie is gone, from a field on the screen.
export const resendConfirmationSchema = z.object({ email });

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
export type ResendConfirmationInput = z.infer<typeof resendConfirmationSchema>;
export type CreateAccountInput = z.infer<typeof createAccountSchema>;

export function isAuthErrorKey(value: string): value is AuthErrorKey {
  return (AUTH_ERROR_KEYS as readonly string[]).includes(value);
}
