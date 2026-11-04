import * as Sentry from "@sentry/nextjs";
import { getBoss } from "@/lib/boss";
import { log } from "@/lib/log";
import { EMAIL_JOB_LOCALES, enqueueSendEmail, type EmailTemplate } from "@/lib/queues";
import { hashEmailAddress } from "./address";

type Recipient = { email: string; name: string; language?: string | null };

// What the Better Auth callbacks call: one job on the send-email queue
// through the web app's send-only pg-boss instance, and nothing else. It
// never throws. A failed enqueue (the worker has never run, the database
// is down) is logged and reported, and the sign-up or reset request still
// succeeds: the person lands on Check inbox and "Send it again" tries once
// more after the cooldown (docs/plans/account-flow-plan.md, section 5).
export async function queueAuthEmail(template: EmailTemplate, user: Recipient, url: string): Promise<boolean> {
  const to = hashEmailAddress(user.email);
  try {
    const boss = await getBoss();
    const jobId = await enqueueSendEmail(boss, { template, to: user.email, locale: localeOf(user.language), params: { name: user.name, url } });
    log.info("send-email queued", { template, jobId, to });
    return true;
  } catch (error) {
    log.error("send-email enqueue failed", { template, to, error: String(error) });
    Sentry.captureException(error, { tags: { queue: "send-email" }, extra: { template } });
    return false;
  }
}

function localeOf(language: string | null | undefined): (typeof EMAIL_JOB_LOCALES)[number] {
  return (EMAIL_JOB_LOCALES as readonly string[]).includes(language ?? "") ? (language as (typeof EMAIL_JOB_LOCALES)[number]) : "en";
}
