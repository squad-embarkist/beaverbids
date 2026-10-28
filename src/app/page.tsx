import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { Audience } from "@/components/landing/audience";
import { Coverage } from "@/components/landing/coverage";
import { Demo } from "@/components/landing/demo";
import { DemoRequest } from "@/components/landing/demo-request";
import { Hero } from "@/components/landing/hero";
import { Problem } from "@/components/landing/problem";
import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { Steps } from "@/components/landing/steps";
import { demoRequestEmail } from "@/lib/demo-request";

// The landing page, built from the Figma file "Beaver bids website" (frame
// 1:957). Copy lives in messages/en.json under Landing. On staging
// NEXT_PUBLIC_SITE_NOINDEX=1 keeps search engines off the unapproved copy.
export const metadata: Metadata =
  process.env.NEXT_PUBLIC_SITE_NOINDEX === "1" ? { robots: { index: false, follow: false } } : {};

export default async function HomePage() {
  const t = await getTranslations("Landing");
  const email = demoRequestEmail();

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:bg-paper focus:px-4 focus:py-2 focus:text-asphalt"
      >
        {t("skipToContent")}
      </a>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <Hero />
        <Problem />
        <Steps />
        <Demo />
        <Audience />
        <Coverage />
        <DemoRequest email={email} />
      </main>
      <SiteFooter email={email} />
    </>
  );
}
