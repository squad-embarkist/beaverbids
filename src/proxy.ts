import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: it looks for the session cookie and never touches
// the database. Every protected page still verifies the real session with
// getCurrentUser() from src/lib/session.ts. /dashboard stays matched so a
// signed-out visitor on the old address lands on sign in, not the redirect.
//
// The check runs in one direction on purpose. Sending a visitor WITH a cookie
// away from /sign-in would loop whenever the cookie is stale (the session was
// deleted or expired but the browser kept the cookie): the dashboard would
// bounce them back to /sign-in, and the proxy would bounce them again.
export function proxy(request: NextRequest) {
  const hasSessionCookie = Boolean(getSessionCookie(request));

  if (!hasSessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/questionnaire/:path*", "/opportunities/:path*"],
};
