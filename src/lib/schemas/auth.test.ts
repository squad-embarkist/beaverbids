import { describe, expect, it } from "vitest";
import { PASSWORD_MIN, createAccountSchema, forgotPasswordSchema, resendConfirmationSchema, resetPasswordSchema, signInSchema } from "./auth";

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
      password: "long-enough-password",
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
      password: "long-enough-password",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => i.message)).toContain("nameRequired");
    }
  });

  it("rejects passwords shorter than 12 characters", () => {
    const result = createAccountSchema.safeParse({
      name: "Jo",
      email: "jo@example.com",
      password: "elevenchars",
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

describe("rememberMe on signInSchema", () => {
  it("reads the checkbox: on means keep the session, nothing means end it with the browser", () => {
    expect(signInSchema.parse({ email: "jo@example.com", password: "secret", rememberMe: "on" }).rememberMe).toBe(true);
    expect(signInSchema.parse({ email: "jo@example.com", password: "secret", rememberMe: null }).rememberMe).toBe(false);
    expect(signInSchema.parse({ email: "jo@example.com", password: "secret" }).rememberMe).toBe(false);
  });
});

describe("resendConfirmationSchema", () => {
  it("normalizes the address and rejects a bad one", () => {
    expect(resendConfirmationSchema.parse({ email: " Jo@Example.com " })).toEqual({ email: "jo@example.com" });
    expect(resendConfirmationSchema.safeParse({ email: "nope" }).success).toBe(false);
  });
});

describe("PASSWORD_MIN", () => {
  it("is the twelve characters the Figma checklist asks for", () => {
    expect(PASSWORD_MIN).toBe(12);
  });
});

describe("forgotPasswordSchema", () => {
  it("trims and lowercases the address", () => {
    const result = forgotPasswordSchema.safeParse({ email: " Jo@Example.com " });
    expect(result.success && result.data.email).toBe("jo@example.com");
  });

  it("rejects a bad address with the emailInvalid key", () => {
    const result = forgotPasswordSchema.safeParse({ email: "nope" });
    expect(!result.success && result.error.issues[0]?.message).toBe("emailInvalid");
  });
});

describe("resetPasswordSchema", () => {
  const valid = { token: "raw-token", password: "a-dozen-chars-at-least", confirm: "a-dozen-chars-at-least" };

  it("accepts a matching pair with a token", () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it("puts the mismatch on the second box", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, confirm: "a-dozen-chars-at-leasT" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(1);
      expect(result.error.issues[0]?.path).toEqual(["confirm"]);
      expect(result.error.issues[0]?.message).toBe("passwordMismatch");
    }
  });

  it("rejects a short password on the first box", () => {
    const result = resetPasswordSchema.safeParse({ ...valid, password: "x".repeat(PASSWORD_MIN - 1), confirm: "x".repeat(PASSWORD_MIN - 1) });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((i) => [i.path[0], i.message])).toEqual([["password", "passwordTooShort"]]);
    }
  });

  it("rejects a missing or blank token with the linkInvalid key", () => {
    for (const token of ["", "   ", undefined]) {
      const result = resetPasswordSchema.safeParse({ ...valid, token });
      expect(!result.success && result.error.issues.map((i) => i.message)).toContain("linkInvalid");
    }
  });
});
