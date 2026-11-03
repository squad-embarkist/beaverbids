import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { CheckInbox } from "@/components/auth/check-inbox";
import { ConfirmationWatcher } from "@/components/auth/confirmation-watcher";
import { FactRows, SidePanel } from "@/components/auth/side-panel";
import { prisma } from "@/lib/db";
import { readPublicEmailConfig } from "@/lib/email/config";
import { getPendingEmail } from "@/lib/pending-email";
import { RATE_LIMITS, peekRateLimit } from "@/lib/rate-limit";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.checkInbox");
  return { title: t("pageTitle") };
}

// Figma frame "Check inbox" (32:1861). The panel and the copy are static;
// the address, the cooldown and the error flag read the cookie and the
// query, so they stream in behind Suspense. The watcher sits outside the
// boundary so it mounts once: it moves the tab on by itself once the link
// has been opened elsewhere, with nothing on the page changing until then.
export default async function CheckInboxPage({ searchParams }: PageProps<"/check-inbox">) {
  const t = await getTranslations("Auth.side");
  const email = readPublicEmailConfig();
  return (
    <AuthShell
      panel={
        <SidePanel
          tone="stone"
          brand={t("brand")}
          title={t("checkInbox.title")}
          titleHighlight={t("checkInbox.titleHighlight")}
          lead={t("checkInbox.lead")}
          footer={
            <FactRows
              tone="stone"
              rows={[
                { label: t("checkInbox.facts.from"), value: email.fromAddress },
                { label: t("checkInbox.facts.subject"), value: t("checkInbox.facts.subjectValue") },
                { label: t("checkInbox.facts.expires"), value: t("checkInbox.facts.expiresValue") },
              ]}
            />
          }
        />
      }
    >
      <ConfirmationWatcher />
      <Suspense fallback={<CheckInbox email={null} retryAfter={0} linkExpired={false} supportEmail={email.supportEmail} />}>
        <CheckInboxContent searchParams={searchParams} supportEmail={email.supportEmail} />
      </Suspense>
    </AuthShell>
  );
}

async function CheckInboxContent({ searchParams, supportEmail }: { searchParams: PageProps<"/check-inbox">["searchParams"]; supportEmail: string }) {
  const [{ error }, email] = await Promise.all([searchParams, getPendingEmail()]);
  const cooldown = email ? await peekRateLimit(prisma, { ...RATE_LIMITS.resendCooldown, subject: email }) : { allowed: true as const };
  return <CheckInbox email={email} retryAfter={cooldown.allowed ? 0 : cooldown.retryAfterSeconds} linkExpired={error === "link"} supportEmail={supportEmail} />;
}
