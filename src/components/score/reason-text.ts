import { CERTIFICATION_MESSAGE_KEYS } from "@/lib/scoring/labels";
import { REASON_CODES, renderReason, type Reason, type ReasonCode, type ReasonMessages, type ReasonParams } from "@/lib/scoring/reasons";
import type { CertificationCode } from "@/lib/scoring/requirements";

// Renders a stored reason from the next-intl message keyed by its code.
// Params carry codes (category, buyer type, regions, team size band,
// certification), so each one is labelled through the Vocab messages
// first; list params are joined in the viewer's language. The stored
// English text is only the fallback for a code with no message.
//
// Works on the server (getTranslations) and the client (useTranslations):
// the caller hands over the two translators and the list formatter.

type Translate = (key: string, values?: Record<string, string | number>) => string;

export type ReasonTextDeps = {
  // Reasons namespace
  t: Translate;
  has: (key: string) => boolean;
  // Vocab namespace
  tVocab: Translate;
  hasVocab: (key: string) => boolean;
  // "a, b or c"
  listOr: (items: string[]) => string;
  // "a, b and c"
  listAnd: (items: string[]) => string;
};

export function createReasonText(deps: ReasonTextDeps): (reason: Reason) => string {
  const label = (namespace: string, code: string): string => {
    const key = `${namespace}.${code}`;
    return deps.hasVocab(key) ? deps.tVocab(key) : code;
  };
  const certification = (code: string): string => {
    const key = CERTIFICATION_MESSAGE_KEYS[code as CertificationCode];
    return key ? label("certifications", key) : code;
  };

  const values = (params: ReasonParams): Record<string, string | number> => {
    const out: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(params)) {
      if (Array.isArray(value)) {
        out[key] = key === "regions" ? deps.listAnd(value.map((code) => label("regions", code))) : value.join(", ");
        continue;
      }
      switch (key) {
        case "category":
          out[key] = label("categories", String(value));
          break;
        case "buyerType":
          out[key] = label("buyerTypes", String(value));
          break;
        case "band":
          out[key] = label("teamSizes", String(value));
          break;
        case "certification":
          out[key] = certification(String(value));
          break;
        default:
          out[key] = value;
      }
    }
    const list = params.certifications;
    if (Array.isArray(list)) out.list = deps.listOr(list.map(certification));
    return out;
  };

  const messages: ReasonMessages = {};
  for (const code of REASON_CODES) {
    if (!deps.has(code)) continue;
    messages[code] = (params) => {
      // A reference count has its own plural message.
      if (code === "referencesRequested" && typeof params.count === "number" && deps.has("referencesRequestedCount")) {
        return deps.t("referencesRequestedCount", values(params));
      }
      return deps.t(code, values(params));
    };
  }

  return (reason) => renderReason(reason, messages);
}

export type { Reason, ReasonCode };
