import { bandForTotal } from "@/lib/schemas/vocab";
import { scoreCategory } from "./factors/category";
import { scoreCredentials } from "./factors/credentials";
import { scoreLocation } from "./factors/location";
import { scoreSize } from "./factors/size";
import { scoreTimeline } from "./factors/timeline";
import { checkGate } from "./gate";
import { extractRequirements } from "./requirements";
import type { ScoreCap, ScoreResult, ScoringProfile, ScoringTender } from "./types";

// Bump when a rule changes so the worker can tell stale rows apart and a
// clean rescore can be triggered.
// rules-1: the five factors, gate and bands (Oct 23, 2026).
// rules-2: category cap (Oct 24, 2026, docs/plans/m2-category-cap.md).
//          Oct 26: the cap reads code plus keyword points only (same version,
//          nothing was deployed).
export const MODEL_VERSION = "rules-2";

// Category cap: with fewer than `threshold` points from category codes and
// keywords the total is capped at `limit`, so the band is Low. A tender for
// work the company does not do must never show as a Medium fit on location,
// size, timeline and credentials alone. Buyer-type points say nothing about
// the work, so they do not count towards the threshold: a right buyer plus
// one generic keyword used to slip past it.
export const CATEGORY_CAP = { threshold: 10, limit: 49 } as const;

export function categoryMatchPoints(category: { facts: { codePoints: number; keywordPoints: number } }): number {
  return category.facts.codePoints + category.facts.keywordPoints;
}

// The whole engine in one pure call: extract facts from the text, run the
// five factors, apply the gate and the band. No database, no clock other
// than `now`.
export function scoreTender(tender: ScoringTender, profile: ScoringProfile, now: Date): ScoreResult {
  const requirements = extractRequirements(tender);

  const category = scoreCategory(tender, profile, requirements);
  const location = scoreLocation(tender, profile, requirements);
  const size = scoreSize(tender, profile);
  const timeline = scoreTimeline(tender, profile, requirements, now);
  const credentials = scoreCredentials(profile, requirements);

  const factors = {
    category: category.points,
    location: location.points,
    size: size.points,
    timeline: timeline.points,
    credentials: credentials.points,
  };
  const uncappedTotal = factors.category + factors.location + factors.size + factors.timeline + factors.credentials;
  const matchPoints = categoryMatchPoints(category);
  const cap: ScoreCap | null =
    matchPoints < CATEGORY_CAP.threshold
      ? { code: "categoryCap", threshold: CATEGORY_CAP.threshold, matchPoints, limit: CATEGORY_CAP.limit, uncappedTotal }
      : null;
  // The factors stay as computed; only the total is capped.
  const total = cap ? Math.min(uncappedTotal, cap.limit) : uncappedTotal;
  const gate = checkGate(tender, profile, requirements);

  return {
    total,
    // An ineligible tender keeps its points for the detail page but is
    // always a Low fit: the user cannot win it as things stand.
    band: gate.eligible ? bandForTotal(total) : "LOW",
    eligible: gate.eligible,
    factors,
    cap,
    gate,
    requirements,
    details: { category, location, size, timeline, credentials },
  };
}
