import type { Metadata } from "next";
import { Suspense } from "react";
import { connection } from "next/server";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { DeadLinkBanner, ResetPasswordForm } from "@/components/auth/reset-password-form";
import { FactRows, SidePanel, SignedInAsCard } from "@/components/auth/side-panel";
import { prisma } from "@/lib/db";
import { findResetToken, minutesLeft } from "@/lib/password-reset";

// The token sits in this page's URL and nowhere else, so the page sends no
// referrer (docs/plans/account-flow-plan.md, section 6).
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.resetPassword");
  return { title: t("pageTitle"), referrer: "no-referrer" };
}

type ScreenState = "loading" | "dead" | { token: string; email: string; minutes: number };

// Figma frame "set new password" (34:3086). The token row names the
// address for the "SIGNED IN AS" card and the minutes left; a missing,
// used or expired token shows the attention banner on this same screen.
export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  return (
    <Suspense fallback={<ResetPasswordScreen state="loading" />}>
      <ResetPasswordContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ResetPasswordContent({ searchParams }: { searchParams: PageProps<"/reset-password">["searchParams"] }) {
  // The minutes left read the clock, which only a request-time render may do.
  await connection();
  const { token } = await searchParams;
  const raw = typeof token === "string" ? token : "";
  const owner = raw ? await findResetToken(prisma, raw) : null;
  return <ResetPasswordScreen state={owner ? { token: raw, email: owner.email, minutes: minutesLeft(owner.expiresAt) } : "dead"} />;
}

async function ResetPasswordScreen({ state }: { state: ScreenState }) {
  const t = await getTranslations("Auth.resetPassword");
  const tSide = await getTranslations("Auth.side");
  const live = typeof state === "object" ? state : null;

  return (
    <AuthShell
      panel={
        <SidePanel
          tone="asphalt"
          brand={tSide("brand")}
          title={tSide("resetPassword.title")}
          titleHighlight={tSide("resetPassword.titleHighlight")}
          lead={tSide("resetPassword.lead")}
          footer={live ? <FactRows tone="asphalt" rows={[{ label: tSide("resetPassword.link"), value: tSide("resetPassword.expiresIn", { minutes: live.minutes }), accent: true }]} /> : undefined}
        >
          {live ? <SignedInAsCard label={tSide("resetPassword.signedInAs")} email={live.email} note={tSide("resetPassword.notYou")} /> : null}
        </SidePanel>
      }
    >
      {state === "dead" ? <DeadLinkBanner /> : null}

      <header className="flex flex-col gap-3">
        <p className="font-mono text-mono-xs font-medium text-ink-strong">{t("eyebrow")}</p>
        <h1 className="font-heading font-expanded text-auth-title font-extrabold text-asphalt">{t("title")}</h1>
      </header>

      {live ? <ResetPasswordForm token={live.token} /> : null}
    </AuthShell>
  );
}
