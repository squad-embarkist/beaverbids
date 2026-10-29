import { ExternalLinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button-link";
import type { OpportunityItem } from "@/lib/opportunities";
import { CopyButton } from "./copy-button";

// The way out to the official notice. More than half of CanadaBuys notices
// carry no direct link, so without one the button goes to the source's own
// site and the reference number sits beside it with a copy button.
export async function NoticeLink({ item }: { item: OpportunityItem }) {
  const t = await getTranslations("Listing.notice");

  if (item.officialUrl) {
    return (
      <ButtonLink href={item.officialUrl} target="_blank" rel="noopener noreferrer" className="h-auto min-h-button w-full py-3 text-center whitespace-normal md:w-auto">
        {t("open", { source: item.source.name })}
        <ExternalLinkIcon aria-hidden />
        <span className="sr-only">({t("opensNewTab")})</span>
      </ButtonLink>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ButtonLink href={item.source.baseUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className="h-auto min-h-button w-full py-3 text-center whitespace-normal md:w-auto">
        {t("find", { source: item.source.name })}
        <ExternalLinkIcon aria-hidden />
        <span className="sr-only">({t("opensNewTab")})</span>
      </ButtonLink>
      <p className="text-sm leading-5 text-asphalt">{t("noLink", { source: item.source.name })}</p>
      <div className="flex flex-wrap items-center gap-3">
        <code className="border border-line bg-surface px-3 py-2 font-mono text-sm text-asphalt select-all">{item.externalId}</code>
        <CopyButton value={item.externalId} label={t("copy")} copiedLabel={t("copied")} />
      </div>
    </div>
  );
}
