import { beforeEach, describe, expect, it, vi } from "vitest";

const { getBoss, captureException } = vi.hoisted(() => ({
  getBoss: vi.fn(),
  captureException: vi.fn(),
}));
vi.mock("@/lib/boss", () => ({ getBoss }));
vi.mock("@sentry/nextjs", () => ({ captureException }));

import { ProfileMissingError, requestRescore, saveProfileStep } from "./profile";

const row = {
  id: "profile-1",
  name: "Sample",
  website: null,
  headOfficeProvince: "ON",
  capacity: null,
  categories: ["it-managed-services-cloud"],
  buyerTypes: [],
  description: null,
  languages: "EN" as const,
  regions: ["ON"],
  sizeMin: null,
  sizeMax: null,
  timelinePref: null,
  certifications: [],
  bonding: false,
  securityClearance: null,
  indigenousBusiness: false,
  questionnaireStep: 1,
  updatedAt: new Date("2026-10-28T12:00:00Z"),
};

function fakeDb(existing: { id: string; questionnaireStep: number } | null) {
  return {
    companyProfile: {
      findUnique: vi.fn(async () => existing),
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...row, ...data })),
      update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => ({ ...row, ...data })),
    },
  };
}

type Db = Parameters<typeof saveProfileStep>[0];

describe("saveProfileStep", () => {
  it("creates the profile on the basics step and records step 1", async () => {
    const db = fakeDb(null);
    const profile = await saveProfileStep(db as unknown as Db, "user-1", {
      step: "basics",
      answers: { name: "Sample", website: null, headOfficeProvince: "ON", capacity: null },
    });

    expect(db.companyProfile.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", name: "Sample", questionnaireStep: 1 }) }),
    );
    expect(profile.updatedAt).toBe("2026-10-28T12:00:00.000Z");
  });

  it("refuses a later step before basics exists", async () => {
    const db = fakeDb(null);
    await expect(
      saveProfileStep(db as unknown as Db, "user-1", { step: "regions", answers: { regions: ["ON"] } }),
    ).rejects.toBeInstanceOf(ProfileMissingError);
    expect(db.companyProfile.create).not.toHaveBeenCalled();
  });

  it("advances the step counter but never lowers it", async () => {
    const db = fakeDb({ id: "profile-1", questionnaireStep: 1 });
    await saveProfileStep(db as unknown as Db, "user-1", { step: "regions", answers: { regions: ["ON"] } });
    expect(db.companyProfile.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ where: { id: "profile-1" }, data: { regions: ["ON"], questionnaireStep: 3 } }),
    );

    const done = fakeDb({ id: "profile-1", questionnaireStep: 5 });
    await saveProfileStep(done as unknown as Db, "user-1", {
      step: "basics",
      answers: { name: "Renamed", website: null, headOfficeProvince: null, capacity: null },
    });
    expect(done.companyProfile.update).toHaveBeenLastCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ name: "Renamed", questionnaireStep: 5 }) }),
    );
  });
});

describe("requestRescore", () => {
  beforeEach(() => {
    getBoss.mockReset();
    captureException.mockReset();
  });

  it("sends a score-profile job keyed on the profile id", async () => {
    const send = vi.fn(async () => "job-1");
    getBoss.mockResolvedValue({ send });
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => {});

    await expect(requestRescore("profile-1")).resolves.toBe(true);
    expect(send).toHaveBeenCalledWith("score-profile", { profileId: "profile-1", reason: "profileUpdated" }, { singletonKey: "profile-1" });
    consoleLog.mockRestore();
  });

  it("reports a failed send and returns false instead of throwing", async () => {
    getBoss.mockRejectedValue(new Error("pg-boss is not installed"));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(requestRescore("profile-1")).resolves.toBe(false);
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), expect.objectContaining({ extra: { profileId: "profile-1" } }));
    consoleError.mockRestore();
  });
});
