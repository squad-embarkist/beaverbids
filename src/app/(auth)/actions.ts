"use server";

import { APIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { VERIFY_EMAIL_CALLBACK, auth } from "@/lib/auth";
import { destinationFor } from "@/lib/auth-destination";
import { prisma } from "@/lib/db";
import { log } from "@/lib/log";
import { queueAuthEmail } from "@/lib/email/enqueue";
import { appUrl, holdUntil, issueResetToken, resetLinkFor, resetPasswordWithToken } from "@/lib/password-reset";
import { getPendingEmail, setPendingEmail } from "@/lib/pending-email";
import { RATE_LIMITS, hitRateLimit, type RateLimitResult } from "@/lib/rate-limit";
import { clientIpFrom } from "@/lib/request-ip";
import { createAccountSchema, forgotPasswordSchema, isAuthErrorKey, resendConfirmationSchema, resetPasswordSchema, signInSchema, type AuthErrorKey } from "@/lib/schemas/auth";

export type AuthField = "name" | "email" | "password" | "confirm";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, AuthErrorKey>>;
  formError?: AuthErrorKey;
  // Minutes to wait, with tooManyAttempts.
  minutes?: number;
  // Echoed back so the form keeps what the user typed after an error.
  values?: { name?: string; email?: string };
};

export type ResendFormState = AuthFormState & {
  sent?: boolean;
  // Seconds until "Send it again" may be pressed, for the countdown.
  retryAfter?: number;
};

export type ForgotFormState = AuthFormState & { sent?: boolean };

// Where a saved password lands: Log in, with the success banner.
const PASSWORD_SAVED_QUERY = "reset=done";
// Every forgot password request takes at least this long, so one that
// wrote a token and queued an email cannot be told from one that did not.
const FORGOT_FLOOR_MS = 800;

function fieldErrorsFrom(error: ZodError): AuthFormState["fieldErrors"] {
  const out: Partial<Record<AuthField, AuthErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if ((field === "name" || field === "email" || field === "password" || field === "confirm") && !out[field] && isAuthErrorKey(issue.message)) {
      out[field] = issue.message;
    }
  }
  return out;
}

type AuthFailure = { kind: "error"; key: AuthErrorKey } | { kind: "unverified" };

function failureFrom(error: unknown): AuthFailure {
  if (error instanceof APIError) {
    const code = error.body?.code ?? "";
    if (code.includes("EMAIL_NOT_VERIFIED")) {
      return { kind: "unverified" };
    }
    if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("INVALID_PASSWORD")) {
      return { kind: "error", key: "invalidCredentials" };
    }
    log.warn("auth api error", { status: error.status, code });
    return { kind: "error", key: "unknown" };
  }
  log.error("auth unexpected error", { error: String(error) });
  return { kind: "error", key: "unknown" };
}

function minutesOf(result: RateLimitResult): number {
  return result.allowed ? 0 : Math.max(1, Math.ceil(result.retryAfterSeconds / 60));
}

async function clientIp(): Promise<string> {
  return clientIpFrom(await headers());
}

// Starts the resend cooldown for an address the moment its email goes out,
// so Check inbox shows "AVAILABLE IN" right away, as drawn.
async function startResendCooldown(email: string): Promise<void> {
  await hitRateLimit(prisma, { ...RATE_LIMITS.resendCooldown, subject: email });
}

export async function signInAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    rememberMe: formData.get("rememberMe"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  // Per IP and per address, before the password is checked.
  const ip = await clientIp();
  for (const result of [
    await hitRateLimit(prisma, { ...RATE_LIMITS.signInPerIp, subject: ip }),
    await hitRateLimit(prisma, { ...RATE_LIMITS.signInPerEmail, subject: parsed.data.email }),
  ]) {
    if (!result.allowed) return { formError: "tooManyAttempts", minutes: minutesOf(result), values };
  }

  let userId: string;
  try {
    const result = await auth.api.signInEmail({ body: parsed.data });
    userId = result.user.id;
  } catch (error) {
    const failure = failureFrom(error);
    if (failure.kind === "error") return { formError: failure.key, values };
    // The password was right and the address is not confirmed: Better Auth
    // has already resent the link (sendOnSignIn), so the person lands on
    // Check inbox with a fresh email and the one banner never has to say
    // the account exists.
    await setPendingEmail(parsed.data.email);
    await startResendCooldown(parsed.data.email);
    userId = "";
  }

  if (!userId) redirect("/check-inbox");
  redirect(await destinationFor(prisma, userId));
}

export async function createAccountAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    name: String(formData.get("name") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
  const parsed = createAccountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  const perIp = await hitRateLimit(prisma, { ...RATE_LIMITS.signUpPerIp, subject: await clientIp() });
  if (!perIp.allowed) return { formError: "tooManyAttempts", minutes: minutesOf(perIp), values };

  try {
    // Confirmation is required, so this creates no session: Better Auth
    // enqueues the confirmation email and answers an address that already
    // has an account exactly like a new one (docs/plans/account-flow-plan.md,
    // section 6).
    await auth.api.signUpEmail({ body: { ...parsed.data, callbackURL: VERIFY_EMAIL_CALLBACK } });
  } catch (error) {
    const failure = failureFrom(error);
    return { formError: failure.kind === "error" ? failure.key : "unknown", values };
  }

  await setPendingEmail(parsed.data.email);
  await startResendCooldown(parsed.data.email);
  redirect("/check-inbox");
}

