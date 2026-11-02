import { afterEach, describe, expect, it, vi } from "vitest";
import { demoVideoUrl } from "./demo-video";

describe("demoVideoUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when the variable is unset or blank", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_VIDEO_URL", "");
    expect(demoVideoUrl()).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_DEMO_VIDEO_URL", "   ");
    expect(demoVideoUrl()).toBeNull();
  });

  it("returns the trimmed URL when set", () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_VIDEO_URL", " https://cdn.example.ca/demo.mp4 ");
    expect(demoVideoUrl()).toBe("https://cdn.example.ca/demo.mp4");
  });
});
