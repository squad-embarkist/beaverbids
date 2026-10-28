import Link from "next/link";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { NavLinkList, NavLinks, type NavItem } from "@/components/nav-links";
import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/wordmark";

// Asphalt bar, paper wordmark, red active item (docs/ui-ux-guide.md "Top
// bar"). Two items fit at 375 px, so there is no collapsed menu yet.
export async function AppHeader({ children }: { children?: React.ReactNode }) {
  const t = await getTranslations("Nav");
  const tCommon = await getTranslations("Common");
  const items: NavItem[] = [
    { href: "/opportunities", label: t("opportunities") },
    { href: "/questionnaire/basics", match: "/questionnaire", label: t("myAnswers") },
  ];

  return (
    <header className="bg-asphalt text-paper">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:bg-paper focus:px-3 focus:py-2 focus:text-asphalt"
      >
        {tCommon("skipToContent")}
      </a>
      <div className="mx-auto flex h-14 w-full max-w-[1200px] items-center gap-6 px-4 md:px-8">
        <Link href="/opportunities" className="shrink-0">
          <Wordmark />
        </Link>
        <nav aria-label={t("label")} className="flex h-full flex-1 items-stretch gap-1 sm:gap-4">
          <Suspense fallback={<NavLinkList items={items} pathname={null} />}>
            <NavLinks items={items} />
          </Suspense>
        </nav>
        <div className="flex shrink-0 items-center gap-3">{children}</div>
      </div>
    </header>
  );
}

export function UserMenu({
  email,
  signedInAs,
  signOutLabel,
  signOut,
}: {
  email: string;
  signedInAs: string;
  signOutLabel: string;
  signOut: () => Promise<void>;
}) {
  return (
    <>
      <span className="hidden font-mono text-sm text-paper/80 md:inline" aria-label={signedInAs}>
        {email}
      </span>
      <form action={signOut}>
        <Button
          type="submit"
          variant="outline"
          size="sm"
          className="border-paper/40 bg-transparent text-paper hover:border-paper hover:bg-transparent focus-visible:outline-paper"
        >
          {signOutLabel}
        </Button>
      </form>
    </>
  );
}
