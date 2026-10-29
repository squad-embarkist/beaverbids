"use client";

import { useEffect } from "react";
import type { Profile } from "@/lib/profile";
import type { QuestionnaireStep as Step } from "@/lib/schemas/company-profile";
import { BasicsForm } from "./forms/basics-form";
import { CredentialsForm } from "./forms/credentials-form";
import { RegionsForm } from "./forms/regions-form";
import { SizeForm } from "./forms/size-form";
import { WorkForm } from "./forms/work-form";
import { newerProfile } from "./store";
import { useQuestionnaireStore, useQuestionnaireStoreApi } from "./store-provider";
import { StepShell } from "./step-shell";

// Client entry for a step page. The server hands over the saved profile;
// the store may hold a newer copy from a save on the previous step, so the
// form takes whichever is newer and the store is brought up to date.
export function QuestionnaireStep({ step, profile }: { step: Step; profile: Profile | null }) {
  const store = useQuestionnaireStoreApi();
  const stored = useQuestionnaireStore((s) => s.profile);
  const effective = newerProfile(stored, profile);

  useEffect(() => {
    store.getState().hydrate(profile);
  }, [store, profile]);

  const Form = FORMS[step];
  return (
    <StepShell step={step}>
      <Form key={`${step}-${effective?.updatedAt ?? "new"}`} profile={effective} />
    </StepShell>
  );
}

const FORMS = {
  basics: BasicsForm,
  work: WorkForm,
  regions: RegionsForm,
  size: SizeForm,
  credentials: CredentialsForm,
} as const;
