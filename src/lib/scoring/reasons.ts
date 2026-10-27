import {
  BUYER_TYPE_LABELS,
  CATEGORY_LABELS,
  CERTIFICATION_LABELS,
  REGION_LABELS,
  TEAM_SIZE_LABELS,
  labelFor,
} from "./labels";
import { TIMELINE_SPLIT } from "./factors/timeline";
import type { ScoreResult } from "./types";

// Plain-language reasons from fixed templates. No AI call in the MVP.
// Each reason keeps its code and params beside the English text so the UI
// can render French later without rescoring. Three lists match the listing
// detail ("in your favour", "gaps to close", "could rule you out") and the
// summary gives the list row two or three of the same reasons, so it too
// can be rendered in either language from the stored row.

// Every code a reason can carry. Adding a template below means adding its
// code here, which is the list the next-intl messages must cover.
export const REASON_CODES = [
  "categoryMatch",
  "categoryMiss",
  "categoryUnknown",
  "categoryCap",
  "buyerMatch",
  "buyerMiss",
  "regionMismatch",
  "setAside",
  "languageMismatch",
  "bilingualRequired",
  "bondRequired",
  "clearanceRequired",
  "residencyRequired",
  "valueInRange",
  "valueAbove",
  "valueBelow",
  "valueUnknown",
  "timelineOk",
  "timelineTight",
  "afterHoursCapacity",
  "certificationHeld",
  "certificationMissing",
  "referencesRequested",
] as const;

export type ReasonCode = (typeof REASON_CODES)[number];
export type ReasonParams = Record<string, string | number>;

// `text` is the English fallback only. The screens render a reason from
// the next-intl message keyed by `code`, with `params`, and use the stored
// text only when no message exists for the code (see renderReason). A
// wording change therefore never needs a rescore.
export type Reason = {
  code: ReasonCode;
  params: ReasonParams;
  text: string;
};

export type ReasonMessages = Partial<Record<ReasonCode, (params: ReasonParams) => string>>;

// The one rule for showing a reason: a message for the code wins, the
// stored English text is the fallback. M3 wires next-intl into `messages`.
export function renderReason(reason: Reason, messages: ReasonMessages): string {
  const message = messages[reason.code];
  return message ? message(reason.params) : reason.text;
}

export type ReasonSet = {
  inFavour: Reason[];
  gaps: Reason[];
  ruleOut: Reason[];
  summary: Reason[];
};

// Same exclusions as REFERENCES in requirements.ts: "2 reference numbers"
// is not two references.
const REFERENCE_COUNT = /\b(one|two|three|four|five|six|\d+) (?:client |customer |project )?references?\b(?! numbers?\b| nos?\b| to\b)/;
const COUNT_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };

export function referenceCount(text: string): number | null {
  const match = REFERENCE_COUNT.exec(text.toLowerCase());
  if (!match) return null;
  return COUNT_WORDS[match[1]] ?? Number.parseInt(match[1], 10);
}

function reason(code: ReasonCode, params: ReasonParams, text: string): Reason {
  return { code, params, text };
}

