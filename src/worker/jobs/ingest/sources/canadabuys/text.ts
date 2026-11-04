// Text cleaning for the CanadaBuys file. About one description in eight
// carries HTML tags or entities, and multi-value cells hold one "*value" per
// line.

const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"',
  ndash: "-", mdash: "-", hellip: "...", bull: "-", middot: "-", laquo: "«", raquo: "»", copy: "©", reg: "®", trade: "™", deg: "°",
  eacute: "é", egrave: "è", agrave: "à", ccedil: "ç", ocirc: "ô", ecirc: "ê", icirc: "î", ucirc: "û", acirc: "â",
  euml: "ë", iuml: "ï", ugrave: "ù", oelig: "œ", Eacute: "É", Egrave: "È", Agrave: "À", Ccedil: "Ç",
};

// Block-level closings become line breaks, every other tag disappears,
// numeric and the common named entities are decoded, and runs of spaces
// collapse. Line breaks are kept (at most two in a row) so the extractor
// still sees sentence boundaries.
export function cleanHtml(text: string): string {
  return text
    .replace(/<br\s*\/?>|<\/(?:p|li|div|h\d|tr|ul|ol|table)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#(\d+);/g, (_, n: string) => safeCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => safeCodePoint(Number.parseInt(h, 16)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name] ?? ENTITIES[name.toLowerCase()] ?? match)
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeCodePoint(n: number): string {
  return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
}

// Multi-value cells: one "*value" per line.
export function splitStarred(cell: string | undefined): string[] {
  return (cell ?? "")
    .split(/\r?\n/)
    .map((v) => v.replace(/^\*/, "").trim())
    .filter(Boolean);
}

// One line, single spaces.
export function collapseWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// Lower case, accents removed, single spaces: the lookup key for the region
// and buyer tables, so "Québec", "QUEBEC" and "Quebec " all match.
export function lookupKey(value: string): string {
  return collapseWhitespace(value)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}
