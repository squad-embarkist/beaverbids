import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { SignInForm } from "@/components/auth/sign-in-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.signIn");
  return { title: t("title") };
}

export default async function SignInPage() {
  const t = await getTranslations("Auth.signIn");

  return (
    <Card>
      <CardHeader>
        <h1 className="font-heading font-expanded text-h1 font-bold text-asphalt">{t("title")}</h1>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <SignInForm />
        <p className="text-sm leading-5 text-ink-muted">
          {t("noAccount")}{" "}
          <Link href="/create-account" className="font-medium text-asphalt underline underline-offset-4">
            {t("createAccount")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
