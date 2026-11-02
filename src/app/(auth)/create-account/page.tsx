import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { CreateAccountForm } from "@/components/auth/create-account-form";
import { FactRows, SampleScoreCard, SidePanel } from "@/components/auth/side-panel";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.createAccount");
  return { title: t("pageTitle") };
}

// Figma frame "Sign Up" (30:135). The drawn "Company website" field is left
// out (docs/plans/account-flow-plan.md, D3).
export default async function CreateAccountPage() {
  const t = await getTranslations("Auth.createAccount");
  const tSide = await getTranslations("Auth.side");

  return (
    <AuthShell
      panel={
        <SidePanel
          tone="asphalt"
          brand={tSide("brand")}
          title={tSide("signUp.title")}
          titleHighlight={tSide("signUp.titleHighlight")}
          lead={tSide("signUp.lead")}
          footer={
            <FactRows
              tone="asphalt"
              rows={[
                { label: tSide("signUp.facts.setup"), value: tSide("signUp.facts.setupValue") },
                { label: tSide("signUp.facts.cost"), value: tSide("signUp.facts.costValue") },
                { label: tSide("signUp.facts.card"), value: tSide("signUp.facts.cardValue") },
              ]}
            />
          }
        >
          <SampleScoreCard score={tSide("signUp.sample.score")} outOf={tSide("signUp.sample.outOf")} title={tSide("signUp.sample.title")} meta={tSide("signUp.sample.meta")} />
        </SidePanel>
      }
    >
      <header className="flex flex-col gap-3">
        <p className="font-mono text-mono-xs font-medium text-ink-strong">{t("eyebrow")}</p>
        <h1 className="font-heading font-expanded text-auth-title font-extrabold text-asphalt">{t("title")}</h1>
        <p className="text-body-15 text-ink-strong">{t("lead")}</p>
      </header>

      <CreateAccountForm />

      <p className="font-mono text-mono-xs leading-[18px] font-medium tracking-normal text-ink-strong">
        {t.rich("consent", {
          terms: (chunks) => (
            <Link href="/terms" className="text-asphalt underline">
              {chunks}
            </Link>
          ),
          privacy: (chunks) => (
            <Link href="/privacy" className="text-asphalt underline">
              {chunks}
            </Link>
          ),
        })}
      </p>

      <p className="border-t border-hairline pt-5 text-body-15 text-asphalt">
        {t("haveAccount")}{" "}
        <Link href="/sign-in" className="text-link">
          {t("signIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
