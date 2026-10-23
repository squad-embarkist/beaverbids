import { z } from "zod";
import {
  buyerTypeCode,
  categoryCode,
  languageCode,
  provinceCode,
  regionCode,
  teamSizeBand,
} from "./vocab";

// The questionnaire answers, one schema per step plus the whole profile.
// Shared by the forms (M3), PUT /api/profile and the seed. Error messages are
// translation keys. Money is whole CAD dollars.

export const MAX_VALUE_CAD = 1_000_000_000;
const money = z.number({ error: "amountInvalid" }).int().min(0, { error: "amountInvalid" }).max(MAX_VALUE_CAD, { error: "amountTooLarge" });

// Step 1: company basics
const basicsShape = {
  name: z.string({ error: "nameRequired" }).trim().min(1, { error: "nameRequired" }).max(200, { error: "nameTooLong" }),
  website: z.url({ error: "websiteInvalid" }).nullish(),
  headOfficeProvince: provinceCode.nullish(),
  capacity: teamSizeBand.nullish(),
};

// Step 2: what you do
const workShape = {
  categories: z.array(categoryCode).min(1, { error: "categoriesRequired" }).max(10),
  buyerTypes: z.array(buyerTypeCode).max(9).default([]),
  description: z.string().trim().max(2000, { error: "descriptionTooLong" }).nullish(),
  languages: languageCode.default("EN"),
};

// Step 3: where you work
const regionsShape = {
  regions: z.array(regionCode).min(1, { error: "regionsRequired" }).max(14),
};

// Step 4: size of work
const sizeShape = {
  sizeMin: money.nullish(),
  sizeMax: money.nullish(),
  timelinePref: z.number().int().min(0).max(365, { error: "timelineTooLong" }).nullish(),
};

const sizeRule = {
  check: (v: { sizeMin?: number | null; sizeMax?: number | null }) =>
    v.sizeMin == null || v.sizeMax == null || v.sizeMin <= v.sizeMax,
  options: { error: "sizeRangeInvalid", path: ["sizeMax"] },
};

// Step 5: credentials
const credentialsShape = {
  certifications: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  bonding: z.boolean().default(false),
};

export const profileBasicsSchema = z.object(basicsShape);
export const profileWorkSchema = z.object(workShape);
export const profileRegionsSchema = z.object(regionsShape);
export const profileSizeSchema = z.object(sizeShape).refine(sizeRule.check, sizeRule.options);
export const profileCredentialsSchema = z.object(credentialsShape);

export const companyProfileSchema = z
  .object({ ...basicsShape, ...workShape, ...regionsShape, ...sizeShape, ...credentialsShape })
  .refine(sizeRule.check, sizeRule.options);

export type CompanyProfileInput = z.infer<typeof companyProfileSchema>;
export type ProfileBasicsInput = z.infer<typeof profileBasicsSchema>;
export type ProfileWorkInput = z.infer<typeof profileWorkSchema>;
export type ProfileRegionsInput = z.infer<typeof profileRegionsSchema>;
export type ProfileSizeInput = z.infer<typeof profileSizeSchema>;
export type ProfileCredentialsInput = z.infer<typeof profileCredentialsSchema>;

export const QUESTIONNAIRE_STEPS = [
  "basics",
  "work",
  "regions",
  "size",
  "credentials",
] as const;
export type QuestionnaireStep = (typeof QUESTIONNAIRE_STEPS)[number];
