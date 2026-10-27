import type { LanguageCode } from "@/lib/schemas/vocab";
import type { Requirements } from "../requirements";
import { FACTOR_MAX, clampPoints, roundPoints, type FactorResult, type ScoringProfile, type ScoringTender } from "../types";

// Location and eligibility, 20 points: can the company legally and
// practically bid.
//   regionPoints   12  the tender's region is one the profile serves
//   languagePoints  5  the profile can deliver in the tender's language
//   checksPoints    3  share of detected eligibility items the profile meets

export const LOCATION_SPLIT = { region: 12, language: 5, checks: 3 } as const;

export type EligibilityCheck = {
  code: "residencyCanada" | "bond" | "clearance";
  satisfied: boolean;
};

export type LocationFacts = {
  regionMatch: boolean;
  tenderLanguage: LanguageCode;
  languageMatch: "full" | "partial" | "none";
  checks: EligibilityCheck[];
  regionPoints: number;
  languagePoints: number;
  checksPoints: number;
};

export type LocationResult = FactorResult<LocationFacts>;

export function regionMatches(tenderRegion: string, profileRegions: readonly string[]): boolean {
  return tenderRegion === "CA" || profileRegions.includes("CA") || profileRegions.includes(tenderRegion);
}

// A tender flagged bilingual in its text counts as EN_FR even when the
// notice itself is in one language.
export function effectiveTenderLanguage(tender: ScoringTender, requirements: Requirements): LanguageCode {
  return requirements.bilingualRequired ? "EN_FR" : tender.language;
}

export function languageMatch(tenderLanguage: LanguageCode, profileLanguage: LanguageCode): LocationFacts["languageMatch"] {
  if (profileLanguage === "EN_FR") return "full";
  if (tenderLanguage === profileLanguage) return "full";
  if (tenderLanguage === "EN_FR") return "partial";
  return "none";
}

export function eligibilityChecks(requirements: Requirements, profile: ScoringProfile): EligibilityCheck[] {
  const checks: EligibilityCheck[] = [];
  if (requirements.residencyCanada) checks.push({ code: "residencyCanada", satisfied: Boolean(profile.headOfficeProvince) });
  if (requirements.bondRequired) checks.push({ code: "bond", satisfied: profile.bonding });
  // Phase 1 has no clearance field on the profile, so a clearance is never
  // confirmed. It costs points here and shows under "could rule you out".
  if (requirements.clearanceRequired) checks.push({ code: "clearance", satisfied: false });
  return checks;
}

export function scoreLocation(tender: ScoringTender, profile: ScoringProfile, requirements: Requirements): LocationResult {
  const regionMatch = regionMatches(tender.region, profile.regions);
  const regionPoints = regionMatch ? LOCATION_SPLIT.region : 0;

  const tenderLanguage = effectiveTenderLanguage(tender, requirements);
  const match = languageMatch(tenderLanguage, profile.languages);
  const languagePoints = match === "full" ? LOCATION_SPLIT.language : match === "partial" ? 3 : 0;

  const checks = eligibilityChecks(requirements, profile);
  const checksPoints =
    checks.length === 0
      ? LOCATION_SPLIT.checks
      : roundPoints(LOCATION_SPLIT.checks * (checks.filter((c) => c.satisfied).length / checks.length));

  return {
    points: clampPoints(regionPoints + languagePoints + checksPoints, FACTOR_MAX.location),
    max: FACTOR_MAX.location,
    facts: { regionMatch, tenderLanguage, languageMatch: match, checks, regionPoints, languagePoints, checksPoints },
  };
}
