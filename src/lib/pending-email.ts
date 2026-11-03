import "server-only";

import { cookies, headers } from "next/headers";

// The address the Check inbox screen shows in bold. Set by the sign-up and
// log-in actions, cleared when the confirmation link is used. It is a
// convenience for one screen and is never trusted for anything else: the
// resend action still validates it and the limiter still applies to it.
export const PENDING_EMAIL_COOKIE = "bb_pending_email";
const MAX_AGE_SECONDS = 24 * 60 * 60;

export async function setPendingEmail(email: string): Promise<void> {
  (await cookies()).set(PENDING_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

// Read from the request's cookie header rather than cookies(): the Check
// inbox page renders again in the same request as its resend action, and
// in Next.js 16.4 dev a cookies() read in that render throws an invariant
// ("underlying cookies object does not match"), after which the dev client
// reloads the page. The header is plain request data and never changes.
export async function getPendingEmail(): Promise<string | null> {
  const header = (await headers()).get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.split("=");
    if (name?.trim() !== PENDING_EMAIL_COOKIE) continue;
    let value = rest.join("=").trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      // Keep the raw value; it is validated by the resend schema anyway.
    }
    value = value.trim().toLowerCase();
    return value || null;
  }
  return null;
}

export async function clearPendingEmail(): Promise<void> {
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
}
