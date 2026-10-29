import { z } from "zod";
import {
  profileBasicsSchema,
  profileCredentialsSchema,
  profileRegionsSchema,
  profileSizeSchema,
  profileWorkSchema,
} from "@/lib/schemas/company-profile";
import type { Profile } from "@/lib/profile";
import { PROVINCE_CODES } from "@/lib/schemas/vocab";
import { CERTIFICATION_MESSAGE_KEYS } from "@/lib/scoring/labels";
import type { CertificationCode } from "@/lib/scoring/requirements";

// What each step form holds, and how it becomes the step's answers. Native
// inputs give strings, "" for an empty field and null for an unchecked
// radio group, so each form schema normalizes its raw values and then runs
// the shared step schema from src/lib/schemas on the result. The resolver
// therefore validates with the same rules as PUT /api/profile and hands the
// submit handler the parsed answers.

export type BasicsFormValues = { name: string; website: string; headOfficeProvince: string; capacity: string | null };
export type WorkFormValues = { categories: string[]; buyerTypes: string[]; description: string; languages: string | null };
export type RegionsFormValues = { regions: string[] };
export type SizeFormValues = { sizeMin: string; sizeMax: string; timelinePref: string };
export type CredentialsFormValues = {
  knownCertifications: string[];
  otherCertifications: string;
  bonding: boolean;
  securityClearance: string | null;
  indigenousBusiness: boolean;
};

const emptyToNull = (value: string | null | undefined) => (value == null || value.trim() === "" ? null : value.trim());

// "250,000" and "250 000" both read as 250000; anything else stays a string
// so the money rule reports amountInvalid.
function toAmount(value: string): number | string | null {
  const text = value.trim();
  if (text === "") return null;
  const digits = text.replace(/[,\s$]/g, "");
  return /^\d+$/.test(digits) ? Number(digits) : text;
}

// The raw shapes only type the form values; the normalized object is cast
// to the step schema's input and the step schema does the checking.
const text = z.string();
const choice = z.string().nullable();
const codes = z.array(z.string());

export const basicsFormSchema = z
  .object({ name: text, website: text, headOfficeProvince: text, capacity: choice } satisfies Record<keyof BasicsFormValues, z.ZodType>)
  .transform(
    (v) =>
      ({
        name: v.name,
        website: emptyToNull(v.website),
        headOfficeProvince: emptyToNull(v.headOfficeProvince),
        capacity: emptyToNull(v.capacity),
      }) as z.input<typeof profileBasicsSchema>,
  )
  .pipe(profileBasicsSchema);

export const workFormSchema = z
  .object({ categories: codes, buyerTypes: codes, description: text, languages: choice } satisfies Record<keyof WorkFormValues, z.ZodType>)
  .transform(
    (v) =>
      ({
        categories: v.categories,
        buyerTypes: v.buyerTypes,
        description: emptyToNull(v.description),
        languages: v.languages ?? "EN",
      }) as z.input<typeof profileWorkSchema>,
  )
  .pipe(profileWorkSchema);

// "All of Canada" and the full set of provinces mean the same thing, so
// either one is stored as the single code CA.
export function normalizeRegions(regions: string[]): string[] {
  const provinces = regions.filter((r) => r !== "CA");
  if (regions.includes("CA") || PROVINCE_CODES.every((p) => provinces.includes(p))) return ["CA"];
  return provinces;
}

export const regionsFormSchema = z
  .object({ regions: codes } satisfies Record<keyof RegionsFormValues, z.ZodType>)
  .transform((v) => ({ regions: normalizeRegions(v.regions) }) as z.input<typeof profileRegionsSchema>)
  .pipe(profileRegionsSchema);

export const sizeFormSchema = z
  .object({ sizeMin: text, sizeMax: text, timelinePref: text } satisfies Record<keyof SizeFormValues, z.ZodType>)
  .transform(
    (v) =>
      ({
        sizeMin: toAmount(v.sizeMin),
        sizeMax: toAmount(v.sizeMax),
        timelinePref: toAmount(v.timelinePref),
      }) as z.input<typeof profileSizeSchema>,
  )
  .pipe(profileSizeSchema);

// The five certifications the extractor recognises are checkboxes whose
// values are the codes it emits, so a ticked box scores. Anything else
// goes in the free-text lines.
export const KNOWN_CERTIFICATIONS = (Object.keys(CERTIFICATION_MESSAGE_KEYS) as CertificationCode[]).map((code) => ({
  code,
  key: CERTIFICATION_MESSAGE_KEYS[code],
}));

const KNOWN_CODES: readonly string[] = KNOWN_CERTIFICATIONS.map((c) => c.code);

export const credentialsFormSchema = z
  .object({
    knownCertifications: codes,
    otherCertifications: text,
    bonding: z.boolean(),
    securityClearance: choice,
    indigenousBusiness: z.boolean(),
  } satisfies Record<keyof CredentialsFormValues, z.ZodType>)
  .transform((v) => {
    const clearance = emptyToNull(v.securityClearance);
    return {
      certifications: [
        ...v.knownCertifications,
        ...v.otherCertifications
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line.length > 0),
      ],
      bonding: v.bonding,
      securityClearance: clearance === "none" ? null : clearance,
      indigenousBusiness: v.indigenousBusiness,
    } as z.input<typeof profileCredentialsSchema>;
  })
  .pipe(profileCredentialsSchema);

// Default form values from the saved profile, or blanks for a new one.
export function basicsDefaults(profile: Profile | null): BasicsFormValues {
  return {
    name: profile?.name ?? "",
    website: profile?.website ?? "",
    headOfficeProvince: profile?.headOfficeProvince ?? "",
    capacity: profile?.capacity ?? null,
  };
}

export function workDefaults(profile: Profile | null): WorkFormValues {
  return {
    categories: profile?.categories ?? [],
    buyerTypes: profile?.buyerTypes ?? [],
    description: profile?.description ?? "",
    languages: profile?.languages ?? "EN",
  };
}

// A profile that works everywhere shows every box ticked.
export function regionsDefaults(profile: Profile | null): RegionsFormValues {
  const regions = profile?.regions ?? [];
  return { regions: regions.includes("CA") ? ["CA", ...PROVINCE_CODES] : regions };
}

export function sizeDefaults(profile: Profile | null): SizeFormValues {
  return {
    sizeMin: profile?.sizeMin == null ? "" : String(profile.sizeMin),
    sizeMax: profile?.sizeMax == null ? "" : String(profile.sizeMax),
    timelinePref: profile?.timelinePref == null ? "" : String(profile.timelinePref),
  };
}

export function credentialsDefaults(profile: Profile | null): CredentialsFormValues {
  const certifications = profile?.certifications ?? [];
  return {
    knownCertifications: certifications.filter((c) => KNOWN_CODES.includes(c)),
    otherCertifications: certifications.filter((c) => !KNOWN_CODES.includes(c)).join("\n"),
    bonding: profile?.bonding ?? false,
    securityClearance: profile?.securityClearance ?? "none",
    indigenousBusiness: profile?.indigenousBusiness ?? false,
  };
}
