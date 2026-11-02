import "server-only";

import { cookies } from "next/headers";

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

export async function getPendingEmail(): Promise<string | null> {
  const value = (await cookies()).get(PENDING_EMAIL_COOKIE)?.value?.trim().toLowerCase();
  return value || null;
}

export async function clearPendingEmail(): Promise<void> {
  (await cookies()).delete(PENDING_EMAIL_COOKIE);
}
