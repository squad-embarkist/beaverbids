// The visitor's address for the server actions' rate limits, read the
// same way Better Auth is told to (src/lib/auth.ts): Cloudflare's header
// first, then the first hop of X-Forwarded-For. On a laptop neither exists
// and every visitor is "local", which the e2e suite accounts for by
// clearing the app's rate-limit rows between tests.
export const IP_HEADERS = ["cf-connecting-ip", "x-forwarded-for"] as const;

export function clientIpFrom(headers: Headers): string {
  for (const name of IP_HEADERS) {
    const value = headers.get(name)?.split(",")[0]?.trim();
    if (value) return value;
  }
  return "local";
}
