// The landing page demo section is a video player. The video itself is not
// in the repo: NEXT_PUBLIC_DEMO_VIDEO_URL (inlined at build time) points at
// it, and while it is unset the player shows the poster with a disabled play
// button so the layout matches the Figma frame either way.

export function demoVideoUrl(): string | null {
  const value = process.env.NEXT_PUBLIC_DEMO_VIDEO_URL?.trim();
  return value ? value : null;
}
