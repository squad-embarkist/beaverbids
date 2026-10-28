import type { BuyerTypeCode, CategoryCode, RegionCode, TeamSizeBand } from "@/lib/schemas/vocab";
import type { CertificationCode } from "./requirements";

// English labels for the fallback text of the fixed reason templates. The
// stored params carry the codes, never these labels: the UI labels a code
// in the viewer's language through next-intl (M3), so these tables are the
// English fallback and the list the French messages must cover.

export const CATEGORY_LABELS: Record<CategoryCode, string> = {
  "it-managed-services-cloud": "IT managed services and cloud",
  "cybersecurity-data-protection": "Cybersecurity and data protection",
  "custom-software-saas": "Custom software and SaaS",
  "healthcare-it-ehr": "Healthcare IT and EHR",
  "commercial-construction": "Commercial construction",
  "civil-engineering-infrastructure": "Civil engineering and infrastructure",
  "medical-equipment-pharma": "Medical equipment and pharma",
  "facilities-janitorial": "Facilities and janitorial",
  "logistics-freight-3pl": "Logistics, freight and 3PL",
  "management-consulting": "Management consulting",
};

export const BUYER_TYPE_LABELS: Record<BuyerTypeCode, string> = {
  municipal: "Municipal",
  provincial: "Provincial",
  federal: "Federal",
  "health-authority": "Health authority",
  education: "Education",
  "crown-utility": "Crown corporation and utility",
  transit: "Transit",
  "defence-public-safety": "Defence and public safety",
  "indigenous-government": "Indigenous government",
};

export const REGION_LABELS: Record<RegionCode, string> = {
  CA: "all of Canada",
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland and Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

export const TEAM_SIZE_LABELS: Record<TeamSizeBand, string> = {
  "1-5": "1 to 5",
  "6-10": "6 to 10",
  "11-25": "11 to 25",
  "26-50": "26 to 50",
  "51-200": "51 to 200",
  "200+": "more than 200",
};

export const CERTIFICATION_LABELS: Record<CertificationCode, string> = {
  "SOC 2": "SOC 2",
  "ISO 27001": "ISO 27001",
  "ISO 9001": "ISO 9001",
  "P.Eng.": "a professional engineering licence",
  "Health Canada licence": "a Health Canada licence",
};

// Certification codes carry dots and spaces ("P.Eng.", "SOC 2"), which
// next-intl cannot use as message keys, so the messages are keyed by these.
export const CERTIFICATION_MESSAGE_KEYS: Record<CertificationCode, "soc2" | "iso27001" | "iso9001" | "pEng" | "healthCanadaLicence"> = {
  "SOC 2": "soc2",
  "ISO 27001": "iso27001",
  "ISO 9001": "iso9001",
  "P.Eng.": "pEng",
  "Health Canada licence": "healthCanadaLicence",
};

export function labelFor<K extends string>(table: Record<K, string>, code: string): string {
  return (table as Record<string, string>)[code] ?? code;
}
