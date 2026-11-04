import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { connection } from "next/server";
import { cacheLife } from "next/cache";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { SidePanel, WaitingCard } from "@/components/auth/side-panel";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Banner } from "@/components/ui/banner";
import { getWaitingCounts } from "@/lib/auth-panel";
import { prisma } from "@/lib/db";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signIn");
  return { title: t("pageTitle") };
}

// Figma frame "Log in" (32:505). After a password reset the person lands
// here with the success banner (?reset=done), read behind Suspense.
export default async function SignInPage({ searchParams }: PageProps<"/sign-in">) {
  const t = await getTranslations("Auth.signIn");
  const tSide = await getTranslations("Auth.side");

  return (
    <AuthShell
      panel={
        <SidePanel
          tone="stone"
          brand={tSide("brand")}
          title={tSide("signIn.title")}
          titleHighlight={tSide("signIn.titleHighlight")}
          lead={tSide("signIn.lead")}
          footer={<p className="max-w-[315px] font-mono text-mono-xs font-medium tracking-[0.12em] text-line-on-dark">{tSide("signIn.footer")}</p>}
        >
          <Suspense fallback={<WaitingCardSkeleton />}>
            <WaitingCounts />
          </Suspense>
        </SidePanel>
      }
    >
      <Suspense fallback={null}>
        <PasswordSavedBanner searchParams={searchParams} />
      </Suspense>

      <header className="flex flex-col gap-3">
        <h1 className="font-heading font-expanded text-auth-title font-extrabold text-asphalt">{t("title")}</h1>
        <p className="text-body-15 text-ink-strong">{t("lead")}</p>
      </header>

      <SignInForm />

      <p className="border-t border-hairline pt-5 text-body-15 text-asphalt">
        {t("newHere")}{" "}
        <Link href="/create-account" className="text-link underline">
          {t("createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
}

async function PasswordSavedBanner({ searchParams }: { searchParams: PageProps<"/sign-in">["searchParams"] }) {
  const { reset } = await searchParams;
  if (reset !== "done") return null;
  const t = await getTranslations("Auth.signIn");
  return (
    <Banner variant="success" role="status">
      {t("passwordSaved")}
    </Banner>
  );
}

// Real global counts (docs/plans/account-flow-plan.md, D4), cached for an
// hour. The component waits for the request first so the cache is filled
// at run time, not at build time where no database exists.
async function WaitingCounts() {
  await connection();
  const [counts, tSide] = await Promise.all([cachedWaitingCounts(), getTranslations("Auth.side")]);
  return (
    <WaitingCard
      label={tSide("signIn.waiting.label")}
      rows={[
        { label: tSide("signIn.waiting.newSince", { day: counts.sinceDay }), value: String(counts.newSince) },
        { label: tSide("signIn.waiting.closingThisWeek"), value: String(counts.closingThisWeek) },
      ]}
    />
  );
}

async function cachedWaitingCounts() {
  "use cache";
  cacheLife("hours");
  return getWaitingCounts(prisma);
}

async function WaitingCardSkeleton() {
  const tSide = await getTranslations("Auth.side");
  return (
    <WaitingCard
      label={tSide("signIn.waiting.label")}
      rows={[
        { label: tSide("signIn.waiting.newSince", { day: "…" }), value: "" },
        { label: tSide("signIn.waiting.closingThisWeek"), value: "" },
      ]}
    />
  );
}
