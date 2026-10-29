import { z } from "zod";

// The landing page demo request. Validated in the browser before the form
// opens the visitor's email client; nothing is sent to our servers. Error
// messages are translation keys under Landing.request.errors.
export const demoRequestSchema = z.object({
  name: z
    .string({ error: "nameRequired" })
    .trim()
    .min(1, { error: "nameRequired" })
    .max(120, { error: "nameTooLong" }),
  company: z
    .string({ error: "companyRequired" })
    .trim()
    .min(1, { error: "companyRequired" })
    .max(120, { error: "companyTooLong" }),
  email: z.email({ error: "emailInvalid" }).trim().max(254, { error: "emailInvalid" }),
  province: z
    .string({ error: "provinceRequired" })
    .trim()
    .min(1, { error: "provinceRequired" })
    .max(80, { error: "provinceTooLong" }),
  trade: z
    .string({ error: "tradeRequired" })
    .trim()
    .min(1, { error: "tradeRequired" })
    .max(80, { error: "tradeTooLong" }),
});

export type DemoRequest = z.infer<typeof demoRequestSchema>;
export type DemoRequestField = keyof DemoRequest;

export const DEMO_REQUEST_FIELDS = ["name", "company", "email", "province", "trade"] as const satisfies readonly DemoRequestField[];

export const DEMO_REQUEST_ERROR_KEYS = [
  "nameRequired",
  "nameTooLong",
  "companyRequired",
  "companyTooLong",
  "emailInvalid",
  "provinceRequired",
  "provinceTooLong",
  "tradeRequired",
  "tradeTooLong",
] as const;

export type DemoRequestErrorKey = (typeof DEMO_REQUEST_ERROR_KEYS)[number];

export function isDemoRequestErrorKey(value: string): value is DemoRequestErrorKey {
  return (DEMO_REQUEST_ERROR_KEYS as readonly string[]).includes(value);
}

export function isDemoRequestField(value: unknown): value is DemoRequestField {
  return typeof value === "string" && (DEMO_REQUEST_FIELDS as readonly string[]).includes(value);
}
