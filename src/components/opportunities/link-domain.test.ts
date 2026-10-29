import { describe, expect, it } from "vitest";
import { linkDomain } from "./link-domain";

describe("linkDomain", () => {
  it("keeps the last two labels of the host", () => {
    expect(linkDomain("https://www.merx.com/public/solicitations/3776296409/abstract?language=EN")).toBe("merx.com");
    expect(linkDomain("https://portal.us.bn.cloud.ariba.com/dashboard/public/appext/x#/RfxEvent/preview/1")).toBe("ariba.com");
    expect(linkDomain("https://discovery.ariba.com/rfx/1")).toBe("ariba.com");
    expect(linkDomain("https://example.com/fixtures/FIXTURE-0001")).toBe("example.com");
    expect(linkDomain("http://localhost:3000/x")).toBe("localhost");
  });

  it("returns null for a value that is not a web address", () => {
    expect(linkDomain("merx.com/notice")).toBeNull();
    expect(linkDomain("")).toBeNull();
  });
});
