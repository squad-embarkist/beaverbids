import type { CategoryCode } from "@/lib/schemas/vocab";

// UNSPSC and GSIN codes to the ten internal categories. Longest prefix wins,
// so a narrower entry can send one class elsewhere than its family (network
// security equipment under cybersecurity while the rest of network
// equipment is managed services). Descriptions beside each prefix are the
// file's own (unspscDescription-eng, gsinDescription-eng). Environmental
// services (77), scientific research (81 outside 8110, 8111, 8115, 8116) and
// health services (85) map to none of the ten on purpose; unmapped codes are
// counted on the run summary so the table can grow. First version from the
// Oct 29, 2026 file; the M4 acceptance check reviews the uncertain entries.

const UNSPSC: Record<string, CategoryCode> = {
  // 43 Information technology, broadcasting and telecommunications
  "43": "it-managed-services-cloud", // The segment itself (43000000), when a notice names nothing narrower
  "4319": "it-managed-services-cloud", // Communications devices and accessories
  "4320": "it-managed-services-cloud", // Components for IT or broadcasting or telecommunications
  "4321": "it-managed-services-cloud", // Computer equipment and accessories
  "4322": "it-managed-services-cloud", // Data voice or multimedia network equipment or platforms
  "432225": "cybersecurity-data-protection", // Network security equipment (firewalls, VPN, vulnerability assessment)
  "4323": "custom-software-saas", // Software
  "432332": "cybersecurity-data-protection", // Security and protection software
  // 8110 Professional engineering services
  "8110": "civil-engineering-infrastructure", // Civil, structural, mechanical, electrical engineering
  // 8111 Computer services
  "8111": "it-managed-services-cloud", // The family itself (81110000)
  "811115": "custom-software-saas", // Software or hardware engineering (systems integration, application programming)
  "811116": "custom-software-saas", // Computer programmers
  "811117": "custom-software-saas", // Management information systems MIS (database design, systems planning)
  "811118": "it-managed-services-cloud", // System and system component administration (LAN, WAN, help desk)
  "81111801": "cybersecurity-data-protection", // Computer or network or internet security
  "811119": "it-managed-services-cloud", // Information retrieval systems
  "811120": "it-managed-services-cloud", // Data services (data centre, disaster recovery)
  "811121": "it-managed-services-cloud", // Internet services
  "811122": "custom-software-saas", // Software maintenance and support
  "81112208": "cybersecurity-data-protection", // Security and protection software maintenance
  "811123": "it-managed-services-cloud", // Computer hardware maintenance and support
  // 8115 Earth science services
  "8115": "civil-engineering-infrastructure", // Cartography, geology, oceanography and hydrology
  // 8116 Information technology service delivery
  "8116": "it-managed-services-cloud", // The family itself (81160000)
  "811615": "cybersecurity-data-protection", // Access management services
  "811617": "it-managed-services-cloud", // Telecommunication services
  "811618": "it-managed-services-cloud", // Data communication equipment or platform rental or leasing
  "811619": "it-managed-services-cloud", // Cloud-based hardware as a service
  "811620": "custom-software-saas", // Cloud-based software as a service
  "811621": "custom-software-saas", // Cloud-based platform as a service
  "811622": "it-managed-services-cloud", // Cloud-based infrastructure as a service
  "81162203": "cybersecurity-data-protection", // Cloud firewalls as a service
  "811623": "it-managed-services-cloud", // Cloud-based business process as a service
  "81162305": "cybersecurity-data-protection", // Risk management process as a service
  // 72 Building and facility construction and maintenance services
  "72": "commercial-construction", // The segment itself (72000000)
  "7210": "facilities-janitorial", // Building and facility maintenance and repair services
  "7211": "commercial-construction", // Residential building construction services
  "7212": "commercial-construction", // Nonresidential building construction services
  "7213": "commercial-construction", // General building construction
  "7214": "civil-engineering-infrastructure", // Heavy construction services (roads, bridges, marine, land preparation)
  "7215": "commercial-construction", // Specialized trade construction and maintenance services
  // 76 Industrial cleaning services
  "76": "facilities-janitorial", // The segment itself (76000000)
  "7610": "facilities-janitorial", // Decontamination services
  "7611": "facilities-janitorial", // Cleaning and janitorial services
  "7612": "facilities-janitorial", // Refuse disposal and treatment
  "7613": "facilities-janitorial", // Toxic and hazardous waste cleanup
  // 78 Transportation and storage and mail services
  "78": "logistics-freight-3pl", // Mail and cargo transport, passenger transport, storage, transport services
  // 80 Management and business professionals and administrative services
  "8010": "management-consulting", // Management advisory services
  "8011": "management-consulting", // Human resources services
  "8016": "management-consulting", // Business administration services
  "801616": "facilities-janitorial", // Management support services (property management)
  "80161604": "it-managed-services-cloud", // Information technology IT management services
  "8411": "management-consulting", // Accounting and auditing (audit services)
  // 95 Land and buildings and structures and thoroughfares
  "9512": "commercial-construction", // Permanent buildings and structures
  "9513": "commercial-construction", // Portable buildings and structures
  "9514": "commercial-construction", // Prefabricated buildings and structures
  // 42 and 51 Medical equipment, drugs and pharmaceutical products
  "42": "medical-equipment-pharma", // Medical equipment and accessories and supplies
  "51": "medical-equipment-pharma", // Drugs and pharmaceutical products
};

