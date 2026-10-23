import { FACTOR_MAX, clampPoints, roundPoints, type FactorResult, type ScoringProfile, type ScoringTender } from "../types";

// Contract size, 15 points: is the value inside the company's range.
//   fitPoints        12  full inside the range, minus 3 per doubling outside
//                        it, 6 when the tender publishes no value, 12 when
//                        the profile set no range
//   certaintyPoints   3  single value 3, range 2, no value 1
// So an unknown value scores 6 + 1 = 7, the guide's "half".

export const SIZE_SPLIT = { fit: 12, certainty: 3, perDoubling: 3 } as const;

export type SizeFacts = {
  tenderValue: { low: number; high: number } | null;
  profileRange: { min: number | null; max: number | null } | null;
  position: "inside" | "above" | "below" | "unknownValue" | "noRange";
  doublingsOutside: number;
  fitPoints: number;
  certaintyPoints: number;
};

export type SizeResult = FactorResult<SizeFacts>;

export function scoreSize(tender: ScoringTender, profile: ScoringProfile): SizeResult {
  const tenderValue =
    tender.valueMin == null && tender.valueMax == null
      ? null
      : { low: tender.valueMin ?? tender.valueMax ?? 0, high: tender.valueMax ?? tender.valueMin ?? 0 };
  const profileRange =
    profile.sizeMin == null && profile.sizeMax == null ? null : { min: profile.sizeMin ?? null, max: profile.sizeMax ?? null };

  const certaintyPoints = tenderValue == null ? 1 : tenderValue.low === tenderValue.high ? 3 : 2;

  let position: SizeFacts["position"];
  let doublingsOutside = 0;
  let fitPoints: number;

  if (profileRange == null) {
    position = "noRange";
    fitPoints = SIZE_SPLIT.fit;
  } else if (tenderValue == null) {
    position = "unknownValue";
    fitPoints = SIZE_SPLIT.fit / 2;
  } else {
    const min = profileRange.min ?? 0;
    const max = profileRange.max ?? Number.POSITIVE_INFINITY;
    if (tenderValue.low > max) {
      position = "above";
      doublingsOutside = Math.log2(tenderValue.low / Math.max(max, 1));
    } else if (tenderValue.high < min) {
      position = "below";
      doublingsOutside = Math.log2(min / Math.max(tenderValue.high, 1));
    } else {
      position = "inside";
    }
    fitPoints = clampPoints(roundPoints(SIZE_SPLIT.fit - SIZE_SPLIT.perDoubling * doublingsOutside), SIZE_SPLIT.fit);
  }

  return {
    points: clampPoints(fitPoints + certaintyPoints, FACTOR_MAX.size),
    max: FACTOR_MAX.size,
    facts: { tenderValue, profileRange, position, doublingsOutside, fitPoints, certaintyPoints },
  };
}