// "Send it again" on Check inbox. The address comes from the pending cookie,
// or from the field the screen shows when the cookie is gone. Better Auth
// answers the same way for an unknown or already confirmed address.
export async function resendConfirmationAction(_previous: ResendFormState, formData: FormData): Promise<ResendFormState> {
  const fromCookie = await getPendingEmail();
  const values = { email: fromCookie ?? String(formData.get("email") ?? "") };
  const parsed = resendConfirmationSchema.safeParse({ email: fromCookie ?? formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const { email } = parsed.data;

  const cooldown = await hitRateLimit(prisma, { ...RATE_LIMITS.resendCooldown, subject: email });
  if (!cooldown.allowed) return { formError: "tooManyAttempts", minutes: minutesOf(cooldown), retryAfter: cooldown.retryAfterSeconds, values };
  const hourly = await hitRateLimit(prisma, { ...RATE_LIMITS.resendPerHour, subject: email });
  if (!hourly.allowed) return { formError: "tooManyAttempts", minutes: minutesOf(hourly), retryAfter: hourly.retryAfterSeconds, values };

  try {
    await auth.api.sendVerificationEmail({ body: { email, callbackURL: VERIFY_EMAIL_CALLBACK } });
  } catch (error) {
    const failure = failureFrom(error);
    return { formError: failure.kind === "error" ? failure.key : "unknown", values };
  }

  // No cookie write here: the screen re-renders in this same request, and
  // Next.js 16.4 cannot read cookies() in a page after an action set one.
  // The address goes back in the state instead.
  return { sent: true, retryAfter: RATE_LIMITS.resendCooldown.windowSeconds, values: { email } };
}

// "Send me a link." Same banner and the same time for every address. A
// confirmed account gets the drawn reset email; an unconfirmed one gets the
// drawn confirmation email again instead (under the resend cooldown), so
// no third email exists; an unknown address gets nothing.
export async function forgotPasswordAction(_previous: ForgotFormState, formData: FormData): Promise<ForgotFormState> {
  const startedAt = Date.now();
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  }
  const { email } = parsed.data;

  for (const result of [
    await hitRateLimit(prisma, { ...RATE_LIMITS.forgotPerIp, subject: await clientIp() }),
    await hitRateLimit(prisma, { ...RATE_LIMITS.forgotCooldown, subject: email }),
    await hitRateLimit(prisma, { ...RATE_LIMITS.forgotPerEmail, subject: email }),
  ]) {
    if (!result.allowed) return { formError: "tooManyAttempts", minutes: minutesOf(result), values };
  }

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, name: true, emailVerified: true, language: true } });
    if (user?.emailVerified) {
      const { raw } = await issueResetToken(prisma, user.id);
      await queueAuthEmail("reset-password", user, resetLinkFor(appUrl(), raw));
    } else if (user) {
      const cooldown = await hitRateLimit(prisma, { ...RATE_LIMITS.resendCooldown, subject: email });
      if (cooldown.allowed) await auth.api.sendVerificationEmail({ body: { email, callbackURL: VERIFY_EMAIL_CALLBACK } });
    }
  } catch (error) {
    // Logged, never shown: the screen says the same thing either way.
    log.error("forgot password failed", { error: String(error) });
  }

  await holdUntil(startedAt, FORGOT_FLOOR_MS);
  return { sent: true, values: { email } };
}

// Set new password. The token comes from the form body. A dead link gets
// the attention banner; the old password again gets the error under the
// first box and nothing is saved. On success every session is gone and the
// person logs in with the new password; nothing signs them in here.
export async function resetPasswordAction(_previous: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const parsed = resetPasswordSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) {
    const fieldErrors = fieldErrorsFrom(parsed.error);
    if (parsed.error.issues.some((issue) => issue.path[0] === "token")) return { formError: "linkInvalid" };
    return { fieldErrors };
  }

  const perIp = await hitRateLimit(prisma, { ...RATE_LIMITS.resetPerIp, subject: await clientIp() });
  if (!perIp.allowed) return { formError: "tooManyAttempts", minutes: minutesOf(perIp) };

  let outcome: Awaited<ReturnType<typeof resetPasswordWithToken>>;
  try {
    outcome = await resetPasswordWithToken(prisma, parsed.data.token, parsed.data.password);
  } catch (error) {
    log.error("reset password failed", { error: String(error) });
    return { formError: "unknown" };
  }
  if (!outcome.ok) {
    return outcome.reason === "sameAsOld" ? { fieldErrors: { password: "passwordSameAsOld" } } : { formError: "linkInvalid" };
  }
  redirect(`/sign-in?${PASSWORD_SAVED_QUERY}`);
}
