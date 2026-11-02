import { describe, expect, it } from "vitest";
import { noticeKindFor } from "./notice-kind";

describe("noticeKindFor", () => {
  it.each([
    "Request for Proposal",
    "Request for Standing Offer",
    "Request for Supply Arrangement",
    "RFP against Supply Arrangement",
    "Invitation to Qualify",
    "Request for Quotation",
    "Tender",
    "Invitation to Tender",
  ])("%s is a bid", (value) => {
    expect(noticeKindFor(value)).toEqual({ kind: "BID", known: true });
  });

  it("maps the non-bid types", () => {
    expect(noticeKindFor("Request for Information")).toEqual({ kind: "RFI", known: true });
    expect(noticeKindFor("Advance Contract Award Notice")).toEqual({ kind: "ACAN", known: true });
    expect(noticeKindFor("Directed Contract")).toEqual({ kind: "DIRECTED", known: true });
    expect(noticeKindFor("Not Applicable")).toEqual({ kind: "OTHER", known: true });
  });

  it("keeps an untyped notice visible as UNKNOWN", () => {
    expect(noticeKindFor("")).toEqual({ kind: "UNKNOWN", known: true });
    expect(noticeKindFor("  ")).toEqual({ kind: "UNKNOWN", known: true });
  });

  it("treats a new type as OTHER and reports it", () => {
    expect(noticeKindFor("Request for Expressions of Interest")).toEqual({ kind: "OTHER", known: false });
  });

  it("ignores case and spacing", () => {
    expect(noticeKindFor("request  for proposal")).toEqual({ kind: "BID", known: true });
  });
});
