import type { BuyerTypeCode } from "@/lib/schemas/vocab";
import { lookupKey } from "./text";

// Contracting entity name to buyer type (plan decision 5). Every entity in
// the file is a federal body, so the default is federal and never null; the
// table names the Defence and public safety bodies, the Crown corporations
// and the one territorial government. A name that matches no rule is still
// federal, and is counted as unmapped so a new non-federal entity shows up
// on the run summary.

type Rule = { type: BuyerTypeCode; match: RegExp };

const RULES: Rule[] = [
  // Defence and public safety
  { type: "defence-public-safety", match: /national defence|\(dnd\)|defence construction|construction de defense|royal canadian mounted|\(rcmp\)|correctional service|public safety and emergency|defence research and development|\(drdc\)|parliamentary protective|canadian armed forces|canadian coast guard/ },
  // Crown corporations
  { type: "crown-utility", match: /canada post|business development bank|export development canada|via rail|mortgage and housing|farm credit|bank of canada|marine atlantic|canada lands company|deposit insurance|destination canada|national capital commission|canada council for the arts|standards council of canada|atomic energy of canada|canadian broadcasting|royal canadian mint|canadian commercial corporation/ },
  // Territorial government (the only non-federal body in today's file)
  { type: "provincial", match: /government of the northwest territories|\(gnwt\)|government of yukon|government of nunavut/ },
  // Federal departments, agencies, offices, boards and the like
  { type: "federal", match: /department of|agency|canada\b|canadian|commission|office of|board|council|service|secretariat|tribunal|house of commons|senate|minister of|statistics canada|revenue|library and archives|elections|parks|court/ },
];

export function buyerTypeFor(entityName: string): { type: BuyerTypeCode; known: boolean } {
  const key = lookupKey(entityName);
  for (const rule of RULES) {
    if (rule.match.test(key)) return { type: rule.type, known: true };
  }
  return { type: "federal", known: false };
}
