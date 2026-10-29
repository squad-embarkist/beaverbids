import { z } from "zod";
import { REASON_CODES, type ReasonSet } from "./reasons";
import { FACTOR_KEYS, type FactorPoints } from "./types";

// The JSON columns on the score table, read back with a check so a row
// written by an older or broken version renders nothing rather than
// crashing a page.

export const factorPointsSchema = z.object(
  Object.fromEntries(FACTOR_KEYS.map((key) => [key, z.number().int().min(0)])) as Record<(typeof FACTOR_KEYS)[number], z.ZodNumber>,
);

const reasonSchema = z.object({
  code: z.enum(REASON_CODES),
  params: z.record(z.string(), z.union([z.string(), z.number(), z.array(z.string())])),
  text: z.string(),
});

export const reasonSetSchema = z.object({
  inFavour: z.array(reasonSchema),
  gaps: z.array(reasonSchema),
  ruleOut: z.array(reasonSchema),
  summary: z.array(reasonSchema),
});

export function parseFactors(value: unknown): FactorPoints | null {
  const parsed = factorPointsSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseReasons(value: unknown): ReasonSet | null {
  const parsed = reasonSetSchema.safeParse(value);
  return parsed.success ? (parsed.data as ReasonSet) : null;
}
