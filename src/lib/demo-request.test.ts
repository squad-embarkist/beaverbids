import { afterEach, describe, expect, it, vi } from "vitest";
import { buildDemoRequestMailto, DEFAULT_DEMO_REQUEST_EMAIL, demoRequestEmail } from "./demo-request";

const values = {
  name: "Jordan Pratt",
  company: "Pratt & Sons Contracting",
  email: "jordan@prattsons.ca",
  province: "Ontario",
  trade: "General contracting",
};

describe("buildDemoRequestMailto", () => {
  it("targets the address and carries the subject", () => {
    const link = buildDemoRequestMailto("demos@beaverbids.ca", "Live demo request: Pratt & Sons Contracting", values);
    expect(link.startsWith("mailto:demos%40beaverbids.ca?")).toBe(true);
    const query = new URLSearchParams(link.slice(link.indexOf("?") + 1));
    expect(query.get("subject")).toBe("Live demo request: Pratt & Sons Contracting");
  });

  it("lists every answer in the body, decoded", () => {
    const link = buildDemoRequestMailto("demos@beaverbids.ca", "Subject", values);
    const body = new URLSearchParams(link.slice(link.indexOf("?") + 1)).get("body");
    expect(body).toBe(
      [
        "Name: Jordan Pratt",
        "Company: Pratt & Sons Contracting",
        "Work email: jordan@prattsons.ca",
        "Province: Ontario",
        "Trade / industry: General contracting",
      ].join("\n"),
    );
  });

  it("encodes an ampersand, a newline and spaces so they cannot break the link", () => {
    const link = buildDemoRequestMailto("demos@beaverbids.ca", "A & B", {
      ...values,
      company: "Smith & Co\nsecond line",
    });
    expect(link).not.toContain(" ");
    expect(link).not.toContain("+");
    expect(link).not.toContain("\n");
    expect(link.split("&").length).toBe(2);
    const query = new URLSearchParams(link.slice(link.indexOf("?") + 1));
    expect(query.get("subject")).toBe("A & B");
    expect(query.get("body")).toContain("Company: Smith & Co\nsecond line");
  });
});

describe("demoRequestEmail", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to the default address when the variable is unset or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_REQUEST_EMAIL", "");
    expect(demoRequestEmail()).toBe(DEFAULT_DEMO_REQUEST_EMAIL);
  });

  it("reads the variable when set", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_REQUEST_EMAIL", " hello@example.ca ");
    expect(demoRequestEmail()).toBe("hello@example.ca");
  });
});
