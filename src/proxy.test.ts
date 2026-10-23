import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { config, proxy } from "./proxy";

const base = "http://localhost:3000";

function request(path: string, cookie?: string) {
  return new NextRequest(`${base}${path}`, {
    headers: cookie ? { cookie } : {},
  });
}

const STALE_COOKIE = "better-auth.session_token=stale.value";

describe("proxy", () => {
  it("redirects /dashboard to /sign-in without a session cookie", () => {
    const response = proxy(request("/dashboard"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(`${base}/sign-in`);
  });

  it("lets /dashboard through with a session cookie; the page verifies the real session", () => {
    const response = proxy(request("/dashboard", STALE_COOKIE));
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("only matches the dashboard, so a stale cookie on /sign-in cannot start a redirect loop", () => {
    // Regression: a cookie whose session was deleted used to bounce
    // /sign-in -> /dashboard -> /sign-in forever.
    expect(config.matcher).toEqual(["/dashboard/:path*"]);
    for (const path of ["/sign-in", "/create-account", "/"]) {
      expect(config.matcher.some((m) => path.startsWith(m.replace("/:path*", "")))).toBe(false);
    }
  });
});
