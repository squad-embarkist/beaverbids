// `npm run ingest:check -- <file.csv>`: the M4 acceptance check from
// docs/plans/m2-category-cap.md, offline. Parses a CanadaBuys open tender
// notices file with the adapter, scores every listable notice (open, a bid
// or untyped) for the sample IT profile, and prints: the counts, the High
// notices, every notice with a UNSPSC code in segment 43 or 81 that the cap
// holds at Low, a sample of the other capped notices with their codes, and
// a verdict. The check passes when no 43 or 81 notice that reads as managed
// IT, cybersecurity or custom software is capped. The tool measures "reads
// as" by a keyword hit from the profile's categories in the notice title
// (a single generic word such as "development" or "security" in a long
// engineering description is not a read), and prints every capped 43 or 81
// notice with any hit so the human read can overrule it. Scoring weights are
// never touched here.
import "dotenv/config";
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import { extractRequirements } from "@/lib/scoring/requirements";
import { CATEGORY_CAP, categoryMatchPoints, scoreTender } from "@/lib/scoring/score";
import { SAMPLE_PROFILE } from "@/lib/seed/sample-profile";
import { LISTED_NOTICE_KINDS } from "@/lib/schemas/vocab";
import { COLUMNS } from "../jobs/ingest/sources/canadabuys/columns";
import { parseCanadaBuys } from "../jobs/ingest/sources/canadabuys/parse";
import { splitStarred } from "../jobs/ingest/sources/canadabuys/text";

const SAMPLE_SIZE = 30;

function main() {
  const file = process.argv[2];
  if (!file) throw new Error("Usage: npm run ingest:check -- <open tender notices csv>");
  const body = readFileSync(file);
  const now = new Date();
  const { tenders, skipped, unmapped, rowsFound } = parseCanadaBuys(body, { now, rawFileKey: "check", existing: new Map() });

  // The raw codes per reference number, for the printed lists.
  const raw = parse(body, { columns: true, bom: true }) as Record<string, string>[];
  const rawCodes = new Map(raw.map((r) => [r[COLUMNS.referenceNumber].trim(), { unspsc: splitStarred(r[COLUMNS.unspsc]), gsin: splitStarred(r[COLUMNS.gsin]) }]));

  const listed = tenders.filter((t) => t.closesAt > now && (LISTED_NOTICE_KINDS as readonly string[]).includes(t.noticeKind));
  const scored = listed.map((t) => {
    const requirements = extractRequirements(t);
    const result = scoreTender(t, SAMPLE_PROFILE, now, requirements);
    const codes = rawCodes.get(t.externalId) ?? { unspsc: [], gsin: [] };
    const profileHits = [...new Set(SAMPLE_PROFILE.categories.flatMap((c) => requirements.keywordHits[c] ?? []))];
    const title = t.title.toLowerCase();
    const titleHits = profileHits.filter((hit) => new RegExp(`\\b${hit.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(title));
    return { t, result, codes, profileHits, titleHits, matchPoints: categoryMatchPoints(result.details.category) };
  });

  const high = scored.filter((s) => s.result.eligible && s.result.band === "HIGH").sort((a, b) => b.result.total - a.result.total);
  const medium = scored.filter((s) => s.result.eligible && s.result.band === "MEDIUM");
  const capped = scored.filter((s) => s.result.cap != null);
  const gated = scored.filter((s) => !s.result.eligible);
  const it = scored.filter((s) => s.codes.unspsc.some((c) => /^(43|81)/.test(c)));
  const itCapped = it.filter((s) => s.result.cap != null);
  const suspects = itCapped.filter((s) => s.titleHits.length > 0);
  const toRead = itCapped.filter((s) => s.profileHits.length > 0 && s.titleHits.length === 0);

  const line = (s: (typeof scored)[number]) =>
    `${String(s.result.total).padStart(3)} ${s.result.band.padEnd(6)} ${s.t.externalId.padEnd(28)} ${s.t.title.slice(0, 70).padEnd(70)} codes=${[...s.codes.unspsc, ...s.codes.gsin].join(",") || "-"} -> ${s.t.categoryCodes.join(",") || "-"}`;

  console.log(`# CanadaBuys acceptance check, ${now.toISOString()}, ${file}`);
  console.log(`rows ${rowsFound}, parsed ${tenders.length}, skipped ${skipped.length}, listable ${listed.length}`);
  console.log(`high ${high.length}, medium ${medium.length}, capped ${capped.length}, gated ${gated.length}, with a 43 or 81 code ${it.length} (capped ${itCapped.length})`);
  console.log(`unmapped regions: ${JSON.stringify(Object.entries(unmapped.regions))}`);
  console.log(`unmapped buyers: ${JSON.stringify(Object.entries(unmapped.buyers))}`);
  console.log(`unmapped notice types: ${JSON.stringify(Object.entries(unmapped.noticeTypes))}`);
  console.log(`unmapped codes: ${Object.keys(unmapped.categories).length} distinct`);

  console.log(`\n## High notices (${high.length})`);
  for (const s of high) console.log(line(s));

  console.log(`\n## Notices with a 43 or 81 UNSPSC code held at Low by the cap (${itCapped.length}), with their keyword hits in the profile's categories`);
  for (const s of itCapped) {
    console.log(line(s));
    console.log(`    match points ${s.matchPoints} of ${CATEGORY_CAP.threshold} needed; hits: ${s.profileHits.join(", ") || "none"}`);
    console.log(`    ${s.t.description.replace(/\s+/g, " ").slice(0, 240)}`);
  }

  const rest = capped.filter((s) => !itCapped.includes(s));
  const step = Math.max(1, Math.floor(rest.length / SAMPLE_SIZE));
  const sample = rest.filter((_, i) => i % step === 0).slice(0, SAMPLE_SIZE);
  console.log(`\n## ${sample.length} of the other ${rest.length} capped notices (every ${step}th by file order)`);
  for (const s of sample) console.log(line(s));

  console.log(`\n## Verdict`);
  if (suspects.length === 0) {
    console.log(`PASS: no capped 43 or 81 notice has a managed IT, cybersecurity or custom software keyword in its title.`);
  } else {
    console.log(`REVIEW: ${suspects.length} capped 43 or 81 notice(s) have a profile keyword in the title; the check fails if any reads as the profile's work:`);
    for (const s of suspects) console.log(`  ${s.t.externalId} ${s.t.title.slice(0, 60)} title hits: ${s.titleHits.join(", ")}`);
  }
  console.log(`${toRead.length} capped 43 or 81 notice(s) have a profile keyword in the description only; read them above:`);
  for (const s of toRead) console.log(`  ${s.t.externalId} ${s.t.title.slice(0, 60)} hits: ${s.profileHits.join(", ")}`);
}

main();
