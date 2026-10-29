import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { AppHeader, UserMenu } from "@/components/app-header";
import { QuestionnaireStoreProvider } from "@/components/questionnaire/store-provider";
import { getCurrentUser } from "@/lib/session";
import { signOutAction } from "./actions";

// Signed-in screens: the top bar with the two nav items is static; the
// user's details stream in behind Suspense because they read the session
// cookie (Cache Components). The questionnaire store lives here so answers
// survive the step-to-step navigation.
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <QuestionnaireStoreProvider>
      <AppHeader>
        <Suspense fallback={null}>
          <SignedInUser />
        </Suspense>
      </AppHeader>
      {children}
    </QuestionnaireStoreProvider>
  );
}

async function SignedInUser() {
  const user = await getCurrentUser();
  const t = await getTranslations("Nav");
  return <UserMenu email={user.email} signedInAs={t("signedInAs", { email: user.email })} signOutLabel={t("signOut")} signOut={signOutAction} />;
}
