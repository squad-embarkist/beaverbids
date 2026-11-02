import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("keeps a custom text size beside a text colour", () => {
    expect(cn("text-wordmark text-paper")).toBe("text-wordmark text-paper");
    expect(cn("text-button text-asphalt")).toBe("text-button text-asphalt");
  });

  it("lets a later custom text size replace an earlier one", () => {
    expect(cn("text-wordmark", "text-wordmark-lg")).toBe("text-wordmark-lg");
    expect(cn("text-sm text-eyebrow")).toBe("text-eyebrow");
  });

  it("keeps font-heading beside font-expanded and font-extrabold", () => {
    expect(cn("font-heading font-expanded font-extrabold")).toBe("font-heading font-expanded font-extrabold");
    expect(cn("font-expanded font-condensed")).toBe("font-condensed");
  });

  it("treats the control, button and header tokens as spacing", () => {
    expect(cn("size-control", "size-20")).toBe("size-20");
    expect(cn("h-button px-7", "h-10")).toBe("px-7 h-10");
  });

  it("still joins conditionals and resolves ordinary conflicts", () => {
    expect(cn("px-2 py-1", false && "hidden", { "bg-signal": true }, "px-4")).toBe("py-1 bg-signal px-4");
  });
});
