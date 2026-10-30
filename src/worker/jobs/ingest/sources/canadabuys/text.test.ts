import { describe, expect, it } from "vitest";
import { cleanHtml, collapseWhitespace, lookupKey, splitStarred } from "./text";

describe("cleanHtml", () => {
  it("strips tags, decodes entities and keeps line breaks", () => {
    expect(cleanHtml("<p>Help&nbsp;desk &amp; network<br/>Data must stay in Canada.</p>")).toBe("Help desk & network\nData must stay in Canada.");
    expect(cleanHtml("Soumissions en fran&ccedil;ais &#8211; 24&#47;7 &Eacute;t&eacute;")).toBe("Soumissions en français – 24/7 Été");
    expect(cleanHtml("<ul><li>One</li><li>Two</li></ul><div>Three</div>")).toBe("One\nTwo\n\nThree");
    expect(cleanHtml("  a \r\n\r\n\r\n\r\n b  ")).toBe("a\n\nb");
  });

  it("leaves unknown entities and drops invalid code points", () => {
    expect(cleanHtml("x &bogus; y &#99999999; z")).toBe("x &bogus; y z");
  });
});

describe("splitStarred, collapseWhitespace and lookupKey", () => {
  it("splits starred multi-line cells", () => {
    expect(splitStarred("*22101500\n*22101600")).toEqual(["22101500", "22101600"]);
    expect(splitStarred("*Ontario (except NCR)\r\n*Québec")).toEqual(["Ontario (except NCR)", "Québec"]);
    expect(splitStarred("plain")).toEqual(["plain"]);
    expect(splitStarred("")).toEqual([]);
    expect(splitStarred(undefined)).toEqual([]);
  });

  it("collapses whitespace to one line", () => {
    expect(collapseWhitespace("  Managed\n\tservices   for  IT ")).toBe("Managed services for IT");
  });

  it("builds an accent-free lower case key", () => {
    expect(lookupKey("  Québec ")).toBe("quebec");
    expect(lookupKey("Montréal-Est")).toBe("montreal-est");
    expect(lookupKey("ONTARIO")).toBe("ontario");
    expect(lookupKey("Sept-Îles")).toBe("sept-iles");
  });
});
