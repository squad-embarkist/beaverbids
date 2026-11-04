import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { readEmailConfig } from "./config";
import { createEmailTransport, createFileTransport, smtpTransportOptions, type EmailMessage } from "./transport";

const MESSAGE: EmailMessage = { from: "BeaverBids <hello@beaverbids.ca>", to: "jordan@prattsons.ca", subject: "Confirm your email", text: "Hello\nhttps://x.test/a", html: "<p>Hello</p>" };

describe("smtpTransportOptions", () => {
  it("sends to Mailpit in clear with no login", () => {
    expect(smtpTransportOptions({ host: "localhost", port: 1025, secure: false })).toMatchObject({ host: "localhost", port: 1025, secure: false, auth: undefined, requireTLS: false, pool: true, connectionTimeout: 10_000 });
  });

  it("requires STARTTLS as soon as a login is set, unless TLS is on from the start", () => {
    const auth = { user: "u", pass: "p" };
    expect(smtpTransportOptions({ host: "pro.turbo-smtp.com", port: 587, secure: false, auth })).toMatchObject({ auth, requireTLS: true });
    expect(smtpTransportOptions({ host: "pro.turbo-smtp.com", port: 465, secure: true, auth })).toMatchObject({ auth, secure: true, requireTLS: false });
  });
});

describe("createEmailTransport", () => {
  it("builds the smtp transport from the config and passes messages through", async () => {
    const sendMail = vi.fn(async () => ({ messageId: "<abc@mail>" }));
    const verify = vi.fn(async () => true);
    const close = vi.fn();
    const createSmtp = vi.fn(() => ({ sendMail, verify, close }));
    const config = readEmailConfig({ NODE_ENV: "development", SMTP_HOST: "mail.test", SMTP_PORT: "2525" });

    const transport = createEmailTransport(config, { createSmtp });
    expect(transport.kind).toBe("smtp");
    expect(createSmtp).toHaveBeenCalledWith(expect.objectContaining({ host: "mail.test", port: 2525 }));

    await expect(transport.send(MESSAGE)).resolves.toEqual({ messageId: "<abc@mail>" });
    expect(sendMail).toHaveBeenCalledWith(MESSAGE);
    await transport.verify();
    expect(verify).toHaveBeenCalled();
    transport.close();
    expect(close).toHaveBeenCalled();
  });

  it("surfaces a rejected send so the job fails and is retried", async () => {
    const createSmtp = () => ({ sendMail: vi.fn(async () => { throw new Error("535 Authentication failed"); }), verify: vi.fn(), close: vi.fn() });
    const transport = createEmailTransport(readEmailConfig({ NODE_ENV: "development" }), { createSmtp });
    await expect(transport.send(MESSAGE)).rejects.toThrow(/535/);
  });

  it("picks the file transport without touching nodemailer", () => {
    const createSmtp = vi.fn();
    const transport = createEmailTransport(readEmailConfig({ NODE_ENV: "test", EMAIL_TRANSPORT: "file" }), { createSmtp });
    expect(transport.kind).toBe("file");
    expect(createSmtp).not.toHaveBeenCalled();
  });
});

describe("file transport", () => {
  let dir = "";
  afterEach(async () => {
    if (dir) await rm(dir, { recursive: true, force: true });
  });

  it("writes one JSON file per message that reads back, and leaves no temp file", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "beaverbids-mail-"));
    const transport = createFileTransport(path.join(dir, "mail"));
    const first = await transport.send(MESSAGE);
    const second = await transport.send({ ...MESSAGE, subject: "Reset your BeaverBids password" });

    const files = (await readdir(path.join(dir, "mail"))).sort();
    expect(files).toEqual([`${first.messageId}.json`, `${second.messageId}.json`]);
    const stored = JSON.parse(await readFile(path.join(dir, "mail", files[0]), "utf8"));
    expect(stored).toMatchObject({ messageId: first.messageId, ...MESSAGE });
    expect(typeof stored.sentAt).toBe("string");
  });

  it("verify only makes the folder", async () => {
    dir = await mkdtemp(path.join(os.tmpdir(), "beaverbids-mail-"));
    const transport = createFileTransport(path.join(dir, "deep", "mail"));
    await transport.verify();
    expect(await readdir(path.join(dir, "deep", "mail"))).toEqual([]);
  });
});
