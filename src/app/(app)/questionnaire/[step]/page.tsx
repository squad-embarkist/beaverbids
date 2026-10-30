import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { QuestionnaireStep } from "@/components/questionnaire/questionnaire-step";
import { prisma } from "@/lib/db";
import { getProfile } from "@/lib/profile";
import { isQuestionnaireStep } from "@/lib/schemas/company-profile";
import { getCurrentUser } from "@/lib/session";

// One route for the five steps (basics, work, regions, size, credentials).
// Serves onboarding and "My answers": the page reads the saved profile, so a
// refresh never loses an answer. Reading params and the session happens
// behind Suspense, as Cache Components requires.

export async function generateMetadata({ params }: PageProps<"/questionnaire/[step]">): Promise<Metadata> {
  const { step } = await params;
  if (!isQuestionnaireStep(step)) return {};
  const t = await getTranslations("Questionnaire");
  return { title: `${t(`steps.${step}.title`)} | ${t("title")}` };
}

export default function QuestionnaireStepPage({ params }: PageProps<"/questionnaire/[step]">) {
  return (
    <Suspense fallback={<StepSkeleton />}>
      <StepContent params={params} />
    </Suspense>
  );
}

async function StepContent({ params }: { params: PageProps<"/questionnaire/[step]">["params"] }) {
  const { step } = await params;
  if (!isQuestionnaireStep(step)) notFound();

  const user = await getCurrentUser();
  const profile = await getProfile(prisma, user.id);
  // Every later step needs the row the basics step creates.
  if (!profile && step !== "basics") redirect("/questionnaire/basics");

  return <QuestionnaireStep step={step} profile={profile} />;
}

function StepSkeleton() {
  return (
    <div aria-hidden className="animate-pulse">
      <div className="h-16 bg-stone" />
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-4 py-8 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-6 border border-line bg-surface p-10">
          <div className="h-4 w-24 bg-line" />
          <div className="h-10 w-3/4 bg-line" />
          <div className="h-12 bg-line" />
          <div className="h-12 bg-line" />
        </div>
        <div className="h-64 bg-line" />
      </div>
    </div>
  );
}
