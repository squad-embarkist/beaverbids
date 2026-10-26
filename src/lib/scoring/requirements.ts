import { CATEGORY_CODES, type CategoryCode } from "@/lib/schemas/vocab";
import { CATEGORY_KEYWORDS } from "./keywords";

// Tenders carry only a title and a description, so this pure function turns
// the text into the facts the rules need. It is pattern matching, not AI,
// and it runs inside the scoring call. The patterns are deliberately
// conservative: a false "set-aside" would hide a tender, while a missed one
// only costs a few points.

export type CertificationCode = "SOC 2" | "ISO 27001" | "ISO 9001" | "P.Eng." | "Health Canada licence";

export type Requirements = {
  certifications: CertificationCode[];
  bondRequired: boolean;
  clearanceRequired: boolean;
  residencyCanada: boolean;
  setAside: string | null;
  afterHours: boolean;
  referencesRequired: boolean;
  bilingualRequired: boolean;
  keywordHits: Partial<Record<CategoryCode, string[]>>;
};

// Lower-case, strip accents, turn hyphens and dashes into spaces and
// collapse whitespace, so "Data Centre", "data-centre" and "centre de
// données" compare the same way.
export function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\u2010-\u2015-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const CERTIFICATION_PATTERNS: [CertificationCode, RegExp][] = [
  ["SOC 2", /\bsoc\s?2\b/],
  ["ISO 27001", /\biso\s?27001\b/],
  ["ISO 9001", /\biso\s?9001\b/],
  // French: the licence, not the word for an engineer, which any notice
  // about a department engineer would carry.
  ["P.Eng.", /\b(professional engineering licen[cs]e|p\.?\s?eng\b|licensed professional engineer|ingenieure?s? (?:agree|professionnel)|ordre des ingenieurs|membre de l'oiq)/],
  ["Health Canada licence", /\bhealth canada licen[cs]e/],
];

// The profile stores certifications as free text ("SOC 2 Type II"), so this
// maps a profile entry to the codes above when it names one.
export function certificationCodesFor(certification: string): CertificationCode[] {
  const text = normalizeText(certification);
  return CERTIFICATION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);
}

const BOND = /\b(bid bond|performance bond|performance and labour|bonds? (are |is )?required|bonding|garantie de soumission|cautionnement)\b/;
const CLEARANCE = /\b(security clearance|reliability (status|clearance|screening)|reliability level|secret clearance|top secret|enhanced reliability|habilitation de securite)\b/;
const RESIDENCY = /\b(data (must|shall|will) (stay|remain|reside) in canada|data residency|canadian cloud region|hosted in canada|storage in canada|stored in canada|data sovereignty)\b/;
const AFTER_HOURS = /\b(24\s?\/\s?7|24 hours a day|24-hour|24 hour|after-hours|after hours|on-call|on call|365 days)\b/;
// References as in past clients, never "Terms of Reference", a reference
// number or "for reference". The plural is taken as client references
// unless the words around it say otherwise; the singular needs a client or
// project word beside it.
const REFERENCES =
  /\b(?:(?<!terms of |cross |by |with |in |for )references(?! numbers?\b| nos?\b| to\b| are made\b)|(?:client|customer|project|contract|past|previous|professional) references?|references? (?:projects?|letters?|checks?|contacts?|sites?)|provide (?:a |one )?reference|prior (?:\w+ )?(?:deployments|experience)|comparable size|similar size)\b/;
const BILINGUAL = /\b(bilingual|bilingue|in english and french|en anglais et en francais|english and french)\b/;

// Set-asides only when the text reserves the work for a kind of supplier.
// "Indigenous-owned proponents are encouraged" is not a set-aside, and
// neither is "funding has been set aside for this project" or "time is set
// aside for questions": the captured group must name suppliers or a known
// program. The group runs to the end of the clause or to "under" /
// "pursuant", whichever comes first.
//
// A conditional set-aside ("tenders may be set aside for Indigenous
// businesses") still counts. Softening that, and letting a profile claim
// Indigenous business status, is a follow-up in docs/plans/m2-category-cap.md.
const SET_ASIDE_PATTERNS = [
  // "set aside from the trade agreements" is an exemption, not a group.
  /\bset[- ]aside (?!from\b)(?:for |under )?(?:the )?([a-z][a-z -]{2,80}?)(?= under | pursuant | in accordance |[.,;:(]|$)/g,
  /\breserved for (?:the )?([a-z][a-z -]{2,80}?)(?= under | pursuant |[.,;:(]|$)/g,
  /\blimited to ([a-z][a-z -]{2,60}?(?:businesses|suppliers|firms|vendors|enterprises|bidders))\b/g,
  /\b(?:reserve|reservee?) (?:aux|a la|a des) ([a-z][a-z -]{2,80}?)(?=[.,;:(]|$)/g,
];

const SET_ASIDE_GROUP =
  /\b(?:business(?:es)?|suppliers?|firms?|vendors?|enterprises?|bidders?|contractors?|proponents?|organi[sz]ations?|compan(?:y|ies)|corporations?|entreprises?|fournisseurs?|entrepreneurs?|psib|psab)\b/;

// A set-aside for small or medium businesses never gates: those are the
// suppliers the product serves. A softer "could rule you out" line for
// large firms belongs to the conditional set-aside work in
// docs/plans/m2-category-cap.md.
const SMALL_BUSINESS_GROUP = /\b(?:small (?:and|or|to) medium|small business(?:es)?|smes?|pmes?|petites? (?:et|ou) moyennes?)\b/;

export function detectSetAside(text: string): string | null {
  for (const pattern of SET_ASIDE_PATTERNS) {
    for (const match of text.matchAll(pattern)) {
      const group = match[1].trim();
      if (SET_ASIDE_GROUP.test(group) && !SMALL_BUSINESS_GROUP.test(group)) return group;
    }
  }
  return null;
}

// Keywords match whole words (with an optional plural "s"), never
// substrings: "Buildings" is not "build" and "capital program" is not "api".
// Built once at module load.
const KEYWORD_MATCHERS: Record<CategoryCode, { variant: string; pattern: RegExp }[][]> = Object.fromEntries(
  CATEGORY_CODES.map((code) => [
    code,
    CATEGORY_KEYWORDS[code].map((phrase) =>
      phrase.split("|").map((variant) => ({ variant, pattern: wordPattern(variant) })),
    ),
  ]),
) as Record<CategoryCode, { variant: string; pattern: RegExp }[][]>;

export function wordPattern(phrase: string): RegExp {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}s?\\b`);
}

export function extractRequirements(tender: { title: string; description: string }): Requirements {
  const text = normalizeText(`${tender.title}. ${tender.description}`);

  const certifications = CERTIFICATION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);

  const setAside = detectSetAside(text);

  // Records the spelling that matched ("data centre", not the whole phrase
  // list) so reasons can quote it.
  const keywordHits: Partial<Record<CategoryCode, string[]>> = {};
  for (const code of CATEGORY_CODES) {
    const hits = KEYWORD_MATCHERS[code]
      .map((variants) => variants.find(({ pattern }) => pattern.test(text))?.variant)
      .filter((hit): hit is string => hit != null);
    if (hits.length > 0) keywordHits[code] = hits;
  }

  return {
    certifications,
    bondRequired: BOND.test(text),
    clearanceRequired: CLEARANCE.test(text),
    residencyCanada: RESIDENCY.test(text),
    setAside,
    afterHours: AFTER_HOURS.test(text),
    referencesRequired: REFERENCES.test(text),
    bilingualRequired: BILINGUAL.test(text),
    keywordHits,
  };
}

export const KEYWORDS_PER_CATEGORY = 5;
