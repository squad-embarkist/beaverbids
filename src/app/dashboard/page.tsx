import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { TopBar } from "@/components/top-bar";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/session";
import { signOutAction } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("Dashboard");
  return { title: t("title") };
}

// The page shell is static. Everything that needs the session streams in
// behind a Suspense boundary, as Cache Components requires.
export default function DashboardPage() {
  return (
    <>
      <TopBar>
        <Suspense fallback={null}>
          <UserMenu />
        </Suspense>
      </TopBar>
      <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8">
        <Suspense fallback={<DashboardSkeleton />}>
          <DashboardContent />
        </Suspense>
      </main>
    </>
  );
}

async function UserMenu() {
  const user = await getCurrentUser();
  const t = await getTranslations("Dashboard");

  return (
    <>
      <span className="hidden font-mono text-sm text-paper/80 sm:inline">{user.email}</span>
      <form action={signOutAction}>
        <Button type="submit" variant="outline" size="sm" className="border-paper/40 bg-transparent text-paper hover:border-paper hover:bg-transparent">
          {t("signOut")}
        </Button>
      </form>
    </>
  );
}

async function DashboardContent() {
  const user = await getCurrentUser();
  const t = await getTranslations("Dashboard");

  return (
    <section className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading font-expanded text-h1 font-bold text-asphalt">{t("title")}</h1>
        <p className="label-mono">{t("signedInAs", { email: user.email })}</p>
      </div>

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
function DashboardSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-8">
      <div className="flex flex-col gap-3">
        <div className="h-8 w-64 rounded-lg bg-line" />
        <div className="h-4 w-48 rounded-lg bg-line" />
      </div>
      <div className="h-28 rounded-card bg-line" />
    </div>
  );
}
