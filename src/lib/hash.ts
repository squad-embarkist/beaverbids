import { createHash } from "node:crypto";

// A short, stable fingerprint of a value for logs and rate-limit keys, so
// an address or an IP never sits in a log line or a table row in clear.
// Lowercased and trimmed first, so "Jo@Example.com" and "jo@example.com"
// hash the same. Sixteen hex characters are plenty for a key that only
// needs to tell subjects apart.
export function shortHash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 16);
}
