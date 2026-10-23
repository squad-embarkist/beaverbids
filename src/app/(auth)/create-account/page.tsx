import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CreateAccountForm } from "@/components/auth/create-account-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Auth.createAccount");
  return { title: t("title") };
}

export default async function CreateAccountPage() {
  const t = await getTranslations("Auth.createAccount");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-expanded text-h1 font-bold">{t("title")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <CreateAccountForm />
        <p className="text-sm leading-5 text-ink-muted">
          {t("haveAccount")}{" "}
          <Link href="/sign-in" className="font-medium text-asphalt underline underline-offset-4">
            {t("signIn")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
