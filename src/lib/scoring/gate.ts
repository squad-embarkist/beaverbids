import type { Requirements } from "./requirements";
import { regionMatches } from "./factors/location";
import type { GateBlocker, GateResult, ScoringProfile, ScoringTender } from "./types";

// Eligibility gate: a hard requirement the company cannot meet sets
// eligible = false. The score is still saved, the list hides it by default.
// Phase 1 gates on two things only: a province outside the profile's
// regions, and a set-aside for a group (the profile has no field to claim
// one yet). A clearance or a French-only notice costs points instead.

export function checkGate(tender: ScoringTender, profile: ScoringProfile, requirements: Requirements): GateResult {
  const blockers: GateBlocker[] = [];

  if (!regionMatches(tender.regions, profile.regions)) {
    blockers.push({ code: "regionMismatch", regions: [...tender.regions] });
  }
  if (requirements.setAside) {
    blockers.push({ code: "setAside", group: requirements.setAside });
  }

  return { eligible: blockers.length === 0, blockers };
}
