import { z } from "zod";

// Option lists shared by the questionnaire, the tender schema, the seed and
// the UI. Codes are stable identifiers; labels live in messages/*.json.
// Lists come from the onboarding and opportunities wireframes.

export const CATEGORY_CODES = [
  "it-managed-services-cloud",
  "cybersecurity-data-protection",
  "custom-software-saas",
  "healthcare-it-ehr",
  "commercial-construction",
  "civil-engineering-infrastructure",
  "medical-equipment-pharma",
  "facilities-janitorial",
  "logistics-freight-3pl",
  "management-consulting",
] as const;

export const BUYER_TYPE_CODES = [
  "municipal",
  "provincial",
  "federal",
  "health-authority",
  "education",
  "crown-utility",
  "transit",
  "defence-public-safety",
  "indigenous-government",
] as const;

export const PROVINCE_CODES = [
  "AB",
  "BC",
  "MB",
  "NB",
  "NL",
  "NS",
  "NT",
  "NU",
  "ON",
  "PE",
  "QC",
  "SK",
  "YT",
] as const;

// CA means all of Canada: a national tender, or a company that works anywhere.
export const REGION_CODES = ["CA", ...PROVINCE_CODES] as const;

export const LANGUAGE_CODES = ["EN", "FR", "EN_FR"] as const;

export const TEAM_SIZE_BANDS = ["1-5", "6-10", "11-25", "26-50", "51-200", "200+"] as const;

export const SCORE_BANDS = ["HIGH", "MEDIUM", "LOW"] as const;

// What kind of notice a source published, normalized by its adapter. Only
// BID and UNKNOWN are scored and listed (see LISTED_NOTICE_KINDS).
export const NOTICE_KINDS = ["BID", "RFI", "ACAN", "DIRECTED", "OTHER", "UNKNOWN"] as const;
export const LISTED_NOTICE_KINDS = ["BID", "UNKNOWN"] as const satisfies readonly NoticeKind[];

// Government of Canada personnel security screening levels. The profile
// stores the highest one held; null means none.
export const CLEARANCE_LEVELS = ["reliability", "secret", "top-secret"] as const;

export const categoryCode = z.enum(CATEGORY_CODES);
export const buyerTypeCode = z.enum(BUYER_TYPE_CODES);
export const provinceCode = z.enum(PROVINCE_CODES);
export const regionCode = z.enum(REGION_CODES);
export const languageCode = z.enum(LANGUAGE_CODES);
export const teamSizeBand = z.enum(TEAM_SIZE_BANDS);
export const scoreBand = z.enum(SCORE_BANDS);
export const clearanceLevel = z.enum(CLEARANCE_LEVELS);
export const noticeKind = z.enum(NOTICE_KINDS);

export type CategoryCode = (typeof CATEGORY_CODES)[number];
export type BuyerTypeCode = (typeof BUYER_TYPE_CODES)[number];
export type ProvinceCode = (typeof PROVINCE_CODES)[number];
export type RegionCode = (typeof REGION_CODES)[number];
export type LanguageCode = (typeof LANGUAGE_CODES)[number];
export type TeamSizeBand = (typeof TEAM_SIZE_BANDS)[number];
export type ScoreBand = (typeof SCORE_BANDS)[number];
export type ClearanceLevel = (typeof CLEARANCE_LEVELS)[number];
export type NoticeKind = (typeof NOTICE_KINDS)[number];

// Band thresholds from the UI guide: 75 to 100 High, 50 to 74 Medium, under 50 Low.
export function bandForTotal(total: number): ScoreBand {
  if (total >= 75) return "HIGH";
  if (total >= 50) return "MEDIUM";
  return "LOW";
}
