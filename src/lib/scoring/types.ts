import type {
  BuyerTypeCode,
  CategoryCode,
  LanguageCode,
  ProvinceCode,
  RegionCode,
  ScoreBand,
  TeamSizeBand,
} from "@/lib/schemas/vocab";
import type { Requirements } from "./requirements";

// The shapes the rules read. They are subsets of the Prisma rows so the
// engine can score a database row, a fixture, or a hand-written test case
// without touching Prisma types.

export type ScoringProfile = {
  headOfficeProvince?: ProvinceCode | string | null;
  capacity?: TeamSizeBand | string | null;
  categories: readonly (CategoryCode | string)[];
  buyerTypes: readonly (BuyerTypeCode | string)[];
  description?: string | null;
  languages: LanguageCode;
  regions: readonly (RegionCode | string)[];
  sizeMin?: number | null;
  sizeMax?: number | null;
  timelinePref?: number | null;
  certifications: readonly string[];
  bonding: boolean;
};

export type ScoringTender = {
  title: string;
  description: string;
  buyerType?: BuyerTypeCode | string | null;
  categoryCodes: readonly (CategoryCode | string)[];
  region: RegionCode | string;
  valueMin?: number | null;
  valueMax?: number | null;
  closesAt: Date;
  language: LanguageCode;
};

export const FACTOR_KEYS = ["category", "location", "size", "timeline", "credentials"] as const;
export type FactorKey = (typeof FACTOR_KEYS)[number];

export const FACTOR_MAX: Record<FactorKey, number> = {
  category: 40,
  location: 20,
  size: 15,
  timeline: 15,
  credentials: 10,
};

// Every factor returns its points plus the facts it used, so reasons.ts can
// explain the number without recomputing anything.
export type FactorResult<TFacts extends object = Record<string, unknown>> = {
  points: number;
  max: number;
  facts: TFacts;
};

export type FactorPoints = Record<FactorKey, number>;

export type GateResult = {
  eligible: boolean;
  blockers: GateBlocker[];
};

export type GateBlocker =
  | { code: "regionMismatch"; region: string }
  | { code: "setAside"; group: string };

export type ScoreResult = {
  total: number;
  band: ScoreBand;
  eligible: boolean;
  factors: FactorPoints;
  gate: GateResult;
  requirements: Requirements;
  details: {
    category: import("./factors/category").CategoryResult;
    location: import("./factors/location").LocationResult;
    size: import("./factors/size").SizeResult;
    timeline: import("./factors/timeline").TimelineResult;
    credentials: import("./factors/credentials").CredentialsResult;
  };
};

// Points round half up at the component level, so 8 * 4/5 = 6.4 -> 6 and
// 10 * 9/10 = 9. Math.round on a negative is never needed here.
export function roundPoints(value: number): number {
  return Math.round(value);
}

export function clampPoints(value: number, max: number): number {
  return Math.min(max, Math.max(0, value));
}
