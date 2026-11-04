import type { CategoryCode } from "@/lib/schemas/vocab";
import { KEYWORDS_PER_CATEGORY, type Requirements } from "../requirements";
import { FACTOR_MAX, clampPoints, roundPoints, type FactorResult, type ScoringProfile, type ScoringTender } from "../types";

// Category match, 40 points: does the work the buyer wants match what the
// company does. Three parts so the sample tender lands on 38:
//   codePoints    24  share of the tender's category codes the profile lists
//   buyerPoints    8  the buyer type is one the profile works with
//   keywordPoints  8  share of the matched category's five keywords in the text

export const CATEGORY_SPLIT = { code: 24, buyer: 8, keyword: 8 } as const;

export type CategoryFacts = {
  matchedCodes: CategoryCode[];
  tenderCodes: string[];
  keywordCategory: CategoryCode | null;
  keywordHits: string[];
  buyerType: string | null;
  buyerMatch: "match" | "unknown" | "miss";
  codePoints: number;
  buyerPoints: number;
  keywordPoints: number;
};

export type CategoryResult = FactorResult<CategoryFacts>;

function keywordShare(code: CategoryCode, requirements: Requirements): number {
  return (requirements.keywordHits[code]?.length ?? 0) / KEYWORDS_PER_CATEGORY;
}

export function scoreCategory(tender: ScoringTender, profile: ScoringProfile, requirements: Requirements): CategoryResult {
  // Deduplicated on both sides (rules-4): a source can carry several codes
  // that map to one category, and the code share must not halve for it.
  const profileCodes = [...new Set(profile.categories)] as CategoryCode[];
  const tenderCodes = [...new Set(tender.categoryCodes)];
  const matchedCodes = profileCodes.filter((code) => tenderCodes.includes(code));

  // The category whose keywords we count: the best matched code, or, when
  // no code matches, the profile category with the most keyword hits. That
  // way adjacent work still earns a little.
  const candidates = matchedCodes.length > 0 ? matchedCodes : profileCodes;
  const keywordCategory =
    [...candidates].sort((a, b) => keywordShare(b, requirements) - keywordShare(a, requirements))[0] ?? null;
  const keywordHits = keywordCategory ? (requirements.keywordHits[keywordCategory] ?? []) : [];
  const share = keywordCategory ? keywordShare(keywordCategory, requirements) : 0;

  const codePoints =
    tenderCodes.length > 0
      ? roundPoints(CATEGORY_SPLIT.code * (matchedCodes.length / tenderCodes.length))
      : roundPoints(CATEGORY_SPLIT.code * share);

  const buyerType = tender.buyerType ?? null;
  const buyerMatch: CategoryFacts["buyerMatch"] =
    buyerType == null ? "unknown" : profile.buyerTypes.length === 0 || profile.buyerTypes.includes(buyerType) ? "match" : "miss";
  const buyerPoints = buyerMatch === "match" ? CATEGORY_SPLIT.buyer : buyerMatch === "unknown" ? CATEGORY_SPLIT.buyer / 2 : 0;

  const keywordPoints = roundPoints(CATEGORY_SPLIT.keyword * share);

  return {
    points: clampPoints(codePoints + buyerPoints + keywordPoints, FACTOR_MAX.category),
    max: FACTOR_MAX.category,
    facts: { matchedCodes, tenderCodes, keywordCategory, keywordHits, buyerType, buyerMatch, codePoints, buyerPoints, keywordPoints },
  };
}
