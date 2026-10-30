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
      {/* Phones: wordmark and sign out on the first row, the two nav items on
          a full-width second row. From 768 px everything sits on one row. */}
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center gap-x-6 px-4 md:h-14 md:flex-nowrap md:px-8">
        <Link href="/opportunities" className="order-1 flex h-14 shrink-0 items-center">
          <Wordmark />
        </Link>
        {/* DOM order is wordmark, nav, user: the desktop tab order. Phones move the nav to its own last row. */}
        <nav aria-label={t("label")} className="order-3 -mx-4 flex h-12 basis-full items-stretch gap-1 border-t border-line-dark px-4 md:order-none md:mx-0 md:h-14 md:basis-auto md:flex-1 md:border-t-0 md:px-0 md:gap-4">
          <Suspense fallback={<NavLinkList items={items} pathname={null} />}>
            <NavLinks items={items} />
          </Suspense>
        </nav>
        <div className="order-2 ml-auto flex h-14 shrink-0 items-center gap-3 md:order-none">{children}</div>
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
