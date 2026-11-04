import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { destinationFor } from "@/lib/auth-destination";
import { prisma } from "@/lib/db";
import { PENDING_EMAIL_COOKIE } from "@/lib/pending-email";

// Where Better Auth sends the browser after GET /api/auth/verify-email. No
// screen of its own (docs/plans/account-flow-plan.md, section 3): a
// confirmed person already carries the session cookie Better Auth set
// (autoSignInAfterVerification) and goes straight to the questionnaire; a
// dead link comes back with ?error=TOKEN_EXPIRED, INVALID_TOKEN or
// USER_NOT_FOUND and lands on Check inbox with the attention banner; a
// second click on an already used link carries no session and goes to
// log in.
export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.has("error")) {
    return NextResponse.redirect(new URL("/check-inbox?error=link", request.url));
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  const response = NextResponse.redirect(new URL(await destinationFor(prisma, session.user.id), request.url));
  response.cookies.delete(PENDING_EMAIL_COOKIE);
  return response;
}
