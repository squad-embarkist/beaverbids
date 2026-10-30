"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export type NavItem = { href: string; label: string; match?: string };

// The active item carries a signal red rule and aria-current, so the state
// is never colour alone. usePathname is runtime data under Cache
// Components, so the header renders NavLinkList without an active item as
// the Suspense fallback and this component fills the state in.
export function NavLinks({ items }: { items: NavItem[] }) {
  return <NavLinkList items={items} pathname={usePathname()} />;
}

export function NavLinkList({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <>
      {items.map((item) => {
        const prefix = item.match ?? item.href;
        const active = pathname != null && (pathname === prefix || pathname.startsWith(`${prefix}/`));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center border-b-4 px-3 font-sans text-button-sm font-condensed font-bold uppercase whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-paper focus-visible:outline-offset-[-2px]",
              active ? "border-signal text-paper" : "border-transparent text-paper/75 hover:text-paper",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </>
  );
}
