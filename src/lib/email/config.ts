import { z } from "zod";

// Email settings, read once at startup by the worker (which sends) and the
// web app (which shows the sender and support addresses on the account
// screens). Every environment sends through nodemailer: Mailpit on a laptop,
// a JSON file per message in CI and Playwright, TurboSMTP on staging and
// production (docs/plans/account-flow-plan.md, section 5).
//
// Production (NODE_ENV=production, which staging also runs) fails here,
// naming the variables, when the SMTP transport is not fully configured, so
// a bad deploy stops at worker startup instead of at the first sign-up.

export const EMAIL_TRANSPORTS = ["smtp", "file"] as const;
export type EmailTransportKind = (typeof EMAIL_TRANSPORTS)[number];

export const DEFAULT_EMAIL_FILE_DIR = ".data/mail";

export type SmtpSettings = {
  host: string;
  port: number;
  // TLS from the first byte (port 465). Otherwise STARTTLS is required
  // whenever credentials are sent, so a password never crosses in clear.
  secure: boolean;
  auth?: { user: string; pass: string };
};

export type EmailConfig = {
  transport: EmailTransportKind;
  smtp: SmtpSettings;
  fileDir: string;
  // "BeaverBids <hello@beaverbids.ca>": the From header and the FROM row
  // on the Check inbox screen.
  from: string;
  supportEmail: string;
  // Printed in the footer of every email (Canada's anti-spam law).
  postalAddress: string;
  // Public origin of the web app (BETTER_AUTH_URL): the logo in the header
  // is loaded from it.
  appUrl: string;
};

export type EmailEnv = Record<string, string | undefined>;

const LAPTOP = {
  host: "localhost",
  port: 1025,
  from: "BeaverBids <hello@beaverbids.ca>",
  supportEmail: "support@beaverbids.ca",
  appUrl: "http://localhost:3000",
} as const;

const PRODUCTION_REQUIRED = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASSWORD", "EMAIL_FROM", "SUPPORT_EMAIL", "EMAIL_POSTAL_ADDRESS", "BETTER_AUTH_URL"] as const;

const envSchema = z.object({
  EMAIL_TRANSPORT: z.enum(EMAIL_TRANSPORTS).default("smtp"),
  SMTP_HOST: z.string().default(LAPTOP.host),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(LAPTOP.port),
  SMTP_USER: z.string().default(""),
  SMTP_PASSWORD: z.string().default(""),
  SMTP_SECURE: z.enum(["true", "false", "1", "0"]).default("false"),
  EMAIL_FROM: z.string().default(LAPTOP.from),
  SUPPORT_EMAIL: z.email().default(LAPTOP.supportEmail),
  EMAIL_POSTAL_ADDRESS: z.string().default(""),
  EMAIL_FILE_DIR: z.string().default(DEFAULT_EMAIL_FILE_DIR),
  BETTER_AUTH_URL: z.url().default(LAPTOP.appUrl),
});

export function readEmailConfig(env: EmailEnv = process.env): EmailConfig {
  const raw = clean(env);

  if (raw.NODE_ENV === "production") {
    const missing = PRODUCTION_REQUIRED.filter((name) => raw[name] === undefined);
    if (raw.EMAIL_TRANSPORT !== undefined && raw.EMAIL_TRANSPORT !== "smtp") {
      throw new Error(`EMAIL_TRANSPORT must be "smtp" in production (got ${JSON.stringify(raw.EMAIL_TRANSPORT)}). The file transport is for CI and Playwright only.`);
    }
    if (missing.length > 0) {
      throw new Error(`Email is not configured for production. Set ${missing.join(", ")} in the worker's environment (see .env.example).`);
    }
  }

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
    throw new Error(`Email settings are invalid: ${issues}`);
  }
  const e = parsed.data;
  const auth = e.SMTP_USER || e.SMTP_PASSWORD ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined;

  return {
    transport: e.EMAIL_TRANSPORT,
    smtp: { host: e.SMTP_HOST, port: e.SMTP_PORT, secure: e.SMTP_SECURE === "true" || e.SMTP_SECURE === "1", auth },
    fileDir: e.EMAIL_FILE_DIR,
    from: e.EMAIL_FROM,
    supportEmail: e.SUPPORT_EMAIL,
    postalAddress: e.EMAIL_POSTAL_ADDRESS,
    appUrl: e.BETTER_AUTH_URL.replace(/\/+$/, ""),
  };
}

// Blank values in .env count as unset, so a laptop .env copied from
// .env.example gets the defaults.
function clean(env: EmailEnv): Record<string, string | undefined> {
  const out: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(env)) {
    const trimmed = value?.trim();
    out[key] = trimmed ? trimmed : undefined;
  }
  return out;
}
