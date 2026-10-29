import type { Requirements } from "./requirements";
import type { ScoringProfile, ScoringTender } from "./types";

// Builders for the table-driven factor tests. Defaults are a plain Ontario
// IT tender and profile that score full points, so each row only states
// what it changes.

export const NOW = new Date("2026-10-23T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysFromNow(days: number): Date {
  return new Date(NOW.getTime() + days * DAY_MS);
}

export function tender(overrides: Partial<ScoringTender> = {}): ScoringTender {
  return {
    title: "Managed IT services",
    description: "Help desk, network and cloud support for a municipality.",
    buyerType: "municipal",
    categoryCodes: ["it-managed-services-cloud"],
    regions: ["ON"],
    valueMin: 500_000,
    valueMax: 800_000,
    closesAt: daysFromNow(30),
    language: "EN",
    ...overrides,
  };
}

export function profile(overrides: Partial<ScoringProfile> = {}): ScoringProfile {
  return {
    headOfficeProvince: "ON",
    capacity: "11-25",
    categories: ["it-managed-services-cloud"],
    buyerTypes: ["municipal"],
    description: "Managed IT for public sector teams.",
    languages: "EN",
    regions: ["ON"],
    sizeMin: 100_000,
    sizeMax: 2_000_000,
    timelinePref: 10,
    certifications: [],
    bonding: false,
    ...overrides,
  };
}

export function requirements(overrides: Partial<Requirements> = {}): Requirements {
  return {
    certifications: [],
    bondRequired: false,
    clearanceRequired: false,
    residencyCanada: false,
    setAside: null,
    afterHours: false,
    referencesRequired: false,
    bilingualRequired: false,
    keywordHits: {},
    ...overrides,
  };
}
