import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { queueAuthEmail } from "@/lib/email/enqueue";
import { PASSWORD_MAX, PASSWORD_MIN } from "@/lib/schemas/auth";

// Email and password only, confirmed by email before the first log in
// (docs/plans/account-flow-plan.md, section 3). The two emails are never
// sent from a request: the callbacks enqueue a job for the worker.

// "EXPIRES: In 24 hours" on the Check inbox screen; the confirmation
// token is a signed JWT, so this is the only place its life is set.
export const CONFIRMATION_LINK_TTL_SECONDS = 24 * 60 * 60;
// "LINK: Good for 60 minutes" on Forgot password; the reset token is a row
// in the verification table, deleted when used.
export const RESET_LINK_TTL_SECONDS = 60 * 60;
// Where Better Auth sends the browser after the confirmation link: a
// redirect-only route that lands a confirmed person on the questionnaire
// and a dead link back on Check inbox.
export const VERIFY_EMAIL_CALLBACK = "/verify-email";
export const RESET_PASSWORD_CALLBACK = "/reset-password";

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Sign-in answers 403 EMAIL_NOT_VERIFIED after the password check for
    // an unconfirmed account; sign-up creates no session and answers a
    // duplicate address exactly like a new one.
    requireEmailVerification: true,
    autoSignIn: true,
    minPasswordLength: PASSWORD_MIN,
    maxPasswordLength: PASSWORD_MAX,
    sendResetPassword: async ({ user, url }) => {
      await queueAuthEmail("reset-password", user, url);
    },
    resetPasswordTokenExpiresIn: RESET_LINK_TTL_SECONDS,
    // "Saving this signs out every other device": every session row goes
    // in the same transaction as the new hash.
    revokeSessionsOnPasswordReset: true,
    // A sign-up with an address that already has an account: the HTTP
    // answer is identical either way. An unconfirmed owner gets the
    // confirmation email again (the screen stays true); a confirmed owner
    // gets nothing and "FORGOT IT?" is their way in (plan, section 8
    // item 5). The endpoint below is a no-op for confirmed addresses.
    onExistingUserSignUp: async ({ user }) => {
      if (user.emailVerified) return;
      const { auth: api } = await import("@/lib/auth");
      await api.api.sendVerificationEmail({ body: { email: user.email, callbackURL: VERIFY_EMAIL_CALLBACK } });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await queueAuthEmail("confirm-email", user, url);
    },
    // An unconfirmed log in resends the link, so the log in screen never
    // has to explain: the person lands on Check inbox with a fresh email.
    sendOnSignIn: true,
    // "One click and you are in": the link confirms and starts the session.
    autoSignInAfterVerification: true,
    expiresIn: CONFIRMATION_LINK_TTL_SECONDS,
  },
  // Better Auth's limiter only sees HTTP calls to /api/auth/*; the server
  // actions apply their own limits on the same table (src/lib/rate-limit.ts).
  rateLimit: { enabled: true, storage: "database" },
  advanced: {
    // Cloudflare sits in front of Coolify. Without this every visitor
    // shares the proxy's address and one person's limit blocks everyone.
    ipAddress: { ipAddressHeaders: ["cf-connecting-ip", "x-forwarded-for"] },
  },
  user: {
    additionalFields: {
      language: { type: "string", required: false, defaultValue: "en" },
      digestOptIn: { type: "boolean", required: false, defaultValue: false },
      // Set by the server when the user opts in to the digest. Never accepted
      // from the sign-up body.
      digestConsentAt: { type: "date", required: false, input: false },
    },
  },
  // Must stay last so server actions can set the session cookie.
  plugins: [nextCookies()],
});

export type Session = typeof auth.$Infer.Session;
