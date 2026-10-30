import { describe, expect, it } from "vitest";
import type { Profile } from "@/lib/profile";
import { createQuestionnaireStore, newerProfile } from "./store";

const base: Profile = {
  id: "p1",
  name: "Sample",
  website: null,
  headOfficeProvince: null,
  capacity: null,
  categories: [],
  buyerTypes: [],
  description: null,
  languages: "EN",
  regions: [],
  sizeMin: null,
  sizeMax: null,
  timelinePref: null,
  certifications: [],
  bonding: false,
  securityClearance: null,
  indigenousBusiness: false,
  questionnaireStep: 1,
  updatedAt: "2026-10-28T12:00:00.000Z",
};

describe("questionnaire store", () => {
  it("keeps the newer of the server copy and the last save", () => {
    const older = { ...base, name: "Old", updatedAt: "2026-10-28T11:00:00.000Z" };
    const newer = { ...base, name: "New", updatedAt: "2026-10-28T12:30:00.000Z" };
    expect(newerProfile(null, older)).toBe(older);
    expect(newerProfile(older, null)).toBe(older);
    expect(newerProfile(older, newer)).toBe(newer);
    expect(newerProfile(newer, older)).toBe(newer);
    expect(newerProfile(base, { ...base })).not.toBe(base);
  });

  it("hydrates without clobbering a later save and setProfile always replaces", () => {
    const store = createQuestionnaireStore();
    const saved = { ...base, name: "Saved", updatedAt: "2026-10-28T12:30:00.000Z" };
    store.getState().setProfile(saved);
    store.getState().hydrate(base);
    expect(store.getState().profile?.name).toBe("Saved");

    const reverted = { ...base, name: "Server", updatedAt: "2026-10-28T13:00:00.000Z" };
    store.getState().hydrate(reverted);
    expect(store.getState().profile?.name).toBe("Server");
  });
});
