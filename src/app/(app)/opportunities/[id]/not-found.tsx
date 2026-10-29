import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button-link";

export default async function ListingNotFound() {
  const t = await getTranslations("Listing.notFound");
  return (
    <main id="main" className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-4 py-16 md:px-8">
      <h1 className="font-heading font-expanded text-h1 font-extrabold uppercase text-asphalt">{t("title")}</h1>
      <p className="text-base leading-6 text-asphalt">{t("body")}</p>
      <ButtonLink href="/opportunities" variant="secondary" className="self-start">
        {t("back")}
      </ButtonLink>
    </main>
  );
}
