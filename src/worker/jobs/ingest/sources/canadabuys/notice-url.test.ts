import { describe, expect, it } from "vitest";
import { noticePageUrlFor, noticeSlug } from "./notice-url";

describe("the CanadaBuys notice page link", () => {
  it("lower-cases the reference number and keeps letters, digits and hyphens only", () => {
    expect(noticeSlug("SSC-26-00034400:T")).toBe("ssc-26-00034400t");
    expect(noticeSlug("PW-_NCS-030-11940")).toBe("pw-ncs-030-11940");
    expect(noticeSlug("cb-329-8183335")).toBe("cb-329-8183335");
    expect(noticeSlug("WS4052927717-Doc4053526199")).toBe("ws4052927717-doc4053526199");
    expect(noticeSlug("MX-443841357513")).toBe("mx-443841357513");
  });

  it("builds the page address under the tender opportunities listing", () => {
    expect(noticePageUrlFor("SSC-26-00034400:T")).toBe("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/ssc-26-00034400t");
    expect(noticePageUrlFor("PW-_NCS-030-11940")).toBe("https://canadabuys.canada.ca/en/tender-opportunities/tender-notice/pw-ncs-030-11940");
  });

  it("gives no link for a reference with nothing usable in it", () => {
    expect(noticePageUrlFor("::")).toBeNull();
  });
});
