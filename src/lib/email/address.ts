import { shortHash } from "@/lib/hash";

// Logs and rate-limit keys carry this instead of the address, so a log line
// or a RateLimit row never holds an email in clear.
export function hashEmailAddress(email: string): string {
  return shortHash(email);
}
