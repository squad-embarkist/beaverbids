import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { BrandLockup } from "./brand-lockup";

// Footer: lockup and blurb left, the 80 × 96 photo and three anchors right,
// then a hairline and the copyright row with the demo address.
export async function SiteFooter({ email }: { email: string }) {
  const t = await getTranslations("Landing.footer");
  const links = [
    { href: "#how-it-works", label: t("howItWorks") },
    { href: "#who-its-for", label: t("whoItsFor") },
    { href: "#request-a-demo", label: t("requestDemo") },
  ];

  return (
    <footer className="bg-asphalt text-paper">
      <div className="mx-auto w-full max-w-[1240px] px-4 py-12 md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
          <div className="max-w-[320px]">
            <BrandLockup brand={t("brand")} tag={t("tag")} size="lg" tone="dark" />
            <p className="mt-3 text-footer text-ink-muted">{t("blurb")}</p>
          </div>
          <div className="flex items-start gap-4">
            <Image
              src="/landing/footer.jpg"
              alt={t("photoAlt")}
              width={80}
              height={96}
              sizes="80px"
              className="h-24 w-20 shrink-0 object-cover"
            />
            <ul className="flex flex-col justify-end self-stretch">
              {links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block py-1 font-mono text-eyebrow tracking-[0.12em] uppercase text-ink-muted transition-colors hover:text-paper"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-10 flex flex-col gap-2 border-t border-line-dark pt-6 font-mono text-mono-xs tracking-[0.14em] uppercase text-ink-muted md:flex-row md:items-center md:justify-between">
          <p>{t("copyright")}</p>
          <a href={`mailto:${email}`} className="underline-offset-4 hover:underline">
            {email}
          </a>
        </div>
      </div>
    </footer>
  );
}
