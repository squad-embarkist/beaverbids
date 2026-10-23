import type { CategoryCode } from "@/lib/schemas/vocab";

// Five plain phrases per category. The category factor counts how many of
// the matched category's phrases appear in the tender text, so a tender
// about "help desk, network and cloud" scores higher inside the managed IT
// category than one that only names the category code. Matching is case
// insensitive on normalized text (see requirements.ts), and each phrase may
// list spellings separated by "|".

export const CATEGORY_KEYWORDS: Record<CategoryCode, readonly string[]> = {
  "it-managed-services-cloud": ["managed services|managed hosting|managed service", "help desk|service desk", "cloud", "network", "data centre|data center"],
  "cybersecurity-data-protection": ["security", "penetration testing|penetration test", "privacy", "incident response|threat", "identity and access|access management"],
  "custom-software-saas": ["software", "application|portal|platform", "saas|hosted service", "development|build", "integration|api"],
  "healthcare-it-ehr": ["electronic health record|electronic records|ehr", "clinical", "patient", "clinic|hospital|care home", "health information|pharmacy information"],
  "commercial-construction": ["construction", "renovation|addition|fit up", "roof|building", "site visit|prequalified", "mechanical|electrical"],
  "civil-engineering-infrastructure": ["engineering", "design", "bridge|highway|road|rail", "water|stormwater", "rehabilitation|resurfacing|safety improvements"],
  "medical-equipment-pharma": ["equipment", "pharmaceutical|pharmacy|vaccine", "supply", "installation|service", "imaging|monitoring|dental"],
  "facilities-janitorial": ["janitorial|cleaning|entretien", "facilities management|facilities|installations", "maintenance", "snow removal|grounds", "environmental services|waste"],
  "logistics-freight-3pl": ["freight|courier|distribution", "warehousing|warehouse", "delivery|relocation", "logistics|fleet", "cold chain|hazardous|sealift"],
  "management-consulting": ["review|roadmap|strategy", "advisory|consulting", "evaluation|assessment", "engagement|change management", "recommendations|governance"],
};
