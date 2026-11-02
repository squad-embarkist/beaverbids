import { createHash } from "node:crypto";

// Logs and rate-limit keys carry this instead of the address, so a log line
// or a RateLimit row never holds an email in clear. Lowercased first, so
// "Jo@Example.com" and "jo@example.com" hash the same.
export function hashEmailAddress(email: string): string {
  return createHash("sha256").update(email.trim().toLowerCase()).digest("hex").slice(0, 16);
}
