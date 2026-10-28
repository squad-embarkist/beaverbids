import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { nextIncompleteStep } from "@/lib/schemas/company-profile";
import { getCurrentUser } from "@/lib/session";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Opportunities");
  return { title: t("title") };
}

// Slice 1 shell: the scored list arrives in slice 2. A user without a
// finished questionnaire is sent to their next step.
export default function OpportunitiesPage() {
  return (
    <main id="main" className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8">
      <Suspense fallback={<OpportunitiesSkeleton />}>
        <OpportunitiesContent />
      </Suspense>
    </main>
  );
}

async function OpportunitiesContent() {
  const user = await getCurrentUser();
  const profile = await getProfile(prisma, user.id);
  const pending = nextIncompleteStep(profile?.questionnaireStep ?? 0);
  if (pending) redirect(`/questionnaire/${pending}`);

  const t = await getTranslations("Opportunities");

  return (
    <section className="flex flex-col gap-8">
      <h1 className="font-heading font-expanded text-h1 font-extrabold uppercase text-asphalt">{t("title")}</h1>
      <Card>
        <CardHeader>
          <CardTitle>{t("emptyTitle")}</CardTitle>
          <CardDescription className="text-base leading-6 text-asphalt">{t("emptyBody")}</CardDescription>
        </CardHeader>
      </Card>
    </section>
  );
}

// Skeleton rows that match the layout, never a lone spinner.
function OpportunitiesSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-8">
      <div className="h-8 w-72 bg-line" />
      <div className="h-28 bg-line" />
    </div>
  );
}
