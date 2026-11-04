import { describe, expect, it, vi } from "vitest";
import type { EmailTransport } from "@/lib/email/transport";
import { QUEUES } from "@/lib/queues";

const captureException = vi.hoisted(() => vi.fn());
vi.mock("@sentry/node", () => ({ captureException }));

import { EMAIL_QUEUE_OPTIONS, registerEmailJobs } from "./index";

type Handler = (jobs: { id: string; data: unknown }[]) => Promise<void>;

function fakeBoss() {
  const handlers = new Map<string, Handler>();
  return {
    handlers,
    createQueue: vi.fn(async () => {}),
    updateQueue: vi.fn(async () => {}),
    work: vi.fn(async (name: string, handler: Handler) => {
      handlers.set(name, handler);
      return name;
    }),
  };
}

function fakeTransport(fail?: Error) {
  const sent: { to: string; subject: string }[] = [];
  const transport: EmailTransport = {
    kind: "file",
    async send(message) {
      if (fail) throw fail;
      sent.push({ to: message.to, subject: message.subject });
      return { messageId: "m-1" };
    },
    async verify() {},
    close() {},
  };
  return { transport, sent };
}

const CONFIG = { from: "BeaverBids <hello@beaverbids.ca>", supportEmail: "support@beaverbids.ca", postalAddress: "123 Main Street, Ottawa, Canada", appUrl: "https://app.beaverbids.ca" };
const JOB = { template: "reset-password", to: "jordan@prattsons.ca", locale: "en", params: { name: "Jordan", url: "https://app.beaverbids.ca/api/auth/reset-password/tok?callbackURL=/reset-password" } };

describe("registerEmailJobs", () => {
  it("creates the queue with retries, a two-minute expiry and one-hour deletion, then registers the worker", async () => {
    const boss = fakeBoss();
    await registerEmailJobs(boss, { transport: fakeTransport().transport, config: CONFIG });

    const { policy, ...options } = EMAIL_QUEUE_OPTIONS;
    expect(policy).toBe("standard");
    expect(options).toEqual({ expireInSeconds: 120, retryLimit: 3, retryDelay: 30, retryBackoff: true, deleteAfterSeconds: 3600 });
    expect(boss.createQueue).toHaveBeenCalledWith(QUEUES.sendEmail, EMAIL_QUEUE_OPTIONS);
    expect(boss.updateQueue).toHaveBeenCalledWith(QUEUES.sendEmail, options);
    expect([...boss.handlers.keys()]).toEqual([QUEUES.sendEmail]);
  });

  it("renders and sends a job, logging the template and never the address", async () => {
    const boss = fakeBoss();
    const { transport, sent } = fakeTransport();
    await registerEmailJobs(boss, { transport, config: CONFIG });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await boss.handlers.get(QUEUES.sendEmail)!([{ id: "j1", data: JOB }]);

    expect(sent).toEqual([{ to: "jordan@prattsons.ca", subject: "Reset your BeaverBids password" }]);
    const lines = consoleLog.mock.calls.map((call) => String(call[0]));
    const finished = lines.map((line) => JSON.parse(line)).find((line) => line.message === `${QUEUES.sendEmail} finished`);
    expect(finished).toMatchObject({ jobId: "j1", template: "reset-password", messageId: "m-1" });
    expect(lines.join("\n")).not.toContain("jordan@");
    expect(lines.join("\n")).not.toContain("/tok?");
    consoleLog.mockRestore();
  });

  it("fails a malformed job before rendering anything", async () => {
    const boss = fakeBoss();
    const { transport, sent } = fakeTransport();
    await registerEmailJobs(boss, { transport, config: CONFIG });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(boss.handlers.get(QUEUES.sendEmail)!([{ id: "j2", data: { ...JOB, template: "digest" } }])).rejects.toThrow();
    await expect(boss.handlers.get(QUEUES.sendEmail)!([{ id: "j3", data: { ...JOB, params: { name: "Jordan", url: "javascript:alert(1)" } } }])).rejects.toThrow();
    expect(sent).toEqual([]);
    consoleError.mockRestore();
  });

  it("logs a failed send, reports it to Sentry without the address and rethrows so pg-boss retries", async () => {
    const boss = fakeBoss();
    const error = new Error("ECONNREFUSED 127.0.0.1:1025");
    await registerEmailJobs(boss, { transport: fakeTransport(error).transport, config: CONFIG });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(boss.handlers.get(QUEUES.sendEmail)!([{ id: "j4", data: JOB }])).rejects.toBe(error);

    expect(captureException).toHaveBeenCalledWith(error, { tags: { queue: QUEUES.sendEmail }, extra: { jobId: "j4", template: "reset-password" } });
    const line = JSON.parse(consoleError.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "error", message: `${QUEUES.sendEmail} failed`, jobId: "j4", template: "reset-password" });
    expect(JSON.stringify(line)).not.toContain("jordan@");
    consoleError.mockRestore();
  });
});
