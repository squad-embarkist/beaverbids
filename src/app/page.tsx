import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

// M0 placeholder. The landing page with the instant score is built in M3.
export default async function HomePage() {
  const t = await getTranslations("Home");

  return (
    <main className="flex flex-1 flex-col">
      <header className="bg-asphalt text-paper">
        <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
          <Wordmark />
          <Link href="/sign-in" className="text-sm font-medium underline-offset-4 hover:underline">
            {t("signIn")}
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col justify-center gap-6 px-4 py-16 md:px-8">
        <h1 className="max-w-2xl font-heading font-expanded text-display font-extrabold text-asphalt">
          {t("headline")}
        </h1>
        <p className="max-w-xl text-lg leading-7 text-asphalt">{t("lead")}</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Link href="/create-account" className={buttonVariants({ variant: "default" })}>
            {t("createAccount")}
          </Link>
          <Link href="/sign-in" className={buttonVariants({ variant: "secondary" })}>
            {t("signIn")}
          </Link>
        </div>
        <p className="label-mono">{t("note")}</p>
      </section>
    </main>
  );
}
