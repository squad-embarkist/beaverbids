import type { Requirements } from "../requirements";
import { FACTOR_MAX, clampPoints, roundPoints, type FactorResult, type ScoringProfile, type ScoringTender } from "../types";

// Timeline and capacity, 15 points: enough time to respond and deliver.
//   timePoints      10  days until close against the profile's lead time
//   capacityPoints   5  stated team size against after-hours coverage

export const TIMELINE_SPLIT = { time: 10, capacity: 5 } as const;

const DAY_MS = 24 * 60 * 60 * 1000;

export type TimelineFacts = {
  daysLeft: number;
  leadDays: number | null;
  afterHours: boolean;
  capacity: string | null;
  timePoints: number;
  capacityPoints: number;
};

export type TimelineResult = FactorResult<TimelineFacts>;

// Whole days, rounded, so a tender seeded "closes in 9 days" still counts
// as 9 when the job runs a few minutes later. Never negative.
export function daysUntil(closesAt: Date, now: Date): number {
  return Math.max(0, roundPoints((closesAt.getTime() - now.getTime()) / DAY_MS));
}

// After-hours coverage (24/7, on-call) stretches a small team.
const AFTER_HOURS_CAPACITY: Record<string, number> = { "1-5": 2, "6-10": 3 };

export function scoreTimeline(tender: ScoringTender, profile: ScoringProfile, requirements: Requirements, now: Date): TimelineResult {
  const daysLeft = daysUntil(tender.closesAt, now);
  const leadDays = profile.timelinePref ?? null;

  const timePoints =
    leadDays == null || leadDays <= 0 || daysLeft >= leadDays
      ? TIMELINE_SPLIT.time
      : roundPoints(TIMELINE_SPLIT.time * (daysLeft / leadDays));

  const capacity = profile.capacity ?? null;
  const capacityPoints =
    requirements.afterHours && capacity != null && capacity in AFTER_HOURS_CAPACITY
      ? AFTER_HOURS_CAPACITY[capacity]
      : TIMELINE_SPLIT.capacity;

  return {
    points: clampPoints(timePoints + capacityPoints, FACTOR_MAX.timeline),
    max: FACTOR_MAX.timeline,
    facts: { daysLeft, leadDays, afterHours: requirements.afterHours, capacity, timePoints, capacityPoints },
  };
}
