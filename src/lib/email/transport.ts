import { randomUUID } from "node:crypto";
import { mkdir, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { createTransport } from "nodemailer";
import type { EmailConfig, EmailTransportKind, SmtpSettings } from "./config";

// The two ways a rendered email leaves the worker. `smtp` is nodemailer on
// Mailpit (laptop) or TurboSMTP (staging, production); `file` writes one
// JSON file per message so CI and the Playwright suite can read a link back
// without a mail server.

export type EmailMessage = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
};

export type EmailTransport = {
  readonly kind: EmailTransportKind;
  send(message: EmailMessage): Promise<{ messageId: string }>;
  // Connects and logs in without sending. The production worker calls it
  // at startup so a wrong host or password fails the deploy, not the first
  // sign-up.
  verify(): Promise<void>;
  close(): void;
};

// What the code needs from a nodemailer transporter, so a test can hand in
// a fake without nodemailer's full SentMessageInfo.
export type SmtpSender = {
  sendMail(message: EmailMessage): Promise<{ messageId: string }>;
  verify(): Promise<unknown>;
  close(): void;
};

// The connection must be up and authenticated within ten seconds. On a
// dead host the job fails fast and pg-boss retries it.
export const SMTP_CONNECTION_TIMEOUT_MS = 10_000;

export function smtpTransportOptions(smtp: SmtpSettings) {
  return {
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: smtp.auth,
    // Credentials never cross in clear: with a login and no TLS from the
    // start, the STARTTLS upgrade is required and a server that refuses
    // it gets nothing. Mailpit takes no login, so it may stay plain.
    requireTLS: Boolean(smtp.auth) && !smtp.secure,
    pool: true,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
  };
}

export function createEmailTransport(config: EmailConfig, deps: { createSmtp?: (options: ReturnType<typeof smtpTransportOptions>) => SmtpSender } = {}): EmailTransport {
  if (config.transport === "file") {
    return createFileTransport(config.fileDir);
  }
  const options = smtpTransportOptions(config.smtp);
  const sender = deps.createSmtp ? deps.createSmtp(options) : createTransport(options);
  return createSmtpTransport(sender);
}

export function createSmtpTransport(sender: SmtpSender): EmailTransport {
  return {
    kind: "smtp",
    async send(message) {
      const info = await sender.sendMail(message);
      return { messageId: String(info.messageId) };
    },
    async verify() {
      await sender.verify();
    },
    close() {
      sender.close();
    },
  };
}

// One file per message, named so a directory listing sorts in send order:
// <epoch ms>-<random>.json. Written beside the target and renamed, so a
// reader never sees a half file.
export function createFileTransport(dir: string): EmailTransport {
  const root = path.resolve(dir);
  return {
    kind: "file",
    async send(message) {
      await mkdir(root, { recursive: true });
      const messageId = `${Date.now()}-${randomUUID().slice(0, 8)}`;
      const target = path.join(root, `${messageId}.json`);
      const temp = `${target}.${process.pid}.tmp`;
      await writeFile(temp, JSON.stringify({ messageId, sentAt: new Date().toISOString(), ...message }, null, 2));
      await rename(temp, target);
      return { messageId };
    },
    async verify() {
      await mkdir(root, { recursive: true });
    },
    close() {},
  };
}
