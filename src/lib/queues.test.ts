import { describe, expect, it, vi } from "vitest";
import { QUEUES, enqueueSendEmail, sendEmailJobSchema } from "./queues";

const JOB = { template: "confirm-email", to: "Jordan@Prattsons.ca ", locale: "en", params: { name: " Jordan ", url: "https://app.beaverbids.ca/api/auth/verify-email?token=t" } } as const;

describe("sendEmailJobSchema", () => {
  it("normalizes the address and name", () => {
    expect(sendEmailJobSchema.parse(JOB)).toEqual({ ...JOB, to: "jordan@prattsons.ca", params: { ...JOB.params, name: "Jordan" } });
  });

  it("rejects a job without a recipient, with an unknown template, locale or a link that is not http(s)", () => {
    expect(sendEmailJobSchema.safeParse({ ...JOB, to: undefined }).success).toBe(false);
    expect(sendEmailJobSchema.safeParse({ ...JOB, to: "not-an-address" }).success).toBe(false);
    expect(sendEmailJobSchema.safeParse({ ...JOB, template: "digest" }).success).toBe(false);
    expect(sendEmailJobSchema.safeParse({ ...JOB, locale: "fr" }).success).toBe(false);
    expect(sendEmailJobSchema.safeParse({ ...JOB, params: { name: "Jordan", url: "javascript:alert(1)" } }).success).toBe(false);
    expect(sendEmailJobSchema.safeParse({ ...JOB, params: { name: "", url: JOB.params.url } }).success).toBe(false);
  });
});

describe("enqueueSendEmail", () => {
  it("sends the parsed payload to the send-email queue with no singleton key", async () => {
    const boss = { send: vi.fn(async () => "job-1") };
    await expect(enqueueSendEmail(boss, JOB)).resolves.toBe("job-1");
    expect(boss.send).toHaveBeenCalledWith(QUEUES.sendEmail, expect.objectContaining({ to: "jordan@prattsons.ca" }));
    expect(boss.send.mock.calls[0]).toHaveLength(2);
  });

  it("refuses to enqueue a bad job", async () => {
    const boss = { send: vi.fn(async () => "job-1") };
    await expect(enqueueSendEmail(boss, { ...JOB, template: "digest" } as never)).rejects.toThrow();
    expect(boss.send).not.toHaveBeenCalled();
  });
});
