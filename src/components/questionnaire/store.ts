import { createStore } from "zustand/vanilla";
import type { Profile } from "@/lib/profile";

// One in-memory copy of the saved profile shared by the five step pages,
// the rail and the answers-so-far panel. The server is the source of truth
// (every step saves through PUT /api/profile), so there is no persistence:
// the store only keeps the latest saved row so a step page never shows an
// older copy than the one the user just saved.

export type QuestionnaireState = {
  profile: Profile | null;
  // Takes the server's copy unless the store already holds a newer save.
  hydrate: (profile: Profile | null) => void;
  // The row PUT /api/profile returned.
  setProfile: (profile: Profile) => void;
};

export function newerProfile(current: Profile | null, incoming: Profile | null): Profile | null {
  if (!incoming) return current;
  if (!current) return incoming;
  return incoming.updatedAt >= current.updatedAt ? incoming : current;
}

export function createQuestionnaireStore(initial: Profile | null = null) {
  return createStore<QuestionnaireState>()((set) => ({
    profile: initial,
    hydrate: (profile) => set((state) => ({ profile: newerProfile(state.profile, profile) })),
    setProfile: (profile) => set({ profile }),
  }));
}

export type QuestionnaireStore = ReturnType<typeof createQuestionnaireStore>;
