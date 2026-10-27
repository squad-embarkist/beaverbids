import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

// Test-only reader for fixtures/canadabuys-sample-20.csv, the trimmed copy
// of the real CanadaBuys open tender notices file. It exists so the
// extractor and the cap can be tested on real text before the M4 adapter
// lands. The adapter owns the real parser, the column map and the
// normalization tables; when it exists, the scoring tests switch to it and
// this file goes away. Nothing in the app or the worker imports it.

export const CANADABUYS_SAMPLE_PATH = fileURLToPath(new URL("../../../fixtures/canadabuys-sample-20.csv", import.meta.url));

// The columns this reader uses, by their original bilingual header names.
export const SAMPLE_COLUMNS = {
  title: "title-titre-eng",
  referenceNumber: "referenceNumber-numeroReference",
  amendmentNumber: "amendmentNumber-numeroModification",
  publicationDate: "publicationDate-datePublication",
  closingDate: "tenderClosingDate-appelOffresDateCloture",
  status: "tenderStatus-appelOffresStatut-eng",
  gsin: "gsin-nibs",
  unspsc: "unspsc",
  noticeType: "noticeType-avisType-eng",
  regionsOfOpportunity: "regionsOfOpportunity-regionAppelOffres-eng",
  regionsOfDelivery: "regionsOfDelivery-regionsLivraison-eng",
  entityName: "contractingEntityName-nomEntitContractante-eng",
  entityProvince: "contractingEntityAddressProvince-entiteContractanteAdresseProvince-eng",
  noticeUrl: "noticeURL-URLavis-eng",
  descriptionEn: "tenderDescription-descriptionAppelOffres-eng",
  descriptionFr: "tenderDescription-descriptionAppelOffres-fra",
} as const;

// Blanked on purpose before the file was committed; the test asserts it.
export const BLANKED_CONTACT_COLUMNS = [
  "contactInfoName-informationsContactNom",
  "contactInfoEmail-informationsContactCourriel",
  "contactInfoPhone-contactInfoTelephone",
  "contactInfoFax",
  "contactInfoAddressLine-contactInfoAdresseLigne-eng",
  "contactInfoAddressLine-contactInfoAdresseLigne-fra",
] as const;

export type CanadaBuysSampleRow = {
  row: number;
  referenceNumber: string;
  amendmentNumber: string;
  title: string;
  /** English description with tags stripped and entities decoded. */
  description: string;
  descriptionRaw: string;
  descriptionFr: string;
  noticeType: string;
  status: string;
  publicationDate: string;
  /** As written in the file, no time zone (for example 2026-11-13T14:00:00). */
  closingDate: string;
  unspsc: string[];
  gsin: string[];
  regionsOfOpportunity: string[];
  regionsOfDelivery: string[];
  entityName: string;
  entityProvince: string;
  noticeUrl: string;
  raw: Record<string, string>;
};

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  ndash: "-", mdash: "-", hellip: "...", eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ocirc: "ô", ecirc: "ê",
  icirc: "î", ucirc: "û", acirc: "â", euml: "ë", iuml: "ï", ugrave: "ù", oelig: "œ",
};

// Minimal cleaning for test purposes: block tags become line breaks, other
// tags disappear, numeric and the common named entities are decoded.
export function cleanHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>|<\/(?:p|li|div|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(Number.parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match)
    .replace(/[ \t]+/g, " ")
    .trim();
}

// Multi-value cells hold one "*value" per line.
export function splitStarred(cell: string | undefined): string[] {
  return (cell ?? "")
    .split(/\r?\n/)
    .map((v) => v.replace(/^\*/, "").trim())
    .filter(Boolean);
}

export function readCanadaBuysSample(path: string = CANADABUYS_SAMPLE_PATH): CanadaBuysSampleRow[] {
  const records = parse(readFileSync(path), { columns: true, bom: true }) as Record<string, string>[];
  return records.map((raw, index) => {
    const get = (key: keyof typeof SAMPLE_COLUMNS) => (raw[SAMPLE_COLUMNS[key]] ?? "").trim();
    return {
      row: index + 1,
      referenceNumber: get("referenceNumber"),
      amendmentNumber: get("amendmentNumber"),
      title: get("title"),
      description: cleanHtml(get("descriptionEn")),
      descriptionRaw: get("descriptionEn"),
      descriptionFr: get("descriptionFr"),
      noticeType: get("noticeType"),
      status: get("status"),
      publicationDate: get("publicationDate"),
      closingDate: get("closingDate"),
      unspsc: splitStarred(raw[SAMPLE_COLUMNS.unspsc]),
      gsin: splitStarred(raw[SAMPLE_COLUMNS.gsin]),
      regionsOfOpportunity: splitStarred(raw[SAMPLE_COLUMNS.regionsOfOpportunity]),
      regionsOfDelivery: splitStarred(raw[SAMPLE_COLUMNS.regionsOfDelivery]),
      entityName: get("entityName"),
      entityProvince: get("entityProvince"),
      noticeUrl: get("noticeUrl"),
      raw,
    };
  });
}
