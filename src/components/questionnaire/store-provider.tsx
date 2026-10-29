"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { useStore } from "zustand";
import { createQuestionnaireStore, type QuestionnaireState, type QuestionnaireStore } from "./store";

// One store per mounted app layout (zustand's Next.js pattern), never a
// module-level singleton, so a request on the server cannot leak answers
// between users.
const QuestionnaireStoreContext = createContext<QuestionnaireStore | undefined>(undefined);

export function QuestionnaireStoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => createQuestionnaireStore());
  return <QuestionnaireStoreContext.Provider value={store}>{children}</QuestionnaireStoreContext.Provider>;
}

export function useQuestionnaireStoreApi(): QuestionnaireStore {
  const store = useContext(QuestionnaireStoreContext);
  if (!store) throw new Error("useQuestionnaireStore must be used within QuestionnaireStoreProvider");
  return store;
}

export function useQuestionnaireStore<T>(selector: (state: QuestionnaireState) => T): T {
  return useStore(useQuestionnaireStoreApi(), selector);
}
