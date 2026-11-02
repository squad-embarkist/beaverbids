import { describe, expect, it } from "vitest";
import { EMAIL_TEMPLATES, type SendEmailJob } from "@/lib/queues";
import { renderEmail } from "./index";
import { escapeHtml, safeUrl } from "./shell";

const CTX = { supportEmail: "support@beaverbids.ca", postalAddress: "123 Main Street, Ottawa, Canada", appUrl: "https://app.beaverbids.ca", now: new Date("2026-11-02T12:00:00Z") };
const URL = "https://app.beaverbids.ca/api/auth/verify-email?token=abc123&callbackURL=/verify-email";

function job(template: SendEmailJob["template"], name = "Jordan"): SendEmailJob {
  return { template, to: "jordan@prattsons.ca", locale: "en", params: { name, url: URL } };
}

describe("renderEmail", () => {
  it("renders the confirmation email as drawn on frame 34:6784", () => {
    const { subject, html, text } = renderEmail(job("confirm-email"), CTX);
    expect(subject).toBe("Confirm your email");
    for (const line of ["NEW ACCOUNT", "CONFIRM YOUR EMAIL.", "Hello Jordan,", "Someone created a BeaverBids account with this address.", "Confirm my email", "This link expires in 24 hours", "ask for a new one from the log in page.", "If you did not sign up for BeaverBids, ignore this email.", "BEAVERBIDS", "Canadian government tenders, filtered to your shop and delivered before they close.", "123 Main Street, Ottawa, Canada", "© 2026 BEAVERBIDS · MADE IN CANADA"]) {
      expect(html).toContain(line);
      expect(text).toContain(line);
    }
    expect(html).toContain("BUTTON NOT WORKING?");
    expect(html).toContain(`href="${escapeHtml(URL)}"`);
    expect(html).toContain('src="https://app.beaverbids.ca/email/logo-dark.png"');
    expect(html).toContain("One click and your five-question setup begins.");
  });

  it("renders the reset email as drawn on frame 34:7183, with the support address", () => {
    const { subject, html, text } = renderEmail(job("reset-password"), CTX);
    expect(subject).toBe("Reset your BeaverBids password");
    for (const line of ["PASSWORD RESET", "SET A NEW PASSWORD.", "Someone asked to reset the password", "Set a new password", "This link expires in 60 minutes", "Saving a new password signs out every other device.", "tell us at support@beaverbids.ca.", "This is a security email about your account"]) {
      expect(html).toContain(line);
      expect(text).toContain(line);
    }
    expect(html).not.toContain("Canadian government tenders, filtered");
  });

  it("puts the link on its own line in the text version and nowhere else", () => {
    for (const template of EMAIL_TEMPLATES) {
      const { text } = renderEmail(job(template), CTX);
      const lines = text.split("\n");
      expect(lines.filter((line) => line === URL)).toHaveLength(1);
      expect(lines.filter((line) => line.includes("abc123"))).toHaveLength(1);
    }
  });

  it("escapes the name and never emits an em dash", () => {
    for (const template of EMAIL_TEMPLATES) {
      const { html, text } = renderEmail(job(template, 'Jordan <b>"Pratt"</b>'), CTX);
      expect(html).toContain("Hello Jordan &lt;b&gt;&quot;Pratt&quot;&lt;/b&gt;,");
      expect(html).not.toContain("<b>");
      expect(text).toContain('Hello Jordan <b>"Pratt"</b>,');
      expect(html).not.toContain("—");
      expect(text).not.toContain("—");
    }
  });

  it("stamps the year from the clock", () => {
    const { text } = renderEmail(job("confirm-email"), { ...CTX, now: new Date("2027-03-01T00:00:00Z") });
    expect(text).toContain("© 2027 BEAVERBIDS");
  });

  it("refuses a link that is not http(s)", () => {
    expect(() => safeUrl("javascript:alert(1)")).toThrow(/not an http\(s\) URL/);
    expect(() => renderEmail({ ...job("confirm-email"), params: { name: "Jordan", url: "javascript:alert(1)" } }, CTX)).toThrow(/not an http\(s\) URL/);
  });
});
