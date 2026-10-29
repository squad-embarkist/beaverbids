import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";
import { BrandLockup } from "./brand-lockup";

// Sticky header: paper at 90 percent, hairline below, lockup left, three mono
// anchors in the middle (hidden under 1024 px, where the three do not fit
// beside the lockup and button; the footer carries them too),
// and the red button right (40 px as drawn, 44 px on phones for touch).
export async function SiteHeader() {
  const t = await getTranslations("Landing.header");
  const links = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#who-its-for", label: t("whoItsFor") },
    { href: "#portals", label: t("portals") },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-paper/90">
      <div className="mx-auto flex w-full max-w-[1240px] items-center justify-between gap-3 px-4 py-4 md:px-6">
        <Link href="/" className="shrink-0">
          <BrandLockup brand={t("brand")} tag={t("tag")} />
        </Link>
        <nav aria-label={t("brand")} className="hidden lg:block">
          <ul className="flex items-center gap-8">
            {links.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  className="font-mono text-eyebrow tracking-[0.14em] uppercase text-asphalt/70 transition-colors hover:text-signal"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <a href="#request-a-demo" className={cn(buttonVariants({ size: "sm" }), "max-md:h-11 max-sm:px-3")}>
          {t("cta")}
        </a>
      </div>
    </header>
  );
}
