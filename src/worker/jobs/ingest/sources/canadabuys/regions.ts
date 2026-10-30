import type { ProvinceCode, RegionCode } from "@/lib/schemas/vocab";
import { lookupKey } from "./text";

// Region values in the file to province codes. Values are English province
// and territory names, French names, two-letter codes, the National Capital
// Region, cities, "Canada", "World" and a few foreign places. One value can
// map to several provinces (the NCR straddles Ontario and Quebec); any value
// that means all of Canada, or that we do not know, maps to CA: a notice
// delivered abroad is still open to Canadian suppliers, and an unknown
// region must never gate a notice for everyone. Unknown values are counted
// so the table can grow.

const CA: RegionCode[] = ["CA"];

const PROVINCES: Record<string, ProvinceCode> = {
  // English and French names, codes and the variants seen in the file
  alberta: "AB", ab: "AB", alta: "AB",
  "british columbia": "BC", "colombie-britannique": "BC", bc: "BC", "b.c.": "BC", pacific: "BC",
  manitoba: "MB", mb: "MB", man: "MB",
  "new brunswick": "NB", "nouveau-brunswick": "NB", nb: "NB",
  "newfoundland and labrador": "NL", "terre-neuve-et-labrador": "NL", newfoundland: "NL", nl: "NL", nfld: "NL",
  "nova scotia": "NS", "nouvelle-ecosse": "NS", ns: "NS",
  "northwest territories": "NT", "territoires du nord-ouest": "NT", nt: "NT", nwt: "NT",
  nunavut: "NU", "nunavut territory": "NU", nu: "NU",
  ontario: "ON", on: "ON", ont: "ON", ontarion: "ON",
  "prince edward island": "PE", "ile-du-prince-edouard": "PE", pe: "PE", pei: "PE", "p.e.i.": "PE",
  quebec: "QC", qc: "QC", que: "QC", pq: "QC",
  saskatchewan: "SK", sk: "SK", sask: "SK",
  yukon: "YT", "yukon territory": "YT", yt: "YT",
  // Cities named in today's file, by province
  ottawa: "ON", kingston: "ON", petawawa: "ON", toronto: "ON", belleville: "ON", mississauga: "ON", barrie: "ON", "deep river": "ON",
  gravenhurst: "ON", hamilton: "ON", "laurentian hills": "ON", "north bay": "ON", "owen sound": "ON", peterborough: "ON", pickering: "ON",
  prescott: "ON", "quinte west": "ON", timmins: "ON", trenton: "ON", london: "ON", windsor: "ON", borden: "ON", "cfb borden": "ON",
  montreal: "QC", "montreal-est": "QC", "montreal-ouest": "QC", gatineau: "QC", "saint-hyacinthe": "QC", drummondville: "QC", boucherville: "QC",
  dorval: "QC", longueuil: "QC", matane: "QC", saguenay: "QC", "sept-iles": "QC", sherbrooke: "QC", "quebec city": "QC", valcartier: "QC", bagotville: "QC",
  "les iles-de-la-madeleine": "QC", "les iles-de-la-madelein": "QC",
  edmonton: "AB", calgary: "AB", wainwright: "AB", "cold lake": "AB", beaverlodge: "AB", suffield: "AB",
  winnipeg: "MB", churchill: "MB", shilo: "MB", "cfb shilo": "MB",
  victoria: "BC", comox: "BC", esquimalt: "BC", agassiz: "BC", fraser: "BC", langley: "BC", "maple ridge": "BC", "prince rupert": "BC",
  sidney: "BC", vancouver: "BC", chilliwack: "BC", nanaimo: "BC",
  halifax: "NS", dartmouth: "NS", greenwood: "NS", shearwater: "NS", sydney: "NS",
  oromocto: "NB", moncton: "NB", gagetown: "NB", fredericton: "NB", "saint john": "NB",
  "st. john's": "NL", "st john's": "NL", "chance cove": "NL", "channel-port aux basques": "NL", "goose bay": "NL", "happy valley-goose bay": "NL",
  charlottetown: "PE", summerside: "PE",
  iqaluit: "NU", "cambridge bay": "NU", "clyde river": "NU", arviat: "NU", "cape dorset": "NU", "gjoa haven": "NU", qikiqtarjuaq: "NU", taloyoak: "NU",
  yellowknife: "NT", "fort smith": "NT", "hay river": "NT", inuvik: "NT",
  whitehorse: "YT",
  dundurn: "SK", "swift current": "SK", "prince albert": "SK", regina: "SK", saskatoon: "SK", "moose jaw": "SK",
};

// Values that mean the whole country, or give no location.
const NATIONAL = new Set(["canada", "world", "unspecified", "foreign", "north america", "remote offsite", "indigenous lands", "aboriginal lands", "national", "all"]);

export function regionCodesFor(value: string): { codes: RegionCode[]; known: boolean } {
  const key = lookupKey(value)
    .replace(/\s*\((?:except|sauf) ncr\)\s*$/i, "")
    .replace(/^national capital region \(ncr\)$|^national capital region$|^ncr$|^region de la capitale nationale(?: \(rcn\))?$/, "ncr")
    .trim();
  if (!key) return { codes: [], known: true };
  if (key === "ncr") return { codes: ["ON", "QC"], known: true };
  if (NATIONAL.has(key)) return { codes: CA, known: true };
  const province = PROVINCES[key];
  if (province) return { codes: [province], known: true };
  return { codes: CA, known: false };
}

// The regions of a notice: delivery regions first, then the regions of
// opportunity, then all of Canada. Any CA collapses the list to ["CA"], and
// the tender schema deduplicates the rest.
export function tenderRegions(delivery: string[], opportunity: string[]): { regions: RegionCode[]; unmapped: string[] } {
  const values = delivery.length ? delivery : opportunity;
  if (values.length === 0) return { regions: CA, unmapped: [] };
  const regions: RegionCode[] = [];
  const unmapped: string[] = [];
  for (const value of values) {
    const { codes, known } = regionCodesFor(value);
    if (!known) unmapped.push(value.trim());
    regions.push(...codes);
  }
  if (regions.length === 0 || regions.includes("CA")) return { regions: CA, unmapped };
  return { regions: [...new Set(regions)], unmapped };
}