const GSIN: Record<string, CategoryCode> = {
  D302: "it-managed-services-cloud", // Informatics professional and consulting services
  D304: "it-managed-services-cloud", // Data transmission service
  D399: "it-managed-services-cloud", // Telecommunications, other
  N7010: "it-managed-services-cloud", // Automatic data processing equipment, system configuration
  N7025: "it-managed-services-cloud", // ADP input and output devices, local area networks
  N7035: "it-managed-services-cloud", // ADP support equipment
  JX7025: "it-managed-services-cloud", // Local area networks, systems and components, maintenance
  N7030: "custom-software-saas", // ADP software
  "5111": "commercial-construction", // Construction of buildings
  C216: "civil-engineering-infrastructure", // Marine architect and engineering services
  E108: "facilities-janitorial", // Hazardous chemical waste disposal services
  N4235: "facilities-janitorial", // Hazardous material spill containment and clean-up
  V101: "logistics-freight-3pl", // Vessel charter
  V401: "logistics-freight-3pl", // Transportation and charters
  T004: "management-consulting", // Media monitoring services
};

function longestPrefix(table: Record<string, CategoryCode>, code: string): CategoryCode | null {
  for (let length = code.length; length > 0; length -= 1) {
    const hit = table[code.slice(0, length)];
    if (hit) return hit;
  }
  return null;
}

// Trailing zeros in a UNSPSC code mean "the whole family or class": 72000000
// is all of segment 72, 81110000 all computer services. They are matched on
// the digits that carry meaning only.
function significantUnspsc(code: string): string {
  const digits = code.replace(/\D/g, "");
  const trimmed = digits.replace(/(?:00)+$/, "");
  return trimmed.length >= 2 ? trimmed : digits.slice(0, 2);
}

export function categoriesForCodes(unspsc: readonly string[], gsin: readonly string[]): { codes: CategoryCode[]; unmapped: string[] } {
  const codes = new Set<CategoryCode>();
  const unmapped: string[] = [];
  for (const raw of unspsc) {
    const code = raw.trim();
    if (!code) continue;
    const hit = longestPrefix(UNSPSC, significantUnspsc(code));
    if (hit) codes.add(hit);
    else unmapped.push(code);
  }
  for (const raw of gsin) {
    const code = raw.trim().toUpperCase();
    if (!code) continue;
    const hit = longestPrefix(GSIN, code);
    if (hit) codes.add(hit);
    else unmapped.push(code);
  }
  return { codes: [...codes], unmapped };
}
