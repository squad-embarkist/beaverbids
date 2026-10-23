"use server";

import { APIError } from "better-auth/api";
import { redirect } from "next/navigation";
import type { ZodError } from "zod";
import { auth } from "@/lib/auth";
import { log } from "@/lib/log";
import {
  createAccountSchema,
  isAuthErrorKey,
  signInSchema,
  type AuthErrorKey,
} from "@/lib/schemas/auth";

export type AuthField = "name" | "email" | "password";

export type AuthFormState = {
  fieldErrors?: Partial<Record<AuthField, AuthErrorKey>>;
  formError?: AuthErrorKey;
  // Echoed back so the form keeps what the user typed after an error.
  values?: { name?: string; email?: string };
};

function fieldErrorsFrom(error: ZodError): AuthFormState["fieldErrors"] {
  const out: Partial<Record<AuthField, AuthErrorKey>> = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (
      (field === "name" || field === "email" || field === "password") &&
      !out[field] &&
      isAuthErrorKey(issue.message)
    ) {
      out[field] = issue.message;
    }
  }
  return out;
}

function errorKeyFrom(error: unknown): AuthErrorKey {
  if (error instanceof APIError) {
    const code = error.body?.code ?? "";
    if (code.includes("INVALID_EMAIL_OR_PASSWORD") || code.includes("INVALID_PASSWORD")) {
      return "invalidCredentials";
    }
    if (code.includes("USER_ALREADY_EXISTS")) {
      return "emailTaken";
    }
    log.warn("auth api error", { status: error.status, code });
    return "unknown";
  }
  log.error("auth unexpected error", { error: String(error) });
  return "unknown";
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const values = { email: String(formData.get("email") ?? "") };
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error), values };
  }

  try {
    await auth.api.signInEmail({ body: parsed.data });
  } catch (error) {
    return { formError: errorKeyFrom(error), values };
  }

  redirect("/dashboard");
}

export async function createAccountAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
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

  try {
    // autoSignIn is on, so this also creates the session.
    await auth.api.signUpEmail({ body: parsed.data });
  } catch (error) {
    return { formError: errorKeyFrom(error), values };
  }

  redirect("/dashboard");
}
