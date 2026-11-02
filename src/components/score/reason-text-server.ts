import "server-only";

import { getFormatter, getTranslations } from "next-intl/server";
import { createReasonText } from "./reason-text";

// The server-side renderer for a stored reason (list rows, listing detail).
export async function getReasonText() {
  const t = await getTranslations("Reasons");
  const tVocab = await getTranslations("Vocab");
  const format = await getFormatter();
  return createReasonText({
    t: (key, values) => t(key as "categoryMatch", values),
    has: (key) => t.has(key as "categoryMatch"),
    tVocab: (key, values) => tVocab(key as "yes", values),
    hasVocab: (key) => tVocab.has(key as "yes"),
    listOr: (items) => format.list(items, { type: "disjunction" }),
    listAnd: (items) => format.list(items, { type: "conjunction" }),
  });
}
