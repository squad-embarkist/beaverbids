import { describe, expect, it } from "vitest";
import { createAccountSchema, signInSchema } from "./auth";

describe("signInSchema", () => {
  it("accepts a valid email and password, trimming and lowercasing the email", () => {
    const result = signInSchema.safeParse({ email: "  Jo@Example.com ", password: "secret" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("jo@example.com");
    }
  });

  it("rejects an invalid email with the emailInvalid key", () => {
    const result = signInSchema.safeParse({ email: "not-an-email", password: "secret" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["email"]);
      expect(result.error.issues[0]?.message).toBe("emailInvalid");
    }
  });

  it("rejects an empty password with the passwordRequired key", () => {
    const result = signInSchema.safeParse({ email: "jo@example.com", password: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain("passwordRequired");
    }
  });
});

describe("createAccountSchema", () => {
  it("accepts a valid account", () => {
    const result = createAccountSchema.safeParse({
      name: " Jo Beaver ",
      email: "jo@example.com",
      password: "longenough",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Jo Beaver");
    }
  });

  it("requires a name", () => {
    const result = createAccountSchema.safeParse({
      name: "   ",
      email: "jo@example.com",
      password: "longenough",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain("nameRequired");
    }
  });

  it("rejects passwords shorter than 8 characters", () => {
    const result = createAccountSchema.safeParse({
      name: "Jo",
      email: "jo@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain("passwordTooShort");
    }
  });

  it("rejects passwords longer than 128 characters", () => {
    const result = createAccountSchema.safeParse({
      name: "Jo",
      email: "jo@example.com",
      password: "x".repeat(129),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain("passwordTooLong");
    }
  });
});
