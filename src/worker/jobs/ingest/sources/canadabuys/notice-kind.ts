import type { NoticeKind } from "@/lib/schemas/vocab";
import { lookupKey } from "./text";

// The file's noticeType values (data dictionary and today's file) to the
// normalized kind. Only BID and UNKNOWN are scored and listed; the 110
// untyped notices stay visible because most are real MERX bids.
const KINDS: Record<string, NoticeKind> = {
  "request for proposal": "BID",
  "request for standing offer": "BID",
  "request for supply arrangement": "BID",
  "rfp against supply arrangement": "BID",
  "invitation to qualify": "BID",
  "request for quotation": "BID",
  tender: "BID",
  "invitation to tender": "BID",
  "request for information": "RFI",
  "advance contract award notice": "ACAN",
  "directed contract": "DIRECTED",
  "not applicable": "OTHER",
};

export function noticeKindFor(noticeType: string): { kind: NoticeKind; known: boolean } {
  const key = lookupKey(noticeType);
  if (!key) return { kind: "UNKNOWN", known: true };
  const kind = KINDS[key];
  return kind ? { kind, known: true } : { kind: "OTHER", known: false };
}
