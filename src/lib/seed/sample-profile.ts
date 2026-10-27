import { companyProfileSchema, type CompanyProfileInput } from "@/lib/schemas/company-profile";

// The sample company profile from the wireframes' "Scoring you against"
// panel. The scoring engine scores the sample tender (FIXTURE-0001) at 92
// for it: 38, 19, 14, 12 and 9. Kept apart from the dev account so tests can
// import it without loading Better Auth.

export const SAMPLE_PROFILE: CompanyProfileInput = companyProfileSchema.parse({
  name: "Sample Technology Partners Inc.",
  website: "https://sample-technology.example.com",
  headOfficeProvince: "ON",
  capacity: "6-10",
  categories: ["it-managed-services-cloud", "cybersecurity-data-protection", "custom-software-saas"],
  buyerTypes: ["municipal", "provincial", "health-authority", "crown-utility"],
  description:
    "Managed IT, cloud migrations and security assessments for public sector teams of 200 to 2,000 staff.",
  languages: "EN",
  regions: ["ON"],
  sizeMin: 250_000,
  sizeMax: 3_000_000,
  timelinePref: 10,
  certifications: ["SOC 2 Type II"],
  bonding: false,
});
