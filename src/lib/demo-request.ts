import type { DemoRequest } from "@/lib/schemas/demo-request";

// The landing page demo form opens a plain email link for now (no email
// sending in the MVP). The address is NEXT_PUBLIC_DEMO_REQUEST_EMAIL, inlined
// at build time, and the same value renders in the page copy so the visible
// address never disagrees with the link.

export const DEFAULT_DEMO_REQUEST_EMAIL = "demos@beaverbids.ca";

export function demoRequestEmail(): string {
  const value = process.env.NEXT_PUBLIC_DEMO_REQUEST_EMAIL?.trim();
  return value ? value : DEFAULT_DEMO_REQUEST_EMAIL;
}

const BODY_LABELS: Record<keyof DemoRequest, string> = {
  name: "Name",
  company: "Company",
  email: "Work email",
  province: "Province",
  trade: "Trade / industry",
};

// Builds a mailto: link with the subject and a body that lists the five
// answers, one per line, fully URL encoded so an ampersand or a line break in
// a value cannot break out of its field.
export function buildDemoRequestMailto(address: string, subject: string, values: DemoRequest): string {
  const body = (Object.keys(BODY_LABELS) as Array<keyof DemoRequest>)
    .map((key) => `${BODY_LABELS[key]}: ${values[key]}`)
    .join("\n");
  const params = new URLSearchParams({ subject, body });
  // URLSearchParams encodes spaces as "+", which mail clients read literally.
  const query = params.toString().replace(/\+/g, "%20");
  return `mailto:${encodeURIComponent(address)}?${query}`;
}
