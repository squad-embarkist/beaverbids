import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { FactRows, SidePanel } from "@/components/auth/side-panel";
import { readPublicEmailConfig } from "@/lib/email/config";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.forgotPassword");
  return { title: t("pageTitle") };
}

// Figma frame "Forget Password" (32:1377). No sent screen of its own: the
// success banner sits above this form (docs/plans/account-flow-plan.md,
// section 8 item 2).
export default async function ForgotPasswordPage() {
  const t = await getTranslations("Auth.forgotPassword");
  const tSide = await getTranslations("Auth.side");
  const email = readPublicEmailConfig();

  return (
    <AuthShell
      panel={
        <SidePanel
          tone="stone"
          brand={tSide("brand")}
          title={tSide("forgotPassword.title")}
          titleHighlight={tSide("forgotPassword.titleHighlight")}
          lead={tSide("forgotPassword.lead")}
          footer={
            <FactRows
              tone="stone"
              rows={[
                { label: tSide("forgotPassword.facts.link"), value: tSide("forgotPassword.facts.linkValue") },
                { label: tSide("forgotPassword.facts.uses"), value: tSide("forgotPassword.facts.usesValue") },
                { label: tSide("forgotPassword.facts.stuck"), value: email.supportEmail },
              ]}
            />
          }
        />
      }
    >
      <header className="flex flex-col gap-3">
        <p className="font-mono text-mono-xs font-medium text-ink-strong">{t("eyebrow")}</p>
        <h1 className="font-heading font-expanded text-auth-title font-extrabold text-asphalt">{t("title")}</h1>
        <p className="text-body-15 text-ink-strong">{t("lead")}</p>
      </header>

      <ForgotPasswordForm />

      <p className="border-t border-hairline pt-5 text-body-15 text-asphalt">
        {t("remembered")}{" "}
        <Link href="/sign-in" className="text-link underline">
          {t("backToLogIn")}
        </Link>
      </p>
    </AuthShell>
  );
}
