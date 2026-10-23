import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";

// Email and password only. No social providers and no email sending in the
// MVP, so no verification or password reset senders are configured.
export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    autoSignIn: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
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
