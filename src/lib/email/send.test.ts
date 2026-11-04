import { describe, expect, it, vi } from "vitest";
import { hashEmailAddress } from "./address";
import { sendEmail } from "./send";
import type { EmailTransport } from "./transport";

const CONFIG = { from: "BeaverBids <hello@beaverbids.ca>", supportEmail: "support@beaverbids.ca", postalAddress: "123 Main Street, Ottawa, Canada", appUrl: "https://app.beaverbids.ca" };
const JOB = { template: "confirm-email", to: "jordan@prattsons.ca", locale: "en", params: { name: "Jordan", url: "https://app.beaverbids.ca/api/auth/verify-email?token=secret-token" } } as const;

function fakeTransport(): EmailTransport & { sent: Parameters<EmailTransport["send"]>[0][] } {
  const sent: Parameters<EmailTransport["send"]>[0][] = [];
  return {
    kind: "file",
    sent,
    async send(message) {
      sent.push(message);
      return { messageId: "m-1" };
    },
    async verify() {},
    close() {},
  };
}

describe("hashEmailAddress", () => {
  it("is stable, case-insensitive and never the address", () => {
    const hash = hashEmailAddress("Jordan@Prattsons.ca");
    expect(hash).toBe(hashEmailAddress("  jordan@prattsons.ca "));
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
    expect(hash).not.toContain("jordan");
  });
});

describe("sendEmail", () => {
  it("renders the job, sends it from the configured sender and logs only safe fields", async () => {
    const transport = fakeTransport();
    const log = { info: vi.fn() };
    const result = await sendEmail(JOB, { transport, config: CONFIG, log });

    expect(result).toEqual({ messageId: "m-1" });
    expect(transport.sent).toHaveLength(1);
    expect(transport.sent[0]).toMatchObject({ from: CONFIG.from, to: JOB.to, subject: "Confirm your email" });
    expect(transport.sent[0].text).toContain(JOB.params.url);

    expect(log.info).toHaveBeenCalledTimes(1);
    const [message, fields] = log.info.mock.calls[0];
    expect(message).toBe("email sent");
    expect(fields).toEqual({ template: "confirm-email", transport: "file", messageId: "m-1", to: hashEmailAddress(JOB.to) });
    const serialized = JSON.stringify(fields);
    expect(serialized).not.toContain("jordan@");
    expect(serialized).not.toContain("secret-token");
  });

  it("lets a transport failure through so the job is retried", async () => {
    const transport: EmailTransport = { kind: "smtp", send: async () => { throw new Error("ECONNREFUSED"); }, verify: async () => {}, close() {} };
    await expect(sendEmail(JOB, { transport, config: CONFIG, log: { info: vi.fn() } })).rejects.toThrow(/ECONNREFUSED/);
  });
});
