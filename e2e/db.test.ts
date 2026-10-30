import { describe, expect, it } from "vitest";
import { assertLocalDatabase } from "./db";

describe("assertLocalDatabase", () => {
  it("allows the local database and nothing else", () => {
    expect(assertLocalDatabase("postgresql://beaverbids:beaverbids@localhost:5432/beaverbids?schema=public")).toContain("localhost");
    expect(assertLocalDatabase("postgresql://u:p@127.0.0.1:5432/db")).toContain("127.0.0.1");
    expect(() => assertLocalDatabase("postgresql://u:p@db.example.com:5432/beaverbids")).toThrow(/refuses to run against "db.example.com"/);
    expect(() => assertLocalDatabase("postgresql://u:p@10.0.0.5:5432/beaverbids")).toThrow(/refuses/);
    expect(() => assertLocalDatabase(undefined)).toThrow(/not set/);
    expect(() => assertLocalDatabase("nonsense")).toThrow(/not a valid URL/);
  });
});
