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
  ["P.Eng.", /\b(professional engineering licen[cs]e|p\.?\s?eng\b|licensed professional engineer|ingenieur)/],
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
const REFERENCES = /\b(references?|reference projects?|prior (?:\w+ )?(?:deployments|experience)|comparable size|similar size)\b/;
const BILINGUAL = /\b(bilingual|bilingue|in english and french|en anglais et en francais|english and french)\b/;

// Set-asides only when the text reserves the work. "Indigenous-owned
// proponents are encouraged" is not a set-aside. The group runs to the end
// of the clause or to "under" / "pursuant", whichever comes first.
const SET_ASIDE_PATTERNS = [
  /\bset[- ]aside (?:for |under )?(?:the )?([a-z][a-z -]{2,80}?)(?= under | pursuant | in accordance |[.,;:(]|$)/,
  /\breserved for (?:the )?([a-z][a-z -]{2,80}?)(?= under | pursuant |[.,;:(]|$)/,
  /\blimited to ([a-z][a-z -]{2,60}?(?:businesses|suppliers|firms|vendors|enterprises|bidders))\b/,
  /\b(?:reserve|reservee?) (?:aux|a la|a des) ([a-z][a-z -]{2,80}?)(?=[.,;:(]|$)/,
];

export function detectSetAside(text: string): string | null {
  for (const pattern of SET_ASIDE_PATTERNS) {
    const match = pattern.exec(text);
    if (match) return match[1].trim() || "a specific group";
  }
  return null;
}

export function extractRequirements(tender: { title: string; description: string }): Requirements {
  const text = normalizeText(`${tender.title}. ${tender.description}`);

  const certifications = CERTIFICATION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);

  const setAside = detectSetAside(text);

  // Records the spelling that matched ("data centre", not the whole phrase
  // list) so reasons can quote it.
  const keywordHits: Partial<Record<CategoryCode, string[]>> = {};
  for (const code of CATEGORY_CODES) {
    const hits = CATEGORY_KEYWORDS[code]
      .map((phrase) => phrase.split("|").find((variant) => text.includes(variant)))
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
