import { z } from "zod";
import { buyerTypeCode, categoryCode, languageCode, regionCode } from "./vocab";
import { MAX_VALUE_CAD } from "./company-profile";

// The normalized shape of a tender before it is saved. Every source adapter
// (CanadaBuys in M4, others only with written permission) must produce this,
// and the fixture seed goes through it too.

const money = z.number().int().min(0).max(MAX_VALUE_CAD);

export const tenderInputSchema = z
  .object({
    externalId: z.string().trim().min(1).max(200),
    title: z.string().trim().min(1).max(500),
    buyer: z.string().trim().min(1).max(300),
    buyerType: buyerTypeCode.nullish(),
    description: z.string().trim().min(1),
    categoryCodes: z.array(categoryCode).default([]),
    region: regionCode,
    valueMin: money.nullish(),
    valueMax: money.nullish(),
    publishedAt: z.coerce.date(),
    closesAt: z.coerce.date(),
    language: languageCode.default("EN"),
    officialUrl: z.url(),
    rawFileKey: z.string().min(1).nullish(),
  })
  .refine((t) => t.closesAt.getTime() > t.publishedAt.getTime(), {
    error: "closesBeforePublished",
    path: ["closesAt"],
  })
  .refine((t) => t.valueMin == null || t.valueMax == null || t.valueMin <= t.valueMax, {
    error: "valueRangeInvalid",
    path: ["valueMax"],
  });

export type TenderInput = z.infer<typeof tenderInputSchema>;
