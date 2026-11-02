import { ExternalLinkIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ButtonLink } from "@/components/ui/button-link";
import type { OpportunityItem } from "@/lib/opportunities";
import { CopyButton } from "./copy-button";
import { linkDomain } from "./link-domain";

// The way out to the official notice. The adapter stores two links: the
// one in the source file when there is one (officialUrl, more than half of
// CanadaBuys notices have none) and the notice's own page on the source
// portal (noticePageUrl, built from the reference number). The screen only
// chooses between them:
// - a link in the file: the primary button names its domain (MERX, Ariba)
//   and a secondary button opens the source's own page;
// - no link in the file: the primary button opens the source's page, with
//   the reference number and a copy button beside it, and a sentence that
//   the page may need an account, since a few notices refuse without one;
// - neither (the fixtures): a link to the source's site and the number.
export async function NoticeLink({ item }: { item: OpportunityItem }) {
  const t = await getTranslations("Listing.notice");
  const source = item.source.name;
  const external = (
    <>
      <ExternalLinkIcon aria-hidden />
      <span className="sr-only">({t("opensNewTab")})</span>
    </>
  );
  const buttonClass = "h-auto min-h-button w-full py-3 text-center whitespace-normal md:w-auto";

  if (item.officialUrl) {
    const domain = linkDomain(item.officialUrl);
    return (
      <div className="flex flex-col gap-3">
        <ButtonLink href={item.officialUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          {domain ? t("openOn", { domain }) : t("open", { source })}
          {external}
        </ButtonLink>
        {item.noticePageUrl ? (
          <ButtonLink href={item.noticePageUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className={buttonClass}>
            {t("viewOnSource", { source })}
            {external}
          </ButtonLink>
        ) : null}
      </div>
    );
  }

  const reference = (
    <div className="flex flex-wrap items-center gap-3">
      <code className="border border-line bg-surface px-3 py-2 font-mono text-sm text-asphalt select-all">{item.externalId}</code>
      <CopyButton value={item.externalId} label={t("copy")} copiedLabel={t("copied")} />
    </div>
  );

  if (item.noticePageUrl) {
    return (
      <div className="flex flex-col gap-3">
        <ButtonLink href={item.noticePageUrl} target="_blank" rel="noopener noreferrer" className={buttonClass}>
          {t("open", { source })}
          {external}
        </ButtonLink>
        {reference}
        <p className="text-sm leading-5 text-asphalt">{t("mayNeedAccount", { source })}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <ButtonLink href={item.source.baseUrl} target="_blank" rel="noopener noreferrer" variant="secondary" className={buttonClass}>
        {t("find", { source })}
        {external}
      </ButtonLink>
      <p className="text-sm leading-5 text-asphalt">{t("noLink", { source })}</p>
      {reference}
    </div>
  );
}
