import { describe, expect, it } from "vitest";
import { DEFAULT_EMAIL_FILE_DIR, addressOf, readEmailConfig, readPublicEmailConfig } from "./config";

const PRODUCTION = {
  NODE_ENV: "production",
  EMAIL_TRANSPORT: "smtp",
  SMTP_HOST: "pro.turbo-smtp.com",
  SMTP_PORT: "587",
  SMTP_USER: "beaverbids",
  SMTP_PASSWORD: "secret",
  EMAIL_FROM: "BeaverBids <hello@beaverbids.ca>",
  SUPPORT_EMAIL: "support@beaverbids.ca",
  EMAIL_POSTAL_ADDRESS: "123 Main Street, Ottawa, Canada",
  BETTER_AUTH_URL: "https://app.beaverbids.ca/",
};

describe("readEmailConfig", () => {
  it("defaults to Mailpit on a laptop with no login", () => {
    const config = readEmailConfig({ NODE_ENV: "development" });
    expect(config.transport).toBe("smtp");
    expect(config.smtp).toEqual({ host: "localhost", port: 1025, secure: false, auth: undefined });
    expect(config.from).toBe("BeaverBids <hello@beaverbids.ca>");
    expect(config.supportEmail).toBe("support@beaverbids.ca");
    expect(config.fileDir).toBe(DEFAULT_EMAIL_FILE_DIR);
    expect(config.appUrl).toBe("http://localhost:3000");
  });

  it("treats blank values as unset, as a copied .env.example leaves them", () => {
    const config = readEmailConfig({ NODE_ENV: "test", SMTP_USER: "", SMTP_PASSWORD: "  ", SMTP_SECURE: "", EMAIL_POSTAL_ADDRESS: "" });
    expect(config.smtp.auth).toBeUndefined();
    expect(config.smtp.secure).toBe(false);
    expect(config.postalAddress).toBe("");
  });

  it("reads the file transport for CI and Playwright", () => {
    const config = readEmailConfig({ NODE_ENV: "test", EMAIL_TRANSPORT: "file", EMAIL_FILE_DIR: "/tmp/mail" });
    expect(config.transport).toBe("file");
    expect(config.fileDir).toBe("/tmp/mail");
  });

  it("reads a full production configuration and trims the app URL", () => {
    const config = readEmailConfig(PRODUCTION);
    expect(config.transport).toBe("smtp");
    expect(config.smtp).toEqual({ host: "pro.turbo-smtp.com", port: 587, secure: false, auth: { user: "beaverbids", pass: "secret" } });
    expect(config.appUrl).toBe("https://app.beaverbids.ca");
    expect(readEmailConfig({ ...PRODUCTION, SMTP_PORT: "465", SMTP_SECURE: "true" }).smtp).toMatchObject({ port: 465, secure: true });
  });

  it("refuses the file transport in production", () => {
    expect(() => readEmailConfig({ ...PRODUCTION, EMAIL_TRANSPORT: "file" })).toThrow(/EMAIL_TRANSPORT must be "smtp" in production/);
  });

  it("names every missing production variable", () => {
    expect(() => readEmailConfig({ ...PRODUCTION, SMTP_PASSWORD: undefined })).toThrow(/Set SMTP_PASSWORD in the worker's environment/);
    expect(() => readEmailConfig({ ...PRODUCTION, SMTP_PASSWORD: "", EMAIL_POSTAL_ADDRESS: " " })).toThrow(/Set SMTP_PASSWORD, EMAIL_POSTAL_ADDRESS in/);
    expect(() => readEmailConfig({ NODE_ENV: "production" })).toThrow(/SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, EMAIL_FROM, SUPPORT_EMAIL, EMAIL_POSTAL_ADDRESS, BETTER_AUTH_URL/);
  });

  it("rejects values that cannot work", () => {
    expect(() => readEmailConfig({ NODE_ENV: "development", SMTP_PORT: "70000" })).toThrow(/SMTP_PORT/);
    expect(() => readEmailConfig({ NODE_ENV: "development", EMAIL_TRANSPORT: "ses" })).toThrow(/EMAIL_TRANSPORT/);
    expect(() => readEmailConfig({ NODE_ENV: "development", SUPPORT_EMAIL: "not-an-address" })).toThrow(/SUPPORT_EMAIL/);
    expect(() => readEmailConfig({ NODE_ENV: "development", BETTER_AUTH_URL: "app.beaverbids.ca" })).toThrow(/BETTER_AUTH_URL/);
  });
});

describe("readPublicEmailConfig", () => {
  it("gives the web app the two addresses without asking for SMTP", () => {
    expect(readPublicEmailConfig({ NODE_ENV: "production", EMAIL_FROM: "BeaverBids <hello@beaverbids.ca>", SUPPORT_EMAIL: "support@beaverbids.ca" })).toEqual({
      from: "BeaverBids <hello@beaverbids.ca>",
      fromAddress: "hello@beaverbids.ca",
      supportEmail: "support@beaverbids.ca",
    });
    expect(readPublicEmailConfig({ NODE_ENV: "development" }).fromAddress).toBe("hello@beaverbids.ca");
  });

  it("still names a missing address in production", () => {
    expect(() => readPublicEmailConfig({ NODE_ENV: "production", EMAIL_FROM: "x <x@beaverbids.ca>" })).toThrow(/Set SUPPORT_EMAIL in the web app's environment/);
  });

  it("takes the address out of a display name", () => {
    expect(addressOf("BeaverBids <hello@beaverbids.ca>")).toBe("hello@beaverbids.ca");
    expect(addressOf("hello@beaverbids.ca")).toBe("hello@beaverbids.ca");
  });
});
