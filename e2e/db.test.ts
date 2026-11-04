import { afterEach, describe, expect, it, vi } from "vitest";
import { assertLocalDatabase } from "./db";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("assertLocalDatabase", () => {
  it("allows the local database and nothing else", () => {
    expect(assertLocalDatabase("postgresql://beaverbids:beaverbids@localhost:5432/beaverbids?schema=public")).toContain("localhost");
    expect(assertLocalDatabase("postgresql://u:p@127.0.0.1:5432/db")).toContain("127.0.0.1");
    expect(() => assertLocalDatabase("postgresql://u:p@db.example.com:5432/beaverbids")).toThrow(/refuses to run against "db.example.com"/);
    expect(() => assertLocalDatabase("postgresql://u:p@10.0.0.5:5432/beaverbids")).toThrow(/refuses/);
    expect(() => assertLocalDatabase("nonsense")).toThrow(/not a valid URL/);
  });

  // Passing undefined falls through to the default parameter, which reads
  // DATABASE_URL, so the "not set" case has to clear the variable itself.
  // Otherwise the test passes on a laptop (vitest does not load .env) and
  // fails in CI, where the Postgres service sets a localhost URL.
  it("refuses to run when DATABASE_URL is not set", () => {
    vi.stubEnv("DATABASE_URL", undefined);
    expect(() => assertLocalDatabase()).toThrow(/not set/);
    expect(() => assertLocalDatabase("")).toThrow(/not set/);
  });

  it("reads DATABASE_URL when no argument is given", () => {
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@localhost:5432/beaverbids");
    expect(assertLocalDatabase()).toContain("localhost");
    vi.stubEnv("DATABASE_URL", "postgresql://u:p@db.example.com:5432/beaverbids");
    expect(() => assertLocalDatabase()).toThrow(/refuses/);
  });
});
