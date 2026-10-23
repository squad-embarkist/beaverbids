import { bandForTotal } from "@/lib/schemas/vocab";
import { scoreCategory } from "./factors/category";
import { scoreCredentials } from "./factors/credentials";
import { scoreLocation } from "./factors/location";
import { scoreSize } from "./factors/size";
import { scoreTimeline } from "./factors/timeline";
import { checkGate } from "./gate";
import { extractRequirements } from "./requirements";
import type { ScoreResult, ScoringProfile, ScoringTender } from "./types";

// Bump when a rule changes so the worker can tell stale rows apart and a
// clean rescore can be triggered.
export const MODEL_VERSION = "rules-1";

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
  const total = factors.category + factors.location + factors.size + factors.timeline + factors.credentials;
  const gate = checkGate(tender, profile, requirements);

  return {
    total,
    // An ineligible tender keeps its points for the detail page but is
    // always a Low fit: the user cannot win it as things stand.
    band: gate.eligible ? bandForTotal(total) : "LOW",
    eligible: gate.eligible,
    factors,
    gate,
    requirements,
    details: { category, location, size, timeline, credentials },
  };
}
