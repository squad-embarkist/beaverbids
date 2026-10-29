"use client";

import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import type { Profile } from "@/lib/profile";
import { stepAfter, type ProfileStepSave, type QuestionnaireStep } from "@/lib/schemas/company-profile";
import { useQuestionnaireStoreApi } from "./store-provider";

export type SaveDestination = "next" | "list";

export type SaveErrorKey = "saveFailed" | "signedOut";

// Saves one step through PUT /api/profile (the one write path, so the
// route's Zod check is the one validation), stores the returned row and
// moves on: the next step, or the list after the last step and for "Save
// and finish later".
export function useSaveStep(step: QuestionnaireStep) {
  const router = useRouter();
  const store = useQuestionnaireStoreApi();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<SaveErrorKey | null>(null);

  const save = useCallback(
    async (answers: ProfileStepSave["answers"], destination: SaveDestination) => {
      setPending(true);
      setError(null);
      try {
        const response = await fetch("/api/profile", {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ step, answers }),
        });
        if (response.status === 401) {
          setError("signedOut");
          router.push("/sign-in");
          return;
        }
        if (!response.ok) {
          setError("saveFailed");
          return;
        }
        const profile = (await response.json()) as Profile;
        store.getState().setProfile(profile);
        const next = destination === "next" ? stepAfter(step) : null;
        router.push(next ? `/questionnaire/${next}` : "/opportunities");
      } catch {
        setError("saveFailed");
      } finally {
        setPending(false);
      }
    },
    [router, step, store],
  );

  return { save, pending, error };
}
