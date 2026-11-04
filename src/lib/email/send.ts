import { log as defaultLog } from "@/lib/log";
import type { SendEmailJob } from "@/lib/queues";
import { hashEmailAddress } from "./address";
import type { EmailConfig } from "./config";
import { renderEmail } from "./templates";
import type { EmailTransport } from "./transport";

// Renders and sends one job. Only the worker calls this; the web app
// enqueues (enqueueSendEmail in src/lib/queues.ts). The log line carries
// the template, the message id and a hash of the address: never the
// address in clear, never the body or the link.
export type SendEmailDeps = {
  transport: EmailTransport;
  config: Pick<EmailConfig, "from" | "supportEmail" | "postalAddress" | "appUrl">;
  log?: Pick<typeof defaultLog, "info">;
  now?: Date;
};

export async function sendEmail(job: SendEmailJob, { transport, config, log = defaultLog, now }: SendEmailDeps): Promise<{ messageId: string }> {
  const rendered = renderEmail(job, { supportEmail: config.supportEmail, postalAddress: config.postalAddress, appUrl: config.appUrl, now });
  const { messageId } = await transport.send({ from: config.from, to: job.to, ...rendered });
  log.info("email sent", { template: job.template, transport: transport.kind, messageId, to: hashEmailAddress(job.to) });
  return { messageId };
}