export function buildReasons(result: ScoreResult, tender: { title: string; description: string }): ReasonSet {
  const { category, location, size, timeline, credentials } = result.details;
  const inFavour: Reason[] = [];
  const gaps: Reason[] = [];
  const ruleOut: Reason[] = [];

  // ---- category and buyer ------------------------------------------------
  if (category.facts.matchedCodes.length > 0) {
    const label = labelFor(CATEGORY_LABELS, category.facts.matchedCodes[0]);
    inFavour.push(reason("categoryMatch", { category: label }, `Matches your category: ${label}`));
  } else if (category.facts.tenderCodes.length > 0) {
    const label = labelFor(CATEGORY_LABELS, category.facts.tenderCodes[0]);
    gaps.push(reason("categoryMiss", { category: label }, `Outside your categories: ${label}`));
  } else {
    gaps.push(reason("categoryUnknown", {}, "The notice names no category, so the match rests on keywords"));
  }

  if (category.facts.buyerType) {
    const label = labelFor(BUYER_TYPE_LABELS, category.facts.buyerType);
    if (category.facts.buyerMatch === "match") {
      inFavour.push(reason("buyerMatch", { buyerType: label }, `${label} buyers are on your list`));
    } else if (category.facts.buyerMatch === "miss") {
      gaps.push(reason("buyerMiss", { buyerType: label }, `${label} buyers are not on your list`));
    }
  }

  // ---- gate and location -------------------------------------------------
  for (const blocker of result.gate.blockers) {
    if (blocker.code === "regionMismatch") {
      const label = labelFor(REGION_LABELS, blocker.region);
      ruleOut.push(reason("regionMismatch", { region: label }, `Outside the provinces you work in: ${label}`));
    } else {
      ruleOut.push(reason("setAside", { group: blocker.group }, `Set aside for ${blocker.group}`));
    }
  }
  if (location.facts.languageMatch === "none") {
    const text = location.facts.tenderLanguage === "FR" ? "French-only submission" : "English-only submission";
    ruleOut.push(reason("languageMismatch", { language: location.facts.tenderLanguage }, text));
  } else if (location.facts.languageMatch === "partial") {
    gaps.push(reason("bilingualRequired", {}, "Bilingual delivery is required"));
  }

  for (const check of location.facts.checks) {
    if (check.satisfied) continue;
    if (check.code === "bond") {
      ruleOut.push(reason("bondRequired", {}, "A bond is required and your answers say no bonding"));
    } else if (check.code === "clearance") {
      ruleOut.push(reason("clearanceRequired", {}, "A security clearance is required"));
    } else {
      ruleOut.push(reason("residencyRequired", {}, "Data must stay in Canada and your head office is not set"));
    }
  }

  // ---- size --------------------------------------------------------------
  if (size.facts.position === "inside") {
    inFavour.push(reason("valueInRange", {}, "The value sits inside your range"));
  } else if (size.facts.position === "above") {
    gaps.push(reason("valueAbove", {}, "The value is above your range"));
  } else if (size.facts.position === "below") {
    gaps.push(reason("valueBelow", {}, "The value is below your range"));
  } else if (size.facts.position === "unknownValue") {
    gaps.push(reason("valueUnknown", {}, "No value is published"));
  }

  // ---- timeline and capacity ---------------------------------------------
  // Compares days, not points: 19 days against a 20-day lead time rounds to
  // full points but is still under the lead time.
  const { daysLeft, leadDays } = timeline.facts;
  if (leadDays != null && leadDays > 0) {
    if (daysLeft >= leadDays) {
      inFavour.push(reason("timelineOk", { days: daysLeft }, `Closes in ${daysLeft} days, inside your lead time`));
    } else {
      gaps.push(
        reason("timelineTight", { days: daysLeft, lead: leadDays }, `Closes in ${daysLeft} days, under your ${leadDays} day lead time`),
      );
    }
  }
  if (timeline.facts.afterHours && timeline.facts.capacity && timeline.facts.capacityPoints < TIMELINE_SPLIT.capacity) {
    const band = labelFor(TEAM_SIZE_LABELS, timeline.facts.capacity);
    gaps.push(reason("afterHoursCapacity", { band }, `24/7 coverage goes beyond a team of ${band}`));
  }

  // ---- credentials -------------------------------------------------------
  if (credentials.facts.certificationStatus === "held") {
    const label = labelFor(CERTIFICATION_LABELS, credentials.facts.heldCertifications[0]);
    inFavour.push(reason("certificationHeld", { certification: label }, `You hold ${label}, which is required`));
  } else if (credentials.facts.certificationStatus === "missing") {
    const label = credentials.facts.requiredCertifications.map((c) => labelFor(CERTIFICATION_LABELS, c)).join(" or ");
    // Labels carry their own article ("a Health Canada licence"), so the
    // template never changes their case.
    ruleOut.push(reason("certificationMissing", { certification: label }, `Requires ${label}, which you do not list`));
  }
  if (credentials.facts.referencesRequired) {
    const count = referenceCount(`${tender.title} ${tender.description}`);
    gaps.push(
      count == null
        ? reason("referencesRequested", {}, "References are requested")
        : reason("referencesRequested", { count }, `${count} references are requested`),
    );
  }

  // The cap explains a Low band better than any single gap, so it leads.
  if (result.cap) {
    gaps.unshift(reason("categoryCap", { limit: result.cap.limit }, "Too little category match, so this tender is capped at Low"));
  }

  return { inFavour, gaps, ruleOut, summary: summarize(inFavour, gaps, ruleOut) };
}

// Two or three lines for the list row: the top point in favour, then the
// top blocker or gap, then a second point in favour when there is one.
// With fewer than two lines so far it pads from the remaining blockers and
// gaps. The category always yields one reason, so the summary is only ever
// shorter than two lines when a tender produces exactly one reason in all:
// no buyer type, no lead time, no value range and nothing in the text.
export function summarize(inFavour: Reason[], gaps: Reason[], ruleOut: Reason[]): Reason[] {
  const lines: Reason[] = [];
  const concern = ruleOut[0] ?? gaps[0];
  if (inFavour[0]) lines.push(inFavour[0]);
  if (concern) lines.push(concern);
  if (inFavour[1]) lines.push(inFavour[1]);
  if (lines.length < 2) {
    for (const extra of [...ruleOut.slice(1), ...gaps.slice(ruleOut[0] ? 0 : 1)]) {
      if (lines.length >= 3) break;
      lines.push(extra);
    }
  }
  return lines.slice(0, 3);
}
