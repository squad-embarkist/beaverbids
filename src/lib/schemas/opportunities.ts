import { z } from "zod";
import { categoryCode, regionCode, scoreBand } from "./vocab";
import { MAX_VALUE_CAD } from "./company-profile";

// Query string for GET /api/opportunities. Parsed from URLSearchParams, so
// everything arrives as strings and is coerced here.

export const OPPORTUNITIES_DEFAULT_LIMIT = 25;
export const OPPORTUNITIES_MAX_LIMIT = 100;

const money = z.coerce.number().int().min(0).max(MAX_VALUE_CAD);

export const opportunitiesQuerySchema = z
  .object({
    limit: z.coerce
      .number()
      .int()
      .min(1)
      .max(OPPORTUNITIES_MAX_LIMIT)
      .default(OPPORTUNITIES_DEFAULT_LIMIT),
    cursor: z.string().min(1).max(500).optional(),
    sort: z.enum(["score", "closing"]).default("score"),
    band: scoreBand.optional(),
    region: regionCode.optional(),
    category: categoryCode.optional(),
    valueMin: money.optional(),
    valueMax: money.optional(),
    closesBefore: z.coerce.date().optional(),
    // "Closing within" on the list: a number of days from now, so a plain
    // GET form can set it without computing a date.
    closingWithin: z.coerce.number().int().min(1).max(365).optional(),
    q: z.string().trim().min(1).max(200).optional(),
    includeIneligible: z.stringbool().default(false),
  })
  .refine((q) => q.valueMin == null || q.valueMax == null || q.valueMin <= q.valueMax, {
    error: "valueRangeInvalid",
    path: ["valueMax"],
  });

export type OpportunitiesQuery = z.infer<typeof opportunitiesQuerySchema>;

// Turns URLSearchParams into the object the schema expects: missing and
// empty parameters are left out so defaults apply.
export function queryObjectFrom(params: URLSearchParams): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of params) {
    if (value !== "" && !(key in out)) out[key] = value;
  }
  return out;
}
