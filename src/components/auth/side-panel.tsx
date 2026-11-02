import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/landing/brand-lockup";
import { cn } from "@/lib/utils";

export type PanelTone = "asphalt" | "stone";

// The side panel drawn on every account frame: a 315 px content column
// (the frames' heading, lead and card are all 315 px wide) inside 50 px
// gutters and a 6 px signal rule on its left edge, so 421 px in all. It
// holds the lockup, a two-line expanded headline with its second line on a
// signal block, a lead, an optional card, and the facts along the bottom.
// "WELCOME" is one 48 px word a few pixels wider than the column and runs
// into the gutter, as it does in the frame. Asphalt on Sign Up and Set new password, stone elsewhere. Under
// 1024 px only the lockup stays, as a band above the form (the frames are
// desktop only; docs/plans/account-flow-plan.md, section 8, item 1).
export function SidePanel({
  tone,
  brand,
  title,
  titleHighlight,
  lead,
  children,
  footer,
}: {
  tone: PanelTone;
  brand: string;
  title: string;
  titleHighlight: string;
  lead: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const dark = tone === "asphalt";
  return (
    <aside
      data-tone={tone}
      className={cn(
        "flex shrink-0 flex-col gap-10 border-l-[6px] border-signal px-4 py-4 sm:px-12 lg:w-[421px] lg:px-[50px] lg:py-10",
        dark ? "bg-asphalt text-paper" : "bg-stone text-asphalt",
      )}
    >
      <Link href="/" className={cn("w-fit", dark ? "focus-visible:outline-paper" : undefined)}>
        <BrandLockup brand={brand} size="lg" tone={dark ? "dark" : "light"} />
      </Link>
      <div className="hidden flex-col gap-6 pt-6 lg:flex">
        <p className="font-heading font-expanded text-section font-extrabold leading-[46px] uppercase">
          {title}
          <br />
          <span className="highlight block w-fit">{titleHighlight}</span>
        </p>
        <p className="max-w-[315px] text-base leading-[26px]">{lead}</p>
      </div>
      {children ? <div className="hidden lg:block">{children}</div> : null}
      {footer ? <div className="mt-auto hidden lg:block">{footer}</div> : null}
    </aside>
  );
}

// The "LABEL: value" rows along the bottom of a panel, each above a
// hairline. 72 px label column on asphalt, 76 px on stone, as drawn.
export function FactRows({ tone, rows }: { tone: PanelTone; rows: { label: string; value: string }[] }) {
  const dark = tone === "asphalt";
  return (
    <dl className="flex flex-col gap-3.5">
      {rows.map((row) => (
        <div key={row.label} className={cn("flex gap-3.5 border-t pt-3", dark ? "border-line-on-dark" : "border-hairline")}>
          <dt className={cn("shrink-0 font-mono text-mono-md leading-5 font-medium tracking-normal", dark ? "w-[72px] text-ink-on-dark" : "w-[76px] text-line-on-dark")}>{row.label}</dt>
          <dd className={cn("font-mono text-mono-md leading-5 font-medium tracking-normal", dark ? "text-paper" : "text-asphalt")}>{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// The boxed sample on the Sign Up panel (node 30:156): a red 84, "/100",
// a fictional tender and its meta line. Static copy from the frame.
export function SampleScoreCard({ score, outOf, title, meta }: { score: string; outOf: string; title: string; meta: string }) {
  return (
    <div className="flex items-center gap-[18px] border border-line-on-dark p-5">
      <div className="flex flex-col">
        <span className="font-heading font-expanded text-[2.5rem] leading-10 font-extrabold text-signal">{score}</span>
        <span className="font-mono text-tag font-medium text-ink-on-dark">{outOf}</span>
      </div>
      <div className="flex w-[192px] flex-col gap-[5px]">
        <p className="text-sm leading-5 font-bold text-paper">{title}</p>
        <p className="font-mono text-mono-xs font-medium tracking-[0.12em] text-ink-on-dark">{meta}</p>
      </div>
    </div>
  );
}

// The "WAITING FOR YOU" card on the Log in panel (node 32:526): a field
// coloured box with a hairline border and one row per count. The numbers
// are real global counts (docs/plans/account-flow-plan.md, D4).
export function WaitingCard({ label, rows }: { label: string; rows: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-4 border border-hairline bg-field p-[22px]">
      <p className="font-mono text-tag font-medium text-ink-strong">{label}</p>
      <dl className="flex flex-col">
        {rows.map((row, index) => (
          <div key={row.label} className={cn("flex items-center justify-between gap-4", index < rows.length - 1 ? "border-b border-stone-light pb-3 pt-2" : "pt-2")}>
            <dt className="text-sm text-asphalt">{row.label}</dt>
            <dd className="font-heading font-expanded text-2xl leading-6 font-extrabold text-asphalt">{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
