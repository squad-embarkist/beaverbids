import Link from "next/link";
import { cn } from "cn";
import { getFormatter, getTranslations } from "next-intl/server";
import { ScoreChip } from "@/components/score/score-chip";
import { getReasonText } from "@/components/score/reason-text-server";
import { CLOSING_SOON_DAYS, daysUntil } from "@/lib/dates";
import type { OpportunityItem } from "@/lib/opportunities";

// The scored rows: a table from 768 px up, a stack of cards below (score on
// the left, title and closing date to the right). Both are rendered and one
// is display:none, so assistive technology sees a single list. The title
// link is the row's one control; the whole row stays reachable by keyboard
// through it.

type RowText = {
  closes: string;
  closesIn: string;
  closingSoon: boolean;
  value: string;
  reason: string | null;
};

export async function OpportunityList({ items, now }: { items: OpportunityItem[]; now: Date }) {
  const t = await getTranslations("Opportunities");
  const tVocab = await getTranslations("Vocab");
  const format = await getFormatter();
  const reasonText = await getReasonText();

  const money = (value: number) => format.number(value, "cadCompact");
  const textFor = (item: OpportunityItem): RowText => {
    const days = daysUntil(item.closesAt, now);
    const value =
      item.valueMin != null && item.valueMax != null
        ? item.valueMin === item.valueMax
          ? money(item.valueMin)
          : t("valueRange", { min: money(item.valueMin), max: money(item.valueMax) })
        : item.valueMin != null
          ? t("valueFrom", { min: money(item.valueMin) })
          : item.valueMax != null
            ? t("valueUpTo", { max: money(item.valueMax) })
            : t("valueNotStated");
    const summary = item.score.placeholder ? null : item.score.reasons?.summary[0];
    return {
      closes: format.dateTime(new Date(item.closesAt), "short"),
      closesIn: t("closesIn", { days }),
      closingSoon: days <= CLOSING_SOON_DAYS,
      value,
      reason: summary ? reasonText(summary) : null,
    };
  };

  const rows = items.map((item) => ({ item, text: textFor(item), region: tVocab(`regions.${item.region as "ON"}`) }));

  return (
    <>
      <table className="hidden w-full table-fixed border-collapse md:table">
        <caption className="sr-only">{t("listLabel")}</caption>
        <colgroup>
          <col className="w-28" />
          <col />
          <col className="w-36" />
          <col className="w-32" />
        </colgroup>
        <thead>
          <tr className="border-b border-line text-left">
            <th scope="col" className="label-mono py-3 pr-4">
              {t("columns.score")}
            </th>
            <th scope="col" className="label-mono py-3 pr-4">
              {t("columns.tender")}
            </th>
            <th scope="col" className="label-mono py-3 pr-4">
              {t("columns.closes")}
            </th>
            <th scope="col" className="label-mono py-3">
              {t("columns.value")}
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ item, text, region }) => (
            <tr key={item.id} className="border-b border-line align-top transition-colors hover:bg-surface">
              <td className="py-4 pr-4">
                <ScoreChip score={item.score} />
              </td>
              <td className="py-4 pr-4">
                <TitleBlock item={item} text={text} region={region} />
              </td>
              <td className="py-4 pr-4 whitespace-nowrap">
                <Closing text={text} />
              </td>
              <td className="py-4 font-mono text-sm text-asphalt whitespace-nowrap">{text.value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map(({ item, text, region }) => (
          <li key={item.id} className="flex gap-4 border border-line bg-surface p-4">
            <ScoreChip score={item.score} className="shrink-0" />
            <div className="flex min-w-0 flex-1 flex-col gap-2">
              <TitleBlock item={item} text={text} region={region} />
              <Closing text={text} />
              <p className="font-mono text-sm text-asphalt">{text.value}</p>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

function TitleBlock({ item, text, region }: { item: OpportunityItem; text: RowText; region: string }) {
  return (
    <div className="flex flex-col gap-1">
      <Link href={`/opportunities/${item.id}`} className="font-heading text-base leading-6 font-bold text-asphalt underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-asphalt">
        {item.title}
      </Link>
      <p className="font-mono text-label text-ink-muted">
        {item.buyer} · {region} · {item.externalId}
      </p>
      {text.reason ? <p className="text-sm leading-5 text-asphalt">{text.reason}</p> : null}
    </div>
  );
}

function Closing({ text }: { text: RowText }) {
  return (
    <p className="flex flex-col gap-0.5">
      <span className="font-mono text-sm text-asphalt">{text.closes}</span>
      <span className={cn("font-mono text-label", text.closingSoon ? "font-medium text-signal" : "text-ink-muted")}>{text.closesIn}</span>
    </p>
  );
}
